-- =====================================================
-- PAYMENT STATE MACHINE & STOCK RESERVATION SYSTEM
-- =====================================================

-- 1. Create payment_status enum type
DO $$ BEGIN
  CREATE TYPE payment_status_order AS ENUM (
    'draft',
    'pending',
    'pending_validation',
    'paid',
    'failed',
    'expired',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Add new columns to orders_b2b for payment state machine
ALTER TABLE public.orders_b2b 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS checkout_session_id UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reservation_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stock_reserved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 3. Create index for efficient pending order lookups
CREATE INDEX IF NOT EXISTS idx_orders_b2b_payment_status ON public.orders_b2b(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_reserved_at ON public.orders_b2b(reserved_at);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_checkout_session ON public.orders_b2b(checkout_session_id);

-- 4. Create stock_reservations table to track reserved stock per order
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders_b2b(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  seller_catalog_id UUID REFERENCES public.seller_catalog(id),
  quantity INTEGER NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  released_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'reserved', -- 'reserved', 'confirmed', 'released'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on stock_reservations
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies for stock_reservations
CREATE POLICY "Admins can manage all reservations" 
ON public.stock_reservations 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own reservations" 
ON public.stock_reservations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders_b2b o 
  WHERE o.id = stock_reservations.order_id 
  AND (o.seller_id = auth.uid() OR o.buyer_id = auth.uid())
));

-- 5. Create function to reserve stock when order goes to 'pending'
CREATE OR REPLACE FUNCTION public.fn_reserve_stock_on_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Only process when payment_status changes to 'pending' or 'pending_validation'
  IF (NEW.payment_status IN ('pending', 'pending_validation') 
      AND (OLD.payment_status IS NULL OR OLD.payment_status NOT IN ('pending', 'pending_validation'))
      AND NEW.stock_reserved = FALSE) THEN
    
    -- Reserve stock for each order item
    FOR v_item IN 
      SELECT oi.*, p.stock_fisico, pv.stock as variant_stock, pv.id as pv_id
      FROM public.order_items_b2b oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      LEFT JOIN public.product_variants pv ON pv.sku = oi.sku AND pv.product_id = p.id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Check if we're dealing with a variant or product
      IF v_item.pv_id IS NOT NULL THEN
        -- Reserve from variant stock
        UPDATE public.product_variants
        SET stock = stock - v_item.cantidad,
            updated_at = now()
        WHERE id = v_item.pv_id AND stock >= v_item.cantidad;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Stock insuficiente para variante SKU: %', v_item.sku;
        END IF;
        
        -- Record reservation
        INSERT INTO public.stock_reservations (order_id, product_id, variant_id, quantity, status)
        VALUES (NEW.id, v_item.product_id, v_item.pv_id, v_item.cantidad, 'reserved');
      ELSIF v_item.product_id IS NOT NULL THEN
        -- Reserve from product stock
        UPDATE public.products
        SET stock_fisico = stock_fisico - v_item.cantidad,
            updated_at = now()
        WHERE id = v_item.product_id AND stock_fisico >= v_item.cantidad;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Stock insuficiente para producto: %', v_item.nombre;
        END IF;
        
        -- Record reservation
        INSERT INTO public.stock_reservations (order_id, product_id, quantity, status)
        VALUES (NEW.id, v_item.product_id, v_item.cantidad, 'reserved');
      END IF;
    END LOOP;
    
    -- Mark order as having stock reserved
    NEW.stock_reserved := TRUE;
    NEW.reserved_at := now();
    NEW.reservation_expires_at := now() + INTERVAL '30 minutes';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create function to release stock when order fails/expires/cancelled
CREATE OR REPLACE FUNCTION public.fn_release_stock_on_failure()
RETURNS TRIGGER AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Only process when payment_status changes to failed, expired, or cancelled
  IF (NEW.payment_status IN ('failed', 'expired', 'cancelled') 
      AND OLD.payment_status NOT IN ('failed', 'expired', 'cancelled')
      AND NEW.stock_reserved = TRUE) THEN
    
    -- Release all reserved stock
    FOR v_reservation IN 
      SELECT * FROM public.stock_reservations 
      WHERE order_id = NEW.id AND status = 'reserved'
    LOOP
      IF v_reservation.variant_id IS NOT NULL THEN
        -- Return stock to variant
        UPDATE public.product_variants
        SET stock = stock + v_reservation.quantity,
            updated_at = now()
        WHERE id = v_reservation.variant_id;
      ELSIF v_reservation.product_id IS NOT NULL THEN
        -- Return stock to product
        UPDATE public.products
        SET stock_fisico = stock_fisico + v_reservation.quantity,
            updated_at = now()
        WHERE id = v_reservation.product_id;
      END IF;
      
      -- Mark reservation as released
      UPDATE public.stock_reservations
      SET status = 'released', released_at = now(), updated_at = now()
      WHERE id = v_reservation.id;
    END LOOP;
    
    -- Mark order as stock released
    NEW.stock_reserved := FALSE;
  END IF;
  
  -- When order is paid, confirm the reservations
  IF (NEW.payment_status = 'paid' 
      AND OLD.payment_status != 'paid') THEN
    
    UPDATE public.stock_reservations
    SET status = 'confirmed', updated_at = now()
    WHERE order_id = NEW.id AND status = 'reserved';
    
    NEW.payment_confirmed_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create function to expire old pending orders (called by cron)
CREATE OR REPLACE FUNCTION public.fn_expire_pending_orders()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_order RECORD;
BEGIN
  -- Find all pending orders that have expired
  FOR v_order IN 
    SELECT id 
    FROM public.orders_b2b 
    WHERE payment_status IN ('pending', 'pending_validation')
      AND stock_reserved = TRUE
      AND reservation_expires_at < now()
  LOOP
    -- Update order to expired
    UPDATE public.orders_b2b
    SET payment_status = 'expired', 
        status = 'cancelled',
        updated_at = now()
    WHERE id = v_order.id;
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Create triggers
DROP TRIGGER IF EXISTS tr_reserve_stock_on_pending ON public.orders_b2b;
CREATE TRIGGER tr_reserve_stock_on_pending
  BEFORE UPDATE ON public.orders_b2b
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_reserve_stock_on_pending();

DROP TRIGGER IF EXISTS tr_release_stock_on_failure ON public.orders_b2b;
CREATE TRIGGER tr_release_stock_on_failure
  BEFORE UPDATE ON public.orders_b2b
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_release_stock_on_failure();

-- 9. Add realtime for orders_b2b for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders_b2b;
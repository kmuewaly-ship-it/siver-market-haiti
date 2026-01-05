-- =====================================================
-- AUTO-CONSOLIDATION ENGINE FOR PO SYSTEM
-- =====================================================

-- 1. Consolidation Settings Table
CREATE TABLE IF NOT EXISTS public.consolidation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  consolidation_mode TEXT DEFAULT 'hybrid' CHECK (consolidation_mode IN ('time', 'quantity', 'hybrid')),
  -- Time-based rule
  time_interval_hours INTEGER DEFAULT 48,
  -- Quantity-based rule  
  order_quantity_threshold INTEGER DEFAULT 50,
  -- Scheduling
  last_auto_close_at TIMESTAMP WITH TIME ZONE,
  next_scheduled_close_at TIMESTAMP WITH TIME ZONE,
  -- Notifications
  notify_on_close BOOLEAN DEFAULT true,
  notify_threshold_percent INTEGER DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO public.consolidation_settings (
  consolidation_mode, 
  time_interval_hours, 
  order_quantity_threshold
) 
SELECT 'hybrid', 48, 50
WHERE NOT EXISTS (SELECT 1 FROM public.consolidation_settings);

-- 2. Add consolidation fields to orders_b2b
ALTER TABLE public.orders_b2b 
ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.master_purchase_orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS po_linked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS consolidation_status TEXT DEFAULT 'pending';

-- Create index for faster PO lookups
CREATE INDEX IF NOT EXISTS idx_orders_b2b_po_id ON public.orders_b2b(po_id);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_consolidation_status ON public.orders_b2b(consolidation_status);

-- 3. Add auto-close tracking to PO
ALTER TABLE public.master_purchase_orders
ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS close_reason TEXT,
ADD COLUMN IF NOT EXISTS orders_at_close INTEGER DEFAULT 0;

-- =====================================================
-- FUNCTION: Get or create active PO for consolidation
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_or_create_active_po()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_po_id UUID;
  v_settings RECORD;
  v_po_number TEXT;
BEGIN
  SELECT * INTO v_settings FROM consolidation_settings LIMIT 1;
  
  SELECT id INTO v_active_po_id
  FROM master_purchase_orders
  WHERE status IN ('draft', 'open')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_active_po_id IS NULL THEN
    SELECT generate_po_number() INTO v_po_number;
    
    INSERT INTO master_purchase_orders (
      po_number, status, cycle_start_at, auto_close_at, notes
    ) VALUES (
      COALESCE(v_po_number, 'PO-' || EXTRACT(EPOCH FROM NOW())::INTEGER),
      'open',
      NOW(),
      CASE WHEN v_settings.consolidation_mode IN ('time', 'hybrid') 
        THEN NOW() + (v_settings.time_interval_hours || ' hours')::INTERVAL
        ELSE NULL
      END,
      'Auto-created by consolidation engine'
    )
    RETURNING id INTO v_active_po_id;
    
    UPDATE consolidation_settings SET
      next_scheduled_close_at = NOW() + (time_interval_hours || ' hours')::INTERVAL,
      updated_at = NOW();
  END IF;
  
  RETURN v_active_po_id;
END;
$$;

-- =====================================================
-- FUNCTION: Auto-link order to active PO
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_link_order_to_po()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_po_id UUID;
  v_settings RECORD;
  v_current_order_count INTEGER;
BEGIN
  IF NEW.payment_status = 'paid' AND NEW.po_id IS NULL THEN
    SELECT * INTO v_settings FROM consolidation_settings WHERE is_active = true LIMIT 1;
    
    IF v_settings IS NOT NULL THEN
      v_active_po_id := get_or_create_active_po();
      
      NEW.po_id := v_active_po_id;
      NEW.po_linked_at := NOW();
      NEW.consolidation_status := 'linked';
      
      UPDATE master_purchase_orders SET
        total_orders = COALESCE(total_orders, 0) + 1,
        total_quantity = COALESCE(total_quantity, 0) + NEW.total_quantity,
        total_amount = COALESCE(total_amount, 0) + NEW.total_amount,
        updated_at = NOW()
      WHERE id = v_active_po_id;
      
      IF v_settings.consolidation_mode IN ('quantity', 'hybrid') THEN
        SELECT total_orders INTO v_current_order_count
        FROM master_purchase_orders WHERE id = v_active_po_id;
        
        IF v_current_order_count >= v_settings.order_quantity_threshold THEN
          PERFORM auto_close_po(v_active_po_id, 'quantity_threshold');
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNCTION: Auto-close PO and create new one
-- =====================================================
CREATE OR REPLACE FUNCTION public.auto_close_po(
  p_po_id UUID,
  p_close_reason TEXT DEFAULT 'manual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_new_po_id UUID;
BEGIN
  SELECT * INTO v_po FROM master_purchase_orders WHERE id = p_po_id;
  
  IF v_po IS NULL OR v_po.status NOT IN ('draft', 'open') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PO not found or already closed');
  END IF;
  
  UPDATE master_purchase_orders SET
    status = 'closed',
    closed_at = NOW(),
    cycle_end_at = NOW(),
    close_reason = p_close_reason,
    orders_at_close = COALESCE(total_orders, 0),
    updated_at = NOW()
  WHERE id = p_po_id;
  
  UPDATE consolidation_settings SET last_auto_close_at = NOW(), updated_at = NOW();
  
  v_new_po_id := get_or_create_active_po();
  
  RETURN jsonb_build_object(
    'success', true,
    'closed_po_id', p_po_id,
    'closed_po_number', v_po.po_number,
    'orders_consolidated', v_po.total_orders,
    'new_po_id', v_new_po_id,
    'close_reason', p_close_reason
  );
END;
$$;

-- =====================================================
-- FUNCTION: Check time-based auto-close
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_po_auto_close()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po RECORD;
  v_settings RECORD;
BEGIN
  SELECT * INTO v_settings FROM consolidation_settings WHERE is_active = true LIMIT 1;
  
  IF v_settings IS NULL OR v_settings.consolidation_mode = 'quantity' THEN
    RETURN jsonb_build_object('action', 'none', 'reason', 'Time-based close not active');
  END IF;
  
  SELECT * INTO v_po
  FROM master_purchase_orders
  WHERE status IN ('draft', 'open')
    AND auto_close_at IS NOT NULL
    AND auto_close_at <= NOW()
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_po IS NOT NULL THEN
    RETURN auto_close_po(v_po.id, 'time_threshold');
  END IF;
  
  RETURN jsonb_build_object('action', 'none', 'reason', 'No PO due for auto-close');
END;
$$;

-- =====================================================
-- FUNCTION: Handle cancelled orders
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_order_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND OLD.po_id IS NOT NULL THEN
    NEW.consolidation_status := 'cancelled';
    
    UPDATE master_purchase_orders SET
      total_orders = GREATEST(0, COALESCE(total_orders, 0) - 1),
      total_quantity = GREATEST(0, COALESCE(total_quantity, 0) - OLD.total_quantity),
      total_amount = GREATEST(0, COALESCE(total_amount, 0) - OLD.total_amount),
      updated_at = NOW()
    WHERE id = OLD.po_id AND status IN ('draft', 'open');
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- FUNCTION: Get consolidation stats
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_consolidation_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_active_po RECORD;
  v_time_remaining INTERVAL;
  v_percent_full NUMERIC;
BEGIN
  SELECT * INTO v_settings FROM consolidation_settings WHERE is_active = true LIMIT 1;
  
  SELECT * INTO v_active_po
  FROM master_purchase_orders
  WHERE status IN ('draft', 'open')
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_active_po IS NULL THEN
    PERFORM get_or_create_active_po();
    SELECT * INTO v_active_po
    FROM master_purchase_orders
    WHERE status IN ('draft', 'open')
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  IF v_active_po.auto_close_at IS NOT NULL THEN
    v_time_remaining := v_active_po.auto_close_at - NOW();
    IF v_time_remaining < INTERVAL '0 seconds' THEN
      v_time_remaining := INTERVAL '0 seconds';
    END IF;
  END IF;
  
  IF v_settings.order_quantity_threshold > 0 THEN
    v_percent_full := (COALESCE(v_active_po.total_orders, 0)::NUMERIC / v_settings.order_quantity_threshold) * 100;
  ELSE
    v_percent_full := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'settings', jsonb_build_object(
      'mode', v_settings.consolidation_mode,
      'time_interval_hours', v_settings.time_interval_hours,
      'order_quantity_threshold', v_settings.order_quantity_threshold,
      'notify_threshold_percent', v_settings.notify_threshold_percent,
      'is_active', v_settings.is_active
    ),
    'active_po', jsonb_build_object(
      'id', v_active_po.id,
      'po_number', v_active_po.po_number,
      'status', v_active_po.status,
      'total_orders', COALESCE(v_active_po.total_orders, 0),
      'total_quantity', COALESCE(v_active_po.total_quantity, 0),
      'total_amount', COALESCE(v_active_po.total_amount, 0),
      'cycle_start_at', v_active_po.cycle_start_at,
      'auto_close_at', v_active_po.auto_close_at
    ),
    'progress', jsonb_build_object(
      'orders_current', COALESCE(v_active_po.total_orders, 0),
      'orders_threshold', v_settings.order_quantity_threshold,
      'percent_full', ROUND(v_percent_full, 1),
      'time_remaining_seconds', EXTRACT(EPOCH FROM v_time_remaining)::INTEGER,
      'time_remaining_formatted', CASE 
        WHEN v_time_remaining IS NULL THEN 'N/A'
        ELSE CONCAT(
          FLOOR(EXTRACT(EPOCH FROM v_time_remaining) / 3600), 'h ',
          FLOOR((EXTRACT(EPOCH FROM v_time_remaining) % 3600) / 60), 'm'
        )
      END
    )
  );
END;
$$;

-- =====================================================
-- FUNCTION: Update consolidation settings
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_consolidation_settings(
  p_mode TEXT DEFAULT NULL,
  p_time_hours INTEGER DEFAULT NULL,
  p_quantity_threshold INTEGER DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
BEGIN
  UPDATE consolidation_settings SET
    consolidation_mode = COALESCE(p_mode, consolidation_mode),
    time_interval_hours = COALESCE(p_time_hours, time_interval_hours),
    order_quantity_threshold = COALESCE(p_quantity_threshold, order_quantity_threshold),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  RETURNING * INTO v_settings;
  
  -- Update active PO's auto_close_at if time changed
  IF p_time_hours IS NOT NULL OR p_mode IS NOT NULL THEN
    UPDATE master_purchase_orders SET
      auto_close_at = CASE 
        WHEN v_settings.consolidation_mode IN ('time', 'hybrid') 
        THEN cycle_start_at + (v_settings.time_interval_hours || ' hours')::INTERVAL
        ELSE NULL
      END,
      updated_at = NOW()
    WHERE status IN ('draft', 'open');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'settings', row_to_json(v_settings)
  );
END;
$$;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================
DROP TRIGGER IF EXISTS trigger_auto_link_order_to_po ON orders_b2b;
CREATE TRIGGER trigger_auto_link_order_to_po
  BEFORE UPDATE ON orders_b2b
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION auto_link_order_to_po();

DROP TRIGGER IF EXISTS trigger_auto_link_new_order_to_po ON orders_b2b;
CREATE TRIGGER trigger_auto_link_new_order_to_po
  BEFORE INSERT ON orders_b2b
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION auto_link_order_to_po();

DROP TRIGGER IF EXISTS trigger_handle_order_cancellation ON orders_b2b;
CREATE TRIGGER trigger_handle_order_cancellation
  BEFORE UPDATE ON orders_b2b
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled')
  EXECUTE FUNCTION handle_order_cancellation();

-- =====================================================
-- RLS POLICIES (simple - allow authenticated users to read)
-- =====================================================
ALTER TABLE public.consolidation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated to read consolidation settings" ON public.consolidation_settings;
CREATE POLICY "Allow authenticated to read consolidation settings"
ON public.consolidation_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated to update consolidation settings" ON public.consolidation_settings;
CREATE POLICY "Allow authenticated to update consolidation settings"
ON public.consolidation_settings FOR UPDATE TO authenticated USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_active_po() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_close_po(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_po_auto_close() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_consolidation_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_consolidation_settings(TEXT, INTEGER, INTEGER, BOOLEAN) TO authenticated;
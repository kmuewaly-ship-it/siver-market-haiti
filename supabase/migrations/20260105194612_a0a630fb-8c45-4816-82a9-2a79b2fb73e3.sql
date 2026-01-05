-- =============================================
-- PO CONSOLIDATION SYSTEM WITH UNIFIED TRACKING
-- =============================================

-- 1. Platform settings for consolidation cycles
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('po_consolidation_hours', 24, 'Horas entre ciclos de consolidación automática'),
  ('po_auto_close_enabled', 1, 'Habilitar cierre automático de PO')
ON CONFLICT (key) DO NOTHING;

-- 2. Master Purchase Orders table
CREATE TABLE IF NOT EXISTS public.master_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'ordered', 'in_transit_china', 'in_transit_usa', 'arrived_hub', 'processing', 'completed', 'cancelled')),
  
  -- Consolidation cycle
  cycle_start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cycle_end_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- China tracking (trigger for hybrid ID generation)
  china_tracking_number TEXT,
  china_tracking_entered_at TIMESTAMPTZ,
  
  -- Statistics
  total_orders INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Logistics dates
  shipped_from_china_at TIMESTAMPTZ,
  arrived_usa_at TIMESTAMPTZ,
  shipped_to_haiti_at TIMESTAMPTZ,
  arrived_hub_at TIMESTAMPTZ,
  
  -- Admin
  created_by UUID REFERENCES auth.users(id),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Link orders to POs (both B2B and B2C)
CREATE TABLE IF NOT EXISTS public.po_order_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.master_purchase_orders(id) ON DELETE CASCADE,
  
  -- Order reference (can be B2B or B2C)
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('b2b', 'b2c')),
  
  -- Customer info for picking
  customer_user_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  customer_phone TEXT,
  
  -- Location for hybrid tracking ID
  department_code TEXT,
  commune_code TEXT,
  pickup_point_code TEXT,
  
  -- Generated hybrid tracking ID
  hybrid_tracking_id TEXT,
  short_order_id TEXT, -- Last 6 chars of order ID
  
  -- Item count for this order
  unit_count INTEGER DEFAULT 1,
  
  -- Status sync
  previous_status TEXT,
  current_status TEXT,
  status_synced_at TIMESTAMPTZ,
  
  -- QR code for pickup (only if payment confirmed)
  pickup_qr_code TEXT,
  pickup_qr_generated_at TIMESTAMPTZ,
  delivery_confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(order_id, order_type)
);

-- 4. Individual items in PO for picking manifest
CREATE TABLE IF NOT EXISTS public.po_picking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES public.master_purchase_orders(id) ON DELETE CASCADE,
  po_order_link_id UUID NOT NULL REFERENCES public.po_order_links(id) ON DELETE CASCADE,
  
  -- Product info
  product_id UUID,
  variant_id UUID,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  
  -- Variant details for visual picking
  color TEXT,
  size TEXT,
  image_url TEXT,
  
  -- Quantities
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- For sorting in hub
  bin_location TEXT,
  picked_at TIMESTAMPTZ,
  picked_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Function to generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(po_number FROM 'PO' || v_date || '(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM public.master_purchase_orders
  WHERE po_number LIKE 'PO' || v_date || '%';
  
  v_number := 'PO' || v_date || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

-- 6. Function to generate hybrid tracking ID
CREATE OR REPLACE FUNCTION public.generate_po_hybrid_tracking(
  p_dept_code TEXT,
  p_commune_code TEXT,
  p_po_number TEXT,
  p_china_tracking TEXT,
  p_short_order_id TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN UPPER(COALESCE(p_dept_code, 'XX')) || 
         UPPER(COALESCE(p_commune_code, 'XX')) || '-' ||
         p_po_number || '-' ||
         COALESCE(p_china_tracking, 'NOTRACK') || '-' ||
         UPPER(p_short_order_id);
END;
$$;

-- 7. Function to process PO tracking entry and update all linked orders
CREATE OR REPLACE FUNCTION public.process_po_china_tracking(
  p_po_id UUID,
  p_china_tracking TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po master_purchase_orders;
  v_link RECORD;
  v_hybrid_id TEXT;
  v_updated_count INTEGER := 0;
BEGIN
  -- Get and lock PO
  SELECT * INTO v_po FROM master_purchase_orders WHERE id = p_po_id FOR UPDATE;
  
  IF v_po IS NULL THEN
    RAISE EXCEPTION 'PO not found';
  END IF;
  
  -- Update PO with tracking
  UPDATE master_purchase_orders
  SET 
    china_tracking_number = p_china_tracking,
    china_tracking_entered_at = now(),
    status = 'in_transit_china',
    updated_at = now()
  WHERE id = p_po_id;
  
  -- Generate hybrid tracking for each linked order
  FOR v_link IN 
    SELECT * FROM po_order_links WHERE po_id = p_po_id
  LOOP
    -- Generate hybrid tracking ID
    v_hybrid_id := generate_po_hybrid_tracking(
      v_link.department_code,
      v_link.commune_code,
      v_po.po_number,
      p_china_tracking,
      v_link.short_order_id
    );
    
    -- Update link with hybrid tracking
    UPDATE po_order_links
    SET 
      hybrid_tracking_id = v_hybrid_id,
      current_status = 'in_transit_china',
      status_synced_at = now(),
      updated_at = now()
    WHERE id = v_link.id;
    
    -- Update B2B order status
    IF v_link.order_type = 'b2b' THEN
      UPDATE orders_b2b
      SET 
        status = 'in_transit',
        metadata = COALESCE(metadata, '{}'::JSONB) || 
          jsonb_build_object(
            'po_id', p_po_id,
            'po_number', v_po.po_number,
            'china_tracking', p_china_tracking,
            'hybrid_tracking_id', v_hybrid_id,
            'logistics_stage', 'in_transit_china'
          ),
        updated_at = now()
      WHERE id = v_link.order_id;
    END IF;
    
    -- TODO: Update B2C orders when table exists
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'po_id', p_po_id,
    'china_tracking', p_china_tracking,
    'orders_updated', v_updated_count
  );
END;
$$;

-- 8. Function to update PO status and sync to all orders
CREATE OR REPLACE FUNCTION public.update_po_logistics_stage(
  p_po_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po master_purchase_orders;
  v_link RECORD;
  v_updated_count INTEGER := 0;
  v_order_status TEXT;
BEGIN
  -- Map PO status to order status
  v_order_status := CASE p_new_status
    WHEN 'in_transit_china' THEN 'in_transit'
    WHEN 'in_transit_usa' THEN 'in_transit'
    WHEN 'arrived_hub' THEN 'ready_pickup'
    WHEN 'processing' THEN 'processing'
    WHEN 'completed' THEN 'delivered'
    ELSE 'processing'
  END;
  
  -- Get and update PO
  UPDATE master_purchase_orders
  SET 
    status = p_new_status,
    shipped_from_china_at = CASE WHEN p_new_status = 'in_transit_china' AND shipped_from_china_at IS NULL THEN now() ELSE shipped_from_china_at END,
    arrived_usa_at = CASE WHEN p_new_status = 'in_transit_usa' AND arrived_usa_at IS NULL THEN now() ELSE arrived_usa_at END,
    arrived_hub_at = CASE WHEN p_new_status = 'arrived_hub' AND arrived_hub_at IS NULL THEN now() ELSE arrived_hub_at END,
    updated_at = now()
  WHERE id = p_po_id
  RETURNING * INTO v_po;
  
  IF v_po IS NULL THEN
    RAISE EXCEPTION 'PO not found';
  END IF;
  
  -- Update all linked orders
  FOR v_link IN 
    SELECT * FROM po_order_links WHERE po_id = p_po_id
  LOOP
    -- Update link status
    UPDATE po_order_links
    SET 
      previous_status = current_status,
      current_status = p_new_status,
      status_synced_at = now(),
      updated_at = now()
    WHERE id = v_link.id;
    
    -- Update B2B order
    IF v_link.order_type = 'b2b' THEN
      UPDATE orders_b2b
      SET 
        status = v_order_status,
        metadata = COALESCE(metadata, '{}'::JSONB) || 
          jsonb_build_object('logistics_stage', p_new_status),
        updated_at = now()
      WHERE id = v_link.order_id;
    END IF;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'po_id', p_po_id,
    'new_status', p_new_status,
    'orders_updated', v_updated_count
  );
END;
$$;

-- 9. Function to generate pickup QR (only for confirmed payments)
CREATE OR REPLACE FUNCTION public.generate_po_pickup_qr(p_order_link_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link po_order_links;
  v_payment_status TEXT;
  v_qr_code TEXT;
BEGIN
  SELECT * INTO v_link FROM po_order_links WHERE id = p_order_link_id;
  
  IF v_link IS NULL THEN
    RAISE EXCEPTION 'Order link not found';
  END IF;
  
  -- Check payment status
  IF v_link.order_type = 'b2b' THEN
    SELECT payment_status INTO v_payment_status 
    FROM orders_b2b WHERE id = v_link.order_id;
  END IF;
  
  -- Only generate QR if payment is confirmed
  IF v_payment_status != 'paid' THEN
    RAISE EXCEPTION 'Payment not confirmed. QR generation blocked.';
  END IF;
  
  -- Generate unique QR code
  v_qr_code := 'QR-' || v_link.hybrid_tracking_id || '-' || 
               UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
  
  -- Update link
  UPDATE po_order_links
  SET 
    pickup_qr_code = v_qr_code,
    pickup_qr_generated_at = now(),
    updated_at = now()
  WHERE id = p_order_link_id;
  
  RETURN v_qr_code;
END;
$$;

-- 10. Function to link pending orders to current open PO
CREATE OR REPLACE FUNCTION public.link_orders_to_po(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_profile RECORD;
  v_address RECORD;
  v_dept_code TEXT;
  v_commune_code TEXT;
  v_link_count INTEGER := 0;
  v_total_items INTEGER := 0;
  v_total_qty INTEGER := 0;
  v_total_amount NUMERIC := 0;
BEGIN
  -- Link all paid B2B orders not yet linked to a PO
  FOR v_order IN 
    SELECT o.*, p.full_name, p.phone
    FROM orders_b2b o
    LEFT JOIN profiles p ON p.id = o.seller_id
    WHERE o.payment_status = 'paid'
      AND o.status IN ('confirmed', 'processing')
      AND NOT EXISTS (
        SELECT 1 FROM po_order_links pol 
        WHERE pol.order_id = o.id AND pol.order_type = 'b2b'
      )
  LOOP
    -- Try to get address info for department/commune
    SELECT a.state, a.city INTO v_address
    FROM addresses a
    WHERE a.user_id = v_order.seller_id AND a.is_default = true
    LIMIT 1;
    
    -- Get department and commune codes
    SELECT d.code INTO v_dept_code
    FROM departments d
    WHERE LOWER(d.name) = LOWER(COALESCE(v_address.state, ''))
    LIMIT 1;
    
    SELECT c.code INTO v_commune_code
    FROM communes c
    WHERE LOWER(c.name) = LOWER(COALESCE(v_address.city, ''))
    LIMIT 1;
    
    -- Get order item count
    SELECT COUNT(*), COALESCE(SUM(cantidad), 0) INTO v_total_items, v_total_qty
    FROM order_items_b2b WHERE order_id = v_order.id;
    
    -- Create link
    INSERT INTO po_order_links (
      po_id,
      order_id,
      order_type,
      customer_user_id,
      customer_name,
      customer_phone,
      department_code,
      commune_code,
      short_order_id,
      unit_count,
      current_status
    ) VALUES (
      p_po_id,
      v_order.id,
      'b2b',
      v_order.seller_id,
      v_order.full_name,
      v_order.phone,
      COALESCE(v_dept_code, 'XX'),
      COALESCE(v_commune_code, 'XX'),
      UPPER(SUBSTRING(v_order.id::TEXT FROM 1 FOR 6)),
      v_total_items,
      'linked'
    );
    
    v_link_count := v_link_count + 1;
    v_total_amount := v_total_amount + v_order.total_amount;
    
    -- Also insert picking items
    INSERT INTO po_picking_items (po_id, po_order_link_id, product_id, sku, product_name, color, size, image_url, quantity)
    SELECT 
      p_po_id,
      (SELECT id FROM po_order_links WHERE order_id = v_order.id AND order_type = 'b2b'),
      oi.product_id,
      oi.sku,
      oi.nombre,
      (SELECT pv.attribute_combination->>'color' FROM product_variants pv WHERE pv.sku = oi.sku LIMIT 1),
      (SELECT pv.attribute_combination->>'size' FROM product_variants pv WHERE pv.sku = oi.sku LIMIT 1),
      (SELECT p.imagen_principal FROM products p WHERE p.id = oi.product_id LIMIT 1),
      oi.cantidad
    FROM order_items_b2b oi
    WHERE oi.order_id = v_order.id;
  END LOOP;
  
  -- Update PO stats
  UPDATE master_purchase_orders
  SET 
    total_orders = total_orders + v_link_count,
    total_items = total_items + v_total_items,
    total_quantity = total_quantity + v_total_qty,
    total_amount = total_amount + v_total_amount,
    updated_at = now()
  WHERE id = p_po_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'orders_linked', v_link_count,
    'total_amount', v_total_amount
  );
END;
$$;

-- 11. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_master_po_status ON master_purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_master_po_china_tracking ON master_purchase_orders(china_tracking_number);
CREATE INDEX IF NOT EXISTS idx_po_order_links_po_id ON po_order_links(po_id);
CREATE INDEX IF NOT EXISTS idx_po_order_links_order_id ON po_order_links(order_id, order_type);
CREATE INDEX IF NOT EXISTS idx_po_order_links_hybrid ON po_order_links(hybrid_tracking_id);
CREATE INDEX IF NOT EXISTS idx_po_picking_items_po_id ON po_picking_items(po_id);

-- 12. RLS Policies
ALTER TABLE master_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_picking_items ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_master_po" ON master_purchase_orders
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_full_access_po_links" ON po_order_links
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_full_access_po_picking" ON po_picking_items
  FOR ALL USING (public.is_admin(auth.uid()));

-- Users can view their own order links
CREATE POLICY "users_view_own_po_links" ON po_order_links
  FOR SELECT USING (customer_user_id = auth.uid());

-- Enable realtime for customer updates
ALTER PUBLICATION supabase_realtime ADD TABLE po_order_links;

-- 13. Trigger for updated_at
CREATE TRIGGER update_master_po_updated_at
  BEFORE UPDATE ON master_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_po_links_updated_at
  BEFORE UPDATE ON po_order_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
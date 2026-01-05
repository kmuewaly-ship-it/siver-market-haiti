-- =====================================================
-- MIXED B2B/B2C PO FLOW WITH SIVER MATCH INTEGRATION
-- =====================================================

-- Add order_type to po_order_links to distinguish B2B/B2C/Siver Match
ALTER TABLE public.po_order_links 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'b2c' CHECK (source_type IN ('b2b', 'b2c', 'siver_match'));

-- Add siver_match specific fields to po_order_links
ALTER TABLE public.po_order_links 
ADD COLUMN IF NOT EXISTS siver_match_sale_id UUID REFERENCES public.siver_match_sales(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS investor_user_id UUID,
ADD COLUMN IF NOT EXISTS gestor_user_id UUID;

-- Add logistics stage to Siver Match sales for tracking
ALTER TABLE public.siver_match_sales 
ADD COLUMN IF NOT EXISTS logistics_stage TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS po_id UUID REFERENCES public.master_purchase_orders(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS po_linked_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster PO lookups
CREATE INDEX IF NOT EXISTS idx_siver_match_sales_po_id ON public.siver_match_sales(po_id);
CREATE INDEX IF NOT EXISTS idx_po_order_links_source_type ON public.po_order_links(source_type);

-- =====================================================
-- UPDATED FUNCTION: Link orders from ALL sources to PO
-- =====================================================
CREATE OR REPLACE FUNCTION public.link_mixed_orders_to_po(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_b2c_linked INT := 0;
  v_b2b_linked INT := 0;
  v_siver_linked INT := 0;
  v_order RECORD;
  v_sale RECORD;
  v_item RECORD;
  v_short_id TEXT;
  v_customer_info RECORD;
BEGIN
  -- 1. LINK B2C ORDERS (orders with metadata.order_type = 'b2c' or no type)
  FOR v_order IN 
    SELECT o.*, 
           a.full_name as addr_name, 
           a.phone as addr_phone,
           d.code as dept_code,
           c.code as comm_code,
           pp.point_code as pickup_code
    FROM orders_b2b o
    LEFT JOIN addresses a ON a.user_id = o.buyer_id AND a.is_default = true
    LEFT JOIN departments d ON d.id::text = (o.metadata->>'department_id')::text
    LEFT JOIN communes c ON c.id::text = (o.metadata->>'commune_id')::text
    LEFT JOIN pickup_points pp ON pp.id::text = (o.metadata->>'pickup_point_id')::text
    WHERE o.payment_status = 'paid'
      AND o.status IN ('placed', 'confirmed', 'processing')
      AND (o.metadata->>'order_type' = 'b2c' OR o.metadata->>'order_type' IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM po_order_links pol 
        WHERE pol.order_id = o.id AND pol.order_type = 'b2c'
      )
  LOOP
    v_short_id := UPPER(SUBSTRING(v_order.id::text FROM 1 FOR 8));
    
    INSERT INTO po_order_links (
      po_id, order_id, order_type, source_type,
      customer_user_id, customer_name, customer_phone,
      department_code, commune_code, pickup_point_code,
      short_order_id, unit_count, current_status
    ) VALUES (
      p_po_id, v_order.id, 'b2c', 'b2c',
      v_order.buyer_id, COALESCE(v_order.addr_name, 'Cliente B2C'), v_order.addr_phone,
      v_order.dept_code, v_order.comm_code, v_order.pickup_code,
      v_short_id, v_order.total_quantity, v_order.status
    );
    
    -- Create picking items for B2C order
    FOR v_item IN 
      SELECT * FROM order_items_b2b WHERE order_id = v_order.id
    LOOP
      INSERT INTO po_picking_items (
        po_id, po_order_link_id, product_id, sku,
        product_name, quantity
      ) VALUES (
        p_po_id, 
        (SELECT id FROM po_order_links WHERE order_id = v_order.id AND order_type = 'b2c' LIMIT 1),
        v_item.product_id, v_item.sku,
        v_item.nombre, v_item.cantidad
      );
    END LOOP;
    
    v_b2c_linked := v_b2c_linked + 1;
  END LOOP;

  -- 2. LINK B2B ORDERS (pure B2B, seller purchases)
  FOR v_order IN 
    SELECT o.*, 
           p.full_name as profile_name,
           p.phone as profile_phone
    FROM orders_b2b o
    LEFT JOIN profiles p ON p.id = o.seller_id
    WHERE o.payment_status = 'paid'
      AND o.status IN ('placed', 'confirmed', 'processing')
      AND o.metadata->>'order_type' = 'b2b'
      AND NOT EXISTS (
        SELECT 1 FROM po_order_links pol 
        WHERE pol.order_id = o.id AND pol.order_type = 'b2b'
      )
  LOOP
    v_short_id := UPPER(SUBSTRING(v_order.id::text FROM 1 FOR 8));
    
    INSERT INTO po_order_links (
      po_id, order_id, order_type, source_type,
      customer_user_id, customer_name, customer_phone,
      short_order_id, unit_count, current_status
    ) VALUES (
      p_po_id, v_order.id, 'b2b', 'b2b',
      v_order.seller_id, COALESCE(v_order.profile_name, 'Vendedor B2B'), v_order.profile_phone,
      v_short_id, v_order.total_quantity, v_order.status
    );
    
    -- Create picking items
    FOR v_item IN 
      SELECT * FROM order_items_b2b WHERE order_id = v_order.id
    LOOP
      INSERT INTO po_picking_items (
        po_id, po_order_link_id, product_id, sku,
        product_name, quantity
      ) VALUES (
        p_po_id, 
        (SELECT id FROM po_order_links WHERE order_id = v_order.id AND order_type = 'b2b' LIMIT 1),
        v_item.product_id, v_item.sku,
        v_item.nombre, v_item.cantidad
      );
    END LOOP;
    
    v_b2b_linked := v_b2b_linked + 1;
  END LOOP;

  -- 3. LINK SIVER MATCH SALES (B2B2C - investor/gestor model)
  FOR v_sale IN 
    SELECT s.*, 
           sl.product_name, sl.sku, sl.color, sl.size, sl.product_image,
           inv.user_id as investor_uid,
           ges.user_id as gestor_uid,
           inv.display_name as investor_name,
           ges.display_name as gestor_name,
           ges.phone as gestor_phone,
           d.code as dept_code,
           c.code as comm_code
    FROM siver_match_sales s
    JOIN siver_match_stock_lots sl ON sl.id = s.stock_lot_id
    JOIN siver_match_profiles inv ON inv.id = s.investor_id
    JOIN siver_match_profiles ges ON ges.id = s.gestor_id
    LEFT JOIN departments d ON d.id = s.department_id
    LEFT JOIN communes c ON c.id = s.commune_id
    WHERE s.payment_status = 'confirmed'
      AND s.status IN ('payment_confirmed', 'ready_pickup')
      AND s.po_id IS NULL
  LOOP
    v_short_id := UPPER(SUBSTRING(v_sale.id::text FROM 1 FOR 8));
    
    INSERT INTO po_order_links (
      po_id, order_id, order_type, source_type,
      siver_match_sale_id, investor_user_id, gestor_user_id,
      customer_user_id, customer_name, customer_phone,
      department_code, commune_code,
      short_order_id, unit_count, current_status
    ) VALUES (
      p_po_id, v_sale.id, 'siver_match', 'siver_match',
      v_sale.id, v_sale.investor_uid, v_sale.gestor_uid,
      v_sale.customer_user_id, v_sale.customer_name, v_sale.customer_phone,
      v_sale.dept_code, v_sale.comm_code,
      v_short_id, v_sale.quantity, v_sale.status::text
    );
    
    -- Create picking item for Siver Match sale
    INSERT INTO po_picking_items (
      po_id, po_order_link_id, sku,
      product_name, color, size, image_url, quantity
    ) VALUES (
      p_po_id, 
      (SELECT id FROM po_order_links WHERE siver_match_sale_id = v_sale.id LIMIT 1),
      COALESCE(v_sale.sku, 'SM-' || v_short_id),
      v_sale.product_name, v_sale.color, v_sale.size, v_sale.product_image, v_sale.quantity
    );
    
    -- Link sale to PO
    UPDATE siver_match_sales 
    SET po_id = p_po_id, po_linked_at = NOW()
    WHERE id = v_sale.id;
    
    v_siver_linked := v_siver_linked + 1;
  END LOOP;

  -- Update PO totals
  UPDATE master_purchase_orders SET
    total_orders = v_b2c_linked + v_b2b_linked + v_siver_linked,
    total_items = (SELECT COUNT(*) FROM po_picking_items WHERE po_id = p_po_id),
    total_quantity = (SELECT COALESCE(SUM(quantity), 0) FROM po_picking_items WHERE po_id = p_po_id),
    updated_at = NOW()
  WHERE id = p_po_id;

  RETURN jsonb_build_object(
    'b2c_linked', v_b2c_linked,
    'b2b_linked', v_b2b_linked,
    'siver_match_linked', v_siver_linked,
    'total_linked', v_b2c_linked + v_b2b_linked + v_siver_linked
  );
END;
$$;

-- =====================================================
-- UPDATED FUNCTION: Process China tracking for ALL sources
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_mixed_po_china_tracking(
  p_po_id UUID,
  p_china_tracking TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_hybrid_id TEXT;
  v_orders_updated INT := 0;
  v_b2c_updated INT := 0;
  v_b2b_updated INT := 0;
  v_siver_updated INT := 0;
BEGIN
  -- Store tracking on PO
  UPDATE master_purchase_orders SET
    china_tracking_number = p_china_tracking,
    china_tracking_entered_at = NOW(),
    status = 'in_transit',
    shipped_from_china_at = NOW(),
    updated_at = NOW()
  WHERE id = p_po_id;

  -- Generate hybrid tracking IDs and update all linked items
  FOR v_link IN 
    SELECT pol.*, mpo.po_number
    FROM po_order_links pol
    JOIN master_purchase_orders mpo ON mpo.id = pol.po_id
    WHERE pol.po_id = p_po_id
  LOOP
    -- Generate hybrid tracking ID: [DEPT][COMM]-[PO]-[TRACKING]-[SHORT_ID]
    v_hybrid_id := COALESCE(v_link.department_code, 'XX') || 
                   COALESCE(v_link.commune_code, 'XX') || '-' ||
                   v_link.po_number || '-' ||
                   p_china_tracking || '-' ||
                   v_link.short_order_id;
    
    -- Update the link with hybrid ID
    UPDATE po_order_links SET
      hybrid_tracking_id = v_hybrid_id,
      previous_status = current_status,
      current_status = 'in_transit',
      status_synced_at = NOW(),
      updated_at = NOW()
    WHERE id = v_link.id;
    
    -- Update source based on type
    IF v_link.source_type = 'b2c' THEN
      -- Update B2C order metadata with hybrid tracking and status
      UPDATE orders_b2b SET
        status = 'in_transit',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'hybrid_tracking_id', v_hybrid_id,
          'china_tracking', p_china_tracking,
          'logistics_stage', 'in_transit_china',
          'tracking_updated_at', NOW()::text
        ),
        updated_at = NOW()
      WHERE id = v_link.order_id;
      v_b2c_updated := v_b2c_updated + 1;
      
    ELSIF v_link.source_type = 'b2b' THEN
      -- Update B2B order
      UPDATE orders_b2b SET
        status = 'in_transit',
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'hybrid_tracking_id', v_hybrid_id,
          'china_tracking', p_china_tracking,
          'logistics_stage', 'in_transit_china',
          'tracking_updated_at', NOW()::text
        ),
        updated_at = NOW()
      WHERE id = v_link.order_id;
      v_b2b_updated := v_b2b_updated + 1;
      
    ELSIF v_link.source_type = 'siver_match' THEN
      -- Update Siver Match sale
      UPDATE siver_match_sales SET
        status = 'ready_pickup',
        logistics_stage = 'in_transit_china',
        hybrid_tracking_id = v_hybrid_id,
        updated_at = NOW()
      WHERE id = v_link.siver_match_sale_id;
      
      -- Also update the stock lot
      UPDATE siver_match_stock_lots SET
        china_tracking_number = p_china_tracking,
        internal_tracking_id = v_hybrid_id,
        status = 'in_transit',
        logistics_stage = 'in_transit_china',
        updated_at = NOW()
      WHERE id = (SELECT stock_lot_id FROM siver_match_sales WHERE id = v_link.siver_match_sale_id);
      
      v_siver_updated := v_siver_updated + 1;
    END IF;
    
    v_orders_updated := v_orders_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'orders_updated', v_orders_updated,
    'b2c_updated', v_b2c_updated,
    'b2b_updated', v_b2b_updated,
    'siver_match_updated', v_siver_updated,
    'china_tracking', p_china_tracking
  );
END;
$$;

-- =====================================================
-- UPDATED FUNCTION: Update PO logistics stage for ALL sources
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_mixed_po_logistics_stage(
  p_po_id UUID,
  p_new_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_orders_updated INT := 0;
  v_b2c_updated INT := 0;
  v_b2b_updated INT := 0;
  v_siver_updated INT := 0;
  v_logistics_stage TEXT;
  v_timestamp_column TEXT;
BEGIN
  -- Map status to logistics stage
  v_logistics_stage := CASE p_new_status
    WHEN 'in_transit' THEN 'in_transit_china'
    WHEN 'arrived_usa' THEN 'in_transit_usa'
    WHEN 'shipped_haiti' THEN 'in_transit_haiti'
    WHEN 'arrived_hub' THEN 'in_haiti_hub'
    WHEN 'ready_delivery' THEN 'ready_for_delivery'
    WHEN 'delivered' THEN 'delivered'
    ELSE p_new_status
  END;

  -- Update PO timestamps based on status
  IF p_new_status = 'arrived_usa' THEN
    UPDATE master_purchase_orders SET arrived_usa_at = NOW(), status = p_new_status, updated_at = NOW() WHERE id = p_po_id;
  ELSIF p_new_status = 'shipped_haiti' THEN
    UPDATE master_purchase_orders SET shipped_to_haiti_at = NOW(), status = p_new_status, updated_at = NOW() WHERE id = p_po_id;
  ELSIF p_new_status = 'arrived_hub' THEN
    UPDATE master_purchase_orders SET arrived_hub_at = NOW(), status = p_new_status, updated_at = NOW() WHERE id = p_po_id;
  ELSE
    UPDATE master_purchase_orders SET status = p_new_status, updated_at = NOW() WHERE id = p_po_id;
  END IF;

  -- Update all linked orders
  FOR v_link IN 
    SELECT * FROM po_order_links WHERE po_id = p_po_id
  LOOP
    -- Update link status
    UPDATE po_order_links SET
      previous_status = current_status,
      current_status = p_new_status,
      status_synced_at = NOW(),
      updated_at = NOW()
    WHERE id = v_link.id;
    
    -- Update source based on type
    IF v_link.source_type IN ('b2c', 'b2b') THEN
      UPDATE orders_b2b SET
        status = CASE 
          WHEN p_new_status = 'arrived_hub' THEN 'ready_pickup'
          WHEN p_new_status = 'delivered' THEN 'delivered'
          ELSE 'in_transit'
        END,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'logistics_stage', v_logistics_stage,
          'stage_updated_at', NOW()::text
        ),
        updated_at = NOW()
      WHERE id = v_link.order_id;
      
      IF v_link.source_type = 'b2c' THEN
        v_b2c_updated := v_b2c_updated + 1;
      ELSE
        v_b2b_updated := v_b2b_updated + 1;
      END IF;
      
    ELSIF v_link.source_type = 'siver_match' THEN
      UPDATE siver_match_sales SET
        logistics_stage = v_logistics_stage,
        status = CASE 
          WHEN p_new_status = 'arrived_hub' THEN 'ready_pickup'
          WHEN p_new_status = 'delivered' THEN 'delivered'
          ELSE status
        END,
        updated_at = NOW()
      WHERE id = v_link.siver_match_sale_id;
      
      -- Update stock lot stage
      UPDATE siver_match_stock_lots SET
        logistics_stage = v_logistics_stage,
        status = CASE 
          WHEN p_new_status = 'arrived_hub' THEN 'in_hub'
          ELSE status
        END,
        arrived_at_hub_at = CASE WHEN p_new_status = 'arrived_hub' THEN NOW() ELSE arrived_at_hub_at END,
        updated_at = NOW()
      WHERE id = (SELECT stock_lot_id FROM siver_match_sales WHERE id = v_link.siver_match_sale_id);
      
      v_siver_updated := v_siver_updated + 1;
    END IF;
    
    v_orders_updated := v_orders_updated + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'new_status', p_new_status,
    'logistics_stage', v_logistics_stage,
    'orders_updated', v_orders_updated,
    'b2c_updated', v_b2c_updated,
    'b2b_updated', v_b2b_updated,
    'siver_match_updated', v_siver_updated
  );
END;
$$;

-- =====================================================
-- FUNCTION: Process wallet splits on delivery (Siver Match only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_delivery_wallet_splits(p_po_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link RECORD;
  v_splits_processed INT := 0;
BEGIN
  -- Only process Siver Match sales that are confirmed paid
  FOR v_link IN 
    SELECT pol.*, sms.id as sale_id, sms.payment_status
    FROM po_order_links pol
    JOIN siver_match_sales sms ON sms.id = pol.siver_match_sale_id
    WHERE pol.po_id = p_po_id
      AND pol.source_type = 'siver_match'
      AND sms.payment_status = 'confirmed'
      AND sms.status != 'delivered'
  LOOP
    -- Call the existing wallet split processor
    PERFORM process_siver_match_wallet_split(v_link.sale_id);
    v_splits_processed := v_splits_processed + 1;
  END LOOP;

  RETURN jsonb_build_object('splits_processed', v_splits_processed);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.link_mixed_orders_to_po(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_mixed_po_china_tracking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_mixed_po_logistics_stage(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_delivery_wallet_splits(UUID) TO authenticated;
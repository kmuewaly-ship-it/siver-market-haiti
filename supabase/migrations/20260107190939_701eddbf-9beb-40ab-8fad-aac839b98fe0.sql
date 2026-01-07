-- Fix: ensure paid orders get registered inside the active PO (po_order_links + po_picking_items)
-- and make bulk linker accept status='paid'.

CREATE OR REPLACE FUNCTION public.create_po_records_for_paid_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_type TEXT;
  v_po_id UUID;
  v_short_id TEXT;
  v_customer_user_id UUID;
  v_customer_name TEXT;
  v_customer_phone TEXT;
  v_dept_code TEXT;
  v_comm_code TEXT;
  v_pickup_code TEXT;
  v_link_id UUID;
  v_item RECORD;
BEGIN
  -- Only act when order is paid
  IF NEW.payment_status IS DISTINCT FROM 'paid' THEN
    RETURN NEW;
  END IF;

  -- Ensure PO is set
  v_po_id := NEW.po_id;
  IF v_po_id IS NULL THEN
    v_po_id := public.get_or_create_active_po();

    -- best-effort persist (in case this trigger fires without the BEFORE trigger)
    UPDATE public.orders_b2b
    SET po_id = v_po_id,
        po_linked_at = NOW(),
        consolidation_status = 'linked',
        updated_at = NOW()
    WHERE id = NEW.id AND po_id IS NULL;
  END IF;

  v_order_type := COALESCE(NEW.metadata->>'order_type', 'b2c');
  v_short_id := UPPER(SUBSTRING(NEW.id::text FROM 1 FOR 8));

  v_customer_user_id := COALESCE(NEW.buyer_id, NEW.seller_id);

  -- Best-effort codes (nullable)
  SELECT d.code INTO v_dept_code
  FROM public.departments d
  WHERE d.id::text = (NEW.metadata->>'department_id')::text;

  SELECT c.code INTO v_comm_code
  FROM public.communes c
  WHERE c.id::text = (NEW.metadata->>'commune_id')::text;

  SELECT pp.point_code INTO v_pickup_code
  FROM public.pickup_points pp
  WHERE pp.id::text = (NEW.metadata->>'pickup_point_id')::text;

  -- Best-effort customer data
  v_customer_name := COALESCE(
    NEW.metadata->'shipping_address'->>'full_name',
    (SELECT p.full_name FROM public.profiles p WHERE p.id = v_customer_user_id),
    'Cliente'
  );

  v_customer_phone := COALESCE(
    NEW.metadata->'shipping_address'->>'phone',
    (SELECT p.phone FROM public.profiles p WHERE p.id = v_customer_user_id),
    NULL
  );

  -- Create link (idempotent)
  SELECT pol.id INTO v_link_id
  FROM public.po_order_links pol
  WHERE pol.order_id = NEW.id
    AND pol.order_type = v_order_type
  LIMIT 1;

  IF v_link_id IS NULL THEN
    INSERT INTO public.po_order_links (
      po_id,
      order_id,
      order_type,
      source_type,
      customer_user_id,
      customer_name,
      customer_phone,
      department_code,
      commune_code,
      pickup_point_code,
      short_order_id,
      unit_count,
      current_status
    ) VALUES (
      v_po_id,
      NEW.id,
      v_order_type,
      v_order_type,
      v_customer_user_id,
      v_customer_name,
      v_customer_phone,
      v_dept_code,
      v_comm_code,
      v_pickup_code,
      v_short_id,
      NEW.total_quantity,
      NEW.status
    )
    RETURNING id INTO v_link_id;
  ELSE
    -- Keep current status in sync
    UPDATE public.po_order_links
    SET current_status = NEW.status
    WHERE id = v_link_id;
  END IF;

  -- Create picking items (idempotent by sku per link)
  FOR v_item IN
    SELECT * FROM public.order_items_b2b WHERE order_id = NEW.id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.po_picking_items ppi
      WHERE ppi.po_order_link_id = v_link_id
        AND ppi.sku = v_item.sku
    ) THEN
      INSERT INTO public.po_picking_items (
        po_id,
        po_order_link_id,
        product_id,
        sku,
        product_name,
        quantity
      ) VALUES (
        v_po_id,
        v_link_id,
        v_item.product_id,
        v_item.sku,
        v_item.nombre,
        v_item.cantidad
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Triggers: create PO records after payment is confirmed
DROP TRIGGER IF EXISTS trg_create_po_records_for_paid_order_update ON public.orders_b2b;
CREATE TRIGGER trg_create_po_records_for_paid_order_update
  AFTER UPDATE ON public.orders_b2b
  FOR EACH ROW
  WHEN (OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.create_po_records_for_paid_order();

DROP TRIGGER IF EXISTS trg_create_po_records_for_paid_order_insert ON public.orders_b2b;
CREATE TRIGGER trg_create_po_records_for_paid_order_insert
  AFTER INSERT ON public.orders_b2b
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.create_po_records_for_paid_order();

-- Make bulk linker include status='paid' (manual/repair tool)
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
      AND o.status IN ('placed', 'confirmed', 'processing', 'paid')
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
      AND o.status IN ('placed', 'confirmed', 'processing', 'paid')
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
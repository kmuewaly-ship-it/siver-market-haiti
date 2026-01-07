-- Fix the trigger function: profiles table doesn't have phone column
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

  -- Best-effort customer data (profiles doesn't have phone)
  v_customer_name := COALESCE(
    NEW.metadata->'shipping_address'->>'full_name',
    (SELECT p.full_name FROM public.profiles p WHERE p.id = v_customer_user_id),
    'Cliente'
  );

  v_customer_phone := COALESCE(
    NEW.metadata->'shipping_address'->>'phone',
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
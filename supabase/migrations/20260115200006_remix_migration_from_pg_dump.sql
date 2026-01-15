CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user',
    'seller',
    'staff_pickup'
);


--
-- Name: approval_request_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_request_type AS ENUM (
    'kyc_verification',
    'referral_bonus',
    'credit_limit_increase',
    'credit_activation',
    'seller_upgrade'
);


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: assignment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.assignment_status AS ENUM (
    'pending',
    'accepted',
    'rejected',
    'active',
    'completed',
    'cancelled'
);


--
-- Name: match_sale_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_sale_status AS ENUM (
    'pending_payment',
    'payment_confirmed',
    'ready_pickup',
    'picked_up',
    'delivered',
    'cancelled'
);


--
-- Name: payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_method AS ENUM (
    'stripe',
    'moncash',
    'transfer'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'verified',
    'rejected'
);


--
-- Name: payment_status_order; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_order AS ENUM (
    'draft',
    'pending',
    'pending_validation',
    'paid',
    'failed',
    'expired',
    'cancelled'
);


--
-- Name: siver_match_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.siver_match_role AS ENUM (
    'investor',
    'gestor'
);


--
-- Name: stock_lot_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_lot_status AS ENUM (
    'draft',
    'published',
    'assigned',
    'in_transit',
    'in_hub',
    'active',
    'depleted',
    'cancelled'
);


--
-- Name: stock_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stock_status AS ENUM (
    'in_stock',
    'low_stock',
    'out_of_stock'
);


--
-- Name: verification_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.verification_status AS ENUM (
    'unverified',
    'pending_verification',
    'verified',
    'rejected'
);


--
-- Name: wallet_transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_transaction_status AS ENUM (
    'pending',
    'processing',
    'completed',
    'cancelled',
    'failed'
);


--
-- Name: wallet_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.wallet_transaction_type AS ENUM (
    'sale_escrow',
    'escrow_release',
    'commission_charge',
    'tax_charge',
    'withdrawal_request',
    'withdrawal_completed',
    'refund',
    'debt_compensation',
    'manual_adjustment'
);


--
-- Name: withdrawal_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.withdrawal_status AS ENUM (
    'pending',
    'approved',
    'processing',
    'completed',
    'rejected',
    'cancelled'
);


--
-- Name: assign_pickup_point_to_order(uuid, character varying, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.assign_pickup_point_to_order(p_order_id uuid, p_order_type character varying, p_customer_commune_id uuid DEFAULT NULL::uuid, p_preferred_pickup_point_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pickup_point_id UUID;
  v_commune_city TEXT;
BEGIN
  -- Si se especificó un punto preferido, usarlo
  IF p_preferred_pickup_point_id IS NOT NULL THEN
    SELECT id INTO v_pickup_point_id
    FROM pickup_points
    WHERE id = p_preferred_pickup_point_id AND is_active = true;
    
    IF v_pickup_point_id IS NOT NULL THEN
      RETURN v_pickup_point_id;
    END IF;
  END IF;
  
  -- Buscar por comuna del cliente
  IF p_customer_commune_id IS NOT NULL THEN
    SELECT c.name INTO v_commune_city
    FROM communes c
    WHERE c.id = p_customer_commune_id;
    
    -- Buscar punto en la misma ciudad
    SELECT id INTO v_pickup_point_id
    FROM pickup_points
    WHERE is_active = true
    AND LOWER(city) = LOWER(v_commune_city)
    ORDER BY created_at
    LIMIT 1;
    
    IF v_pickup_point_id IS NOT NULL THEN
      RETURN v_pickup_point_id;
    END IF;
  END IF;
  
  -- Fallback: primer punto activo
  SELECT id INTO v_pickup_point_id
  FROM pickup_points
  WHERE is_active = true
  ORDER BY created_at
  LIMIT 1;
  
  RETURN v_pickup_point_id;
END;
$$;


--
-- Name: auto_close_po(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_close_po(p_po_id uuid, p_close_reason text DEFAULT 'manual'::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: auto_link_order_to_po(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_link_order_to_po() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: calculate_cart_projected_profit(jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_cart_projected_profit(p_cart_items jsonb) RETURNS TABLE(total_investment numeric, total_pvp_value numeric, total_profit numeric, avg_roi_percent numeric, items_with_market_price integer, items_total integer)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_investment NUMERIC := 0;
  v_total_pvp NUMERIC := 0;
  v_total_profit NUMERIC := 0;
  v_items_synced INTEGER := 0;
  v_items_count INTEGER := 0;
  v_item RECORD;
  v_pvp_data RECORD;
BEGIN
  -- Iterate through cart items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(
    product_id UUID,
    sku TEXT,
    cantidad INTEGER,
    precio_b2b NUMERIC
  )
  LOOP
    v_items_count := v_items_count + 1;
    
    -- Get PVP reference for this product
    SELECT * INTO v_pvp_data FROM get_reference_pvp(v_item.product_id, v_item.sku, v_item.precio_b2b);
    
    -- Calculate totals
    v_total_investment := v_total_investment + (v_item.precio_b2b * v_item.cantidad);
    v_total_pvp := v_total_pvp + (COALESCE(v_pvp_data.pvp_reference, v_item.precio_b2b * 1.3) * v_item.cantidad);
    
    IF v_pvp_data.is_synced_with_market THEN
      v_items_synced := v_items_synced + 1;
    END IF;
  END LOOP;
  
  v_total_profit := v_total_pvp - v_total_investment;
  
  RETURN QUERY SELECT 
    v_total_investment,
    v_total_pvp,
    v_total_profit,
    CASE WHEN v_total_investment > 0 THEN ROUND((v_total_profit / v_total_investment) * 100, 1) ELSE 0 END,
    v_items_synced,
    v_items_count;
END;
$$;


--
-- Name: check_po_auto_close(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_po_auto_close() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: confirm_pickup_point_delivery(character varying, character varying, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirm_pickup_point_delivery(p_qr_code character varying, p_physical_pin character varying, p_operator_id uuid) RETURNS TABLE(success boolean, message text, delivery_id uuid, order_id uuid, escrow_release_at timestamp with time zone)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_delivery RECORD;
  v_escrow_hours INTEGER;
  v_release_at TIMESTAMPTZ;
BEGIN
  -- Buscar delivery por QR
  SELECT od.*
  INTO v_delivery
  FROM order_deliveries od
  WHERE od.customer_qr_code = p_qr_code
  AND od.status IN ('pending', 'ready')
  LIMIT 1;
  
  IF v_delivery IS NULL THEN
    RETURN QUERY SELECT false, 'Código QR no válido o pedido no disponible'::TEXT,
                        NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Validar PIN físico de la caja
  IF v_delivery.security_pin != p_physical_pin THEN
    RETURN QUERY SELECT false, 'PIN de la caja incorrecto. Verifique la etiqueta física.'::TEXT,
                        NULL::UUID, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;
  
  -- Obtener configuración de escrow
  SELECT COALESCE((value::INTEGER), 48) INTO v_escrow_hours
  FROM platform_settings
  WHERE key = 'escrow_release_hours'
  LIMIT 1;
  
  IF v_escrow_hours IS NULL THEN
    v_escrow_hours := 48;
  END IF;
  
  v_release_at := now() + (v_escrow_hours || ' hours')::INTERVAL;
  
  -- Confirmar entrega
  UPDATE order_deliveries
  SET status = 'picked_up',
      confirmed_by = p_operator_id,
      confirmed_at = now(),
      escrow_release_at = v_release_at,
      updated_at = now()
  WHERE id = v_delivery.id;
  
  RETURN QUERY SELECT true, 'Entrega confirmada exitosamente'::TEXT,
                      v_delivery.id, v_delivery.order_id, v_release_at;
END;
$$;


--
-- Name: create_order_delivery_with_assignment(uuid, character varying, character varying, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_order_delivery_with_assignment(p_order_id uuid, p_order_type character varying DEFAULT 'b2c'::character varying, p_delivery_method character varying DEFAULT 'pickup_point'::character varying, p_customer_commune_id uuid DEFAULT NULL::uuid, p_preferred_pickup_point_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_delivery_id UUID;
  v_pickup_point_id UUID;
  v_delivery_code TEXT;
BEGIN
  -- Asignar punto de entrega
  IF p_delivery_method = 'pickup_point' THEN
    v_pickup_point_id := assign_pickup_point_to_order(
      p_order_id, p_order_type, p_customer_commune_id, p_preferred_pickup_point_id
    );
  END IF;
  
  -- Generar código de delivery único
  v_delivery_code := UPPER(SUBSTRING(MD5(p_order_id::TEXT || now()::TEXT) FROM 1 FOR 8));
  
  -- Crear registro de delivery
  INSERT INTO order_deliveries (
    order_id,
    order_type,
    pickup_point_id,
    delivery_code,
    delivery_method,
    status,
    assigned_at
  ) VALUES (
    p_order_id,
    p_order_type,
    v_pickup_point_id,
    v_delivery_code,
    p_delivery_method,
    'pending',
    now()
  )
  RETURNING id INTO v_delivery_id;
  
  RETURN v_delivery_id;
END;
$$;


--
-- Name: create_po_records_for_paid_order(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_po_records_for_paid_order() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: ensure_active_po_on_startup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_active_po_on_startup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Whenever consolidation settings is activated, ensure a PO exists
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    PERFORM get_or_create_active_po();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fn_create_seller_store(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_seller_store() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_store_id UUID;
BEGIN
  -- Only process when a seller role is assigned
  IF NEW.role = 'seller' THEN
    -- Check if store already exists for this user
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE owner_user_id = NEW.user_id
    LIMIT 1;
    
    IF v_store_id IS NULL THEN
      -- Get user info from profiles
      SELECT email, full_name INTO v_user_email, v_user_name
      FROM public.profiles
      WHERE id = NEW.user_id;
      
      -- Create store for the seller
      INSERT INTO public.stores (
        owner_user_id,
        name,
        slug,
        description,
        is_active
      ) VALUES (
        NEW.user_id,
        COALESCE(v_user_name, 'Mi Tienda'),
        'tienda-' || REPLACE(NEW.user_id::TEXT, '-', ''),
        'Tienda de ' || COALESCE(v_user_name, v_user_email),
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: fn_create_seller_wallet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_create_seller_wallet() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.seller_wallets (seller_id)
  VALUES (NEW.id)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: fn_expire_pending_orders(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_expire_pending_orders() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: fn_handle_b2b_payment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_handle_b2b_payment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cart_id UUID;
  v_buyer_id UUID;
  v_store_id UUID;
  v_item RECORD;
  v_catalog_id UUID;
  v_previous_stock INTEGER;
  v_product_images JSONB;
BEGIN
  -- Solo procesar cuando el status cambia a 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Obtener el buyer_id del pedido
    v_buyer_id := NEW.seller_id; -- En orders_b2b, seller_id es el comprador mayorista
    
    -- Buscar o crear la tienda del comprador
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE owner_user_id = v_buyer_id
    LIMIT 1;
    
    IF v_store_id IS NULL THEN
      -- Crear tienda placeholder para el comprador
      INSERT INTO public.stores (owner_user_id, name, slug, description)
      VALUES (
        v_buyer_id,
        'Mi Tienda',
        'tienda-' || REPLACE(v_buyer_id::TEXT, '-', ''),
        'Tienda creada automáticamente'
      )
      RETURNING id INTO v_store_id;
    END IF;
    
    -- Procesar cada item del pedido
    FOR v_item IN 
      SELECT oi.*, p.imagen_principal, p.galeria_imagenes, p.descripcion_corta
      FROM public.order_items_b2b oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Preparar imágenes
      v_product_images := COALESCE(
        to_jsonb(ARRAY[v_item.imagen_principal] || COALESCE(v_item.galeria_imagenes, ARRAY[]::TEXT[])),
        '[]'::JSONB
      );
      
      -- Buscar si ya existe en el catálogo del seller
      SELECT id, stock INTO v_catalog_id, v_previous_stock
      FROM public.seller_catalog
      WHERE seller_store_id = v_store_id 
        AND source_product_id = v_item.product_id
      LIMIT 1;
      
      IF v_catalog_id IS NOT NULL THEN
        -- Actualizar stock existente
        UPDATE public.seller_catalog
        SET 
          stock = stock + v_item.cantidad,
          updated_at = now()
        WHERE id = v_catalog_id;
        
        -- Registrar movimiento
        INSERT INTO public.inventory_movements (
          seller_catalog_id,
          change_amount,
          previous_stock,
          new_stock,
          reason,
          reference_type,
          reference_id
        ) VALUES (
          v_catalog_id,
          v_item.cantidad,
          v_previous_stock,
          v_previous_stock + v_item.cantidad,
          'Importación por compra B2B',
          'b2b_order',
          NEW.id
        );
      ELSE
        -- Crear nueva entrada en el catálogo
        INSERT INTO public.seller_catalog (
          seller_store_id,
          source_product_id,
          source_order_id,
          sku,
          nombre,
          descripcion,
          precio_venta,
          precio_costo,
          stock,
          images
        ) VALUES (
          v_store_id,
          v_item.product_id,
          NEW.id,
          v_item.sku,
          v_item.nombre,
          v_item.descripcion_corta,
          v_item.precio_unitario * 1.3, -- Margen sugerido del 30%
          v_item.precio_unitario,
          v_item.cantidad,
          v_product_images
        )
        RETURNING id INTO v_catalog_id;
        
        -- Registrar movimiento inicial
        INSERT INTO public.inventory_movements (
          seller_catalog_id,
          change_amount,
          previous_stock,
          new_stock,
          reason,
          reference_type,
          reference_id
        ) VALUES (
          v_catalog_id,
          v_item.cantidad,
          0,
          v_item.cantidad,
          'Importación inicial por compra B2B',
          'b2b_order',
          NEW.id
        );
      END IF;
      
      -- Reducir stock del producto maestro
      UPDATE public.products
      SET stock_fisico = stock_fisico - v_item.cantidad
      WHERE id = v_item.product_id;
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: fn_notify_wallet_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_wallet_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_user_id UUID;
  v_seller_name TEXT;
BEGIN
  -- Get user_id from sellers table
  SELECT user_id INTO v_user_id FROM sellers WHERE id = NEW.seller_id;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if available_balance increased (funds released)
  IF NEW.available_balance > OLD.available_balance THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'wallet_update',
      'Fondos Liberados',
      format('Se han liberado $%s a tu saldo disponible', (NEW.available_balance - OLD.available_balance)::TEXT),
      jsonb_build_object(
        'amount', NEW.available_balance - OLD.available_balance,
        'new_balance', NEW.available_balance
      )
    );
  END IF;

  -- Check if pending balance changed
  IF NEW.pending_balance != OLD.pending_balance THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'wallet_update',
      'Saldo Pendiente Actualizado',
      format('Tu saldo pendiente ahora es $%s', NEW.pending_balance::TEXT),
      jsonb_build_object('pending_balance', NEW.pending_balance)
    );
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: fn_notify_withdrawal_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_notify_withdrawal_status() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get user_id from sellers table
  SELECT user_id INTO v_user_id FROM sellers WHERE id = NEW.seller_id;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Set message based on status
  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Retiro Aprobado';
      v_message := format('Tu solicitud de retiro por $%s ha sido aprobada', NEW.amount::TEXT);
    WHEN 'processing' THEN
      v_title := 'Retiro en Proceso';
      v_message := format('Tu retiro por $%s está siendo procesado', NEW.amount::TEXT);
    WHEN 'completed' THEN
      v_title := 'Retiro Completado';
      v_message := format('Se han transferido $%s a tu cuenta', NEW.net_amount::TEXT);
    WHEN 'rejected' THEN
      v_title := 'Retiro Rechazado';
      v_message := COALESCE(NEW.admin_notes, 'Tu solicitud de retiro fue rechazada');
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'withdrawal_status',
    v_title,
    v_message,
    jsonb_build_object(
      'withdrawal_id', NEW.id,
      'status', NEW.status,
      'amount', NEW.amount,
      'net_amount', NEW.net_amount
    )
  );

  RETURN NEW;
END;
$_$;


--
-- Name: fn_release_stock_on_failure(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_release_stock_on_failure() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: fn_reserve_stock_on_pending(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_reserve_stock_on_pending() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;


--
-- Name: fn_update_product_review_aggregates(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_update_product_review_aggregates() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_product_id UUID;
  v_avg_rating NUMERIC;
  v_count INTEGER;
BEGIN
  -- Determinar el product_id afectado
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
  ELSE
    v_product_id := NEW.product_id;
  END IF;
  
  -- Calcular nuevos agregados
  SELECT 
    COALESCE(AVG(rating)::NUMERIC(3,2), 0),
    COUNT(*)::INTEGER
  INTO v_avg_rating, v_count
  FROM public.product_reviews
  WHERE product_id = v_product_id;
  
  -- Actualizar products
  UPDATE public.products
  SET 
    rating = v_avg_rating,
    reviews_count = v_count,
    updated_at = now()
  WHERE id = v_product_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: generate_batch_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_batch_code() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.batch_code := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_consolidation_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_consolidation_number() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM purchase_consolidations;
  v_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;


--
-- Name: generate_delivery_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_delivery_code() RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DEL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM public.order_deliveries WHERE delivery_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;


--
-- Name: generate_delivery_security_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_delivery_security_codes() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_qr_code VARCHAR(6);
  v_pin VARCHAR(4);
  v_attempts INTEGER := 0;
BEGIN
  -- Generar QR code único de 6 dígitos
  LOOP
    v_qr_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM order_deliveries 
      WHERE customer_qr_code = v_qr_code 
      AND status NOT IN ('delivered', 'cancelled', 'expired')
    );
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      v_qr_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0') || SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 2);
      EXIT;
    END IF;
  END LOOP;
  
  -- Generar PIN de seguridad de 4 dígitos
  v_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  NEW.customer_qr_code := v_qr_code;
  NEW.security_pin := v_pin;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_hybrid_tracking_id(character varying, character varying, character varying, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_hybrid_tracking_id(p_dept_code character varying, p_commune_code character varying, p_point_code character varying, p_unit_count integer, p_china_tracking text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN UPPER(p_dept_code) || '-' || UPPER(p_commune_code) || '-' || UPPER(COALESCE(p_point_code, 'XX')) || '-' || LPAD(p_unit_count::TEXT, 2, '0') || '-' || p_china_tracking;
END;
$$;


--
-- Name: generate_match_sale_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_match_sale_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_date TEXT;
    v_seq INTEGER;
    v_number TEXT;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(sale_number FROM 'SM' || v_date || '(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM public.siver_match_sales
    WHERE sale_number LIKE 'SM' || v_date || '%';
    
    v_number := 'SM' || v_date || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$;


--
-- Name: generate_payment_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_payment_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_pickup_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_pickup_code() RETURNS text
    LANGUAGE sql
    AS $$
    SELECT LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0');
$$;


--
-- Name: generate_po_hybrid_tracking(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_po_hybrid_tracking(p_dept_code text, p_commune_code text, p_po_number text, p_china_tracking text, p_short_order_id text) RETURNS text
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN UPPER(COALESCE(p_dept_code, 'XX')) || 
         UPPER(COALESCE(p_commune_code, 'XX')) || '-' ||
         p_po_number || '-' ||
         COALESCE(p_china_tracking, 'NOTRACK') || '-' ||
         UPPER(p_short_order_id);
END;
$$;


--
-- Name: generate_po_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_po_number() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: generate_po_pickup_qr(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_po_pickup_qr(p_order_link_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: generate_quote_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_number() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.quote_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Solo generar código para sellers verificados
  IF NEW.status = 'verified' AND (OLD IS NULL OR OLD.status != 'verified') THEN
    -- Generar código único
    new_code := 'SIVER' || UPPER(SUBSTRING(MD5(NEW.user_id::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    
    -- Insertar código si no existe
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.user_id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: get_consolidation_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_consolidation_stats() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_or_create_active_po(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_or_create_active_po() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_reference_pvp(uuid, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_reference_pvp(p_product_id uuid, p_product_sku text DEFAULT NULL::text, p_fallback_price numeric DEFAULT NULL::numeric) RETURNS TABLE(pvp_reference numeric, pvp_source text, num_b2c_sellers integer, min_market_price numeric, max_market_price numeric, is_synced_with_market boolean)
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_b2c_data RECORD;
  v_product_suggested NUMERIC;
  v_wholesale_price NUMERIC;
BEGIN
  -- Get B2C market data by product_id or SKU
  SELECT 
    bmp.max_b2c_price,
    bmp.min_b2c_price,
    bmp.num_sellers::INTEGER
  INTO v_b2c_data
  FROM b2c_max_prices bmp
  WHERE bmp.source_product_id = p_product_id
     OR (p_product_sku IS NOT NULL AND bmp.sku = p_product_sku)
  ORDER BY bmp.max_b2c_price DESC NULLS LAST
  LIMIT 1;
  
  -- Get product's suggested price and wholesale price
  SELECT p.precio_sugerido_venta, p.precio_mayorista
  INTO v_product_suggested, v_wholesale_price
  FROM products p
  WHERE p.id = p_product_id;
  
  -- Determine PVP source and value
  IF v_b2c_data.max_b2c_price IS NOT NULL AND v_b2c_data.max_b2c_price > 0 THEN
    -- Market price available
    RETURN QUERY SELECT 
      v_b2c_data.max_b2c_price,
      'market'::TEXT,
      v_b2c_data.num_sellers,
      v_b2c_data.min_b2c_price,
      v_b2c_data.max_b2c_price,
      true;
  ELSIF v_product_suggested IS NOT NULL AND v_product_suggested > 0 THEN
    -- Use admin-defined suggested price
    RETURN QUERY SELECT 
      v_product_suggested,
      'admin'::TEXT,
      0::INTEGER,
      v_product_suggested,
      v_product_suggested,
      false;
  ELSIF p_fallback_price IS NOT NULL AND p_fallback_price > 0 THEN
    -- Use provided fallback
    RETURN QUERY SELECT 
      ROUND(p_fallback_price * 1.3, 2),
      'calculated'::TEXT,
      0::INTEGER,
      ROUND(p_fallback_price * 1.3, 2),
      ROUND(p_fallback_price * 1.3, 2),
      false;
  ELSIF v_wholesale_price IS NOT NULL AND v_wholesale_price > 0 THEN
    -- Calculate 30% margin from wholesale
    RETURN QUERY SELECT 
      ROUND(v_wholesale_price * 1.3, 2),
      'calculated'::TEXT,
      0::INTEGER,
      ROUND(v_wholesale_price * 1.3, 2),
      ROUND(v_wholesale_price * 1.3, 2),
      false;
  ELSE
    -- No reference available
    RETURN QUERY SELECT 
      0::NUMERIC,
      'none'::TEXT,
      0::INTEGER,
      0::NUMERIC,
      0::NUMERIC,
      false;
  END IF;
END;
$$;


--
-- Name: get_trending_products(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_trending_products(days_back integer DEFAULT 7, limit_count integer DEFAULT 20) RETURNS TABLE(product_id uuid, view_count bigint, product_data jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.product_id,
    COUNT(pv.id) as view_count,
    jsonb_build_object(
      'id', p.id,
      'nombre', p.nombre,
      'precio_mayorista', p.precio_mayorista,
      'precio_sugerido_venta', p.precio_sugerido_venta,
      'imagen_principal', p.imagen_principal,
      'categoria_id', p.categoria_id,
      'sku_interno', p.sku_interno,
      'stock_status', p.stock_status
    ) as product_data
  FROM product_views pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.viewed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND p.is_active = true
  GROUP BY pv.product_id, p.id, p.nombre, p.precio_mayorista, p.precio_sugerido_venta, 
           p.imagen_principal, p.categoria_id, p.sku_interno, p.stock_status
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Crear perfil
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email)
  );
  
  -- Asignar rol 'user' por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_profile(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_profile() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Insertar rol 'user' por defecto para el nuevo usuario
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_order_cancellation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_order_cancellation() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


--
-- Name: is_promo_active(boolean, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_promo_active(p_promo_active boolean, p_promo_starts_at timestamp with time zone, p_promo_ends_at timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN p_promo_active = true 
    AND (p_promo_starts_at IS NULL OR p_promo_starts_at <= now())
    AND (p_promo_ends_at IS NULL OR p_promo_ends_at > now());
END;
$$;


--
-- Name: is_seller(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_seller(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'seller')
$$;


--
-- Name: link_mixed_orders_to_po(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_mixed_orders_to_po(p_po_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: link_orders_to_po(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.link_orders_to_po(p_po_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


SET default_table_access_method = heap;

--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sku_interno text NOT NULL,
    nombre text NOT NULL,
    descripcion_corta text,
    descripcion_larga text,
    categoria_id uuid,
    proveedor_id uuid,
    precio_mayorista numeric(10,2) DEFAULT 0 NOT NULL,
    precio_sugerido_venta numeric(10,2),
    moq integer DEFAULT 1 NOT NULL,
    stock_fisico integer DEFAULT 0 NOT NULL,
    stock_status public.stock_status DEFAULT 'in_stock'::public.stock_status NOT NULL,
    peso_kg numeric(6,3),
    dimensiones_cm jsonb,
    imagen_principal text,
    galeria_imagenes text[],
    url_origen text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(512),
    costo_base_excel numeric DEFAULT 0,
    precio_promocional numeric,
    promo_active boolean DEFAULT false,
    promo_starts_at timestamp with time zone,
    promo_ends_at timestamp with time zone,
    currency_code text DEFAULT 'USD'::text,
    rating numeric DEFAULT 0,
    reviews_count integer DEFAULT 0,
    is_parent boolean DEFAULT false,
    parent_product_id uuid
);


--
-- Name: match_products(public.vector, double precision, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_products(query_embedding public.vector, match_threshold double precision, match_count integer) RETURNS SETOF public.products
    LANGUAGE plpgsql
    AS $$
begin
  return query
  select *
  from products
  where 1 - (products.embedding <=> query_embedding) > match_threshold
  order by products.embedding <=> query_embedding
  limit match_count;
end;
$$;


--
-- Name: process_delivery_wallet_splits(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_delivery_wallet_splits(p_po_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: process_mixed_po_china_tracking(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_mixed_po_china_tracking(p_po_id uuid, p_china_tracking text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: process_po_china_tracking(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_po_china_tracking(p_po_id uuid, p_china_tracking text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: process_siver_match_wallet_split(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_siver_match_wallet_split(p_sale_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    v_sale RECORD;
    v_investor_wallet_id UUID;
    v_gestor_wallet_id UUID;
BEGIN
    -- Get sale details
    SELECT * INTO v_sale FROM public.siver_match_sales WHERE id = p_sale_id;
    
    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;
    
    IF v_sale.status != 'delivered' THEN
        RAISE EXCEPTION 'Sale not yet delivered';
    END IF;
    
    -- Check if already processed
    IF EXISTS (SELECT 1 FROM public.siver_match_wallet_splits WHERE sale_id = p_sale_id AND is_processed = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- Get or create wallets
    SELECT sw.id INTO v_investor_wallet_id
    FROM public.seller_wallets sw
    JOIN public.siver_match_profiles smp ON smp.user_id = sw.seller_id
    WHERE smp.id = v_sale.investor_id;
    
    SELECT sw.id INTO v_gestor_wallet_id
    FROM public.seller_wallets sw
    JOIN public.siver_match_profiles smp ON smp.user_id = sw.seller_id
    WHERE smp.id = v_sale.gestor_id;
    
    -- Record the split
    INSERT INTO public.siver_match_wallet_splits (
        sale_id,
        total_received,
        investor_amount,
        gestor_amount,
        siver_amount,
        is_processed,
        processed_at
    ) VALUES (
        p_sale_id,
        v_sale.total_amount,
        v_sale.investor_amount,
        v_sale.gestor_commission,
        v_sale.siver_fee,
        TRUE,
        NOW()
    );
    
    RETURN TRUE;
END;
$$;


--
-- Name: process_withdrawal_completion(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_withdrawal_completion(p_withdrawal_id uuid, p_action text, p_admin_notes text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_withdrawal withdrawal_requests;
  v_wallet seller_wallets;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify action is valid
  IF p_action NOT IN ('approved', 'rejected', 'completed') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
  
  -- Get withdrawal details with lock
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;
  
  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = p_action,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    processed_by = CASE WHEN p_action IN ('completed', 'rejected') THEN v_user_id ELSE processed_by END,
    processed_at = CASE WHEN p_action IN ('completed', 'rejected') THEN now() ELSE processed_at END,
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  -- If completed, update wallet balance atomically
  IF p_action = 'completed' THEN
    UPDATE seller_wallets
    SET 
      available_balance = available_balance - v_withdrawal.net_amount,
      total_withdrawn = total_withdrawn + v_withdrawal.net_amount,
      updated_at = now()
    WHERE id = v_withdrawal.wallet_id;
    
    -- Verify the update was successful
    GET DIAGNOSTICS v_user_id = ROW_COUNT;
    IF v_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
      RAISE EXCEPTION 'Failed to update wallet balance';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'action', p_action,
    'processed_at', now()
  );
END;
$$;


--
-- Name: track_catalog_click(uuid, uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_catalog_click(p_seller_id uuid, p_product_id uuid, p_variant_id uuid DEFAULT NULL::uuid, p_source_type text DEFAULT 'pdf'::text) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE v_id UUID;
BEGIN INSERT INTO public.catalog_click_tracking (seller_id, product_id, variant_id, source_type) VALUES (p_seller_id, p_product_id, p_variant_id, COALESCE(p_source_type, 'pdf')) RETURNING id INTO v_id; RETURN v_id;
END; $$;


--
-- Name: trigger_delivery_notification(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trigger_delivery_notification() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Solo cuando cambia a 'picked_up' (entregado)
  IF NEW.status = 'picked_up' AND (OLD.status IS NULL OR OLD.status != 'picked_up') THEN
    -- Insertar notificación para el cliente
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    )
    SELECT 
      CASE 
        WHEN NEW.order_type = 'b2c' THEN (SELECT buyer_id FROM orders_b2c WHERE id = NEW.order_id)
        ELSE (SELECT buyer_user_id FROM orders_b2b WHERE id = NEW.order_id)
      END,
      'delivery_confirmed',
      '📦 ¡Tu pedido ha sido entregado!',
      'Tu paquete fue recogido exitosamente. Por favor califica tu experiencia.',
      jsonb_build_object(
        'order_id', NEW.order_id,
        'order_type', NEW.order_type,
        'delivery_id', NEW.id,
        'confirmed_at', NEW.confirmed_at
      )
    WHERE CASE 
        WHEN NEW.order_type = 'b2c' THEN EXISTS (SELECT 1 FROM orders_b2c WHERE id = NEW.order_id)
        ELSE EXISTS (SELECT 1 FROM orders_b2b WHERE id = NEW.order_id)
      END;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_asset_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_asset_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_consolidation_settings(text, integer, integer, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_consolidation_settings(p_mode text DEFAULT NULL::text, p_time_hours integer DEFAULT NULL::integer, p_quantity_threshold integer DEFAULT NULL::integer, p_is_active boolean DEFAULT NULL::boolean) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_mixed_po_logistics_stage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_mixed_po_logistics_stage(p_po_id uuid, p_new_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_po_logistics_stage(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_po_logistics_stage(p_po_id uuid, p_new_status text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: update_siver_match_profile_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_siver_match_profile_stats() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    -- Update gestor stats
    UPDATE public.siver_match_profiles
    SET 
        total_sales_count = (
            SELECT COUNT(*) FROM public.siver_match_sales 
            WHERE gestor_id = NEW.gestor_id AND status = 'delivered'
        ),
        total_sales_amount = (
            SELECT COALESCE(SUM(total_amount), 0) FROM public.siver_match_sales 
            WHERE gestor_id = NEW.gestor_id AND status = 'delivered'
        ),
        updated_at = NOW()
    WHERE id = NEW.gestor_id;
    
    -- Update investor stats
    UPDATE public.siver_match_profiles
    SET 
        total_sales_count = (
            SELECT COUNT(*) FROM public.siver_match_sales 
            WHERE investor_id = NEW.investor_id AND status = 'delivered'
        ),
        total_sales_amount = (
            SELECT COALESCE(SUM(total_amount), 0) FROM public.siver_match_sales 
            WHERE investor_id = NEW.investor_id AND status = 'delivered'
        ),
        updated_at = NOW()
    WHERE id = NEW.investor_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_siver_match_rating(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_siver_match_rating() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    UPDATE public.siver_match_profiles
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0) FROM public.siver_match_reviews 
            WHERE reviewed_profile_id = NEW.reviewed_profile_id
        ),
        total_reviews = (
            SELECT COUNT(*) FROM public.siver_match_reviews 
            WHERE reviewed_profile_id = NEW.reviewed_profile_id
        ),
        updated_at = NOW()
    WHERE id = NEW.reviewed_profile_id;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_stock_status(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_stock_status() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.stock_fisico = 0 THEN
    NEW.stock_status := 'out_of_stock';
  ELSIF NEW.stock_fisico < NEW.moq THEN
    NEW.stock_status := 'low_stock';
  ELSE
    NEW.stock_status := 'in_stock';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: validate_courier_delivery(character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_courier_delivery(p_qr_code character varying, p_security_pin character varying) RETURNS TABLE(success boolean, message text, delivery_id uuid, hybrid_tracking_id text, order_id uuid, pickup_point_name text)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_delivery RECORD;
  v_tracking TEXT;
BEGIN
  -- Buscar delivery por QR
  SELECT od.*, pp.name as point_name
  INTO v_delivery
  FROM order_deliveries od
  LEFT JOIN pickup_points pp ON od.pickup_point_id = pp.id
  WHERE od.customer_qr_code = p_qr_code
  AND od.status IN ('pending', 'ready', 'in_transit')
  LIMIT 1;
  
  IF v_delivery IS NULL THEN
    RETURN QUERY SELECT false, 'Código QR no encontrado o pedido ya entregado'::TEXT, 
                        NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Validar PIN
  IF v_delivery.security_pin != p_security_pin THEN
    RETURN QUERY SELECT false, 'PIN de seguridad incorrecto'::TEXT,
                        NULL::UUID, NULL::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Obtener hybrid tracking ID
  SELECT st.hybrid_tracking_id INTO v_tracking
  FROM shipment_tracking st
  WHERE st.order_id = v_delivery.order_id
  LIMIT 1;
  
  -- Marcar tracking como revelado
  UPDATE order_deliveries
  SET hybrid_tracking_revealed = true,
      hybrid_tracking_revealed_at = now(),
      updated_at = now()
  WHERE id = v_delivery.id;
  
  RETURN QUERY SELECT true, 'Validación exitosa'::TEXT,
                      v_delivery.id, v_tracking, v_delivery.order_id, v_delivery.point_name;
END;
$$;


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    label text DEFAULT 'Casa'::text NOT NULL,
    full_name text NOT NULL,
    phone text,
    street_address text NOT NULL,
    city text NOT NULL,
    state text,
    postal_code text,
    country text DEFAULT 'Haiti'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferred_pickup_point_id uuid
);


--
-- Name: admin_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_type public.approval_request_type NOT NULL,
    requester_id uuid NOT NULL,
    status public.approval_status DEFAULT 'pending'::public.approval_status NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    amount numeric,
    admin_comments text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_banners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_banners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    image_url text NOT NULL,
    link_url text,
    target_audience text DEFAULT 'all'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone,
    ends_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: asset_processing_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_processing_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    sku_interno text NOT NULL,
    original_url text NOT NULL,
    storage_path text,
    public_url text,
    status text DEFAULT 'pending'::text NOT NULL,
    error_message text,
    retry_count integer DEFAULT 0 NOT NULL,
    row_index integer NOT NULL,
    CONSTRAINT asset_processing_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: asset_processing_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_processing_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    total_assets integer DEFAULT 0 NOT NULL,
    processed_assets integer DEFAULT 0 NOT NULL,
    failed_assets integer DEFAULT 0 NOT NULL,
    user_id uuid,
    metadata jsonb,
    CONSTRAINT asset_processing_jobs_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: attribute_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_options (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    attribute_id uuid NOT NULL,
    value text NOT NULL,
    display_value text NOT NULL,
    color_hex text,
    image_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: attributes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attributes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    display_name text NOT NULL,
    attribute_type text DEFAULT 'select'::text NOT NULL,
    render_type text DEFAULT 'chips'::text NOT NULL,
    category_hint text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: b2b_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2b_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_code text NOT NULL,
    order_id uuid,
    supplier_id uuid,
    purchase_date timestamp with time zone DEFAULT now(),
    total_quantity integer DEFAULT 0 NOT NULL,
    total_cost numeric DEFAULT 0 NOT NULL,
    notes text,
    status text DEFAULT 'active'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: b2b_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2b_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id uuid,
    sku text NOT NULL,
    nombre text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    total_price numeric(12,2) NOT NULL,
    color text,
    size text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    image text,
    CONSTRAINT b2b_cart_items_quantity_check CHECK ((quantity > 0))
);


--
-- Name: b2b_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2b_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_user_id uuid NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT b2b_carts_status_check CHECK ((status = ANY (ARRAY['open'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: b2b_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2b_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_number text NOT NULL,
    seller_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    method public.payment_method NOT NULL,
    reference text NOT NULL,
    status public.payment_status DEFAULT 'pending'::public.payment_status NOT NULL,
    notes text,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: b2c_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2c_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    seller_catalog_id uuid,
    sku text NOT NULL,
    nombre text NOT NULL,
    unit_price numeric NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    total_price numeric NOT NULL,
    image text,
    store_id uuid,
    store_name text,
    store_whatsapp text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: b2c_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.b2c_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: seller_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_store_id uuid NOT NULL,
    source_product_id uuid,
    source_order_id uuid,
    sku text NOT NULL,
    nombre text NOT NULL,
    descripcion text,
    precio_venta numeric(12,2) DEFAULT 0 NOT NULL,
    precio_costo numeric(12,2) DEFAULT 0 NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    images jsonb DEFAULT '[]'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    imported_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: b2c_max_prices; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.b2c_max_prices AS
 SELECT source_product_id,
    sku,
    max(precio_venta) AS max_b2c_price,
    count(DISTINCT seller_store_id) AS num_sellers,
    min(precio_venta) AS min_b2c_price,
    avg(precio_venta) AS avg_b2c_price
   FROM public.seller_catalog sc
  WHERE ((is_active = true) AND (precio_venta > (0)::numeric))
  GROUP BY source_product_id, sku;


--
-- Name: batch_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    variant_id uuid NOT NULL,
    quantity_purchased integer DEFAULT 0 NOT NULL,
    quantity_sold integer DEFAULT 0,
    quantity_available integer GENERATED ALWAYS AS ((quantity_purchased - quantity_sold)) STORED,
    unit_cost numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: catalog_click_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_click_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid,
    product_id uuid,
    variant_id uuid,
    source_type text DEFAULT 'pdf'::text,
    source_campaign text,
    ip_hash text,
    user_agent text,
    device_type text,
    clicked_at timestamp with time zone DEFAULT now(),
    converted_to_cart boolean DEFAULT false,
    converted_at timestamp with time zone
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_visible_public boolean DEFAULT true NOT NULL,
    description text,
    icon text,
    sort_order integer DEFAULT 0
);


--
-- Name: category_attribute_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_attribute_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    attribute_name text NOT NULL,
    attribute_display_name text NOT NULL,
    attribute_type text DEFAULT 'text'::text,
    render_type text DEFAULT 'select'::text,
    suggested_values text[],
    is_required boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: category_shipping_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_shipping_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    fixed_fee numeric(10,2) DEFAULT 0 NOT NULL,
    percentage_fee numeric(5,2) DEFAULT 0 NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: commission_debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commission_debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    wallet_id uuid,
    order_id uuid,
    order_type text,
    payment_method text NOT NULL,
    sale_amount numeric NOT NULL,
    commission_amount numeric NOT NULL,
    tax_amount numeric DEFAULT 0,
    total_debt numeric NOT NULL,
    is_paid boolean DEFAULT false,
    paid_at timestamp with time zone,
    paid_from_wallet boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT commission_debts_order_type_check CHECK ((order_type = ANY (ARRAY['b2b'::text, 'b2c'::text])))
);


--
-- Name: communes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.communes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid NOT NULL,
    code character varying(2) NOT NULL,
    name text NOT NULL,
    rate_per_lb numeric(10,4) DEFAULT 0 NOT NULL,
    extra_department_fee numeric(10,2) DEFAULT 0 NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0 NOT NULL,
    operational_fee numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: consolidation_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consolidation_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    is_active boolean DEFAULT true,
    consolidation_mode text DEFAULT 'hybrid'::text,
    time_interval_hours integer DEFAULT 48,
    order_quantity_threshold integer DEFAULT 50,
    last_auto_close_at timestamp with time zone,
    next_scheduled_close_at timestamp with time zone,
    notify_on_close boolean DEFAULT true,
    notify_threshold_percent integer DEFAULT 80,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT consolidation_settings_consolidation_mode_check CHECK ((consolidation_mode = ANY (ARRAY['time'::text, 'quantity'::text, 'hybrid'::text])))
);


--
-- Name: credit_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    movement_type text NOT NULL,
    amount numeric NOT NULL,
    balance_before numeric NOT NULL,
    balance_after numeric NOT NULL,
    reference_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_discounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_discounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_user_id uuid NOT NULL,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    reason text,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    store_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT customer_discounts_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text]))),
    CONSTRAINT customer_discounts_discount_value_check CHECK ((discount_value > (0)::numeric))
);


--
-- Name: delivery_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_delivery_id uuid,
    order_id uuid NOT NULL,
    order_type character varying(10) DEFAULT 'b2c'::character varying,
    customer_user_id uuid NOT NULL,
    product_rating integer,
    product_comment text,
    delivery_rating integer,
    delivery_comment text,
    rated_at timestamp with time zone DEFAULT now(),
    is_anonymous boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT delivery_ratings_delivery_rating_check CHECK (((delivery_rating >= 1) AND (delivery_rating <= 5))),
    CONSTRAINT delivery_ratings_product_rating_check CHECK (((product_rating >= 1) AND (product_rating <= 5)))
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(2) NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_code_uses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_code_uses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    discount_code_id uuid NOT NULL,
    user_id uuid NOT NULL,
    order_id uuid,
    discount_applied numeric NOT NULL,
    used_at timestamp with time zone DEFAULT now()
);


--
-- Name: discount_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    min_purchase_amount numeric DEFAULT 0,
    max_uses integer,
    used_count integer DEFAULT 0,
    max_uses_per_user integer DEFAULT 1,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_active boolean DEFAULT true,
    created_by uuid NOT NULL,
    store_id uuid,
    applies_to text DEFAULT 'all'::text,
    applicable_ids uuid[] DEFAULT ARRAY[]::uuid[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT discount_codes_applies_to_check CHECK ((applies_to = ANY (ARRAY['all'::text, 'specific_products'::text, 'specific_categories'::text]))),
    CONSTRAINT discount_codes_discount_type_check CHECK ((discount_type = ANY (ARRAY['percentage'::text, 'fixed_amount'::text]))),
    CONSTRAINT discount_codes_discount_value_check CHECK ((discount_value > (0)::numeric))
);


--
-- Name: dynamic_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nombre_gasto text NOT NULL,
    valor numeric DEFAULT 0 NOT NULL,
    tipo text NOT NULL,
    operacion text NOT NULL,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT dynamic_expenses_operacion_check CHECK ((operacion = ANY (ARRAY['suma'::text, 'resta'::text]))),
    CONSTRAINT dynamic_expenses_tipo_check CHECK ((tipo = ANY (ARRAY['fijo'::text, 'porcentual'::text])))
);


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    seller_catalog_id uuid,
    change_amount integer NOT NULL,
    previous_stock integer,
    new_stock integer,
    reason text NOT NULL,
    reference_type text,
    reference_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: kyc_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kyc_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status public.verification_status DEFAULT 'unverified'::public.verification_status NOT NULL,
    id_front_url text,
    id_back_url text,
    fiscal_document_url text,
    submitted_at timestamp with time zone,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    admin_comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_section_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_section_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_key text NOT NULL,
    title text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    item_limit integer DEFAULT 10 NOT NULL,
    display_mode text DEFAULT 'carousel'::text,
    custom_config jsonb DEFAULT '{}'::jsonb,
    target_audience text DEFAULT 'all'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: master_purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_number text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    cycle_start_at timestamp with time zone DEFAULT now() NOT NULL,
    cycle_end_at timestamp with time zone,
    closed_at timestamp with time zone,
    china_tracking_number text,
    china_tracking_entered_at timestamp with time zone,
    total_orders integer DEFAULT 0,
    total_items integer DEFAULT 0,
    total_quantity integer DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    shipped_from_china_at timestamp with time zone,
    arrived_usa_at timestamp with time zone,
    shipped_to_haiti_at timestamp with time zone,
    arrived_hub_at timestamp with time zone,
    created_by uuid,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    auto_close_at timestamp with time zone,
    close_reason text,
    orders_at_close integer DEFAULT 0,
    CONSTRAINT master_purchase_orders_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'open'::text, 'closed'::text, 'ordered'::text, 'in_transit_china'::text, 'in_transit_usa'::text, 'arrived_hub'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb DEFAULT '{}'::jsonb,
    is_read boolean DEFAULT false NOT NULL,
    is_email_sent boolean DEFAULT false NOT NULL,
    is_whatsapp_sent boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    read_at timestamp with time zone,
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['wallet_update'::text, 'commission_change'::text, 'withdrawal_status'::text, 'order_delivery'::text, 'general'::text, 'system'::text])))
);


--
-- Name: order_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_type text NOT NULL,
    pickup_point_id uuid,
    delivery_code text NOT NULL,
    qr_code_data text,
    status text DEFAULT 'pending'::text NOT NULL,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    escrow_release_at timestamp with time zone,
    funds_released boolean DEFAULT false,
    funds_released_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    customer_qr_code character varying(6),
    security_pin character varying(4),
    delivery_method character varying(20) DEFAULT 'pickup_point'::character varying,
    hybrid_tracking_revealed boolean DEFAULT false,
    hybrid_tracking_revealed_at timestamp with time zone,
    assigned_at timestamp with time zone DEFAULT now(),
    notification_sent_at timestamp with time zone,
    notification_channel character varying(20),
    CONSTRAINT order_deliveries_order_type_check CHECK ((order_type = ANY (ARRAY['b2b'::text, 'b2c'::text]))),
    CONSTRAINT order_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'ready'::text, 'picked_up'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: order_items_b2b; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items_b2b (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    sku text NOT NULL,
    nombre text NOT NULL,
    cantidad integer NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    descuento_percent numeric(5,2) DEFAULT 0.00,
    subtotal numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_refunds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_refunds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    status character varying(50) DEFAULT 'requested'::character varying NOT NULL,
    amount numeric DEFAULT 0 NOT NULL,
    reason text,
    requested_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: order_stock_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_stock_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    order_type text DEFAULT 'b2c'::text NOT NULL,
    product_id uuid,
    variant_id uuid,
    sku text NOT NULL,
    quantity_ordered integer NOT NULL,
    quantity_from_haiti integer DEFAULT 0,
    quantity_from_transit integer DEFAULT 0,
    quantity_pending_purchase integer DEFAULT 0,
    transit_stock_id uuid,
    allocation_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: orders_b2b; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders_b2b (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    buyer_id uuid,
    status text DEFAULT 'draft'::text NOT NULL,
    total_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_quantity integer DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    payment_method text,
    notes text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_status text DEFAULT 'draft'::text,
    checkout_session_id uuid,
    reserved_at timestamp with time zone,
    reservation_expires_at timestamp with time zone,
    stock_reserved boolean DEFAULT false,
    payment_confirmed_at timestamp with time zone,
    po_id uuid,
    po_linked_at timestamp with time zone,
    consolidation_status text DEFAULT 'pending'::text
);


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid,
    method_type text NOT NULL,
    is_active boolean DEFAULT true,
    display_name text,
    bank_name text,
    account_type text,
    account_number text,
    account_holder text,
    bank_swift text,
    phone_number text,
    holder_name text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    manual_enabled boolean DEFAULT true,
    automatic_enabled boolean DEFAULT false,
    CONSTRAINT payment_methods_method_type_check CHECK ((method_type = ANY (ARRAY['bank'::text, 'moncash'::text, 'natcash'::text, 'stripe'::text]))),
    CONSTRAINT payment_methods_owner_type_check CHECK ((owner_type = ANY (ARRAY['admin'::text, 'seller'::text, 'store'::text])))
);


--
-- Name: pending_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    quote_number text NOT NULL,
    cart_snapshot jsonb NOT NULL,
    total_amount numeric DEFAULT 0 NOT NULL,
    total_quantity integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    seller_notes text,
    whatsapp_sent_at timestamp with time zone,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pickup_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_points (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    address text NOT NULL,
    city text NOT NULL,
    country text DEFAULT 'Haiti'::text,
    phone text,
    manager_user_id uuid,
    is_active boolean DEFAULT true,
    operating_hours jsonb DEFAULT '{}'::jsonb,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    latitude numeric(10,8),
    longitude numeric(11,8),
    point_code character varying(4)
);


--
-- Name: shipment_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipment_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hybrid_tracking_id text NOT NULL,
    china_tracking_number text NOT NULL,
    order_id uuid,
    order_type text DEFAULT 'b2c'::text,
    department_id uuid,
    commune_id uuid,
    pickup_point_id uuid,
    unit_count integer DEFAULT 1 NOT NULL,
    customer_name text,
    customer_phone text,
    weight_grams numeric(10,2),
    reference_price numeric(10,2),
    shipping_cost_china_usa numeric(10,2),
    shipping_cost_usa_haiti numeric(10,2),
    category_fees numeric(10,2),
    total_shipping_cost numeric(10,2),
    status text DEFAULT 'pending'::text,
    label_printed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: pickup_point_pending_deliveries; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.pickup_point_pending_deliveries AS
 SELECT od.id AS delivery_id,
    od.order_id,
    od.order_type,
    od.customer_qr_code,
    od.security_pin,
    od.status,
    od.delivery_method,
    od.assigned_at,
    pp.id AS pickup_point_id,
    pp.name AS pickup_point_name,
    pp.address AS pickup_point_address,
    st.hybrid_tracking_id,
    st.customer_name,
    st.customer_phone,
    st.unit_count
   FROM ((public.order_deliveries od
     JOIN public.pickup_points pp ON ((od.pickup_point_id = pp.id)))
     LEFT JOIN public.shipment_tracking st ON ((od.order_id = st.order_id)))
  WHERE ((od.status = ANY (ARRAY['pending'::text, 'ready'::text])) AND (pp.is_active = true));


--
-- Name: pickup_point_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pickup_point_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    pickup_point_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: po_order_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_order_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    order_id uuid NOT NULL,
    order_type text NOT NULL,
    customer_user_id uuid,
    customer_name text,
    customer_phone text,
    department_code text,
    commune_code text,
    pickup_point_code text,
    hybrid_tracking_id text,
    short_order_id text,
    unit_count integer DEFAULT 1,
    previous_status text,
    current_status text,
    status_synced_at timestamp with time zone,
    pickup_qr_code text,
    pickup_qr_generated_at timestamp with time zone,
    delivery_confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    source_type text DEFAULT 'b2c'::text,
    siver_match_sale_id uuid,
    investor_user_id uuid,
    gestor_user_id uuid,
    CONSTRAINT po_order_links_order_type_check CHECK ((order_type = ANY (ARRAY['b2b'::text, 'b2c'::text]))),
    CONSTRAINT po_order_links_source_type_check CHECK ((source_type = ANY (ARRAY['b2b'::text, 'b2c'::text, 'siver_match'::text])))
);


--
-- Name: po_picking_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.po_picking_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    po_id uuid NOT NULL,
    po_order_link_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    sku text NOT NULL,
    product_name text NOT NULL,
    color text,
    size text,
    image_url text,
    quantity integer DEFAULT 1 NOT NULL,
    bin_location text,
    picked_at timestamp with time zone,
    picked_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: price_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value numeric DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    attribute_id uuid NOT NULL,
    attribute_option_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: product_eta_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.product_eta_view AS
 SELECT id AS product_id,
    sku_interno,
    nombre,
    stock_fisico,
        CASE
            WHEN (COALESCE(stock_fisico, 0) > 0) THEN 'inmediato'::text
            ELSE '14-21 días'::text
        END AS eta_display,
        CASE
            WHEN (COALESCE(stock_fisico, 0) > 0) THEN 0
            ELSE 21
        END AS eta_days_min
   FROM public.products p
  WHERE (is_active = true);


--
-- Name: product_migration_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_migration_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_product_id uuid,
    new_variant_id uuid,
    parent_sku text NOT NULL,
    migrated_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'completed'::text
);


--
-- Name: product_price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    campo_modificado text NOT NULL,
    valor_anterior text,
    valor_nuevo text,
    modificado_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer,
    title text,
    comment text,
    is_verified_purchase boolean DEFAULT false,
    is_anonymous boolean DEFAULT false,
    helpful_count integer DEFAULT 0,
    images jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    parent_review_id uuid,
    CONSTRAINT product_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: product_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku text NOT NULL,
    name text NOT NULL,
    option_type text NOT NULL,
    option_value text NOT NULL,
    price numeric,
    precio_promocional numeric,
    stock integer DEFAULT 0 NOT NULL,
    moq integer DEFAULT 1 NOT NULL,
    images jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    batch_id uuid,
    attribute_combination jsonb DEFAULT '{}'::jsonb,
    stock_b2c integer DEFAULT 0,
    cost_price numeric DEFAULT 0,
    price_adjustment numeric DEFAULT 0
);


--
-- Name: product_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid,
    session_id text,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'direct'::text
);


--
-- Name: products_b2b_enriched; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.products_b2b_enriched AS
 SELECT p.id,
    p.sku_interno,
    p.nombre,
    p.precio_mayorista,
    p.precio_sugerido_venta,
    p.stock_fisico,
    p.moq,
    p.imagen_principal,
    p.categoria_id,
    p.is_active,
    p.created_at,
    COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, round((p.precio_mayorista * 1.3), 2)) AS pvp_reference,
        CASE
            WHEN (bmp.max_b2c_price IS NOT NULL) THEN 'market'::text
            WHEN (p.precio_sugerido_venta IS NOT NULL) THEN 'admin'::text
            ELSE 'calculated'::text
        END AS pvp_source,
    COALESCE(bmp.num_sellers, (0)::bigint) AS num_b2c_sellers,
    bmp.min_b2c_price,
    bmp.max_b2c_price,
    (COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, round((p.precio_mayorista * 1.3), 2)) - p.precio_mayorista) AS profit_amount,
        CASE
            WHEN (p.precio_mayorista > (0)::numeric) THEN round((((COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, round((p.precio_mayorista * 1.3), 2)) - p.precio_mayorista) / p.precio_mayorista) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS roi_percent,
    (bmp.max_b2c_price IS NOT NULL) AS is_market_synced
   FROM (public.products p
     LEFT JOIN public.b2c_max_prices bmp ON ((bmp.source_product_id = p.id)))
  WHERE (p.is_active = true);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    banner_url text
);


--
-- Name: purchase_consolidation_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_consolidation_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consolidation_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    sku text NOT NULL,
    product_name text NOT NULL,
    color text,
    size text,
    quantity_confirmed integer DEFAULT 0,
    quantity_pending integer DEFAULT 0,
    quantity_cart integer DEFAULT 0,
    quantity_in_stock integer DEFAULT 0,
    quantity_in_transit integer DEFAULT 0,
    quantity_to_order integer DEFAULT 0,
    unit_cost numeric(10,2) DEFAULT 0,
    total_cost numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: purchase_consolidations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_consolidations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    consolidation_number text NOT NULL,
    status text DEFAULT 'draft'::text,
    total_items integer DEFAULT 0,
    total_quantity integer DEFAULT 0,
    estimated_cost numeric(12,2) DEFAULT 0,
    supplier_id uuid,
    notes text,
    submitted_at timestamp with time zone,
    ordered_at timestamp with time zone,
    received_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bonus_per_referral numeric DEFAULT 20 NOT NULL,
    referrals_for_credit_increase integer DEFAULT 5 NOT NULL,
    credit_increase_amount numeric DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    referral_code text NOT NULL,
    first_purchase_completed boolean DEFAULT false NOT NULL,
    first_purchase_at timestamp with time zone,
    bonus_amount numeric DEFAULT 0,
    bonus_approved boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    name text NOT NULL,
    slug text,
    description text,
    logo text,
    banner text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    country text DEFAULT 'Haiti'::text,
    city text,
    instagram text,
    facebook text,
    whatsapp text,
    tiktok text,
    return_policy text,
    shipping_policy text,
    bank_name character varying(255),
    account_type character varying(50),
    account_number character varying(255),
    account_holder character varying(255),
    is_accepting_orders boolean DEFAULT true,
    allow_comments boolean DEFAULT true,
    show_stock boolean DEFAULT true
);


--
-- Name: seller_catalog_marketing; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.seller_catalog_marketing AS
 SELECT sc.id,
    sc.seller_store_id,
    sc.source_product_id,
    sc.sku,
    sc.nombre,
    sc.precio_venta,
    sc.stock,
    sc.images,
    st.name AS store_name,
    st.slug AS store_slug,
        CASE
            WHEN ((p.id IS NOT NULL) AND (p.is_active = true)) THEN true
            ELSE false
        END AS b2b_available
   FROM ((public.seller_catalog sc
     JOIN public.stores st ON ((st.id = sc.seller_store_id)))
     LEFT JOIN public.products p ON ((p.id = sc.source_product_id)))
  WHERE (sc.is_active = true);


--
-- Name: seller_catalog_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.seller_catalog_public WITH (security_invoker='true') AS
 SELECT id,
    seller_store_id,
    sku,
    nombre,
    descripcion,
    precio_venta,
    stock,
    images,
    is_active,
    imported_at,
    updated_at
   FROM public.seller_catalog sc
  WHERE (is_active = true);


--
-- Name: seller_commission_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_commission_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    commission_percentage numeric,
    commission_fixed numeric,
    tax_tca_percentage numeric,
    reason text,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: seller_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credit_limit numeric DEFAULT 0 NOT NULL,
    balance_debt numeric DEFAULT 0 NOT NULL,
    max_cart_percentage integer DEFAULT 50 NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    activated_at timestamp with time zone,
    activated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: seller_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_statuses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    image_url text NOT NULL,
    caption text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL
);


--
-- Name: seller_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    pending_balance numeric DEFAULT 0 NOT NULL,
    available_balance numeric DEFAULT 0 NOT NULL,
    commission_debt numeric DEFAULT 0 NOT NULL,
    total_earned numeric DEFAULT 0 NOT NULL,
    total_withdrawn numeric DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sellers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    business_name text,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    verification_date timestamp with time zone,
    verification_badge_active boolean DEFAULT false
);


--
-- Name: shipping_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value numeric(10,4) DEFAULT 0 NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: siver_match_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stock_lot_id uuid NOT NULL,
    gestor_id uuid NOT NULL,
    investor_id uuid NOT NULL,
    quantity_assigned integer NOT NULL,
    quantity_sold integer DEFAULT 0,
    quantity_available integer NOT NULL,
    initiated_by public.siver_match_role NOT NULL,
    status public.assignment_status DEFAULT 'pending'::public.assignment_status,
    requested_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    completed_at timestamp with time zone,
    gestor_notes text,
    investor_notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: siver_match_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    role public.siver_match_role,
    min_sales integer,
    min_rating numeric(3,2),
    min_reviews integer,
    color text DEFAULT '#FFD700'::text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: siver_match_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.siver_match_role NOT NULL,
    department_id uuid,
    commune_id uuid,
    display_name text NOT NULL,
    bio text,
    avatar_url text,
    phone text,
    total_sales_count integer DEFAULT 0,
    total_sales_amount numeric(12,2) DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0,
    total_reviews integer DEFAULT 0,
    max_pending_orders integer DEFAULT 20,
    current_pending_orders integer DEFAULT 0,
    is_verified boolean DEFAULT false,
    is_active boolean DEFAULT true,
    verified_at timestamp with time zone,
    badges jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: siver_match_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    reviewer_profile_id uuid NOT NULL,
    reviewed_profile_id uuid NOT NULL,
    reviewer_role public.siver_match_role NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_public boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT siver_match_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: siver_match_sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_number text NOT NULL,
    assignment_id uuid NOT NULL,
    stock_lot_id uuid NOT NULL,
    gestor_id uuid NOT NULL,
    investor_id uuid NOT NULL,
    customer_user_id uuid,
    customer_name text NOT NULL,
    customer_phone text,
    customer_email text,
    department_id uuid,
    commune_id uuid,
    delivery_address text,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    investor_amount numeric(12,2) NOT NULL,
    gestor_commission numeric(12,2) NOT NULL,
    siver_fee numeric(12,2) NOT NULL,
    payment_method text,
    payment_reference text,
    payment_status text DEFAULT 'pending'::text,
    payment_confirmed_at timestamp with time zone,
    pickup_qr_code text,
    pickup_qr_generated_at timestamp with time zone,
    pickup_code text,
    status public.match_sale_status DEFAULT 'pending_payment'::public.match_sale_status,
    picked_up_at timestamp with time zone,
    picked_up_by uuid,
    delivered_at timestamp with time zone,
    delivery_confirmed_by uuid,
    delivery_photo_url text,
    hybrid_tracking_id text,
    investor_wallet_tx_id uuid,
    gestor_wallet_tx_id uuid,
    siver_wallet_tx_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    logistics_stage text DEFAULT 'pending'::text,
    po_id uuid,
    po_linked_at timestamp with time zone
);


--
-- Name: siver_match_stock_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_stock_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    investor_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    product_name text NOT NULL,
    product_image text,
    sku text,
    color text,
    size text,
    total_quantity integer NOT NULL,
    available_quantity integer NOT NULL,
    sold_quantity integer DEFAULT 0,
    cost_per_unit numeric(10,2) NOT NULL,
    suggested_price numeric(10,2) NOT NULL,
    min_price numeric(10,2),
    gestor_commission_per_unit numeric(10,2) NOT NULL,
    china_tracking_number text,
    internal_tracking_id text,
    status public.stock_lot_status DEFAULT 'draft'::public.stock_lot_status,
    logistics_stage text DEFAULT 'pending'::text,
    arrived_at_hub_at timestamp with time zone,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: siver_match_wallet_splits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.siver_match_wallet_splits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    total_received numeric(12,2) NOT NULL,
    investor_amount numeric(12,2) NOT NULL,
    gestor_amount numeric(12,2) NOT NULL,
    siver_amount numeric(12,2) NOT NULL,
    is_processed boolean DEFAULT false,
    processed_at timestamp with time zone,
    investor_tx_ref text,
    gestor_tx_ref text,
    siver_tx_ref text,
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_in_transit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_in_transit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    quantity integer DEFAULT 0 NOT NULL,
    china_tracking_number text,
    supplier_id uuid,
    expected_arrival_date date,
    shipped_date date,
    status text DEFAULT 'in_transit'::text,
    batch_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_balance_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stock_balance_view AS
 SELECT p.id AS product_id,
    p.nombre AS product_name,
    p.sku_interno AS sku,
    pv.id AS variant_id,
    pv.option_value AS variant_name,
    COALESCE(pv.stock, 0) AS stock_haiti,
    COALESCE(( SELECT sum(sit.quantity) AS sum
           FROM public.stock_in_transit sit
          WHERE ((sit.variant_id = pv.id) AND (sit.status = 'in_transit'::text))), (0)::bigint) AS stock_in_transit,
    COALESCE(( SELECT sum(osa.quantity_ordered) AS sum
           FROM public.order_stock_allocations osa
          WHERE ((osa.variant_id = pv.id) AND (osa.allocation_status <> 'fulfilled'::text))), (0)::bigint) AS orders_pending,
    ((COALESCE(pv.stock, 0) + COALESCE(( SELECT sum(sit.quantity) AS sum
           FROM public.stock_in_transit sit
          WHERE ((sit.variant_id = pv.id) AND (sit.status = 'in_transit'::text))), (0)::bigint)) - COALESCE(( SELECT sum(osa.quantity_ordered) AS sum
           FROM public.order_stock_allocations osa
          WHERE ((osa.variant_id = pv.id) AND (osa.allocation_status <> 'fulfilled'::text))), (0)::bigint)) AS available_balance
   FROM (public.products p
     JOIN public.product_variants pv ON ((pv.product_id = p.id)))
  WHERE ((p.is_active = true) AND (pv.is_active = true));


--
-- Name: stock_reservations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_reservations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    variant_id uuid,
    seller_catalog_id uuid,
    quantity integer NOT NULL,
    reserved_at timestamp with time zone DEFAULT now() NOT NULL,
    released_at timestamp with time zone,
    status text DEFAULT 'reserved'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_rotation_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_rotation_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    variant_id uuid,
    last_sale_date timestamp with time zone,
    stock_quantity integer DEFAULT 0,
    suggested_discount numeric(5,2) DEFAULT 0,
    alert_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stock_rotation_alerts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stock_rotation_alerts AS
 SELECT srt.id,
    p.id AS product_id,
    p.nombre AS product_name,
    p.sku_interno AS sku,
    pv.id AS variant_id,
    pv.option_value AS variant_name,
    srt.last_sale_date,
    (EXTRACT(day FROM (now() - srt.last_sale_date)))::integer AS days_without_sale,
    srt.stock_quantity,
    srt.suggested_discount,
    srt.alert_sent_at
   FROM ((public.stock_rotation_tracking srt
     JOIN public.products p ON ((p.id = srt.product_id)))
     LEFT JOIN public.product_variants pv ON ((pv.id = srt.variant_id)))
  WHERE ((srt.stock_quantity > 0) AND ((srt.last_sale_date IS NULL) OR (EXTRACT(day FROM (now() - srt.last_sale_date)) > (30)::numeric)));


--
-- Name: store_followers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_followers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: store_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    is_anonymous boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: stores_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stores_public WITH (security_invoker='true') AS
 SELECT id,
    owner_user_id,
    name,
    slug,
    description,
    logo,
    banner,
    whatsapp,
    city,
    country,
    is_active,
    is_accepting_orders,
    allow_comments,
    show_stock,
    instagram,
    facebook,
    tiktok,
    return_policy,
    shipping_policy,
    created_at,
    updated_at
   FROM public.stores
  WHERE (is_active = true);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    contact_email text,
    contact_phone text,
    country text DEFAULT 'China'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_notification_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email_notifications boolean DEFAULT true,
    order_notifications boolean DEFAULT true,
    promotional_emails boolean DEFAULT false,
    whatsapp_notifications boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: variant_attribute_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variant_attribute_values (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    variant_id uuid NOT NULL,
    attribute_id uuid NOT NULL,
    attribute_option_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    type public.wallet_transaction_type NOT NULL,
    status public.wallet_transaction_status DEFAULT 'pending'::public.wallet_transaction_status NOT NULL,
    amount numeric NOT NULL,
    fee_amount numeric DEFAULT 0,
    tax_amount numeric DEFAULT 0,
    net_amount numeric NOT NULL,
    reference_type text,
    reference_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    release_at timestamp with time zone,
    released_at timestamp with time zone,
    processed_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: withdrawal_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.withdrawal_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    amount numeric NOT NULL,
    fee_amount numeric DEFAULT 0,
    net_amount numeric NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    payment_method text NOT NULL,
    bank_details jsonb,
    status public.withdrawal_status DEFAULT 'pending'::public.withdrawal_status NOT NULL,
    admin_notes text,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT withdrawal_requests_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT withdrawal_requests_payment_method_check CHECK ((payment_method = ANY (ARRAY['bank_transfer'::text, 'moncash'::text, 'stripe'::text])))
);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: admin_approval_requests admin_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: admin_banners admin_banners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_banners
    ADD CONSTRAINT admin_banners_pkey PRIMARY KEY (id);


--
-- Name: asset_processing_items asset_processing_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_processing_items
    ADD CONSTRAINT asset_processing_items_pkey PRIMARY KEY (id);


--
-- Name: asset_processing_jobs asset_processing_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_processing_jobs
    ADD CONSTRAINT asset_processing_jobs_pkey PRIMARY KEY (id);


--
-- Name: attribute_options attribute_options_attribute_id_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_options
    ADD CONSTRAINT attribute_options_attribute_id_value_key UNIQUE (attribute_id, value);


--
-- Name: attribute_options attribute_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_options
    ADD CONSTRAINT attribute_options_pkey PRIMARY KEY (id);


--
-- Name: attributes attributes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_name_key UNIQUE (name);


--
-- Name: attributes attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_pkey PRIMARY KEY (id);


--
-- Name: attributes attributes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attributes
    ADD CONSTRAINT attributes_slug_key UNIQUE (slug);


--
-- Name: b2b_batches b2b_batches_batch_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_batches
    ADD CONSTRAINT b2b_batches_batch_code_key UNIQUE (batch_code);


--
-- Name: b2b_batches b2b_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_batches
    ADD CONSTRAINT b2b_batches_pkey PRIMARY KEY (id);


--
-- Name: b2b_cart_items b2b_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_cart_items
    ADD CONSTRAINT b2b_cart_items_pkey PRIMARY KEY (id);


--
-- Name: b2b_carts b2b_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_carts
    ADD CONSTRAINT b2b_carts_pkey PRIMARY KEY (id);


--
-- Name: b2b_payments b2b_payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_payments
    ADD CONSTRAINT b2b_payments_payment_number_key UNIQUE (payment_number);


--
-- Name: b2b_payments b2b_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_payments
    ADD CONSTRAINT b2b_payments_pkey PRIMARY KEY (id);


--
-- Name: b2c_cart_items b2c_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2c_cart_items
    ADD CONSTRAINT b2c_cart_items_pkey PRIMARY KEY (id);


--
-- Name: b2c_carts b2c_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2c_carts
    ADD CONSTRAINT b2c_carts_pkey PRIMARY KEY (id);


--
-- Name: batch_inventory batch_inventory_batch_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_inventory
    ADD CONSTRAINT batch_inventory_batch_id_variant_id_key UNIQUE (batch_id, variant_id);


--
-- Name: batch_inventory batch_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_inventory
    ADD CONSTRAINT batch_inventory_pkey PRIMARY KEY (id);


--
-- Name: catalog_click_tracking catalog_click_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_click_tracking
    ADD CONSTRAINT catalog_click_tracking_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: category_attribute_templates category_attribute_templates_category_id_attribute_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_category_id_attribute_name_key UNIQUE (category_id, attribute_name);


--
-- Name: category_attribute_templates category_attribute_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_pkey PRIMARY KEY (id);


--
-- Name: category_shipping_rates category_shipping_rates_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_shipping_rates
    ADD CONSTRAINT category_shipping_rates_category_id_key UNIQUE (category_id);


--
-- Name: category_shipping_rates category_shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_shipping_rates
    ADD CONSTRAINT category_shipping_rates_pkey PRIMARY KEY (id);


--
-- Name: commission_debts commission_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_debts
    ADD CONSTRAINT commission_debts_pkey PRIMARY KEY (id);


--
-- Name: communes communes_department_id_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT communes_department_id_code_key UNIQUE (department_id, code);


--
-- Name: communes communes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT communes_pkey PRIMARY KEY (id);


--
-- Name: consolidation_settings consolidation_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consolidation_settings
    ADD CONSTRAINT consolidation_settings_pkey PRIMARY KEY (id);


--
-- Name: credit_movements credit_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_movements
    ADD CONSTRAINT credit_movements_pkey PRIMARY KEY (id);


--
-- Name: customer_discounts customer_discounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_pkey PRIMARY KEY (id);


--
-- Name: delivery_ratings delivery_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_ratings
    ADD CONSTRAINT delivery_ratings_pkey PRIMARY KEY (id);


--
-- Name: departments departments_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_code_key UNIQUE (code);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: discount_code_uses discount_code_uses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_uses
    ADD CONSTRAINT discount_code_uses_pkey PRIMARY KEY (id);


--
-- Name: discount_codes discount_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_code_key UNIQUE (code);


--
-- Name: discount_codes discount_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_pkey PRIMARY KEY (id);


--
-- Name: dynamic_expenses dynamic_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_expenses
    ADD CONSTRAINT dynamic_expenses_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: kyc_verifications kyc_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_pkey PRIMARY KEY (id);


--
-- Name: kyc_verifications kyc_verifications_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_user_id_key UNIQUE (user_id);


--
-- Name: marketplace_section_settings marketplace_section_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_section_settings
    ADD CONSTRAINT marketplace_section_settings_pkey PRIMARY KEY (id);


--
-- Name: marketplace_section_settings marketplace_section_settings_section_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_section_settings
    ADD CONSTRAINT marketplace_section_settings_section_key_key UNIQUE (section_key);


--
-- Name: master_purchase_orders master_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_purchase_orders
    ADD CONSTRAINT master_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: master_purchase_orders master_purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_purchase_orders
    ADD CONSTRAINT master_purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: order_deliveries order_deliveries_delivery_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deliveries
    ADD CONSTRAINT order_deliveries_delivery_code_key UNIQUE (delivery_code);


--
-- Name: order_deliveries order_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deliveries
    ADD CONSTRAINT order_deliveries_pkey PRIMARY KEY (id);


--
-- Name: order_items_b2b order_items_b2b_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items_b2b
    ADD CONSTRAINT order_items_b2b_pkey PRIMARY KEY (id);


--
-- Name: order_refunds order_refunds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_refunds
    ADD CONSTRAINT order_refunds_pkey PRIMARY KEY (id);


--
-- Name: order_stock_allocations order_stock_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_pkey PRIMARY KEY (id);


--
-- Name: orders_b2b orders_b2b_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: pending_quotes pending_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_quotes
    ADD CONSTRAINT pending_quotes_pkey PRIMARY KEY (id);


--
-- Name: pickup_point_staff pickup_point_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_point_staff
    ADD CONSTRAINT pickup_point_staff_pkey PRIMARY KEY (id);


--
-- Name: pickup_point_staff pickup_point_staff_user_id_pickup_point_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_point_staff
    ADD CONSTRAINT pickup_point_staff_user_id_pickup_point_id_key UNIQUE (user_id, pickup_point_id);


--
-- Name: pickup_points pickup_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_points
    ADD CONSTRAINT pickup_points_pkey PRIMARY KEY (id);


--
-- Name: platform_settings platform_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_key_key UNIQUE (key);


--
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (id);


--
-- Name: po_order_links po_order_links_order_id_order_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_order_links
    ADD CONSTRAINT po_order_links_order_id_order_type_key UNIQUE (order_id, order_type);


--
-- Name: po_order_links po_order_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_order_links
    ADD CONSTRAINT po_order_links_pkey PRIMARY KEY (id);


--
-- Name: po_picking_items po_picking_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_picking_items
    ADD CONSTRAINT po_picking_items_pkey PRIMARY KEY (id);


--
-- Name: price_settings price_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_settings
    ADD CONSTRAINT price_settings_key_key UNIQUE (key);


--
-- Name: price_settings price_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_settings
    ADD CONSTRAINT price_settings_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_values product_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: product_attribute_values product_attribute_values_product_id_attribute_id_attribute__key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_product_id_attribute_id_attribute__key UNIQUE (product_id, attribute_id, attribute_option_id);


--
-- Name: product_migration_log product_migration_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_migration_log
    ADD CONSTRAINT product_migration_log_pkey PRIMARY KEY (id);


--
-- Name: product_price_history product_price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: product_variants product_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_interno_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_interno_key UNIQUE (sku_interno);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: purchase_consolidation_items purchase_consolidation_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidation_items
    ADD CONSTRAINT purchase_consolidation_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_consolidations purchase_consolidations_consolidation_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidations
    ADD CONSTRAINT purchase_consolidations_consolidation_number_key UNIQUE (consolidation_number);


--
-- Name: purchase_consolidations purchase_consolidations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidations
    ADD CONSTRAINT purchase_consolidations_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_code_key UNIQUE (code);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_key UNIQUE (user_id);


--
-- Name: referral_settings referral_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_settings
    ADD CONSTRAINT referral_settings_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referred_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_key UNIQUE (referred_id);


--
-- Name: seller_catalog seller_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_catalog
    ADD CONSTRAINT seller_catalog_pkey PRIMARY KEY (id);


--
-- Name: seller_commission_overrides seller_commission_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_overrides
    ADD CONSTRAINT seller_commission_overrides_pkey PRIMARY KEY (id);


--
-- Name: seller_commission_overrides seller_commission_overrides_seller_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_overrides
    ADD CONSTRAINT seller_commission_overrides_seller_id_key UNIQUE (seller_id);


--
-- Name: seller_credits seller_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_credits
    ADD CONSTRAINT seller_credits_pkey PRIMARY KEY (id);


--
-- Name: seller_credits seller_credits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_credits
    ADD CONSTRAINT seller_credits_user_id_key UNIQUE (user_id);


--
-- Name: seller_statuses seller_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_statuses
    ADD CONSTRAINT seller_statuses_pkey PRIMARY KEY (id);


--
-- Name: seller_wallets seller_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_wallets
    ADD CONSTRAINT seller_wallets_pkey PRIMARY KEY (id);


--
-- Name: seller_wallets seller_wallets_seller_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_wallets
    ADD CONSTRAINT seller_wallets_seller_id_key UNIQUE (seller_id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: shipment_tracking shipment_tracking_hybrid_tracking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_hybrid_tracking_id_key UNIQUE (hybrid_tracking_id);


--
-- Name: shipment_tracking shipment_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_pkey PRIMARY KEY (id);


--
-- Name: shipping_rates shipping_rates_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_key_key UNIQUE (key);


--
-- Name: shipping_rates shipping_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_rates
    ADD CONSTRAINT shipping_rates_pkey PRIMARY KEY (id);


--
-- Name: siver_match_assignments siver_match_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_assignments
    ADD CONSTRAINT siver_match_assignments_pkey PRIMARY KEY (id);


--
-- Name: siver_match_badges siver_match_badges_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_badges
    ADD CONSTRAINT siver_match_badges_code_key UNIQUE (code);


--
-- Name: siver_match_badges siver_match_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_badges
    ADD CONSTRAINT siver_match_badges_pkey PRIMARY KEY (id);


--
-- Name: siver_match_profiles siver_match_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_profiles
    ADD CONSTRAINT siver_match_profiles_pkey PRIMARY KEY (id);


--
-- Name: siver_match_reviews siver_match_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_reviews
    ADD CONSTRAINT siver_match_reviews_pkey PRIMARY KEY (id);


--
-- Name: siver_match_sales siver_match_sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_pkey PRIMARY KEY (id);


--
-- Name: siver_match_sales siver_match_sales_sale_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_sale_number_key UNIQUE (sale_number);


--
-- Name: siver_match_stock_lots siver_match_stock_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_stock_lots
    ADD CONSTRAINT siver_match_stock_lots_pkey PRIMARY KEY (id);


--
-- Name: siver_match_wallet_splits siver_match_wallet_splits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_wallet_splits
    ADD CONSTRAINT siver_match_wallet_splits_pkey PRIMARY KEY (id);


--
-- Name: stock_in_transit stock_in_transit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_in_transit
    ADD CONSTRAINT stock_in_transit_pkey PRIMARY KEY (id);


--
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


--
-- Name: stock_rotation_tracking stock_rotation_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_rotation_tracking
    ADD CONSTRAINT stock_rotation_tracking_pkey PRIMARY KEY (id);


--
-- Name: stock_rotation_tracking stock_rotation_tracking_product_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_rotation_tracking
    ADD CONSTRAINT stock_rotation_tracking_product_id_variant_id_key UNIQUE (product_id, variant_id);


--
-- Name: store_followers store_followers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_followers
    ADD CONSTRAINT store_followers_pkey PRIMARY KEY (id);


--
-- Name: store_followers store_followers_store_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_followers
    ADD CONSTRAINT store_followers_store_id_user_id_key UNIQUE (store_id, user_id);


--
-- Name: store_reviews store_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_pkey PRIMARY KEY (id);


--
-- Name: store_reviews store_reviews_store_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_store_id_user_id_key UNIQUE (store_id, user_id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_key UNIQUE (slug);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: siver_match_assignments unique_lot_gestor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_assignments
    ADD CONSTRAINT unique_lot_gestor UNIQUE (stock_lot_id, gestor_id);


--
-- Name: siver_match_reviews unique_review_per_sale; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_reviews
    ADD CONSTRAINT unique_review_per_sale UNIQUE (sale_id, reviewer_profile_id);


--
-- Name: siver_match_profiles unique_user_role; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_profiles
    ADD CONSTRAINT unique_user_role UNIQUE (user_id, role);


--
-- Name: user_notification_preferences user_notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_notification_preferences user_notification_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notification_preferences
    ADD CONSTRAINT user_notification_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: variant_attribute_values variant_attribute_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (id);


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_attribute_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_attribute_id_key UNIQUE (variant_id, attribute_id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: withdrawal_requests withdrawal_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_pkey PRIMARY KEY (id);


--
-- Name: idx_admin_banners_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_banners_active ON public.admin_banners USING btree (is_active, target_audience, sort_order);


--
-- Name: idx_asset_items_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_items_job_id ON public.asset_processing_items USING btree (job_id);


--
-- Name: idx_asset_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_items_status ON public.asset_processing_items USING btree (status);


--
-- Name: idx_asset_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_jobs_status ON public.asset_processing_jobs USING btree (status);


--
-- Name: idx_asset_jobs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asset_jobs_user ON public.asset_processing_jobs USING btree (user_id);


--
-- Name: idx_assignments_gestor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_gestor ON public.siver_match_assignments USING btree (gestor_id);


--
-- Name: idx_assignments_investor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_investor ON public.siver_match_assignments USING btree (investor_id);


--
-- Name: idx_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_status ON public.siver_match_assignments USING btree (status);


--
-- Name: idx_attribute_options_attribute; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attribute_options_attribute ON public.attribute_options USING btree (attribute_id);


--
-- Name: idx_b2b_cart_items_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_b2b_cart_items_cart ON public.b2b_cart_items USING btree (cart_id);


--
-- Name: idx_b2b_cart_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_b2b_cart_items_product ON public.b2b_cart_items USING btree (product_id);


--
-- Name: idx_b2b_carts_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_b2b_carts_buyer ON public.b2b_carts USING btree (buyer_user_id);


--
-- Name: idx_b2b_carts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_b2b_carts_status ON public.b2b_carts USING btree (status);


--
-- Name: idx_batch_inventory_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_inventory_batch ON public.batch_inventory USING btree (batch_id);


--
-- Name: idx_batch_inventory_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_batch_inventory_variant ON public.batch_inventory USING btree (variant_id);


--
-- Name: idx_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_parent ON public.categories USING btree (parent_id);


--
-- Name: idx_categories_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_slug ON public.categories USING btree (slug);


--
-- Name: idx_categories_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_categories_visible ON public.categories USING btree (is_visible_public);


--
-- Name: idx_commission_debts_unpaid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_commission_debts_unpaid ON public.commission_debts USING btree (seller_id) WHERE (is_paid = false);


--
-- Name: idx_customer_discounts_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discounts_customer ON public.customer_discounts USING btree (customer_user_id);


--
-- Name: idx_customer_discounts_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customer_discounts_store ON public.customer_discounts USING btree (store_id);


--
-- Name: idx_delivery_ratings_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_ratings_customer ON public.delivery_ratings USING btree (customer_user_id);


--
-- Name: idx_delivery_ratings_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_ratings_order ON public.delivery_ratings USING btree (order_id);


--
-- Name: idx_discount_code_uses_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_code_uses_code ON public.discount_code_uses USING btree (discount_code_id);


--
-- Name: idx_discount_code_uses_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_code_uses_user ON public.discount_code_uses USING btree (user_id);


--
-- Name: idx_discount_codes_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_active ON public.discount_codes USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_discount_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_code ON public.discount_codes USING btree (code);


--
-- Name: idx_discount_codes_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_codes_store ON public.discount_codes USING btree (store_id);


--
-- Name: idx_inventory_movements_catalog; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_catalog ON public.inventory_movements USING btree (seller_catalog_id);


--
-- Name: idx_inventory_movements_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_created ON public.inventory_movements USING btree (created_at);


--
-- Name: idx_inventory_movements_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inventory_movements_product ON public.inventory_movements USING btree (product_id);


--
-- Name: idx_master_po_china_tracking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_po_china_tracking ON public.master_purchase_orders USING btree (china_tracking_number);


--
-- Name: idx_master_po_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_po_status ON public.master_purchase_orders USING btree (status);


--
-- Name: idx_match_profiles_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_profiles_location ON public.siver_match_profiles USING btree (department_id, commune_id);


--
-- Name: idx_match_profiles_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_profiles_rating ON public.siver_match_profiles USING btree (average_rating DESC);


--
-- Name: idx_match_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_profiles_role ON public.siver_match_profiles USING btree (role);


--
-- Name: idx_match_profiles_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_profiles_user ON public.siver_match_profiles USING btree (user_id);


--
-- Name: idx_migration_log_parent_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_migration_log_parent_sku ON public.product_migration_log USING btree (parent_sku);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read) WHERE (is_read = false);


--
-- Name: idx_order_deliveries_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_code ON public.order_deliveries USING btree (delivery_code);


--
-- Name: idx_order_deliveries_customer_qr; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_customer_qr ON public.order_deliveries USING btree (customer_qr_code);


--
-- Name: idx_order_deliveries_pickup_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_pickup_status ON public.order_deliveries USING btree (pickup_point_id, status);


--
-- Name: idx_order_deliveries_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_release ON public.order_deliveries USING btree (escrow_release_at) WHERE (funds_released = false);


--
-- Name: idx_order_deliveries_security_pin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_security_pin ON public.order_deliveries USING btree (security_pin);


--
-- Name: idx_order_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_status ON public.order_deliveries USING btree (status);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order ON public.order_items_b2b USING btree (order_id);


--
-- Name: idx_order_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product ON public.order_items_b2b USING btree (product_id);


--
-- Name: idx_orders_b2b_checkout_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_checkout_session ON public.orders_b2b USING btree (checkout_session_id);


--
-- Name: idx_orders_b2b_consolidation_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_consolidation_status ON public.orders_b2b USING btree (consolidation_status);


--
-- Name: idx_orders_b2b_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_created ON public.orders_b2b USING btree (created_at DESC);


--
-- Name: idx_orders_b2b_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_payment_status ON public.orders_b2b USING btree (payment_status);


--
-- Name: idx_orders_b2b_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_po_id ON public.orders_b2b USING btree (po_id);


--
-- Name: idx_orders_b2b_reserved_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_reserved_at ON public.orders_b2b USING btree (reserved_at);


--
-- Name: idx_orders_b2b_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_seller ON public.orders_b2b USING btree (seller_id);


--
-- Name: idx_orders_b2b_seller_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_seller_status ON public.orders_b2b USING btree (seller_id, status);


--
-- Name: idx_orders_b2b_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_status ON public.orders_b2b USING btree (status);


--
-- Name: idx_payment_methods_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_owner ON public.payment_methods USING btree (owner_type, owner_id);


--
-- Name: idx_payment_methods_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_methods_type ON public.payment_methods USING btree (method_type);


--
-- Name: idx_pickup_staff_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pickup_staff_user ON public.pickup_point_staff USING btree (user_id);


--
-- Name: idx_po_order_links_hybrid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_order_links_hybrid ON public.po_order_links USING btree (hybrid_tracking_id);


--
-- Name: idx_po_order_links_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_order_links_order_id ON public.po_order_links USING btree (order_id, order_type);


--
-- Name: idx_po_order_links_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_order_links_po_id ON public.po_order_links USING btree (po_id);


--
-- Name: idx_po_order_links_source_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_order_links_source_type ON public.po_order_links USING btree (source_type);


--
-- Name: idx_po_picking_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_picking_items_po_id ON public.po_picking_items USING btree (po_id);


--
-- Name: idx_product_attribute_values_attribute; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_attribute_values_attribute ON public.product_attribute_values USING btree (attribute_id);


--
-- Name: idx_product_attribute_values_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_attribute_values_product ON public.product_attribute_values USING btree (product_id);


--
-- Name: idx_product_reviews_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_parent_id ON public.product_reviews USING btree (parent_review_id);


--
-- Name: idx_product_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_product_id ON public.product_reviews USING btree (product_id);


--
-- Name: idx_product_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_rating ON public.product_reviews USING btree (rating);


--
-- Name: idx_product_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_reviews_user_id ON public.product_reviews USING btree (user_id);


--
-- Name: idx_product_variants_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_batch ON public.product_variants USING btree (batch_id);


--
-- Name: idx_product_variants_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_option ON public.product_variants USING btree (option_type, option_value);


--
-- Name: idx_product_variants_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_product_id ON public.product_variants USING btree (product_id);


--
-- Name: idx_product_variants_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_variants_sku ON public.product_variants USING btree (sku);


--
-- Name: idx_product_views_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
-- Name: idx_product_views_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_viewed_at ON public.product_views USING btree (viewed_at DESC);


--
-- Name: idx_products_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_active ON public.products USING btree (is_active);


--
-- Name: idx_products_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_categoria ON public.products USING btree (categoria_id);


--
-- Name: idx_products_is_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_is_parent ON public.products USING btree (is_parent) WHERE (is_parent = true);


--
-- Name: idx_products_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_parent_id ON public.products USING btree (parent_product_id) WHERE (parent_product_id IS NOT NULL);


--
-- Name: idx_products_precio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_precio ON public.products USING btree (precio_mayorista);


--
-- Name: idx_products_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_sku ON public.products USING btree (sku_interno);


--
-- Name: idx_refunds_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refunds_order ON public.order_refunds USING btree (order_id);


--
-- Name: idx_reviews_reviewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewed ON public.siver_match_reviews USING btree (reviewed_profile_id);


--
-- Name: idx_reviews_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_sale ON public.siver_match_reviews USING btree (sale_id);


--
-- Name: idx_sales_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_customer ON public.siver_match_sales USING btree (customer_user_id);


--
-- Name: idx_sales_gestor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_gestor ON public.siver_match_sales USING btree (gestor_id);


--
-- Name: idx_sales_investor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_investor ON public.siver_match_sales USING btree (investor_id);


--
-- Name: idx_sales_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_status ON public.siver_match_sales USING btree (status);


--
-- Name: idx_seller_catalog_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_sku ON public.seller_catalog USING btree (sku);


--
-- Name: idx_seller_catalog_sku_price; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_sku_price ON public.seller_catalog USING btree (sku, precio_venta) WHERE (is_active = true);


--
-- Name: idx_seller_catalog_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_source ON public.seller_catalog USING btree (source_product_id);


--
-- Name: idx_seller_catalog_source_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_source_product ON public.seller_catalog USING btree (source_product_id) WHERE (is_active = true);


--
-- Name: idx_seller_catalog_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_store ON public.seller_catalog USING btree (seller_store_id);


--
-- Name: idx_seller_statuses_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_statuses_expires ON public.seller_statuses USING btree (expires_at);


--
-- Name: idx_seller_statuses_store_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_statuses_store_expires ON public.seller_statuses USING btree (store_id, expires_at DESC);


--
-- Name: idx_sellers_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sellers_verified ON public.sellers USING btree (is_verified);


--
-- Name: idx_siver_match_sales_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_siver_match_sales_po_id ON public.siver_match_sales USING btree (po_id);


--
-- Name: idx_stock_lots_investor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_lots_investor ON public.siver_match_stock_lots USING btree (investor_id);


--
-- Name: idx_stock_lots_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_lots_product ON public.siver_match_stock_lots USING btree (product_id);


--
-- Name: idx_stock_lots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_lots_status ON public.siver_match_stock_lots USING btree (status);


--
-- Name: idx_store_followers_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_followers_store_id ON public.store_followers USING btree (store_id);


--
-- Name: idx_store_followers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_followers_user_id ON public.store_followers USING btree (user_id);


--
-- Name: idx_store_reviews_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_reviews_rating ON public.store_reviews USING btree (rating);


--
-- Name: idx_store_reviews_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_reviews_store_id ON public.store_reviews USING btree (store_id);


--
-- Name: idx_store_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_reviews_user_id ON public.store_reviews USING btree (user_id);


--
-- Name: idx_stores_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_owner ON public.stores USING btree (owner_user_id);


--
-- Name: idx_stores_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_slug ON public.stores USING btree (slug);


--
-- Name: idx_user_notif_prefs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notif_prefs_user ON public.user_notification_preferences USING btree (user_id);


--
-- Name: idx_variant_attribute_values_attribute; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variant_attribute_values_attribute ON public.variant_attribute_values USING btree (attribute_id);


--
-- Name: idx_variant_attribute_values_variant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_variant_attribute_values_variant ON public.variant_attribute_values USING btree (variant_id);


--
-- Name: idx_wallet_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_seller ON public.seller_wallets USING btree (seller_id);


--
-- Name: idx_wallet_transactions_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_release ON public.wallet_transactions USING btree (release_at) WHERE (status = 'pending'::public.wallet_transaction_status);


--
-- Name: idx_wallet_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions USING btree (status);


--
-- Name: idx_wallet_transactions_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallet_transactions_wallet ON public.wallet_transactions USING btree (wallet_id);


--
-- Name: idx_withdrawal_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests USING btree (status);


--
-- Name: b2b_payments generate_payment_number_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_payment_number_trigger BEFORE INSERT ON public.b2b_payments FOR EACH ROW EXECUTE FUNCTION public.generate_payment_number();


--
-- Name: kyc_verifications generate_referral_code_on_verify; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_referral_code_on_verify AFTER UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();


--
-- Name: user_roles on_seller_role_assigned; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_seller_role_assigned AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.fn_create_seller_store();


--
-- Name: pending_quotes set_quote_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_quote_number BEFORE INSERT ON public.pending_quotes FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();


--
-- Name: sellers tr_create_seller_wallet; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_create_seller_wallet AFTER INSERT ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.fn_create_seller_wallet();


--
-- Name: b2b_batches tr_generate_batch_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_generate_batch_code BEFORE INSERT ON public.b2b_batches FOR EACH ROW WHEN ((new.batch_code IS NULL)) EXECUTE FUNCTION public.generate_batch_code();


--
-- Name: orders_b2b tr_release_stock_on_failure; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_release_stock_on_failure BEFORE UPDATE ON public.orders_b2b FOR EACH ROW EXECUTE FUNCTION public.fn_release_stock_on_failure();


--
-- Name: orders_b2b tr_reserve_stock_on_pending; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_reserve_stock_on_pending BEFORE UPDATE ON public.orders_b2b FOR EACH ROW EXECUTE FUNCTION public.fn_reserve_stock_on_pending();


--
-- Name: orders_b2b trg_b2b_payment_completed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_b2b_payment_completed AFTER UPDATE ON public.orders_b2b FOR EACH ROW EXECUTE FUNCTION public.fn_handle_b2b_payment();


--
-- Name: orders_b2b trg_create_po_records_for_paid_order_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_po_records_for_paid_order_insert AFTER INSERT ON public.orders_b2b FOR EACH ROW WHEN ((new.payment_status = 'paid'::text)) EXECUTE FUNCTION public.create_po_records_for_paid_order();


--
-- Name: orders_b2b trg_create_po_records_for_paid_order_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_create_po_records_for_paid_order_update AFTER UPDATE ON public.orders_b2b FOR EACH ROW WHEN (((old.payment_status IS DISTINCT FROM 'paid'::text) AND (new.payment_status = 'paid'::text))) EXECUTE FUNCTION public.create_po_records_for_paid_order();


--
-- Name: product_reviews trg_update_product_review_aggregates; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_update_product_review_aggregates AFTER INSERT OR DELETE OR UPDATE OF rating ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.fn_update_product_review_aggregates();


--
-- Name: seller_wallets trg_wallet_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_wallet_notification AFTER UPDATE ON public.seller_wallets FOR EACH ROW EXECUTE FUNCTION public.fn_notify_wallet_change();


--
-- Name: withdrawal_requests trg_withdrawal_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_withdrawal_notification AFTER UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.fn_notify_withdrawal_status();


--
-- Name: orders_b2b trigger_auto_link_new_order_to_po; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_link_new_order_to_po BEFORE INSERT ON public.orders_b2b FOR EACH ROW WHEN ((new.payment_status = 'paid'::text)) EXECUTE FUNCTION public.auto_link_order_to_po();


--
-- Name: orders_b2b trigger_auto_link_order_to_po; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_auto_link_order_to_po BEFORE UPDATE ON public.orders_b2b FOR EACH ROW WHEN (((old.payment_status IS DISTINCT FROM 'paid'::text) AND (new.payment_status = 'paid'::text))) EXECUTE FUNCTION public.auto_link_order_to_po();


--
-- Name: order_deliveries trigger_delivery_notification; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_delivery_notification AFTER UPDATE ON public.order_deliveries FOR EACH ROW EXECUTE FUNCTION public.trigger_delivery_notification();


--
-- Name: consolidation_settings trigger_ensure_po_on_activation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_ensure_po_on_activation AFTER INSERT OR UPDATE OF is_active ON public.consolidation_settings FOR EACH ROW WHEN ((new.is_active = true)) EXECUTE FUNCTION public.ensure_active_po_on_startup();


--
-- Name: order_deliveries trigger_generate_security_codes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_security_codes BEFORE INSERT ON public.order_deliveries FOR EACH ROW WHEN (((new.customer_qr_code IS NULL) OR (new.security_pin IS NULL))) EXECUTE FUNCTION public.generate_delivery_security_codes();


--
-- Name: orders_b2b trigger_handle_order_cancellation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_handle_order_cancellation BEFORE UPDATE ON public.orders_b2b FOR EACH ROW WHEN (((new.status = 'cancelled'::text) AND (old.status IS DISTINCT FROM 'cancelled'::text))) EXECUTE FUNCTION public.handle_order_cancellation();


--
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_approval_requests update_admin_approval_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_approval_requests_updated_at BEFORE UPDATE ON public.admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_processing_items update_asset_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_items_updated_at BEFORE UPDATE ON public.asset_processing_items FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();


--
-- Name: asset_processing_jobs update_asset_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_jobs_updated_at BEFORE UPDATE ON public.asset_processing_jobs FOR EACH ROW EXECUTE FUNCTION public.update_asset_updated_at();


--
-- Name: b2b_carts update_b2b_carts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_b2b_carts_updated_at BEFORE UPDATE ON public.b2b_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: b2b_payments update_b2b_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_b2b_payments_updated_at BEFORE UPDATE ON public.b2b_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_discounts update_customer_discounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_discounts_updated_at BEFORE UPDATE ON public.customer_discounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_codes update_discount_codes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_codes_updated_at BEFORE UPDATE ON public.discount_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_expenses update_dynamic_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_expenses_updated_at BEFORE UPDATE ON public.dynamic_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kyc_verifications update_kyc_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketplace_section_settings update_marketplace_section_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketplace_section_settings_updated_at BEFORE UPDATE ON public.marketplace_section_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: master_purchase_orders update_master_po_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_master_po_updated_at BEFORE UPDATE ON public.master_purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_deliveries update_order_deliveries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_deliveries_updated_at BEFORE UPDATE ON public.order_deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_refunds update_order_refunds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_order_refunds_updated_at BEFORE UPDATE ON public.order_refunds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders_b2b update_orders_b2b_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_orders_b2b_updated_at BEFORE UPDATE ON public.orders_b2b FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payment_methods update_payment_methods_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pickup_points update_pickup_points_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pickup_points_updated_at BEFORE UPDATE ON public.pickup_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_settings update_platform_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: po_order_links update_po_links_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_po_links_updated_at BEFORE UPDATE ON public.po_order_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: price_settings update_price_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_price_settings_updated_at BEFORE UPDATE ON public.price_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_reviews update_product_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_product_stock_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_stock_status BEFORE INSERT OR UPDATE OF stock_fisico, moq ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_stock_status();


--
-- Name: product_variants update_product_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: siver_match_sales update_profile_stats_on_sale; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profile_stats_on_sale AFTER UPDATE OF status ON public.siver_match_sales FOR EACH ROW WHEN ((new.status = 'delivered'::public.match_sale_status)) EXECUTE FUNCTION public.update_siver_match_profile_stats();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: siver_match_reviews update_rating_on_review; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_rating_on_review AFTER INSERT ON public.siver_match_reviews FOR EACH ROW EXECUTE FUNCTION public.update_siver_match_rating();


--
-- Name: seller_catalog update_seller_catalog_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seller_catalog_updated_at BEFORE UPDATE ON public.seller_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seller_commission_overrides update_seller_commission_overrides_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seller_commission_overrides_updated_at BEFORE UPDATE ON public.seller_commission_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seller_credits update_seller_credits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seller_credits_updated_at BEFORE UPDATE ON public.seller_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seller_wallets update_seller_wallets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seller_wallets_updated_at BEFORE UPDATE ON public.seller_wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sellers update_sellers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: store_reviews update_store_reviews_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_store_reviews_updated_at BEFORE UPDATE ON public.store_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stores update_stores_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_notification_preferences update_user_notification_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: wallet_transactions update_wallet_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: withdrawal_requests update_withdrawal_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: addresses addresses_preferred_pickup_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_preferred_pickup_point_id_fkey FOREIGN KEY (preferred_pickup_point_id) REFERENCES public.pickup_points(id);


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_approval_requests admin_approval_requests_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: admin_approval_requests admin_approval_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_approval_requests
    ADD CONSTRAINT admin_approval_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: asset_processing_items asset_processing_items_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_processing_items
    ADD CONSTRAINT asset_processing_items_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.asset_processing_jobs(id) ON DELETE CASCADE;


--
-- Name: asset_processing_jobs asset_processing_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_processing_jobs
    ADD CONSTRAINT asset_processing_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: attribute_options attribute_options_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_options
    ADD CONSTRAINT attribute_options_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- Name: b2b_batches b2b_batches_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_batches
    ADD CONSTRAINT b2b_batches_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders_b2b(id);


--
-- Name: b2b_batches b2b_batches_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_batches
    ADD CONSTRAINT b2b_batches_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: b2b_cart_items b2b_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_cart_items
    ADD CONSTRAINT b2b_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.b2b_carts(id) ON DELETE CASCADE;


--
-- Name: b2b_cart_items b2b_cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_cart_items
    ADD CONSTRAINT b2b_cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: b2b_carts b2b_carts_buyer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_carts
    ADD CONSTRAINT b2b_carts_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: b2b_payments b2b_payments_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_payments
    ADD CONSTRAINT b2b_payments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- Name: b2b_payments b2b_payments_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2b_payments
    ADD CONSTRAINT b2b_payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES auth.users(id);


--
-- Name: b2c_cart_items b2c_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2c_cart_items
    ADD CONSTRAINT b2c_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.b2c_carts(id) ON DELETE CASCADE;


--
-- Name: b2c_cart_items b2c_cart_items_seller_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2c_cart_items
    ADD CONSTRAINT b2c_cart_items_seller_catalog_id_fkey FOREIGN KEY (seller_catalog_id) REFERENCES public.seller_catalog(id);


--
-- Name: b2c_cart_items b2c_cart_items_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.b2c_cart_items
    ADD CONSTRAINT b2c_cart_items_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id);


--
-- Name: batch_inventory batch_inventory_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_inventory
    ADD CONSTRAINT batch_inventory_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.b2b_batches(id) ON DELETE CASCADE;


--
-- Name: batch_inventory batch_inventory_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_inventory
    ADD CONSTRAINT batch_inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: catalog_click_tracking catalog_click_tracking_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_click_tracking
    ADD CONSTRAINT catalog_click_tracking_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: catalog_click_tracking catalog_click_tracking_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_click_tracking
    ADD CONSTRAINT catalog_click_tracking_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.stores(id);


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: category_attribute_templates category_attribute_templates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_attribute_templates
    ADD CONSTRAINT category_attribute_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_shipping_rates category_shipping_rates_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_shipping_rates
    ADD CONSTRAINT category_shipping_rates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: commission_debts commission_debts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_debts
    ADD CONSTRAINT commission_debts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- Name: commission_debts commission_debts_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_debts
    ADD CONSTRAINT commission_debts_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.seller_wallets(id);


--
-- Name: communes communes_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.communes
    ADD CONSTRAINT communes_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: credit_movements credit_movements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_movements
    ADD CONSTRAINT credit_movements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customer_discounts customer_discounts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customer_discounts customer_discounts_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: customer_discounts customer_discounts_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_discounts
    ADD CONSTRAINT customer_discounts_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: delivery_ratings delivery_ratings_order_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_ratings
    ADD CONSTRAINT delivery_ratings_order_delivery_id_fkey FOREIGN KEY (order_delivery_id) REFERENCES public.order_deliveries(id) ON DELETE CASCADE;


--
-- Name: discount_code_uses discount_code_uses_discount_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_uses
    ADD CONSTRAINT discount_code_uses_discount_code_id_fkey FOREIGN KEY (discount_code_id) REFERENCES public.discount_codes(id) ON DELETE CASCADE;


--
-- Name: discount_code_uses discount_code_uses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_code_uses
    ADD CONSTRAINT discount_code_uses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discount_codes discount_codes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: discount_codes discount_codes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_codes
    ADD CONSTRAINT discount_codes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: inventory_movements inventory_movements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: inventory_movements inventory_movements_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: inventory_movements inventory_movements_seller_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_seller_catalog_id_fkey FOREIGN KEY (seller_catalog_id) REFERENCES public.seller_catalog(id) ON DELETE SET NULL;


--
-- Name: kyc_verifications kyc_verifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: kyc_verifications kyc_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kyc_verifications
    ADD CONSTRAINT kyc_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: master_purchase_orders master_purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_purchase_orders
    ADD CONSTRAINT master_purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: order_deliveries order_deliveries_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deliveries
    ADD CONSTRAINT order_deliveries_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.profiles(id);


--
-- Name: order_deliveries order_deliveries_pickup_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_deliveries
    ADD CONSTRAINT order_deliveries_pickup_point_id_fkey FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id);


--
-- Name: order_items_b2b order_items_b2b_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items_b2b
    ADD CONSTRAINT order_items_b2b_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders_b2b(id) ON DELETE CASCADE;


--
-- Name: order_items_b2b order_items_b2b_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items_b2b
    ADD CONSTRAINT order_items_b2b_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: order_refunds order_refunds_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_refunds
    ADD CONSTRAINT order_refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders_b2b(id) ON DELETE CASCADE;


--
-- Name: order_stock_allocations order_stock_allocations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: order_stock_allocations order_stock_allocations_transit_stock_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_transit_stock_id_fkey FOREIGN KEY (transit_stock_id) REFERENCES public.stock_in_transit(id);


--
-- Name: order_stock_allocations order_stock_allocations_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_stock_allocations
    ADD CONSTRAINT order_stock_allocations_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: orders_b2b orders_b2b_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: orders_b2b orders_b2b_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.master_purchase_orders(id) ON DELETE SET NULL;


--
-- Name: orders_b2b orders_b2b_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pickup_point_staff pickup_point_staff_pickup_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_point_staff
    ADD CONSTRAINT pickup_point_staff_pickup_point_id_fkey FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id) ON DELETE CASCADE;


--
-- Name: pickup_point_staff pickup_point_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_point_staff
    ADD CONSTRAINT pickup_point_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: pickup_points pickup_points_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pickup_points
    ADD CONSTRAINT pickup_points_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.profiles(id);


--
-- Name: po_order_links po_order_links_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_order_links
    ADD CONSTRAINT po_order_links_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id);


--
-- Name: po_order_links po_order_links_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_order_links
    ADD CONSTRAINT po_order_links_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.master_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: po_order_links po_order_links_siver_match_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_order_links
    ADD CONSTRAINT po_order_links_siver_match_sale_id_fkey FOREIGN KEY (siver_match_sale_id) REFERENCES public.siver_match_sales(id) ON DELETE SET NULL;


--
-- Name: po_picking_items po_picking_items_picked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_picking_items
    ADD CONSTRAINT po_picking_items_picked_by_fkey FOREIGN KEY (picked_by) REFERENCES auth.users(id);


--
-- Name: po_picking_items po_picking_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_picking_items
    ADD CONSTRAINT po_picking_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.master_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: po_picking_items po_picking_items_po_order_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.po_picking_items
    ADD CONSTRAINT po_picking_items_po_order_link_id_fkey FOREIGN KEY (po_order_link_id) REFERENCES public.po_order_links(id) ON DELETE CASCADE;


--
-- Name: product_attribute_values product_attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- Name: product_attribute_values product_attribute_values_attribute_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_attribute_option_id_fkey FOREIGN KEY (attribute_option_id) REFERENCES public.attribute_options(id) ON DELETE CASCADE;


--
-- Name: product_attribute_values product_attribute_values_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_attribute_values
    ADD CONSTRAINT product_attribute_values_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_migration_log product_migration_log_new_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_migration_log
    ADD CONSTRAINT product_migration_log_new_variant_id_fkey FOREIGN KEY (new_variant_id) REFERENCES public.product_variants(id);


--
-- Name: product_migration_log product_migration_log_original_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_migration_log
    ADD CONSTRAINT product_migration_log_original_product_id_fkey FOREIGN KEY (original_product_id) REFERENCES public.products(id);


--
-- Name: product_price_history product_price_history_modificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_modificado_por_fkey FOREIGN KEY (modificado_por) REFERENCES auth.users(id);


--
-- Name: product_price_history product_price_history_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_history
    ADD CONSTRAINT product_price_history_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_parent_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_parent_review_id_fkey FOREIGN KEY (parent_review_id) REFERENCES public.product_reviews(id) ON DELETE CASCADE;


--
-- Name: product_reviews product_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_variants product_variants_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.b2b_batches(id);


--
-- Name: product_variants product_variants_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_variants
    ADD CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_views product_views_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: products products_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categories(id);


--
-- Name: products products_parent_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_parent_product_id_fkey FOREIGN KEY (parent_product_id) REFERENCES public.products(id);


--
-- Name: products products_proveedor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_proveedor_id_fkey FOREIGN KEY (proveedor_id) REFERENCES public.suppliers(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: purchase_consolidation_items purchase_consolidation_items_consolidation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidation_items
    ADD CONSTRAINT purchase_consolidation_items_consolidation_id_fkey FOREIGN KEY (consolidation_id) REFERENCES public.purchase_consolidations(id) ON DELETE CASCADE;


--
-- Name: purchase_consolidation_items purchase_consolidation_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidation_items
    ADD CONSTRAINT purchase_consolidation_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_consolidation_items purchase_consolidation_items_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidation_items
    ADD CONSTRAINT purchase_consolidation_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: purchase_consolidations purchase_consolidations_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_consolidations
    ADD CONSTRAINT purchase_consolidations_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: referral_codes referral_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: seller_catalog seller_catalog_seller_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_catalog
    ADD CONSTRAINT seller_catalog_seller_store_id_fkey FOREIGN KEY (seller_store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: seller_catalog seller_catalog_source_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_catalog
    ADD CONSTRAINT seller_catalog_source_order_id_fkey FOREIGN KEY (source_order_id) REFERENCES public.orders_b2b(id) ON DELETE SET NULL;


--
-- Name: seller_catalog seller_catalog_source_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_catalog
    ADD CONSTRAINT seller_catalog_source_product_id_fkey FOREIGN KEY (source_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: seller_commission_overrides seller_commission_overrides_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_overrides
    ADD CONSTRAINT seller_commission_overrides_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: seller_commission_overrides seller_commission_overrides_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_commission_overrides
    ADD CONSTRAINT seller_commission_overrides_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- Name: seller_credits seller_credits_activated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_credits
    ADD CONSTRAINT seller_credits_activated_by_fkey FOREIGN KEY (activated_by) REFERENCES auth.users(id);


--
-- Name: seller_credits seller_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_credits
    ADD CONSTRAINT seller_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: seller_statuses seller_statuses_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_statuses
    ADD CONSTRAINT seller_statuses_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: seller_wallets seller_wallets_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_wallets
    ADD CONSTRAINT seller_wallets_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- Name: sellers sellers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: shipment_tracking shipment_tracking_commune_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_commune_id_fkey FOREIGN KEY (commune_id) REFERENCES public.communes(id);


--
-- Name: shipment_tracking shipment_tracking_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: shipment_tracking shipment_tracking_pickup_point_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipment_tracking
    ADD CONSTRAINT shipment_tracking_pickup_point_id_fkey FOREIGN KEY (pickup_point_id) REFERENCES public.pickup_points(id);


--
-- Name: siver_match_assignments siver_match_assignments_gestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_assignments
    ADD CONSTRAINT siver_match_assignments_gestor_id_fkey FOREIGN KEY (gestor_id) REFERENCES public.siver_match_profiles(id) ON DELETE CASCADE;


--
-- Name: siver_match_assignments siver_match_assignments_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_assignments
    ADD CONSTRAINT siver_match_assignments_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.siver_match_profiles(id);


--
-- Name: siver_match_assignments siver_match_assignments_stock_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_assignments
    ADD CONSTRAINT siver_match_assignments_stock_lot_id_fkey FOREIGN KEY (stock_lot_id) REFERENCES public.siver_match_stock_lots(id) ON DELETE CASCADE;


--
-- Name: siver_match_profiles siver_match_profiles_commune_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_profiles
    ADD CONSTRAINT siver_match_profiles_commune_id_fkey FOREIGN KEY (commune_id) REFERENCES public.communes(id);


--
-- Name: siver_match_profiles siver_match_profiles_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_profiles
    ADD CONSTRAINT siver_match_profiles_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: siver_match_profiles siver_match_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_profiles
    ADD CONSTRAINT siver_match_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: siver_match_reviews siver_match_reviews_reviewed_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_reviews
    ADD CONSTRAINT siver_match_reviews_reviewed_profile_id_fkey FOREIGN KEY (reviewed_profile_id) REFERENCES public.siver_match_profiles(id);


--
-- Name: siver_match_reviews siver_match_reviews_reviewer_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_reviews
    ADD CONSTRAINT siver_match_reviews_reviewer_profile_id_fkey FOREIGN KEY (reviewer_profile_id) REFERENCES public.siver_match_profiles(id);


--
-- Name: siver_match_reviews siver_match_reviews_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_reviews
    ADD CONSTRAINT siver_match_reviews_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.siver_match_sales(id) ON DELETE CASCADE;


--
-- Name: siver_match_sales siver_match_sales_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.siver_match_assignments(id);


--
-- Name: siver_match_sales siver_match_sales_commune_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_commune_id_fkey FOREIGN KEY (commune_id) REFERENCES public.communes(id);


--
-- Name: siver_match_sales siver_match_sales_customer_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_customer_user_id_fkey FOREIGN KEY (customer_user_id) REFERENCES auth.users(id);


--
-- Name: siver_match_sales siver_match_sales_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id);


--
-- Name: siver_match_sales siver_match_sales_gestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_gestor_id_fkey FOREIGN KEY (gestor_id) REFERENCES public.siver_match_profiles(id);


--
-- Name: siver_match_sales siver_match_sales_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.siver_match_profiles(id);


--
-- Name: siver_match_sales siver_match_sales_picked_up_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_picked_up_by_fkey FOREIGN KEY (picked_up_by) REFERENCES auth.users(id);


--
-- Name: siver_match_sales siver_match_sales_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.master_purchase_orders(id) ON DELETE SET NULL;


--
-- Name: siver_match_sales siver_match_sales_stock_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_sales
    ADD CONSTRAINT siver_match_sales_stock_lot_id_fkey FOREIGN KEY (stock_lot_id) REFERENCES public.siver_match_stock_lots(id);


--
-- Name: siver_match_stock_lots siver_match_stock_lots_investor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_stock_lots
    ADD CONSTRAINT siver_match_stock_lots_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.siver_match_profiles(id) ON DELETE CASCADE;


--
-- Name: siver_match_stock_lots siver_match_stock_lots_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_stock_lots
    ADD CONSTRAINT siver_match_stock_lots_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: siver_match_stock_lots siver_match_stock_lots_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_stock_lots
    ADD CONSTRAINT siver_match_stock_lots_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: siver_match_wallet_splits siver_match_wallet_splits_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.siver_match_wallet_splits
    ADD CONSTRAINT siver_match_wallet_splits_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.siver_match_sales(id);


--
-- Name: stock_in_transit stock_in_transit_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_in_transit
    ADD CONSTRAINT stock_in_transit_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.b2b_batches(id);


--
-- Name: stock_in_transit stock_in_transit_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_in_transit
    ADD CONSTRAINT stock_in_transit_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_in_transit stock_in_transit_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_in_transit
    ADD CONSTRAINT stock_in_transit_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: stock_in_transit stock_in_transit_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_in_transit
    ADD CONSTRAINT stock_in_transit_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: stock_reservations stock_reservations_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders_b2b(id) ON DELETE CASCADE;


--
-- Name: stock_reservations stock_reservations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_reservations stock_reservations_seller_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_seller_catalog_id_fkey FOREIGN KEY (seller_catalog_id) REFERENCES public.seller_catalog(id);


--
-- Name: stock_reservations stock_reservations_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: stock_rotation_tracking stock_rotation_tracking_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_rotation_tracking
    ADD CONSTRAINT stock_rotation_tracking_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_rotation_tracking stock_rotation_tracking_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_rotation_tracking
    ADD CONSTRAINT stock_rotation_tracking_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id);


--
-- Name: store_followers store_followers_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_followers
    ADD CONSTRAINT store_followers_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_reviews store_reviews_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_reviews
    ADD CONSTRAINT store_reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: stores stores_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_attribute_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_attribute_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_attribute_option_id_fkey FOREIGN KEY (attribute_option_id) REFERENCES public.attribute_options(id) ON DELETE CASCADE;


--
-- Name: variant_attribute_values variant_attribute_values_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variant_attribute_values
    ADD CONSTRAINT variant_attribute_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE CASCADE;


--
-- Name: wallet_transactions wallet_transactions_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);


--
-- Name: wallet_transactions wallet_transactions_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.seller_wallets(id) ON DELETE CASCADE;


--
-- Name: withdrawal_requests withdrawal_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id);


--
-- Name: withdrawal_requests withdrawal_requests_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);


--
-- Name: withdrawal_requests withdrawal_requests_wallet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES public.seller_wallets(id) ON DELETE CASCADE;


--
-- Name: inventory_movements Admins can insert movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert movements" ON public.inventory_movements FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) OR (created_by = auth.uid())));


--
-- Name: product_price_history Admins can insert price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert price history" ON public.product_price_history FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: b2b_cart_items Admins can manage all cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all cart items" ON public.b2b_cart_items USING (public.is_admin(auth.uid()));


--
-- Name: b2c_cart_items Admins can manage all cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all cart items" ON public.b2c_cart_items USING (public.is_admin(auth.uid()));


--
-- Name: b2b_carts Admins can manage all carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all carts" ON public.b2b_carts USING (public.is_admin(auth.uid()));


--
-- Name: b2c_carts Admins can manage all carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all carts" ON public.b2c_carts USING (public.is_admin(auth.uid()));


--
-- Name: seller_catalog Admins can manage all catalog items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all catalog items" ON public.seller_catalog USING (public.is_admin(auth.uid()));


--
-- Name: seller_credits Admins can manage all credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all credits" ON public.seller_credits USING (public.is_admin(auth.uid()));


--
-- Name: customer_discounts Admins can manage all customer discounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all customer discounts" ON public.customer_discounts USING (public.is_admin(auth.uid()));


--
-- Name: discount_codes Admins can manage all discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all discount codes" ON public.discount_codes USING (public.is_admin(auth.uid()));


--
-- Name: discount_code_uses Admins can manage all discount uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all discount uses" ON public.discount_code_uses USING (public.is_admin(auth.uid()));


--
-- Name: kyc_verifications Admins can manage all kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all kyc" ON public.kyc_verifications USING (public.is_admin(auth.uid()));


--
-- Name: notifications Admins can manage all notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all notifications" ON public.notifications USING (public.is_admin(auth.uid()));


--
-- Name: payment_methods Admins can manage all payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payment methods" ON public.payment_methods USING (public.is_admin(auth.uid()));


--
-- Name: user_notification_preferences Admins can manage all preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all preferences" ON public.user_notification_preferences USING (public.is_admin(auth.uid()));


--
-- Name: pending_quotes Admins can manage all quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all quotes" ON public.pending_quotes USING (public.is_admin(auth.uid()));


--
-- Name: referral_codes Admins can manage all referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all referral codes" ON public.referral_codes USING (public.is_admin(auth.uid()));


--
-- Name: referrals Admins can manage all referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all referrals" ON public.referrals USING (public.is_admin(auth.uid()));


--
-- Name: order_refunds Admins can manage all refunds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all refunds" ON public.order_refunds USING (public.is_admin(auth.uid()));


--
-- Name: admin_approval_requests Admins can manage all requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all requests" ON public.admin_approval_requests USING (public.is_admin(auth.uid()));


--
-- Name: stock_reservations Admins can manage all reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reservations" ON public.stock_reservations USING (public.is_admin(auth.uid()));


--
-- Name: product_reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews USING (public.is_admin(auth.uid()));


--
-- Name: store_reviews Admins can manage all reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all reviews" ON public.store_reviews USING (public.is_admin(auth.uid()));


--
-- Name: seller_statuses Admins can manage all statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all statuses" ON public.seller_statuses USING (public.is_admin(auth.uid()));


--
-- Name: store_reviews Admins can manage all store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all store reviews" ON public.store_reviews USING (public.is_admin(auth.uid()));


--
-- Name: stores Admins can manage all stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all stores" ON public.stores USING (public.is_admin(auth.uid()));


--
-- Name: wallet_transactions Admins can manage all transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all transactions" ON public.wallet_transactions USING (public.is_admin(auth.uid()));


--
-- Name: seller_wallets Admins can manage all wallets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all wallets" ON public.seller_wallets USING (public.is_admin(auth.uid()));


--
-- Name: order_stock_allocations Admins can manage allocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage allocations" ON public.order_stock_allocations USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: attribute_options Admins can manage attribute options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage attribute options" ON public.attribute_options USING (public.is_admin(auth.uid()));


--
-- Name: attributes Admins can manage attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage attributes" ON public.attributes USING (public.is_admin(auth.uid()));


--
-- Name: admin_banners Admins can manage banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage banners" ON public.admin_banners USING (public.is_admin(auth.uid()));


--
-- Name: batch_inventory Admins can manage batch inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage batch inventory" ON public.batch_inventory USING (public.is_admin(auth.uid()));


--
-- Name: b2b_batches Admins can manage batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage batches" ON public.b2b_batches USING (public.is_admin(auth.uid()));


--
-- Name: categories Admins can manage categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage categories" ON public.categories USING (public.is_admin(auth.uid()));


--
-- Name: category_shipping_rates Admins can manage category shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage category shipping rates" ON public.category_shipping_rates USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: referral_codes Admins can manage codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage codes" ON public.referral_codes USING (public.is_admin(auth.uid()));


--
-- Name: seller_commission_overrides Admins can manage commission overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage commission overrides" ON public.seller_commission_overrides USING (public.is_admin(auth.uid()));


--
-- Name: communes Admins can manage communes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage communes" ON public.communes USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: purchase_consolidation_items Admins can manage consolidation items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage consolidation items" ON public.purchase_consolidation_items USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: purchase_consolidations Admins can manage consolidations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage consolidations" ON public.purchase_consolidations USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: commission_debts Admins can manage debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage debts" ON public.commission_debts USING (public.is_admin(auth.uid()));


--
-- Name: order_deliveries Admins can manage deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage deliveries" ON public.order_deliveries USING (public.is_admin(auth.uid()));


--
-- Name: departments Admins can manage departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage departments" ON public.departments USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: dynamic_expenses Admins can manage dynamic expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dynamic expenses" ON public.dynamic_expenses USING (public.is_admin(auth.uid()));


--
-- Name: marketplace_section_settings Admins can manage marketplace sections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage marketplace sections" ON public.marketplace_section_settings USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: product_migration_log Admins can manage migration logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage migration logs" ON public.product_migration_log USING (public.is_admin(auth.uid()));


--
-- Name: credit_movements Admins can manage movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage movements" ON public.credit_movements USING (public.is_admin(auth.uid()));


--
-- Name: b2b_payments Admins can manage payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payments" ON public.b2b_payments USING (public.is_admin(auth.uid()));


--
-- Name: pickup_points Admins can manage pickup points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage pickup points" ON public.pickup_points USING (public.is_admin(auth.uid()));


--
-- Name: platform_settings Admins can manage platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage platform settings" ON public.platform_settings USING (public.is_admin(auth.uid()));


--
-- Name: price_settings Admins can manage price settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage price settings" ON public.price_settings USING (public.is_admin(auth.uid()));


--
-- Name: product_attribute_values Admins can manage product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage product attributes" ON public.product_attribute_values USING (public.is_admin(auth.uid()));


--
-- Name: products Admins can manage products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage products" ON public.products USING (public.is_admin(auth.uid()));


--
-- Name: referral_settings Admins can manage referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage referral settings" ON public.referral_settings USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: stock_rotation_tracking Admins can manage rotation tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage rotation tracking" ON public.stock_rotation_tracking USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: sellers Admins can manage sellers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sellers" ON public.sellers USING (public.is_admin(auth.uid()));


--
-- Name: referral_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.referral_settings USING (public.is_admin(auth.uid()));


--
-- Name: shipment_tracking Admins can manage shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipments" ON public.shipment_tracking USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: shipping_rates Admins can manage shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage shipping rates" ON public.shipping_rates USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: pickup_point_staff Admins can manage staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage staff" ON public.pickup_point_staff USING (public.is_admin(auth.uid()));


--
-- Name: stock_in_transit Admins can manage stock_in_transit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage stock_in_transit" ON public.stock_in_transit USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: suppliers Admins can manage suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage suppliers" ON public.suppliers USING (public.is_admin(auth.uid()));


--
-- Name: variant_attribute_values Admins can manage variant attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage variant attributes" ON public.variant_attribute_values USING (public.is_admin(auth.uid()));


--
-- Name: product_variants Admins can manage variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage variants" ON public.product_variants USING (public.is_admin(auth.uid()));


--
-- Name: withdrawal_requests Admins can manage withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage withdrawals" ON public.withdrawal_requests USING (public.is_admin(auth.uid()));


--
-- Name: inventory_movements Admins can view all movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all movements" ON public.inventory_movements FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: b2b_payments Admins can view all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payments" ON public.b2b_payments FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: products Admins can view all products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all products" ON public.products FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: sellers Admins can view all sellers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sellers" ON public.sellers FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: shipment_tracking Admins can view all shipments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all shipments" ON public.shipment_tracking FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role)))));


--
-- Name: product_price_history Admins can view price history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view price history" ON public.product_price_history FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: product_views Admins can view product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view product views" ON public.product_views FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: suppliers Admins can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view suppliers" ON public.suppliers FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: orders_b2b Admins full access to orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins full access to orders" ON public.orders_b2b USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: order_items_b2b Admins manage all items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage all items" ON public.order_items_b2b USING (public.is_admin(auth.uid()));


--
-- Name: consolidation_settings Allow authenticated to read consolidation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated to read consolidation settings" ON public.consolidation_settings FOR SELECT TO authenticated USING (true);


--
-- Name: consolidation_settings Allow authenticated to update consolidation settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated to update consolidation settings" ON public.consolidation_settings FOR UPDATE TO authenticated USING (true);


--
-- Name: catalog_click_tracking Allow public inserts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public inserts" ON public.catalog_click_tracking FOR INSERT WITH CHECK (true);


--
-- Name: product_views Anyone can insert product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert product views" ON public.product_views FOR INSERT WITH CHECK (true);


--
-- Name: referral_codes Anyone can lookup referral codes for validation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can lookup referral codes for validation" ON public.referral_codes FOR SELECT USING (true);


--
-- Name: category_attribute_templates Anyone can read category templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read category templates" ON public.category_attribute_templates FOR SELECT USING (true);


--
-- Name: payment_methods Anyone can view admin payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view admin payment methods" ON public.payment_methods FOR SELECT USING ((owner_type = 'admin'::text));


--
-- Name: category_shipping_rates Anyone can view category shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view category shipping rates" ON public.category_shipping_rates FOR SELECT USING (true);


--
-- Name: referral_codes Anyone can view codes for lookup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view codes for lookup" ON public.referral_codes FOR SELECT USING (true);


--
-- Name: communes Anyone can view communes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view communes" ON public.communes FOR SELECT USING (true);


--
-- Name: order_deliveries Anyone can view delivery by code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view delivery by code" ON public.order_deliveries FOR SELECT USING (true);


--
-- Name: departments Anyone can view departments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);


--
-- Name: store_followers Anyone can view follower counts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view follower counts" ON public.store_followers FOR SELECT USING (true);


--
-- Name: platform_settings Anyone can view platform settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view platform settings" ON public.platform_settings FOR SELECT USING (true);


--
-- Name: referral_settings Anyone can view referral settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view referral settings" ON public.referral_settings FOR SELECT USING (true);


--
-- Name: product_reviews Anyone can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews" ON public.product_reviews FOR SELECT USING (true);


--
-- Name: store_reviews Anyone can view reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view reviews" ON public.store_reviews FOR SELECT USING (true);


--
-- Name: stock_rotation_tracking Anyone can view rotation tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view rotation tracking" ON public.stock_rotation_tracking FOR SELECT USING (true);


--
-- Name: referral_settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.referral_settings FOR SELECT USING (true);


--
-- Name: shipping_rates Anyone can view shipping rates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view shipping rates" ON public.shipping_rates FOR SELECT USING (true);


--
-- Name: stock_in_transit Anyone can view stock_in_transit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view stock_in_transit" ON public.stock_in_transit FOR SELECT USING (true);


--
-- Name: store_reviews Anyone can view store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view store reviews" ON public.store_reviews FOR SELECT USING (true);


--
-- Name: siver_match_assignments Assignment participants can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Assignment participants can view" ON public.siver_match_assignments FOR SELECT USING (((gestor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))) OR (investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid())))));


--
-- Name: suppliers Authenticated can view suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);


--
-- Name: product_reviews Authenticated users can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create reviews" ON public.product_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: store_reviews Authenticated users can create reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create reviews" ON public.store_reviews FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: store_reviews Authenticated users can create store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create store reviews" ON public.store_reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: category_attribute_templates Authenticated users can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can manage templates" ON public.category_attribute_templates USING ((auth.uid() IS NOT NULL));


--
-- Name: siver_match_badges Badges are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Badges are public" ON public.siver_match_badges FOR SELECT USING ((is_active = true));


--
-- Name: orders_b2b Buyers can cancel their own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can cancel their own orders" ON public.orders_b2b FOR UPDATE USING (((buyer_id = auth.uid()) AND (status = ANY (ARRAY['placed'::text, 'paid'::text])))) WITH CHECK (((buyer_id = auth.uid()) AND (status = 'cancelled'::text)));


--
-- Name: orders_b2b Buyers can confirm their own payment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can confirm their own payment" ON public.orders_b2b FOR UPDATE USING (((buyer_id = auth.uid()) AND (payment_status = ANY (ARRAY['pending'::text, 'pending_validation'::text])))) WITH CHECK ((buyer_id = auth.uid()));


--
-- Name: orders_b2b Buyers can create B2C orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can create B2C orders" ON public.orders_b2b FOR INSERT WITH CHECK (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text)));


--
-- Name: order_items_b2b Buyers can insert items for own B2C orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can insert items for own B2C orders" ON public.order_items_b2b FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_items_b2b.order_id) AND (o.buyer_id = auth.uid()) AND (COALESCE((o.metadata ->> 'order_type'::text), ''::text) = 'b2c'::text)))));


--
-- Name: orders_b2b Buyers can view orders where they are buyer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can view orders where they are buyer" ON public.orders_b2b FOR SELECT USING ((buyer_id = auth.uid()));


--
-- Name: b2b_cart_items Cart items deletable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items deletable with open cart" ON public.b2b_cart_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.b2b_carts c
  WHERE ((c.id = b2b_cart_items.cart_id) AND (c.buyer_user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2c_cart_items Cart items deletable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items deletable with open cart" ON public.b2c_cart_items FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.b2c_carts c
  WHERE ((c.id = b2c_cart_items.cart_id) AND (c.user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2b_cart_items Cart items insertable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items insertable with open cart" ON public.b2b_cart_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.b2b_carts c
  WHERE ((c.id = b2b_cart_items.cart_id) AND (c.buyer_user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2c_cart_items Cart items insertable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items insertable with open cart" ON public.b2c_cart_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.b2c_carts c
  WHERE ((c.id = b2c_cart_items.cart_id) AND (c.user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2b_cart_items Cart items updatable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items updatable with open cart" ON public.b2b_cart_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.b2b_carts c
  WHERE ((c.id = b2b_cart_items.cart_id) AND (c.buyer_user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2c_cart_items Cart items updatable with open cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items updatable with open cart" ON public.b2c_cart_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.b2c_carts c
  WHERE ((c.id = b2c_cart_items.cart_id) AND (c.user_id = auth.uid()) AND (c.status = 'open'::text)))));


--
-- Name: b2b_cart_items Cart items visible with parent cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items visible with parent cart" ON public.b2b_cart_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.b2b_carts c
  WHERE ((c.id = b2b_cart_items.cart_id) AND ((c.buyer_user_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: b2c_cart_items Cart items visible with parent cart; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Cart items visible with parent cart" ON public.b2c_cart_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.b2c_carts c
  WHERE ((c.id = b2c_cart_items.cart_id) AND ((c.user_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: user_roles First user can self-assign admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "First user can self-assign admin" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (NOT (EXISTS ( SELECT 1
   FROM public.user_roles user_roles_1
  WHERE (user_roles_1.role = 'admin'::public.app_role))))));


--
-- Name: siver_match_sales Gestors can create sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Gestors can create sales" ON public.siver_match_sales FOR INSERT WITH CHECK ((gestor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))));


--
-- Name: siver_match_stock_lots Investors can manage own lots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investors can manage own lots" ON public.siver_match_stock_lots USING ((investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))));


--
-- Name: order_items_b2b Items visible to order owner or buyer; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Items visible to order owner or buyer" ON public.order_items_b2b FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_items_b2b.order_id) AND ((o.seller_id = auth.uid()) OR (o.buyer_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: marketplace_section_settings Marketplace sections are publicly readable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Marketplace sections are publicly readable" ON public.marketplace_section_settings FOR SELECT USING (true);


--
-- Name: stores Owners can manage their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their stores" ON public.stores USING ((owner_user_id = auth.uid()));


--
-- Name: siver_match_assignments Participants can manage assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can manage assignments" ON public.siver_match_assignments USING (((gestor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))) OR (investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid())))));


--
-- Name: siver_match_sales Participants can update sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Participants can update sales" ON public.siver_match_sales FOR UPDATE USING (((gestor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))) OR (investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid())))));


--
-- Name: admin_banners Public can view active banners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active banners" ON public.admin_banners FOR SELECT USING (((is_active = true) AND ((starts_at IS NULL) OR (starts_at <= now())) AND ((ends_at IS NULL) OR (ends_at > now()))));


--
-- Name: seller_catalog Public can view active catalog items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active catalog items" ON public.seller_catalog FOR SELECT USING ((is_active = true));


--
-- Name: pickup_points Public can view active pickup points; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active pickup points" ON public.pickup_points FOR SELECT USING ((is_active = true));


--
-- Name: products Public can view active products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active products" ON public.products FOR SELECT USING ((is_active = true));


--
-- Name: seller_statuses Public can view active statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active statuses" ON public.seller_statuses FOR SELECT USING ((expires_at > now()));


--
-- Name: stores Public can view active stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active stores" ON public.stores FOR SELECT USING ((is_active = true));


--
-- Name: product_variants Public can view active variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view active variants" ON public.product_variants FOR SELECT USING ((is_active = true));


--
-- Name: attribute_options Public can view attribute options; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view attribute options" ON public.attribute_options FOR SELECT USING ((is_active = true));


--
-- Name: attributes Public can view attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view attributes" ON public.attributes FOR SELECT USING ((is_active = true));


--
-- Name: categories Public can view categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);


--
-- Name: delivery_ratings Public can view non-anonymous ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view non-anonymous ratings" ON public.delivery_ratings FOR SELECT USING ((is_anonymous = false));


--
-- Name: product_attribute_values Public can view product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view product attributes" ON public.product_attribute_values FOR SELECT USING (true);


--
-- Name: variant_attribute_values Public can view variant attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view variant attributes" ON public.variant_attribute_values FOR SELECT USING (true);


--
-- Name: siver_match_profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public profiles are viewable by everyone" ON public.siver_match_profiles FOR SELECT USING ((is_active = true));


--
-- Name: siver_match_stock_lots Published lots are viewable; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Published lots are viewable" ON public.siver_match_stock_lots FOR SELECT USING (((status = ANY (ARRAY['published'::public.stock_lot_status, 'assigned'::public.stock_lot_status, 'in_hub'::public.stock_lot_status, 'active'::public.stock_lot_status])) OR (investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid())))));


--
-- Name: siver_match_reviews Reviews are public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Reviews are public" ON public.siver_match_reviews FOR SELECT USING ((is_public = true));


--
-- Name: siver_match_sales Sale participants can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sale participants can view" ON public.siver_match_sales FOR SELECT USING (((customer_user_id = auth.uid()) OR (gestor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))) OR (investor_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid())))));


--
-- Name: orders_b2b Sellers can confirm payments for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can confirm payments for their orders" ON public.orders_b2b FOR UPDATE USING (((seller_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text) AND (payment_status = ANY (ARRAY['pending_validation'::text, 'pending'::text])))) WITH CHECK (((seller_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text)));


--
-- Name: withdrawal_requests Sellers can create and view own withdrawals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can create and view own withdrawals" ON public.withdrawal_requests USING ((EXISTS ( SELECT 1
   FROM public.sellers s
  WHERE ((s.id = withdrawal_requests.seller_id) AND (s.user_id = auth.uid())))));


--
-- Name: orders_b2b Sellers can create own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can create own orders" ON public.orders_b2b FOR INSERT WITH CHECK ((seller_id = auth.uid()));


--
-- Name: pending_quotes Sellers can create quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can create quotes" ON public.pending_quotes FOR INSERT WITH CHECK ((auth.uid() = seller_id));


--
-- Name: sellers Sellers can insert their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can insert their own record" ON public.sellers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: customer_discounts Sellers can manage their store customer discounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can manage their store customer discounts" ON public.customer_discounts USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: discount_codes Sellers can manage their store discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can manage their store discount codes" ON public.discount_codes USING ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid())))) WITH CHECK ((store_id IN ( SELECT stores.id
   FROM public.stores
  WHERE (stores.owner_user_id = auth.uid()))));


--
-- Name: orders_b2b Sellers can update draft orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update draft orders" ON public.orders_b2b FOR UPDATE USING (((seller_id = auth.uid()) AND (status = 'draft'::text)));


--
-- Name: pending_quotes Sellers can update own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update own quotes" ON public.pending_quotes FOR UPDATE USING (((auth.uid() = seller_id) AND (status = 'pending'::text)));


--
-- Name: sellers Sellers can update their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can update their own record" ON public.sellers FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: commission_debts Sellers can view own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view own debts" ON public.commission_debts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sellers s
  WHERE ((s.id = commission_debts.seller_id) AND (s.user_id = auth.uid())))));


--
-- Name: orders_b2b Sellers can view own orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view own orders" ON public.orders_b2b FOR SELECT USING ((seller_id = auth.uid()));


--
-- Name: pending_quotes Sellers can view own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view own quotes" ON public.pending_quotes FOR SELECT USING ((auth.uid() = seller_id));


--
-- Name: wallet_transactions Sellers can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view own transactions" ON public.wallet_transactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.seller_wallets w
     JOIN public.sellers s ON ((s.id = w.seller_id)))
  WHERE ((w.id = wallet_transactions.wallet_id) AND (s.user_id = auth.uid())))));


--
-- Name: seller_wallets Sellers can view own wallet; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view own wallet" ON public.seller_wallets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sellers s
  WHERE ((s.id = seller_wallets.seller_id) AND (s.user_id = auth.uid())))));


--
-- Name: batch_inventory Sellers can view their batch inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view their batch inventory" ON public.batch_inventory FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.b2b_batches b
     JOIN public.orders_b2b o ON ((o.id = b.order_id)))
  WHERE ((b.id = batch_inventory.batch_id) AND (o.seller_id = auth.uid())))));


--
-- Name: b2b_batches Sellers can view their batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view their batches" ON public.b2b_batches FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = b2b_batches.order_id) AND (o.seller_id = auth.uid())))));


--
-- Name: seller_commission_overrides Sellers can view their own overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view their own overrides" ON public.seller_commission_overrides FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sellers s
  WHERE ((s.id = seller_commission_overrides.seller_id) AND (s.user_id = auth.uid())))));


--
-- Name: sellers Sellers can view their own record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view their own record" ON public.sellers FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: discount_code_uses Sellers can view their store discount uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can view their store discount uses" ON public.discount_code_uses FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.discount_codes dc
     JOIN public.stores s ON ((s.id = dc.store_id)))
  WHERE ((dc.id = discount_code_uses.discount_code_id) AND (s.owner_user_id = auth.uid())))));


--
-- Name: catalog_click_tracking Sellers view own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers view own" ON public.catalog_click_tracking FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = catalog_click_tracking.seller_id) AND (s.owner_user_id = auth.uid())))));


--
-- Name: notifications Service can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);


--
-- Name: order_deliveries Staff can manage deliveries at their point; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can manage deliveries at their point" ON public.order_deliveries USING ((EXISTS ( SELECT 1
   FROM public.pickup_point_staff pps
  WHERE ((pps.pickup_point_id = order_deliveries.pickup_point_id) AND (pps.user_id = auth.uid()) AND (pps.is_active = true)))));


--
-- Name: pickup_point_staff Staff can view own assignment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own assignment" ON public.pickup_point_staff FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: seller_catalog Store owners can manage their catalog; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store owners can manage their catalog" ON public.seller_catalog USING ((EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = seller_catalog.seller_store_id) AND (s.owner_user_id = auth.uid())))));


--
-- Name: seller_statuses Store owners can manage their statuses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store owners can manage their statuses" ON public.seller_statuses USING ((EXISTS ( SELECT 1
   FROM public.stores s
  WHERE ((s.id = seller_statuses.store_id) AND (s.owner_user_id = auth.uid())))));


--
-- Name: inventory_movements Store owners can view their movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Store owners can view their movements" ON public.inventory_movements FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.seller_catalog sc
     JOIN public.stores s ON ((s.id = sc.seller_store_id)))
  WHERE ((sc.id = inventory_movements.seller_catalog_id) AND (s.owner_user_id = auth.uid())))));


--
-- Name: asset_processing_items Users can create items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create items" ON public.asset_processing_items FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: asset_processing_jobs Users can create jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create jobs" ON public.asset_processing_jobs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: b2b_carts Users can create own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own carts" ON public.b2b_carts FOR INSERT WITH CHECK ((buyer_user_id = auth.uid()));


--
-- Name: b2c_carts Users can create own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own carts" ON public.b2c_carts FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: siver_match_reviews Users can create own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own reviews" ON public.siver_match_reviews FOR INSERT WITH CHECK ((reviewer_profile_id IN ( SELECT siver_match_profiles.id
   FROM public.siver_match_profiles
  WHERE (siver_match_profiles.user_id = auth.uid()))));


--
-- Name: referrals Users can create referrals when referred; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create referrals when referred" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referred_id));


--
-- Name: order_refunds Users can create refunds for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create refunds for their orders" ON public.order_refunds FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_refunds.order_id) AND (o.seller_id = auth.uid())))));


--
-- Name: addresses Users can create their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own addresses" ON public.addresses FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: delivery_ratings Users can create their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own ratings" ON public.delivery_ratings FOR INSERT WITH CHECK ((auth.uid() = customer_user_id));


--
-- Name: product_reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.product_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: store_reviews Users can delete own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own reviews" ON public.store_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: store_reviews Users can delete own store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own store reviews" ON public.store_reviews FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: addresses Users can delete their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own addresses" ON public.addresses FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: store_followers Users can follow stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can follow stores" ON public.store_followers FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: order_items_b2b Users can insert items for their orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert items for their orders" ON public.order_items_b2b FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_items_b2b.order_id) AND ((o.seller_id = auth.uid()) OR (o.buyer_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: kyc_verifications Users can insert own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own kyc" ON public.kyc_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: siver_match_profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.siver_match_profiles FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: referrals Users can insert referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK ((auth.uid() = referred_id));


--
-- Name: discount_code_uses Users can insert their own discount uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own discount uses" ON public.discount_code_uses FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_notification_preferences Users can insert their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: payment_methods Users can manage their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own payment methods" ON public.payment_methods USING ((auth.uid() = owner_id)) WITH CHECK ((auth.uid() = owner_id));


--
-- Name: store_followers Users can unfollow stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow stores" ON public.store_followers FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: asset_processing_items Users can update items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update items" ON public.asset_processing_items FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.asset_processing_jobs
  WHERE ((asset_processing_jobs.id = asset_processing_items.job_id) AND ((asset_processing_jobs.user_id = auth.uid()) OR (auth.uid() IS NOT NULL))))));


--
-- Name: b2b_carts Users can update own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own carts" ON public.b2b_carts FOR UPDATE USING ((buyer_user_id = auth.uid())) WITH CHECK ((buyer_user_id = auth.uid()));


--
-- Name: b2c_carts Users can update own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own carts" ON public.b2c_carts FOR UPDATE USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: kyc_verifications Users can update own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own kyc" ON public.kyc_verifications FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'unverified'::public.verification_status)));


--
-- Name: notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: siver_match_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.siver_match_profiles FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: product_reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.product_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: store_reviews Users can update own reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own reviews" ON public.store_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: store_reviews Users can update own store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own store reviews" ON public.store_reviews FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: addresses Users can update their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own addresses" ON public.addresses FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: asset_processing_jobs Users can update their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own jobs" ON public.asset_processing_jobs FOR UPDATE USING (((auth.uid() = user_id) OR (auth.uid() IS NOT NULL)));


--
-- Name: user_notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_notification_preferences FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: delivery_ratings Users can update their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own ratings" ON public.delivery_ratings FOR UPDATE USING ((auth.uid() = customer_user_id));


--
-- Name: discount_codes Users can view active discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active discount codes" ON public.discount_codes FOR SELECT USING (((is_active = true) AND ((valid_from IS NULL) OR (valid_from <= now())) AND ((valid_until IS NULL) OR (valid_until > now()))));


--
-- Name: asset_processing_items Users can view items for their jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view items for their jobs" ON public.asset_processing_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.asset_processing_jobs
  WHERE ((asset_processing_jobs.id = asset_processing_items.job_id) AND ((asset_processing_jobs.user_id = auth.uid()) OR (auth.uid() IS NOT NULL))))));


--
-- Name: b2b_carts Users can view own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own carts" ON public.b2b_carts FOR SELECT USING ((buyer_user_id = auth.uid()));


--
-- Name: b2c_carts Users can view own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own carts" ON public.b2c_carts FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: referral_codes Users can view own code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own code" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: seller_credits Users can view own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credits" ON public.seller_credits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: kyc_verifications Users can view own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own kyc" ON public.kyc_verifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_movements Users can view own movements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own movements" ON public.credit_movements FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: notifications Users can view own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: stock_reservations Users can view own order reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own order reservations" ON public.stock_reservations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = stock_reservations.order_id) AND ((o.seller_id = auth.uid()) OR (o.buyer_id = auth.uid()))))));


--
-- Name: referral_codes Users can view own referral codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referral codes" ON public.referral_codes FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: admin_approval_requests Users can view own requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own requests" ON public.admin_approval_requests FOR SELECT USING ((auth.uid() = requester_id));


--
-- Name: referrals Users can view referrals they made; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: addresses Users can view their own addresses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own addresses" ON public.addresses FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: discount_code_uses Users can view their own discount uses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own discount uses" ON public.discount_code_uses FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: customer_discounts Users can view their own discounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own discounts" ON public.customer_discounts FOR SELECT USING ((customer_user_id = auth.uid()));


--
-- Name: asset_processing_jobs Users can view their own jobs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own jobs" ON public.asset_processing_jobs FOR SELECT USING (((auth.uid() = user_id) OR (auth.uid() IS NOT NULL)));


--
-- Name: payment_methods Users can view their own payment methods; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own payment methods" ON public.payment_methods FOR SELECT USING ((auth.uid() = owner_id));


--
-- Name: user_notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: delivery_ratings Users can view their own ratings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own ratings" ON public.delivery_ratings FOR SELECT USING ((auth.uid() = customer_user_id));


--
-- Name: order_refunds Users can view their own refunds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own refunds" ON public.order_refunds FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_refunds.order_id) AND (o.seller_id = auth.uid())))));


--
-- Name: stock_reservations Users can view their own reservations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own reservations" ON public.stock_reservations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = stock_reservations.order_id) AND ((o.seller_id = auth.uid()) OR (o.buyer_id = auth.uid()))))));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: siver_match_wallet_splits Wallet splits visible to participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Wallet splits visible to participants" ON public.siver_match_wallet_splits FOR SELECT USING ((sale_id IN ( SELECT siver_match_sales.id
   FROM public.siver_match_sales
  WHERE ((siver_match_sales.gestor_id IN ( SELECT siver_match_profiles.id
           FROM public.siver_match_profiles
          WHERE (siver_match_profiles.user_id = auth.uid()))) OR (siver_match_sales.investor_id IN ( SELECT siver_match_profiles.id
           FROM public.siver_match_profiles
          WHERE (siver_match_profiles.user_id = auth.uid())))))));


--
-- Name: addresses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_approval_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_banners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_banners ENABLE ROW LEVEL SECURITY;

--
-- Name: master_purchase_orders admin_full_access_master_po; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access_master_po ON public.master_purchase_orders USING (public.is_admin(auth.uid()));


--
-- Name: po_order_links admin_full_access_po_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access_po_links ON public.po_order_links USING (public.is_admin(auth.uid()));


--
-- Name: po_picking_items admin_full_access_po_picking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access_po_picking ON public.po_picking_items USING (public.is_admin(auth.uid()));


--
-- Name: asset_processing_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_processing_items ENABLE ROW LEVEL SECURITY;

--
-- Name: asset_processing_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asset_processing_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: attribute_options; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;

--
-- Name: attributes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;

--
-- Name: b2b_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2b_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: b2b_cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2b_cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: b2b_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2b_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: b2b_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2b_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: b2c_cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2c_cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: b2c_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.b2c_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: batch_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.batch_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_click_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_click_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: category_attribute_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_attribute_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: category_shipping_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_shipping_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_debts ENABLE ROW LEVEL SECURITY;

--
-- Name: communes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;

--
-- Name: consolidation_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consolidation_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_discounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

--
-- Name: delivery_ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

--
-- Name: departments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_code_uses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_code_uses ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_expenses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_expenses ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: kyc_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_section_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_section_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: master_purchase_orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_purchase_orders ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: order_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items_b2b; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items_b2b ENABLE ROW LEVEL SECURITY;

--
-- Name: order_refunds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

--
-- Name: order_stock_allocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_stock_allocations ENABLE ROW LEVEL SECURITY;

--
-- Name: orders_b2b; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders_b2b ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_methods; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: pickup_point_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pickup_point_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: pickup_points; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: po_order_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_order_links ENABLE ROW LEVEL SECURITY;

--
-- Name: po_picking_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.po_picking_items ENABLE ROW LEVEL SECURITY;

--
-- Name: price_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: product_attribute_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;

--
-- Name: product_migration_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_migration_log ENABLE ROW LEVEL SECURITY;

--
-- Name: product_price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: product_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: product_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: product_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_consolidation_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_consolidation_items ENABLE ROW LEVEL SECURITY;

--
-- Name: purchase_consolidations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.purchase_consolidations ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_catalog; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_catalog ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_commission_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_commission_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_credits ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_statuses ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_wallets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;

--
-- Name: sellers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

--
-- Name: shipment_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: shipping_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_sales ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_stock_lots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_stock_lots ENABLE ROW LEVEL SECURITY;

--
-- Name: siver_match_wallet_splits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.siver_match_wallet_splits ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_in_transit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_in_transit ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_reservations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_rotation_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_rotation_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: store_followers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_followers ENABLE ROW LEVEL SECURITY;

--
-- Name: store_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: user_notification_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: po_order_links users_view_own_po_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_view_own_po_links ON public.po_order_links FOR SELECT USING ((customer_user_id = auth.uid()));


--
-- Name: variant_attribute_values; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;

--
-- Name: wallet_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: withdrawal_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;
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
    updated_at timestamp with time zone DEFAULT now() NOT NULL
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
    payment_confirmed_at timestamp with time zone
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
    longitude numeric(11,8)
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
-- Name: commission_debts commission_debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commission_debts
    ADD CONSTRAINT commission_debts_pkey PRIMARY KEY (id);


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
-- Name: orders_b2b orders_b2b_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_pkey PRIMARY KEY (id);


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
-- Name: stock_reservations stock_reservations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_reservations
    ADD CONSTRAINT stock_reservations_pkey PRIMARY KEY (id);


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
-- Name: idx_order_deliveries_release; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_deliveries_release ON public.order_deliveries USING btree (escrow_release_at) WHERE (funds_released = false);


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
-- Name: idx_orders_b2b_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_created ON public.orders_b2b USING btree (created_at DESC);


--
-- Name: idx_orders_b2b_payment_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_b2b_payment_status ON public.orders_b2b USING btree (payment_status);


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
-- Name: idx_pickup_staff_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pickup_staff_user ON public.pickup_point_staff USING btree (user_id);


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
-- Name: idx_seller_catalog_sku; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_sku ON public.seller_catalog USING btree (sku);


--
-- Name: idx_seller_catalog_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_catalog_source ON public.seller_catalog USING btree (source_product_id);


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
-- Name: addresses update_addresses_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: admin_approval_requests update_admin_approval_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_approval_requests_updated_at BEFORE UPDATE ON public.admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: pickup_points update_pickup_points_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pickup_points_updated_at BEFORE UPDATE ON public.pickup_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_settings update_platform_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


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
-- Name: orders_b2b orders_b2b_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders_b2b
    ADD CONSTRAINT orders_b2b_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


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
-- Name: referral_codes Admins can manage codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage codes" ON public.referral_codes USING (public.is_admin(auth.uid()));


--
-- Name: seller_commission_overrides Admins can manage commission overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage commission overrides" ON public.seller_commission_overrides USING (public.is_admin(auth.uid()));


--
-- Name: commission_debts Admins can manage debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage debts" ON public.commission_debts USING (public.is_admin(auth.uid()));


--
-- Name: order_deliveries Admins can manage deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage deliveries" ON public.order_deliveries USING (public.is_admin(auth.uid()));


--
-- Name: dynamic_expenses Admins can manage dynamic expenses; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage dynamic expenses" ON public.dynamic_expenses USING (public.is_admin(auth.uid()));


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
-- Name: sellers Admins can manage sellers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sellers" ON public.sellers USING (public.is_admin(auth.uid()));


--
-- Name: referral_settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.referral_settings USING (public.is_admin(auth.uid()));


--
-- Name: pickup_point_staff Admins can manage staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage staff" ON public.pickup_point_staff USING (public.is_admin(auth.uid()));


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
-- Name: product_views Anyone can insert product views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert product views" ON public.product_views FOR INSERT WITH CHECK (true);


--
-- Name: referral_codes Anyone can lookup referral codes for validation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can lookup referral codes for validation" ON public.referral_codes FOR SELECT USING (true);


--
-- Name: referral_codes Anyone can view codes for lookup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view codes for lookup" ON public.referral_codes FOR SELECT USING (true);


--
-- Name: order_deliveries Anyone can view delivery by code; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view delivery by code" ON public.order_deliveries FOR SELECT USING (true);


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
-- Name: referral_settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.referral_settings FOR SELECT USING (true);


--
-- Name: store_reviews Anyone can view store reviews; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view store reviews" ON public.store_reviews FOR SELECT USING (true);


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
-- Name: orders_b2b Buyers can cancel their own B2C orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can cancel their own B2C orders" ON public.orders_b2b FOR UPDATE USING (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text) AND (status = ANY (ARRAY['placed'::text, 'paid'::text])))) WITH CHECK (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text) AND (status = 'cancelled'::text)));


--
-- Name: orders_b2b Buyers can confirm their own B2C payment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can confirm their own B2C payment" ON public.orders_b2b FOR UPDATE USING (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text) AND (payment_status = ANY (ARRAY['pending'::text, 'pending_validation'::text])))) WITH CHECK (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text)));


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
-- Name: orders_b2b Buyers can view own B2C orders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Buyers can view own B2C orders" ON public.orders_b2b FOR SELECT USING (((buyer_id = auth.uid()) AND (COALESCE((metadata ->> 'order_type'::text), ''::text) = 'b2c'::text)));


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
-- Name: order_items_b2b Items insertable with parent order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Items insertable with parent order" ON public.order_items_b2b FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_items_b2b.order_id) AND ((o.seller_id = auth.uid()) OR public.is_admin(auth.uid())) AND (o.status = 'draft'::text)))));


--
-- Name: order_items_b2b Items visible with parent order; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Items visible with parent order" ON public.order_items_b2b FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders_b2b o
  WHERE ((o.id = order_items_b2b.order_id) AND ((o.seller_id = auth.uid()) OR public.is_admin(auth.uid()))))));


--
-- Name: stores Owners can manage their stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage their stores" ON public.stores USING ((owner_user_id = auth.uid()));


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
-- Name: product_attribute_values Public can view product attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view product attributes" ON public.product_attribute_values FOR SELECT USING (true);


--
-- Name: variant_attribute_values Public can view variant attributes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view variant attributes" ON public.variant_attribute_values FOR SELECT USING (true);


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
-- Name: b2b_carts Users can create own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own carts" ON public.b2b_carts FOR INSERT WITH CHECK ((buyer_user_id = auth.uid()));


--
-- Name: b2c_carts Users can create own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own carts" ON public.b2c_carts FOR INSERT WITH CHECK ((user_id = auth.uid()));


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
-- Name: kyc_verifications Users can insert own kyc; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own kyc" ON public.kyc_verifications FOR INSERT WITH CHECK ((auth.uid() = user_id));


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
-- Name: store_followers Users can unfollow stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can unfollow stores" ON public.store_followers FOR DELETE USING ((auth.uid() = user_id));


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
-- Name: user_notification_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.user_notification_preferences FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: discount_codes Users can view active discount codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view active discount codes" ON public.discount_codes FOR SELECT USING (((is_active = true) AND ((valid_from IS NULL) OR (valid_from <= now())) AND ((valid_until IS NULL) OR (valid_until > now()))));


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
-- Name: user_notification_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.user_notification_preferences FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


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
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: commission_debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.commission_debts ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_movements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_movements ENABLE ROW LEVEL SECURITY;

--
-- Name: customer_discounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

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
-- Name: orders_b2b; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders_b2b ENABLE ROW LEVEL SECURITY;

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
-- Name: stock_reservations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

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
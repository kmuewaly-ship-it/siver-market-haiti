-- =============================================
-- ECOSISTEMA LOGÍSTICO INTELIGENTE
-- Seguridad Dual, Asignación Automática y Calificaciones
-- =============================================

-- 1. Extender order_deliveries con campos de seguridad dual
ALTER TABLE public.order_deliveries 
ADD COLUMN IF NOT EXISTS customer_qr_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS security_pin VARCHAR(4),
ADD COLUMN IF NOT EXISTS delivery_method VARCHAR(20) DEFAULT 'pickup_point',
ADD COLUMN IF NOT EXISTS hybrid_tracking_revealed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS hybrid_tracking_revealed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_channel VARCHAR(20);

-- 2. Crear tabla de calificaciones de entrega
CREATE TABLE IF NOT EXISTS public.delivery_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_delivery_id UUID REFERENCES public.order_deliveries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL,
  order_type VARCHAR(10) DEFAULT 'b2c',
  customer_user_id UUID NOT NULL,
  
  -- Calificación del producto
  product_rating INTEGER CHECK (product_rating >= 1 AND product_rating <= 5),
  product_comment TEXT,
  
  -- Calificación del servicio de entrega
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  delivery_comment TEXT,
  
  -- Metadata
  rated_at TIMESTAMPTZ DEFAULT now(),
  is_anonymous BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_order ON public.delivery_ratings(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_ratings_customer ON public.delivery_ratings(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_pickup_status ON public.order_deliveries(pickup_point_id, status);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_customer_qr ON public.order_deliveries(customer_qr_code);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_security_pin ON public.order_deliveries(security_pin);

-- 4. Función para generar códigos de seguridad únicos
CREATE OR REPLACE FUNCTION public.generate_delivery_security_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

-- 5. Trigger para auto-generar códigos al crear delivery
DROP TRIGGER IF EXISTS trigger_generate_security_codes ON public.order_deliveries;
CREATE TRIGGER trigger_generate_security_codes
BEFORE INSERT ON public.order_deliveries
FOR EACH ROW
WHEN (NEW.customer_qr_code IS NULL OR NEW.security_pin IS NULL)
EXECUTE FUNCTION public.generate_delivery_security_codes();

-- 6. Función para validar PIN y revelar tracking (Courier Externo)
CREATE OR REPLACE FUNCTION public.validate_courier_delivery(
  p_qr_code VARCHAR(6),
  p_security_pin VARCHAR(4)
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  delivery_id UUID,
  hybrid_tracking_id TEXT,
  order_id UUID,
  pickup_point_name TEXT
)
LANGUAGE plpgsql
SET search_path = public
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

-- 7. Función para confirmar entrega en Punto Oficial (PIN físico)
CREATE OR REPLACE FUNCTION public.confirm_pickup_point_delivery(
  p_qr_code VARCHAR(6),
  p_physical_pin VARCHAR(4),
  p_operator_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  delivery_id UUID,
  order_id UUID,
  escrow_release_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SET search_path = public
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

-- 8. Función para asignar punto de entrega automáticamente
CREATE OR REPLACE FUNCTION public.assign_pickup_point_to_order(
  p_order_id UUID,
  p_order_type VARCHAR(10),
  p_customer_commune_id UUID DEFAULT NULL,
  p_preferred_pickup_point_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
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

-- 9. Función para crear delivery con asignación automática
CREATE OR REPLACE FUNCTION public.create_order_delivery_with_assignment(
  p_order_id UUID,
  p_order_type VARCHAR(10) DEFAULT 'b2c',
  p_delivery_method VARCHAR(20) DEFAULT 'pickup_point',
  p_customer_commune_id UUID DEFAULT NULL,
  p_preferred_pickup_point_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SET search_path = public
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

-- 10. Función para enviar notificación de entrega
CREATE OR REPLACE FUNCTION public.trigger_delivery_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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

DROP TRIGGER IF EXISTS trigger_delivery_notification ON public.order_deliveries;
CREATE TRIGGER trigger_delivery_notification
AFTER UPDATE ON public.order_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.trigger_delivery_notification();

-- 11. RLS Policies para delivery_ratings
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own ratings"
ON public.delivery_ratings FOR SELECT
USING (auth.uid() = customer_user_id);

CREATE POLICY "Users can create their own ratings"
ON public.delivery_ratings FOR INSERT
WITH CHECK (auth.uid() = customer_user_id);

CREATE POLICY "Users can update their own ratings"
ON public.delivery_ratings FOR UPDATE
USING (auth.uid() = customer_user_id);

-- Permitir lectura pública de ratings (sin datos personales)
CREATE POLICY "Public can view non-anonymous ratings"
ON public.delivery_ratings FOR SELECT
USING (is_anonymous = false);

-- 12. Vista para operarios de puntos de entrega
CREATE OR REPLACE VIEW public.pickup_point_pending_deliveries AS
SELECT 
  od.id as delivery_id,
  od.order_id,
  od.order_type,
  od.customer_qr_code,
  od.security_pin,
  od.status,
  od.delivery_method,
  od.assigned_at,
  pp.id as pickup_point_id,
  pp.name as pickup_point_name,
  pp.address as pickup_point_address,
  st.hybrid_tracking_id,
  st.customer_name,
  st.customer_phone,
  st.unit_count
FROM order_deliveries od
JOIN pickup_points pp ON od.pickup_point_id = pp.id
LEFT JOIN shipment_tracking st ON od.order_id = st.order_id
WHERE od.status IN ('pending', 'ready')
AND pp.is_active = true;

-- 13. Habilitar realtime para delivery_ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_ratings;

-- 14. Agregar campo de punto de entrega preferido a addresses
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS preferred_pickup_point_id UUID REFERENCES public.pickup_points(id);

-- 15. Actualizar campos existentes si no tienen códigos
UPDATE public.order_deliveries
SET customer_qr_code = LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    security_pin = LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0')
WHERE customer_qr_code IS NULL OR security_pin IS NULL;
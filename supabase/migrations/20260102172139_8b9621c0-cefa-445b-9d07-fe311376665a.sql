
-- FASE 2: SISTEMA DE CÓDIGOS DE DESCUENTO

-- 2.1 Crear tabla discount_codes
CREATE TABLE public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_purchase_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  used_count INTEGER DEFAULT 0,
  max_uses_per_user INTEGER DEFAULT 1,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  applies_to TEXT DEFAULT 'all' CHECK (applies_to IN ('all', 'specific_products', 'specific_categories')),
  applicable_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.2 Crear tabla discount_code_uses (historial de uso)
CREATE TABLE public.discount_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID,
  discount_applied NUMERIC NOT NULL,
  used_at TIMESTAMPTZ DEFAULT now()
);

-- 2.3 Crear tabla customer_discounts (descuentos personalizados)
CREATE TABLE public.customer_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  reason TEXT,
  valid_from TIMESTAMPTZ DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Índices para búsquedas eficientes
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_store ON public.discount_codes(store_id);
CREATE INDEX idx_discount_codes_active ON public.discount_codes(is_active) WHERE is_active = true;
CREATE INDEX idx_discount_code_uses_code ON public.discount_code_uses(discount_code_id);
CREATE INDEX idx_discount_code_uses_user ON public.discount_code_uses(user_id);
CREATE INDEX idx_customer_discounts_customer ON public.customer_discounts(customer_user_id);
CREATE INDEX idx_customer_discounts_store ON public.customer_discounts(store_id);

-- 2.5 Trigger para updated_at
CREATE TRIGGER update_discount_codes_updated_at
  BEFORE UPDATE ON public.discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_discounts_updated_at
  BEFORE UPDATE ON public.customer_discounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2.6 Habilitar RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_discounts ENABLE ROW LEVEL SECURITY;

-- 2.7 RLS Policies para discount_codes

-- Admins tienen acceso total
CREATE POLICY "Admins can manage all discount codes"
ON public.discount_codes FOR ALL
USING (public.is_admin(auth.uid()));

-- Sellers pueden gestionar códigos de SU tienda
CREATE POLICY "Sellers can manage their store discount codes"
ON public.discount_codes FOR ALL
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
);

-- Usuarios pueden ver códigos activos para validarlos
CREATE POLICY "Users can view active discount codes"
ON public.discount_codes FOR SELECT
USING (
  is_active = true 
  AND (valid_from IS NULL OR valid_from <= now())
  AND (valid_until IS NULL OR valid_until > now())
);

-- 2.8 RLS Policies para discount_code_uses

-- Admins pueden ver todo
CREATE POLICY "Admins can manage all discount uses"
ON public.discount_code_uses FOR ALL
USING (public.is_admin(auth.uid()));

-- Sellers pueden ver usos de códigos de su tienda
CREATE POLICY "Sellers can view their store discount uses"
ON public.discount_code_uses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.discount_codes dc
    JOIN public.stores s ON s.id = dc.store_id
    WHERE dc.id = discount_code_uses.discount_code_id
    AND s.owner_user_id = auth.uid()
  )
);

-- Usuarios pueden registrar uso de códigos
CREATE POLICY "Users can insert their own discount uses"
ON public.discount_code_uses FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Usuarios pueden ver sus propios usos
CREATE POLICY "Users can view their own discount uses"
ON public.discount_code_uses FOR SELECT
USING (user_id = auth.uid());

-- 2.9 RLS Policies para customer_discounts

-- Admins tienen acceso total
CREATE POLICY "Admins can manage all customer discounts"
ON public.customer_discounts FOR ALL
USING (public.is_admin(auth.uid()));

-- Sellers pueden gestionar descuentos de clientes de SU tienda
CREATE POLICY "Sellers can manage their store customer discounts"
ON public.customer_discounts FOR ALL
USING (
  store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
)
WITH CHECK (
  store_id IN (SELECT id FROM public.stores WHERE owner_user_id = auth.uid())
);

-- Usuarios pueden ver sus propios descuentos
CREATE POLICY "Users can view their own discounts"
ON public.customer_discounts FOR SELECT
USING (customer_user_id = auth.uid());

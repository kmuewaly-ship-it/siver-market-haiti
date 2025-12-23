-- =====================================================
-- MIGRACIÓN: Soporte para Promos, Moneda, Variantes y Reseñas
-- =====================================================

-- 1. ACTUALIZAR TABLA PRODUCTS - Campos de promoción, moneda y agregados de reseñas
-- =====================================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS precio_promocional NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promo_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS promo_starts_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS promo_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;

-- 2. CREAR TABLA PRODUCT_VARIANTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  option_type TEXT NOT NULL, -- 'size', 'color', 'material', etc.
  option_value TEXT NOT NULL, -- 'XL', 'Rojo', 'Algodón', etc.
  price NUMERIC DEFAULT NULL, -- NULL = usa precio del producto base
  precio_promocional NUMERIC DEFAULT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  moq INTEGER NOT NULL DEFAULT 1,
  images JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_option ON public.product_variants(option_type, option_value);

-- 3. CREAR TABLA PRODUCT_REVIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id) -- Un usuario, una reseña por producto
);

-- Índices para product_reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_rating ON public.product_reviews(rating);

-- 4. FUNCIÓN PARA ACTUALIZAR AGREGADOS DE RESEÑAS EN PRODUCTS
-- =====================================================

CREATE OR REPLACE FUNCTION public.fn_update_product_review_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger para mantener agregados actualizados
DROP TRIGGER IF EXISTS trg_update_product_review_aggregates ON public.product_reviews;
CREATE TRIGGER trg_update_product_review_aggregates
AFTER INSERT OR UPDATE OF rating OR DELETE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_product_review_aggregates();

-- 5. TRIGGER PARA UPDATED_AT EN NUEVAS TABLAS
-- =====================================================

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_reviews_updated_at ON public.product_reviews;
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS POLICIES PARA PRODUCT_VARIANTS
-- =====================================================

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active variants"
ON public.product_variants
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage variants"
ON public.product_variants
FOR ALL
USING (is_admin(auth.uid()));

-- 7. RLS POLICIES PARA PRODUCT_REVIEWS
-- =====================================================

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
ON public.product_reviews
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON public.product_reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
ON public.product_reviews
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.product_reviews
FOR ALL
USING (is_admin(auth.uid()));

-- 8. FUNCIÓN HELPER PARA VERIFICAR SI PROMO ESTÁ ACTIVA
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_promo_active(
  p_promo_active BOOLEAN,
  p_promo_starts_at TIMESTAMP WITH TIME ZONE,
  p_promo_ends_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN p_promo_active = true 
    AND (p_promo_starts_at IS NULL OR p_promo_starts_at <= now())
    AND (p_promo_ends_at IS NULL OR p_promo_ends_at > now());
END;
$$;
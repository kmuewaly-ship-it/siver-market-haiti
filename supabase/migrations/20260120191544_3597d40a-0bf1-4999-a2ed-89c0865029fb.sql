-- Añadir columnas para soportar wishlist B2B y B2C
ALTER TABLE public.user_favorites 
ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'B2C' CHECK (type IN ('B2B', 'B2C'));

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_type ON public.user_favorites(user_id, type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id ON public.user_favorites(product_id);

-- Actualizar RLS policies
DROP POLICY IF EXISTS "Users can view own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.user_favorites;
DROP POLICY IF EXISTS "Admin can view all favorites" ON public.user_favorites;

-- Política para que usuarios vean sus propios favoritos
CREATE POLICY "Users can view own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Política para que usuarios inserten sus propios favoritos
CREATE POLICY "Users can insert own favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para que usuarios eliminen sus propios favoritos
CREATE POLICY "Users can delete own favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Política para que Admin vea todos los favoritos (para estadísticas)
CREATE POLICY "Admin can view all favorites"
ON public.user_favorites
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Crear restricción única para evitar duplicados
ALTER TABLE public.user_favorites 
DROP CONSTRAINT IF EXISTS unique_user_product_favorite;

ALTER TABLE public.user_favorites 
ADD CONSTRAINT unique_user_product_favorite 
UNIQUE NULLS NOT DISTINCT (user_id, seller_catalog_id, product_id, variant_id, type);
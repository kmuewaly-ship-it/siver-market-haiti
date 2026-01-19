-- =============================================
-- 1. VARIANT SYSTEM: Add variant columns to cart tables
-- =============================================

-- Add variant_id and variant_attributes to b2b_cart_items (color, size already exist)
ALTER TABLE public.b2b_cart_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}';

-- Add variant columns to b2c_cart_items
ALTER TABLE public.b2c_cart_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id),
ADD COLUMN IF NOT EXISTS color TEXT,
ADD COLUMN IF NOT EXISTS size TEXT,
ADD COLUMN IF NOT EXISTS variant_attributes JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_b2b_cart_items_variant_id ON public.b2b_cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_b2c_cart_items_variant_id ON public.b2c_cart_items(variant_id);

-- =============================================
-- 2. USER FAVORITES: Add RLS policies
-- =============================================

-- Enable RLS on user_favorites
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove their favorites
CREATE POLICY "Users can delete their own favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- =============================================
-- 3. STORE CREATION: Improve trigger function
-- =============================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_seller_role_assigned ON public.user_roles;
DROP FUNCTION IF EXISTS public.handle_seller_store_creation();

-- Create improved function for seller role only (investor not in enum)
CREATE OR REPLACE FUNCTION public.handle_seller_store_creation()
RETURNS TRIGGER AS $$
DECLARE
  user_name TEXT;
  user_email TEXT;
  user_avatar TEXT;
  existing_store UUID;
BEGIN
  -- Only proceed for seller role
  IF NEW.role != 'seller' THEN
    RETURN NEW;
  END IF;

  -- Check if store already exists for this user
  SELECT id INTO existing_store
  FROM public.stores
  WHERE owner_user_id = NEW.user_id
  LIMIT 1;

  -- If store exists, skip creation
  IF existing_store IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get user info from profiles
  SELECT full_name, avatar_url INTO user_name, user_avatar
  FROM public.profiles
  WHERE id = NEW.user_id;

  -- Get email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Use email as fallback for name
  IF user_name IS NULL OR user_name = '' THEN
    user_name := COALESCE(SPLIT_PART(user_email, '@', 1), 'Mi Tienda');
  END IF;

  -- Create the store
  INSERT INTO public.stores (
    owner_user_id,
    name,
    slug,
    description,
    logo,
    is_active
  ) VALUES (
    NEW.user_id,
    user_name || '''s Store',
    LOWER(REPLACE(REGEXP_REPLACE(user_name, '[^a-zA-Z0-9]', '', 'g'), ' ', '-')) || '-' || SUBSTRING(NEW.user_id::TEXT, 1, 8),
    'Tienda de ' || user_name,
    user_avatar,
    true
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on user_roles
CREATE TRIGGER on_seller_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_store_creation();

-- Also create stores for existing sellers without stores
INSERT INTO public.stores (owner_user_id, name, slug, description, is_active)
SELECT 
  ur.user_id,
  COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1), 'Mi Tienda') || '''s Store',
  LOWER(REPLACE(COALESCE(p.full_name, SPLIT_PART(u.email, '@', 1), 'store'), ' ', '-')) || '-' || SUBSTRING(ur.user_id::TEXT, 1, 8),
  'Tienda de ' || COALESCE(p.full_name, 'vendedor'),
  true
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'seller'
AND NOT EXISTS (
  SELECT 1 FROM public.stores s WHERE s.owner_user_id = ur.user_id
)
ON CONFLICT DO NOTHING;

-- =============================================
-- 4. ADDITIONAL SECURITY: Ensure proper RLS
-- =============================================

-- Ensure b2b_cart_items has proper RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2b_cart_items' 
    AND policyname = 'Users can manage their cart items'
  ) THEN
    CREATE POLICY "Users can manage their cart items"
    ON public.b2b_cart_items
    FOR ALL
    USING (
      cart_id IN (
        SELECT id FROM public.b2b_carts WHERE buyer_user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Ensure b2c_cart_items has proper RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'b2c_cart_items' 
    AND policyname = 'Users can manage their B2C cart items'
  ) THEN
    CREATE POLICY "Users can manage their B2C cart items"
    ON public.b2c_cart_items
    FOR ALL
    USING (
      cart_id IN (
        SELECT id FROM public.b2c_carts WHERE user_id = auth.uid()
      )
    );
  END IF;
END $$;
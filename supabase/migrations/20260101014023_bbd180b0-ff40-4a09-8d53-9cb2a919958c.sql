-- =============================================
-- SECURITY FIXES - CORRECTED VERSION
-- =============================================

-- 1. Fix stores table: Create public view that hides bank info
CREATE OR REPLACE VIEW public.stores_public AS
SELECT 
  id,
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
WHERE is_active = true;

GRANT SELECT ON public.stores_public TO anon, authenticated;

-- 2. Fix seller_catalog: Create public view that hides cost price
CREATE OR REPLACE VIEW public.seller_catalog_public AS
SELECT 
  sc.id,
  sc.seller_store_id,
  sc.sku,
  sc.nombre,
  sc.descripcion,
  sc.precio_venta,
  sc.stock,
  sc.images,
  sc.is_active,
  sc.imported_at,
  sc.updated_at
FROM public.seller_catalog sc
WHERE sc.is_active = true;

GRANT SELECT ON public.seller_catalog_public TO anon, authenticated;

-- 3. Fix referral_codes: Add missing RLS policies
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Admins can manage all referral codes" ON public.referral_codes;
DROP POLICY IF EXISTS "Anyone can lookup referral codes for validation" ON public.referral_codes;

CREATE POLICY "Users can view own referral codes"
ON public.referral_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all referral codes"
ON public.referral_codes
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Anyone can lookup referral codes for validation"
ON public.referral_codes
FOR SELECT
USING (true);

-- 4. Fix referrals table: Add missing RLS policies  
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view referrals they made" ON public.referrals;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
DROP POLICY IF EXISTS "Users can create referrals when referred" ON public.referrals;

CREATE POLICY "Users can view referrals they made"
ON public.referrals
FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can create referrals when referred"
ON public.referrals
FOR INSERT
WITH CHECK (auth.uid() = referred_id);

CREATE POLICY "Admins can manage all referrals"
ON public.referrals
FOR ALL
USING (public.is_admin(auth.uid()));

-- 5. Fix referral_settings: Add missing RLS policies
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view referral settings" ON public.referral_settings;
DROP POLICY IF EXISTS "Admins can manage referral settings" ON public.referral_settings;

CREATE POLICY "Anyone can view referral settings"
ON public.referral_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage referral settings"
ON public.referral_settings
FOR ALL
USING (public.is_admin(auth.uid()));

-- 6. Fix stock_reservations: Add missing RLS policies
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all reservations" ON public.stock_reservations;
DROP POLICY IF EXISTS "Users can view own order reservations" ON public.stock_reservations;

CREATE POLICY "Admins can manage all reservations"
ON public.stock_reservations
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own order reservations"
ON public.stock_reservations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders_b2b o
    WHERE o.id = stock_reservations.order_id
    AND (o.seller_id = auth.uid() OR o.buyer_id = auth.uid())
  )
);

-- 7. Fix suppliers table: Add missing RLS policies (no is_active column)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated can view suppliers" ON public.suppliers;

CREATE POLICY "Admins can manage suppliers"
ON public.suppliers
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated can view suppliers"
ON public.suppliers
FOR SELECT
TO authenticated
USING (true);

-- 8. Fix store_reviews: Add proper RLS
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view store reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Authenticated users can create store reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Users can update own store reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Users can delete own store reviews" ON public.store_reviews;
DROP POLICY IF EXISTS "Admins can manage all store reviews" ON public.store_reviews;

CREATE POLICY "Anyone can view store reviews"
ON public.store_reviews
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create store reviews"
ON public.store_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own store reviews"
ON public.store_reviews
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own store reviews"
ON public.store_reviews
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all store reviews"
ON public.store_reviews
FOR ALL
USING (public.is_admin(auth.uid()));

-- 9. Fix seller_credits: Add proper RLS
ALTER TABLE public.seller_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.seller_credits;
DROP POLICY IF EXISTS "Admins can manage all credits" ON public.seller_credits;

CREATE POLICY "Users can view own credits"
ON public.seller_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all credits"
ON public.seller_credits
FOR ALL
USING (public.is_admin(auth.uid()));
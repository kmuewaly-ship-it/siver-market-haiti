-- 1. Create SECURITY DEFINER function to check if user owns a store
CREATE OR REPLACE FUNCTION public.user_owns_store(store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM stores
    WHERE id = store_id AND owner_user_id = auth.uid()
  );
$$;

-- 2. Add phone column to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 3. Drop existing payment_methods policies that don't work for store owners
DROP POLICY IF EXISTS "Users can manage their own payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;

-- 4. Create new policy that allows store owners to manage their store's payment methods
CREATE POLICY "Store owners can manage their payment methods"
ON payment_methods
FOR ALL
USING (
  -- Admins can manage all
  public.is_admin(auth.uid())
  -- Sellers can manage their own (owner_id = user_id)
  OR (owner_type = 'seller' AND owner_id = auth.uid())
  -- Store owners can manage their store's payment methods
  OR (owner_type = 'store' AND public.user_owns_store(owner_id))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR (owner_type = 'seller' AND owner_id = auth.uid())
  OR (owner_type = 'store' AND public.user_owns_store(owner_id))
);

-- 5. Create policy for viewing payment methods
CREATE POLICY "Users can view payment methods"
ON payment_methods
FOR SELECT
USING (
  -- Anyone can view admin payment methods (for checkout display)
  owner_type = 'admin'
  -- Sellers can view their own
  OR (owner_type = 'seller' AND owner_id = auth.uid())
  -- Store owners can view their store's payment methods
  OR (owner_type = 'store' AND public.user_owns_store(owner_id))
  -- Admins can view all
  OR public.is_admin(auth.uid())
);
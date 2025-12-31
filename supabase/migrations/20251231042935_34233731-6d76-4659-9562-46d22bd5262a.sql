-- Allow buyers to cancel their own B2C orders (update to cancelled status)
CREATE POLICY "Buyers can cancel their own B2C orders"
ON public.orders_b2b
FOR UPDATE
USING (
  buyer_id = auth.uid() 
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
  AND status IN ('placed', 'paid')
)
WITH CHECK (
  buyer_id = auth.uid() 
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
  AND status = 'cancelled'
);

-- Allow admins to cancel any order
DROP POLICY IF EXISTS "Admins full access to orders" ON public.orders_b2b;
CREATE POLICY "Admins full access to orders"
ON public.orders_b2b
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));
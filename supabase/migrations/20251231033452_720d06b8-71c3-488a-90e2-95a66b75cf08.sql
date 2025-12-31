-- Fix RLS policy on b2c_carts to allow updating cart status to 'completed'
DROP POLICY IF EXISTS "Users can update own open carts" ON public.b2c_carts;

CREATE POLICY "Users can update own carts"
ON public.b2c_carts
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
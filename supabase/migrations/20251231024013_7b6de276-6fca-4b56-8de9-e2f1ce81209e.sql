-- Fix RLS policy for b2b_carts to allow users to complete their own carts
-- Current policy only allows update when status = 'open', but we need to change status to 'completed'

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own open carts" ON public.b2b_carts;

-- Create a new policy that allows users to update their own carts (including changing status to completed)
CREATE POLICY "Users can update own carts" 
ON public.b2b_carts 
FOR UPDATE 
USING (buyer_user_id = auth.uid())
WITH CHECK (buyer_user_id = auth.uid());
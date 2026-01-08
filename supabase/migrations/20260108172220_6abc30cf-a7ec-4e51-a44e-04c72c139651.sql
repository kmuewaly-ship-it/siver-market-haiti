-- Drop the restrictive policy and create a more inclusive one for B2B buyers
DROP POLICY IF EXISTS "Items insertable with parent order" ON public.order_items_b2b;

-- Create new policy that allows both sellers and buyers to insert items for their orders
CREATE POLICY "Users can insert items for their orders"
ON public.order_items_b2b
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders_b2b o
    WHERE o.id = order_items_b2b.order_id
    AND (
      o.seller_id = auth.uid() 
      OR o.buyer_id = auth.uid()
      OR is_admin(auth.uid())
    )
  )
);
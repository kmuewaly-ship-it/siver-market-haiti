-- Fix RLS policy for order_items_b2b to allow buyers to see their B2C order items

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Items visible with parent order" ON order_items_b2b;

-- Create a new policy that allows both sellers and buyers to view their order items
CREATE POLICY "Items visible to order owner or buyer"
  ON order_items_b2b
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders_b2b o
      WHERE o.id = order_items_b2b.order_id
      AND (
        o.seller_id = auth.uid() 
        OR o.buyer_id = auth.uid()
        OR is_admin(auth.uid())
      )
    )
  );

-- Also ensure buyers can view their B2C orders even if metadata is null
-- Update the B2C buyer view policy to be more inclusive
DROP POLICY IF EXISTS "Buyers can view own B2C orders" ON orders_b2b;

CREATE POLICY "Buyers can view orders where they are buyer"
  ON orders_b2b
  FOR SELECT
  USING (buyer_id = auth.uid());
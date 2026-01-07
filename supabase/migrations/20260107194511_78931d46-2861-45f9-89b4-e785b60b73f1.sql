-- Update RLS policies for orders_b2b to allow buyers to cancel/update their orders without order_type filter

-- Drop the existing restrictive cancel policy
DROP POLICY IF EXISTS "Buyers can cancel their own B2C orders" ON orders_b2b;

-- Create new policy that allows buyers to cancel any order where they are the buyer
CREATE POLICY "Buyers can cancel their own orders"
  ON orders_b2b
  FOR UPDATE
  USING (
    buyer_id = auth.uid() 
    AND status IN ('placed', 'paid')
  )
  WITH CHECK (
    buyer_id = auth.uid() 
    AND status = 'cancelled'
  );

-- Update the confirm payment policy too
DROP POLICY IF EXISTS "Buyers can confirm their own B2C payment" ON orders_b2b;

CREATE POLICY "Buyers can confirm their own payment"
  ON orders_b2b
  FOR UPDATE
  USING (
    buyer_id = auth.uid() 
    AND payment_status IN ('pending', 'pending_validation')
  )
  WITH CHECK (
    buyer_id = auth.uid()
  );
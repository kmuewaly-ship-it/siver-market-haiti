-- Create policy for buyers to confirm their own B2C payment
CREATE POLICY "Buyers can confirm their own B2C payment"
ON public.orders_b2b
FOR UPDATE
USING (
  buyer_id = auth.uid()
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
  AND payment_status IN ('pending', 'pending_validation')
)
WITH CHECK (
  buyer_id = auth.uid()
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
);
-- Allow sellers to update payment status for their B2C orders
CREATE POLICY "Sellers can confirm payments for their orders"
ON public.orders_b2b
FOR UPDATE
USING (
  seller_id = auth.uid() 
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
  AND payment_status IN ('pending_validation', 'pending')
)
WITH CHECK (
  seller_id = auth.uid() 
  AND COALESCE((metadata->>'order_type'), '') = 'b2c'
);
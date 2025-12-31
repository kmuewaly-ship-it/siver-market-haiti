-- Allow regular buyers to create and view their own B2C orders stored in orders_b2b
-- (B2B sellers keep their existing policies.)

-- Buyers can create B2C orders (must set buyer_id to themselves and metadata.order_type = 'b2c')
DROP POLICY IF EXISTS "Buyers can create B2C orders" ON public.orders_b2b;
CREATE POLICY "Buyers can create B2C orders"
ON public.orders_b2b
FOR INSERT
WITH CHECK (
  buyer_id = auth.uid()
  AND COALESCE(metadata->>'order_type', '') = 'b2c'
);

-- Buyers can view their own B2C orders
DROP POLICY IF EXISTS "Buyers can view own B2C orders" ON public.orders_b2b;
CREATE POLICY "Buyers can view own B2C orders"
ON public.orders_b2b
FOR SELECT
USING (
  buyer_id = auth.uid()
  AND COALESCE(metadata->>'order_type', '') = 'b2c'
);

-- Allow buyers to insert order items for their own B2C orders
DROP POLICY IF EXISTS "Buyers can insert items for own B2C orders" ON public.order_items_b2b;
CREATE POLICY "Buyers can insert items for own B2C orders"
ON public.order_items_b2b
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders_b2b o
    WHERE o.id = order_items_b2b.order_id
      AND o.buyer_id = auth.uid()
      AND COALESCE(o.metadata->>'order_type', '') = 'b2c'
  )
);
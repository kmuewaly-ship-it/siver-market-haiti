-- Add seller_catalog_id to order_items_b2b to support reordering
ALTER TABLE public.order_items_b2b 
ADD COLUMN IF NOT EXISTS seller_catalog_id uuid;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_order_items_seller_catalog ON public.order_items_b2b(seller_catalog_id);

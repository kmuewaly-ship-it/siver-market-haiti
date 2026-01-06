-- Add image column to b2b_cart_items table for product image display in cart and checkout

ALTER TABLE public.b2b_cart_items
ADD COLUMN image text;

-- Add comment for documentation
COMMENT ON COLUMN public.b2b_cart_items.image IS 'URL of the product image for display in cart and checkout pages';

-- Add image column to b2b_cart_items table for product/variant image display
ALTER TABLE public.b2b_cart_items
ADD COLUMN IF NOT EXISTS image text;

-- Add image column to b2c_cart_items table for product/variant image display  
-- (already has 'image' column based on types, but ensure it exists)

COMMENT ON COLUMN public.b2b_cart_items.image IS 'URL of the product or variant image for display in cart and checkout pages';
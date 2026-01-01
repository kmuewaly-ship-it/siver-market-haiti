-- Add parent_review_id column for reply functionality
ALTER TABLE public.product_reviews
ADD COLUMN parent_review_id UUID REFERENCES public.product_reviews(id) ON DELETE CASCADE;

-- Create index for efficient querying of replies
CREATE INDEX idx_product_reviews_parent_id ON public.product_reviews(parent_review_id);

-- Make rating nullable for replies (replies don't need a rating)
ALTER TABLE public.product_reviews
ALTER COLUMN rating DROP NOT NULL;

-- Add comment to document the column
COMMENT ON COLUMN public.product_reviews.parent_review_id IS 'References parent review for replies. NULL for top-level reviews.';
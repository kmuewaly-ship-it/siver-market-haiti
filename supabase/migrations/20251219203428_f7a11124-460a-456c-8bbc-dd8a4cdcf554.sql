-- Create store_followers table
CREATE TABLE public.store_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Create index for faster queries
CREATE INDEX idx_store_followers_store_id ON public.store_followers(store_id);
CREATE INDEX idx_store_followers_user_id ON public.store_followers(user_id);

-- Enable RLS
ALTER TABLE public.store_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_followers
CREATE POLICY "Anyone can view follower counts"
ON public.store_followers FOR SELECT
USING (true);

CREATE POLICY "Users can follow stores"
ON public.store_followers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow stores"
ON public.store_followers FOR DELETE
USING (auth.uid() = user_id);

-- Create store_reviews table
CREATE TABLE public.store_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

-- Create indexes
CREATE INDEX idx_store_reviews_store_id ON public.store_reviews(store_id);
CREATE INDEX idx_store_reviews_user_id ON public.store_reviews(user_id);
CREATE INDEX idx_store_reviews_rating ON public.store_reviews(rating);

-- Enable RLS
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_reviews
CREATE POLICY "Anyone can view reviews"
ON public.store_reviews FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create reviews"
ON public.store_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
ON public.store_reviews FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
ON public.store_reviews FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
ON public.store_reviews FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_store_reviews_updated_at
BEFORE UPDATE ON public.store_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
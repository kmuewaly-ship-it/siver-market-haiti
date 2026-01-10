-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images', 
  'product-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create table to track asset processing jobs
CREATE TABLE IF NOT EXISTS public.asset_processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_assets INTEGER NOT NULL DEFAULT 0,
  processed_assets INTEGER NOT NULL DEFAULT 0,
  failed_assets INTEGER NOT NULL DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  metadata JSONB
);

-- Create table to track individual asset items
CREATE TABLE IF NOT EXISTS public.asset_processing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.asset_processing_jobs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sku_interno TEXT NOT NULL,
  original_url TEXT NOT NULL,
  storage_path TEXT,
  public_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  row_index INTEGER NOT NULL
);

-- Enable RLS
ALTER TABLE public.asset_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_processing_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for asset_processing_jobs
CREATE POLICY "Users can view their own jobs" 
ON public.asset_processing_jobs 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can create jobs" 
ON public.asset_processing_jobs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own jobs" 
ON public.asset_processing_jobs 
FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- RLS policies for asset_processing_items
CREATE POLICY "Users can view items for their jobs" 
ON public.asset_processing_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.asset_processing_jobs 
    WHERE id = asset_processing_items.job_id 
    AND (user_id = auth.uid() OR auth.uid() IS NOT NULL)
  )
);

CREATE POLICY "Users can create items" 
ON public.asset_processing_items 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update items" 
ON public.asset_processing_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.asset_processing_jobs 
    WHERE id = asset_processing_items.job_id 
    AND (user_id = auth.uid() OR auth.uid() IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_items_job_id ON public.asset_processing_items(job_id);
CREATE INDEX IF NOT EXISTS idx_asset_items_status ON public.asset_processing_items(status);
CREATE INDEX IF NOT EXISTS idx_asset_jobs_status ON public.asset_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_asset_jobs_user ON public.asset_processing_jobs(user_id);

-- Storage policies for product-images bucket
CREATE POLICY "Anyone can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_asset_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_asset_jobs_updated_at
BEFORE UPDATE ON public.asset_processing_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_updated_at();

CREATE TRIGGER update_asset_items_updated_at
BEFORE UPDATE ON public.asset_processing_items
FOR EACH ROW
EXECUTE FUNCTION public.update_asset_updated_at();
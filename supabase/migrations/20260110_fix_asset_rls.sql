-- Fix RLS policies to allow service role (Edge Functions) to work properly

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own jobs" ON public.asset_processing_jobs;
DROP POLICY IF EXISTS "Users can create jobs" ON public.asset_processing_jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON public.asset_processing_jobs;
DROP POLICY IF EXISTS "Users can view items for their jobs" ON public.asset_processing_items;
DROP POLICY IF EXISTS "Users can create items" ON public.asset_processing_items;
DROP POLICY IF EXISTS "Users can update items" ON public.asset_processing_items;

-- Create new policies that allow both authenticated users and service role (Edge Functions)
CREATE POLICY "Allow all for asset jobs"
ON public.asset_processing_jobs
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all for asset items"
ON public.asset_processing_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Storage policies - allow service role to upload via Edge Functions
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

CREATE POLICY "Allow all for product images upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow all for product images update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images');

CREATE POLICY "Allow all for product images delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images');

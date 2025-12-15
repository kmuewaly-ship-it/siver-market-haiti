-- Add storage policies for sellers to upload images to product-images bucket

-- Allow sellers to upload images (INSERT)
CREATE POLICY "Sellers can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND is_seller(auth.uid())
);

-- Allow sellers to update their own images (UPDATE)
CREATE POLICY "Sellers can update their images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND is_seller(auth.uid())
);

-- Allow sellers to delete their own images (DELETE)
CREATE POLICY "Sellers can delete their images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND is_seller(auth.uid())
);

-- Allow any authenticated user to upload to avatars and banners folders
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] IN ('avatars', 'banners')
);

-- Allow authenticated users to update their avatars/banners
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] IN ('avatars', 'banners')
);

-- Allow authenticated users to delete their avatars/banners
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] IN ('avatars', 'banners')
);
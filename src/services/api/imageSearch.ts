import { supabase } from "@/integrations/supabase/client";

export const uploadSearchImage = async (file: File) => {
  // Create a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${fileName}`;

  // Upload to a temporary bucket
  // Note: You need to create a bucket named 'temp-search-images' in Supabase Storage
  // and set a policy to allow public uploads/reads or authenticated uploads.
  const { error: uploadError } = await supabase.storage
    .from('temp-search-images')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading image:', uploadError);
    throw uploadError;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('temp-search-images')
    .getPublicUrl(filePath);

  return publicUrl;
};

export const searchProductsByImage = async (imageUrl: string) => {
  // Call the Edge Function
  const { data, error } = await supabase.functions.invoke('image-search', {
    body: { imageUrl },
  });

  if (error) {
    console.error('Error invoking image-search function:', error);
    throw error;
  }

  return data.products;
};

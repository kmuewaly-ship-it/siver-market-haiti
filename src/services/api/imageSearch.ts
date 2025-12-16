import { supabase } from "@/integrations/supabase/client";
import EmbeddingService from "@/services/ai/embeddingService";

export const uploadSearchImage = async (file: File) => {
  // Create a unique file name
  const fileExt = file.name.split('.').pop();
  const fileName = ${crypto.randomUUID()}.;
  const filePath = ${fileName};

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
  try {
    console.log("Generating embedding for image:", imageUrl);
    
    // 1. Generate embedding locally in the browser
    const embedding = await EmbeddingService.generateImageEmbedding(imageUrl);
    
    console.log("Embedding generated, length:", embedding.length);

    // 2. Call Supabase RPC to find similar products
    const { data: products, error } = await supabase.rpc('match_products', {
      query_embedding: embedding,
      match_threshold: 0.5, // Adjust threshold as needed
      match_count: 10
    });

    if (error) {
      console.error('Error searching products:', error);
      // Fallback to mock if RPC fails (e.g. function doesn't exist yet)
      console.warn("Falling back to mock search due to RPC error");
      return mockSearch();
    }

    return products;
  } catch (err) {
    console.error("Client-side AI error:", err);
    // Fallback to mock for demo purposes if model fails to load or other error
    return mockSearch();
  }
};

// Fallback mock function
const mockSearch = async () => {
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .limit(8);
      
    return products?.sort(() => 0.5 - Math.random()) || [];
};

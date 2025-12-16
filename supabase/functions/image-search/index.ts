import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl } = await req.json()

    if (!imageUrl) {
      throw new Error('Image URL is required')
    }
    
    // Initialize Supabase client with Service Role Key to bypass RLS if needed
    // or to access internal tables.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Searching for products similar to: ${imageUrl}`);

    // --------------------------------------------------------------------------
    // REAL IMPLEMENTATION PLAN (To be implemented with Vector Database):
    // --------------------------------------------------------------------------
    // 1. Fetch the image from `imageUrl`.
    // 2. Use an embedding model (e.g., OpenAI CLIP, HuggingFace) to generate a vector.
    // 3. Perform a similarity search on the `products` table using `pgvector`.
    //    const { data: products } = await supabase.rpc('match_products', {
    //      query_embedding: embedding,
    //      match_threshold: 0.7,
    //      match_count: 10
    //    });
    // --------------------------------------------------------------------------

    // --------------------------------------------------------------------------
    // MOCK IMPLEMENTATION (For Demo Purposes):
    // --------------------------------------------------------------------------
    // We will return a random selection of products to simulate the search result.
    // This allows the frontend to be fully functional while the AI part is set up.
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(8); // Return 8 random products (in a real app, use random() or sample)
    
    if (error) throw error

    // Shuffle the results to make it look dynamic
    const shuffled = products.sort(() => 0.5 - Math.random());

    return new Response(JSON.stringify({ products: shuffled }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

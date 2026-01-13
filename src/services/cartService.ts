import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface B2CAddItemParams {
  userId: string;
  sku: string;
  name: string;
  price: number;
  quantity?: number;
  image?: string | null;
  storeId?: string | null;
  storeName?: string | null;
  storeWhatsapp?: string | null;
  sellerCatalogId?: string | null;
}

interface B2BAddItemParams {
  userId: string;
  productId?: string;
  sku: string;
  name: string;
  priceB2B: number;
  quantity: number;
  image?: string | null;
}

/**
 * Add item directly to B2C cart in database
 */
export const addItemB2C = async (params: B2CAddItemParams) => {
  try {
    console.log('B2C: Getting or creating cart for user:', params.userId);
    
    // Get or create cart for user
    let { data: carts, error: cartError } = await supabase
      .from('b2c_carts')
      .select('id')
      .eq('user_id', params.userId)
      .eq('status', 'open')
      .limit(1)
      .order('created_at', { ascending: false });

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      throw cartError;
    }

    let cart = carts && carts.length > 0 ? carts[0] : null;

    // If no cart exists, create one
    if (!cart) {
      console.log('B2C: No cart found, creating new one');
      
      const { data: newCart, error: createError } = await supabase
        .from('b2c_carts')
        .insert([{
          user_id: params.userId,
          status: 'open',
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating cart:', createError);
        throw createError;
      }
      
      console.log('B2C: Cart created successfully:', newCart.id);
      cart = newCart;
    } else {
      console.log('B2C: Cart found:', cart.id);
    }

    // Insert item
    console.log('B2C: Inserting item:', params.sku);
    
    const { error: insertError } = await supabase
      .from('b2c_cart_items')
      .insert([{
        cart_id: cart.id,
        seller_catalog_id: params.sellerCatalogId || null,
        sku: params.sku,
        nombre: params.name,
        unit_price: params.price,
        total_price: params.price * (params.quantity || 1),
        quantity: params.quantity || 1,
        image: params.image,
        store_id: params.storeId,
        store_name: params.storeName,
        store_whatsapp: params.storeWhatsapp,
      }]);

    if (insertError) {
      console.error('Error inserting item:', insertError);
      throw insertError;
    }

    console.log('B2C: Item added successfully:', params.sku);
    return true;
  } catch (error) {
    console.error('Error adding item to B2C cart:', error);
    throw error;
  }
};

/**
 * Add item directly to B2B cart in database
 */
export const addItemB2B = async (params: B2BAddItemParams) => {
  try {
    console.log('B2B: Adding item for user:', params.userId);
    
    // Get or create cart for user
    let { data: carts, error: cartError } = await supabase
      .from('b2b_carts')
      .select('id')
      .eq('buyer_user_id', params.userId)
      .eq('status', 'open')
      .limit(1)
      .order('created_at', { ascending: false });

    if (cartError) {
      console.error('Error fetching cart:', cartError);
      throw cartError;
    }

    let cart = carts && carts.length > 0 ? carts[0] : null;

    // If no cart exists, create one
    if (!cart) {
      console.log('B2B: No cart found, creating new one for user:', params.userId);
      
      const { data: newCart, error: createError } = await supabase
        .from('b2b_carts')
        .insert([{
          buyer_user_id: params.userId,
          status: 'open',
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating cart:', createError);
        throw createError;
      }
      
      console.log('B2B: Cart created successfully:', newCart);
      cart = newCart;
    } else {
      console.log('B2B: Using existing cart:', cart.id);
    }

    // Insert item
    console.log('B2B: Inserting item:', params.sku, 'to cart:', cart.id);
    
    // If no productId provided, try to find it by SKU
    let productId = params.productId;
    if (!productId && params.sku) {
      try {
        const skuBase = params.sku.split('-')[0];
        // Workaround for TS2589: Type instantiation is excessively deep
        const client = supabase as unknown as { 
          from: (table: string) => { 
            select: (cols: string) => { 
              eq: (col: string, val: string) => { 
                maybeSingle: () => Promise<{ data: { id: string } | null; error: unknown }> 
              } 
            } 
          } 
        };
        const result = await client.from('products').select('id').eq('sku', skuBase).maybeSingle();
        
        if (result.data?.id) {
          productId = result.data.id;
          console.log('B2B: Found productId by SKU:', productId);
        }
      } catch (e) {
        console.log('B2B: Could not find productId by SKU:', e);
      }
    }
    
    const { data: inserted, error: insertError } = await supabase
      .from('b2b_cart_items')
      .insert([{
        cart_id: cart.id,
        product_id: productId || null,
        sku: params.sku,
        nombre: params.name,
        unit_price: params.priceB2B,
        total_price: params.priceB2B * params.quantity,
        quantity: params.quantity,
        image: params.image || null,
      }])
      .select();

    if (insertError) {
      console.error('Error inserting item:', insertError);
      throw insertError;
    }

    console.log('B2B: Item inserted successfully:', inserted);
    return true;
  } catch (error) {
    console.error('Error adding item to B2B cart:', error);
    throw error;
  }
};

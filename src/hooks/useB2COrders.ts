import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface B2COrderItem {
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  image?: string;
  store_id?: string;
  store_name?: string;
}

export interface CreateB2COrderParams {
  items: B2COrderItem[];
  total_amount: number;
  total_quantity: number;
  payment_method: 'stripe' | 'moncash' | 'transfer';
  payment_reference?: string;
  notes?: string;
  shipping_address?: {
    id: string;
    full_name: string;
    phone?: string;
    street_address: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
    notes?: string;
  };
}

export const useCreateB2COrder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateB2COrderParams) => {
      if (!user?.id) {
        throw new Error('Usuario no autenticado');
      }

      // Create the order - using orders_b2b with buyer_id for B2C orders
      // seller_id will be the first store's owner or a system seller for B2C
      const firstStoreId = params.items[0]?.store_id;
      let sellerId = user.id; // Default to buyer if no store found

      if (firstStoreId) {
        const { data: store } = await supabase
          .from('stores')
          .select('owner_user_id')
          .eq('id', firstStoreId)
          .single();
        
        if (store?.owner_user_id) {
          sellerId = store.owner_user_id;
        }
      }

      const orderMetadata: Record<string, any> = {};
      
      if (params.shipping_address) {
        orderMetadata.shipping_address = params.shipping_address;
      }
      
      if (params.payment_reference) {
        orderMetadata.payment_reference = params.payment_reference;
      }

      orderMetadata.order_type = 'b2c';
      orderMetadata.items_by_store = params.items.reduce((acc, item) => {
        const storeKey = item.store_id || 'unknown';
        if (!acc[storeKey]) {
          acc[storeKey] = {
            store_name: item.store_name || 'Tienda',
            items: [],
            subtotal: 0
          };
        }
        acc[storeKey].items.push(item);
        acc[storeKey].subtotal += item.subtotal;
        return acc;
      }, {} as Record<string, any>);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders_b2b')
        .insert({
          seller_id: sellerId,
          buyer_id: user.id,
          total_amount: params.total_amount,
          total_quantity: params.total_quantity,
          payment_method: params.payment_method,
          status: params.payment_method === 'stripe' ? 'paid' : 'placed',
          currency: 'USD',
          notes: params.notes || null,
          metadata: orderMetadata,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = params.items.map(item => ({
        order_id: order.id,
        product_id: null, // B2C items come from seller_catalog, not products table
        sku: item.sku,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
      }));

      const { error: itemsError } = await supabase
        .from('order_items_b2b')
        .insert(orderItems);

      if (itemsError) {
        // Rollback order if items fail
        await supabase.from('orders_b2b').delete().eq('id', order.id);
        throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast.success('¡Pedido creado exitosamente!');
    },
    onError: (error: Error) => {
      console.error('Error creating order:', error);
      toast.error('Error al crear el pedido');
    },
  });
};

// Hook to complete/mark B2C cart as completed
export const useCompleteB2CCart = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (cartId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { error } = await supabase
        .from('b2c_carts')
        .update({ status: 'completed' })
        .eq('id', cartId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
  });
};

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
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
  seller_catalog_id?: string;
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
  delivery_method?: 'address' | 'pickup';
  pickup_point_id?: string;
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

      if (params.delivery_method) {
        orderMetadata.delivery_method = params.delivery_method;
      }

      if (params.pickup_point_id) {
        orderMetadata.pickup_point_id = params.pickup_point_id;
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

      // Determine payment_status based on payment method (like B2B)
      const paymentStatus = params.payment_method === 'stripe' 
        ? 'pending' 
        : 'pending_validation';

      // Create order with proper payment state machine
      const { data: order, error: orderError } = await supabase
        .from('orders_b2b')
        .insert({
          seller_id: sellerId,
          buyer_id: user.id,
          total_amount: params.total_amount,
          total_quantity: params.total_quantity,
          payment_method: params.payment_method,
          payment_status: paymentStatus,
          status: 'placed',
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      console.log('Marking cart as completed:', cartId);

      // First, delete all items from the cart to ensure it's empty
      const { error: deleteItemsError } = await supabase
        .from('b2c_cart_items')
        .delete()
        .eq('cart_id', cartId);

      if (deleteItemsError) {
        console.error('Error deleting cart items:', deleteItemsError);
      }

      // Then update cart status to completed
      const { error } = await supabase
        .from('b2c_carts')
        .update({ status: 'completed' })
        .eq('id', cartId)
        .eq('user_id', user.id);

      if (error) throw error;
      
      console.log('Cart marked as completed and items deleted successfully');
      
      return { cartId };
    },
    onSuccess: () => {
      console.log('Cart completion success, invalidating queries');
      // Clear all cart-related queries immediately
      queryClient.setQueryData(['b2c-cart-items', user?.id], []);
      queryClient.setQueryData(['b2c-cart-items'], []);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['b2c-cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
    },
    onError: (error: Error) => {
      console.error('Error completing cart:', error);
    },
  });
};

// Hook to get active B2C order for payment state
export const useActiveB2COrder = () => {
  const { user } = useAuth();
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActiveOrder = useCallback(async () => {
    if (!user?.id) {
      setActiveOrder(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('orders_b2b')
        .select('*')
        .eq('buyer_id', user.id)
        .in('payment_status', ['pending', 'pending_validation'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setActiveOrder(data ? {
        id: data.id,
        payment_status: data.payment_status,
        status: data.status,
        total_amount: Number(data.total_amount),
        total_quantity: data.total_quantity,
        payment_method: data.payment_method,
        metadata: data.metadata,
        created_at: data.created_at,
      } : null);
    } catch (error) {
      console.error('Error fetching active B2C order:', error);
      setActiveOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchActiveOrder();
  }, [fetchActiveOrder]);

  const isCartLocked = activeOrder?.payment_status === 'pending' || 
                       activeOrder?.payment_status === 'pending_validation';

  return { activeOrder, isLoading, isCartLocked, refreshActiveOrder: fetchActiveOrder };
};

// Hook to confirm B2C payment
export const useConfirmB2CPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders_b2b')
        .update({ 
          payment_status: 'paid',
          status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;
      return { orderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast.success('¡Pago confirmado!');
    },
    onError: (error: Error) => {
      console.error('Error confirming payment:', error);
      toast.error('Error al confirmar el pago');
    },
  });
};

// Hook to cancel B2C order
export const useCancelB2COrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('orders_b2b')
        .update({ 
          payment_status: 'cancelled',
          status: 'cancelled',
        })
        .eq('id', orderId);

      if (error) throw error;
      return { orderId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast.info('Pedido cancelado');
    },
    onError: (error: Error) => {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar el pedido');
    },
  });
};

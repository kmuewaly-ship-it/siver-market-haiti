import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type BuyerOrderStatus = 'draft' | 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
export type RefundStatus = 'none' | 'requested' | 'processing' | 'completed' | 'rejected';

export interface BuyerOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  sku: string;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento_percent: number | null;
  subtotal: number;
}

export interface BuyerOrder {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  status: BuyerOrderStatus;
  total_amount: number;
  total_quantity: number;
  currency: string;
  payment_method: string | null;
  notes: string | null;
  metadata: {
    tracking_number?: string;
    carrier?: string;
    carrier_url?: string;
    estimated_delivery?: string;
    cancellation_reason?: string;
    cancelled_at?: string;
    cancelled_by?: 'buyer' | 'seller' | 'admin';
    refund_status?: RefundStatus;
    refund_amount?: number;
    refund_requested_at?: string;
    refund_completed_at?: string;
    [key: string]: any;
  } | null;
  created_at: string;
  updated_at: string;
  order_items_b2b?: BuyerOrderItem[];
  seller_profile?: { full_name: string | null; email: string | null } | null;
}

export const useBuyerOrders = (statusFilter?: BuyerOrderStatus | 'all') => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-orders', user?.id, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('orders_b2b')
        .select(`
          *,
          order_items_b2b (*),
          seller_profile:profiles!orders_b2b_seller_id_fkey (full_name, email)
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BuyerOrder[];
    },
    enabled: !!user?.id,
  });
};

export const useBuyerOrder = (orderId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-order', orderId],
    queryFn: async () => {
      if (!user?.id || !orderId) return null;

      const { data, error } = await supabase
        .from('orders_b2b')
        .select(`
          *,
          order_items_b2b (*),
          seller_profile:profiles!orders_b2b_seller_id_fkey (full_name, email)
        `)
        .eq('id', orderId)
        .eq('buyer_id', user.id)
        .single();

      if (error) throw error;
      return data as BuyerOrder;
    },
    enabled: !!user?.id && !!orderId,
  });
};

export const useCancelBuyerOrder = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      reason,
      requestRefund = false
    }: { 
      orderId: string; 
      reason: string;
      requestRefund?: boolean;
    }) => {
      // First get the current order to check status and get metadata
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders_b2b')
        .select('status, metadata, total_amount')
        .eq('id', orderId)
        .eq('buyer_id', user?.id)
        .single();

      if (fetchError) throw fetchError;

      // Only allow cancellation for certain statuses
      if (!['placed', 'paid'].includes(currentOrder.status)) {
        throw new Error('Este pedido no puede ser cancelado en su estado actual');
      }

      const existingMetadata = (currentOrder.metadata && typeof currentOrder.metadata === 'object') 
        ? currentOrder.metadata as Record<string, any>
        : {};

      const newMetadata = {
        ...existingMetadata,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: 'buyer' as const,
        refund_status: requestRefund && currentOrder.status === 'paid' ? 'requested' as RefundStatus : 'none' as RefundStatus,
        refund_amount: requestRefund ? currentOrder.total_amount : undefined,
        refund_requested_at: requestRefund ? new Date().toISOString() : undefined,
      };

      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ 
          status: 'cancelled',
          metadata: newMetadata,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)
        .eq('buyer_id', user?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-order'] });
      toast({ 
        title: 'Pedido cancelado',
        description: variables.requestRefund 
          ? 'Tu solicitud de reembolso ha sido enviada' 
          : 'El pedido ha sido cancelado exitosamente'
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Error al cancelar',
        description: error.message,
        variant: 'destructive'
      });
    },
  });
};

// Hook to complete/mark B2B cart as completed
export const useCompleteB2BCart = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cartId: string) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      console.log('Marking B2B cart as completed:', cartId);

      const { error } = await supabase
        .from('b2b_carts')
        .update({ status: 'completed' })
        .eq('id', cartId)
        .eq('buyer_user_id', user.id);

      if (error) throw error;
      
      console.log('B2B cart marked as completed successfully');
      
      // Wait a bit for DB to sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { cartId };
    },
    onSuccess: (data) => {
      console.log('B2B cart completion success, invalidating queries');
      // Clear all cart-related queries immediately
      queryClient.setQueryData(['b2b-cart-items', user?.id], []);
      // Invalidate cart queries to force refetch
      queryClient.invalidateQueries({ queryKey: ['b2b-cart-items'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      // Force immediate refetch
      queryClient.refetchQueries({ queryKey: ['b2b-cart-items'], type: 'active' });
    },
    onError: (error: Error) => {
      console.error('Error completing B2B cart:', error);
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type OrderStatus = 'draft' | 'placed' | 'paid' | 'shipped' | 'cancelled';
export type PaymentStatus = 'draft' | 'pending' | 'pending_validation' | 'paid' | 'failed' | 'expired' | 'cancelled';

export interface OrderItem {
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

export interface Order {
  id: string;
  seller_id: string;
  buyer_id: string | null;
  status: OrderStatus;
  payment_status?: PaymentStatus | null;
  total_amount: number;
  total_quantity: number;
  currency: string;
  payment_method: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
  buyer_profile?: { full_name: string | null; email: string | null } | null;
  order_items_b2b?: OrderItem[];
}

export interface OrderFilters {
  status?: OrderStatus | 'all';
  paymentStatus?: PaymentStatus | 'all';
  orderType?: 'b2b' | 'b2c' | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useOrders = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch seller's orders (B2B orders where user is the buyer/seller)
  const useSellerOrders = (filters?: OrderFilters) => {
    return useQuery({
      queryKey: ['seller-orders', user?.id, filters],
      queryFn: async () => {
        if (!user?.id) return [];
        
        let query = supabase
          .from('orders_b2b')
          .select(`
            *,
            order_items_b2b (*)
          `)
          .eq('seller_id', user.id)
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          query = query.eq('payment_status', filters.paymentStatus);
        }
        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Order[];
      },
      enabled: !!user?.id,
    });
  };

  // Fetch seller's B2C sales (orders where the seller's store is the vendor)
  const useSellerB2CSales = (filters?: OrderFilters) => {
    return useQuery({
      queryKey: ['seller-b2c-sales', user?.id, filters],
      queryFn: async () => {
        if (!user?.id) return [];
        
        // Get seller's store first
        const { data: store } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_user_id', user.id)
          .maybeSingle();

        if (!store?.id) return [];
        
        // Get B2C orders where this seller's store has items
        let query = supabase
          .from('orders_b2b')
          .select(`
            *,
            order_items_b2b (*),
            buyer_profile:profiles!orders_b2b_buyer_id_fkey (full_name, email)
          `)
          .eq('seller_id', user.id)
          .not('metadata->order_type', 'is', null)
          .order('created_at', { ascending: false });

        if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
          query = query.eq('payment_status', filters.paymentStatus);
        }
        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        // Filter to only B2C orders
        return (data || []).filter(o => {
          const metadata = o.metadata as Record<string, any> | null;
          return metadata?.order_type === 'b2c';
        }) as Order[];
      },
      enabled: !!user?.id,
    });
  };

  // Fetch all orders (admin)
  const useAllOrders = (filters?: OrderFilters) => {
    return useQuery({
      queryKey: ['all-orders', filters],
      queryFn: async () => {
        let query = supabase
          .from('orders_b2b')
          .select(`
            *,
            profiles!orders_b2b_seller_id_fkey (full_name, email),
            order_items_b2b (*)
          `)
          .order('created_at', { ascending: false });

        if (filters?.status && filters.status !== 'all') {
          query = query.eq('status', filters.status);
        }
        if (filters?.dateFrom) {
          query = query.gte('created_at', filters.dateFrom);
        }
        if (filters?.dateTo) {
          query = query.lte('created_at', filters.dateTo);
        }
        if (filters?.search) {
          query = query.or(`id.ilike.%${filters.search}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Order[];
      },
    });
  };

  // Fetch single order
  const useOrder = (orderId: string) => {
    return useQuery({
      queryKey: ['order', orderId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('orders_b2b')
          .select(`
            *,
            profiles!orders_b2b_seller_id_fkey (full_name, email),
            order_items_b2b (*)
          `)
          .eq('id', orderId)
          .single();
        if (error) throw error;
        return data as Order;
      },
      enabled: !!orderId,
    });
  };

  // Update order status
  const updateOrderStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast({ title: 'Estado del pedido actualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar pedido', description: error.message, variant: 'destructive' });
    },
  });

  // Update order tracking info
  const updateOrderTracking = useMutation({
    mutationFn: async ({ 
      orderId, 
      carrier, 
      trackingNumber, 
      carrierUrl,
      estimatedDelivery 
    }: { 
      orderId: string; 
      carrier: string; 
      trackingNumber: string;
      carrierUrl?: string;
      estimatedDelivery?: string;
    }) => {
      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ 
          metadata: {
            carrier,
            tracking_number: trackingNumber,
            carrier_url: carrierUrl || null,
            estimated_delivery: estimatedDelivery || null,
          },
          status: 'shipped',
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast({ title: 'Información de envío actualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar envío', description: error.message, variant: 'destructive' });
    },
  });

  // Cancel order
  const cancelOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      toast({ title: 'Pedido cancelado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al cancelar pedido', description: error.message, variant: 'destructive' });
    },
  });

  // Confirm manual payment (MonCash, NatCash, Transfer, Cash)
  const confirmManualPayment = useMutation({
    mutationFn: async ({ orderId, paymentNotes }: { orderId: string; paymentNotes?: string }) => {
      // Get current order to preserve metadata
      const { data: currentOrder } = await supabase
        .from('orders_b2b')
        .select('metadata')
        .eq('id', orderId)
        .maybeSingle();
      
      const existingMetadata = (currentOrder?.metadata as Record<string, any>) || {};
      
      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ 
          payment_status: 'paid',
          status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            payment_confirmed_by: user?.id,
            payment_confirmation_notes: paymentNotes || null,
          }
        })
        .eq('id', orderId)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Pedido no encontrado');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-b2c-sales'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast({ title: '¡Pago confirmado!', description: 'El pedido ha sido marcado como pagado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al confirmar pago', description: error.message, variant: 'destructive' });
    },
  });

  // Reject manual payment
  const rejectManualPayment = useMutation({
    mutationFn: async ({ orderId, rejectionReason }: { orderId: string; rejectionReason?: string }) => {
      // Get current order to preserve metadata
      const { data: currentOrder } = await supabase
        .from('orders_b2b')
        .select('metadata')
        .eq('id', orderId)
        .maybeSingle();
      
      const existingMetadata = (currentOrder?.metadata as Record<string, any>) || {};
      
      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ 
          payment_status: 'failed',
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          metadata: {
            ...existingMetadata,
            payment_rejected_by: user?.id,
            payment_rejection_reason: rejectionReason || 'Pago no verificado',
          }
        })
        .eq('id', orderId)
        .select()
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error('Pedido no encontrado');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-b2c-sales'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast({ title: 'Pago rechazado', description: 'El pedido ha sido cancelado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al rechazar pago', description: error.message, variant: 'destructive' });
    },
  });

  // Get order stats
  const useOrderStats = (sellerId?: string) => {
    return useQuery({
      queryKey: ['order-stats', sellerId],
      queryFn: async () => {
        let query = supabase.from('orders_b2b').select('status, payment_status, total_amount, metadata');
        
        if (sellerId) {
          query = query.eq('seller_id', sellerId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const stats = {
          total: data.length,
          draft: data.filter(o => o.status === 'draft').length,
          placed: data.filter(o => o.status === 'placed').length,
          paid: data.filter(o => o.status === 'paid').length,
          shipped: data.filter(o => o.status === 'shipped').length,
          cancelled: data.filter(o => o.status === 'cancelled').length,
          pending_validation: data.filter(o => o.payment_status === 'pending_validation').length,
          totalAmount: data.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total_amount), 0),
          paidAmount: data.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((sum, o) => sum + Number(o.total_amount), 0),
        };

        return stats;
      },
    });
  };

  // Get B2C sales stats for seller
  const useB2CSalesStats = () => {
    return useQuery({
      queryKey: ['b2c-sales-stats', user?.id],
      queryFn: async () => {
        if (!user?.id) return null;
        
        const { data, error } = await supabase
          .from('orders_b2b')
          .select('status, payment_status, total_amount, metadata')
          .eq('seller_id', user.id);
        
        if (error) throw error;

        // Filter B2C orders only
        const b2cOrders = data.filter(o => {
          const metadata = o.metadata as Record<string, any> | null;
          return metadata?.order_type === 'b2c';
        });

        return {
          total: b2cOrders.length,
          pending_validation: b2cOrders.filter(o => o.payment_status === 'pending_validation').length,
          paid: b2cOrders.filter(o => o.status === 'paid' || o.payment_status === 'paid').length,
          shipped: b2cOrders.filter(o => o.status === 'shipped').length,
          cancelled: b2cOrders.filter(o => o.status === 'cancelled').length,
          totalRevenue: b2cOrders.filter(o => o.status === 'paid' || o.status === 'shipped')
            .reduce((sum, o) => sum + Number(o.total_amount), 0),
        };
      },
      enabled: !!user?.id,
    });
  };

  return {
    useSellerOrders,
    useSellerB2CSales,
    useAllOrders,
    useOrder,
    useOrderStats,
    useB2CSalesStats,
    updateOrderStatus,
    updateOrderTracking,
    cancelOrder,
    confirmManualPayment,
    rejectManualPayment,
  };
};
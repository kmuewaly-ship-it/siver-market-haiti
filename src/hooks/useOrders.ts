import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export type OrderStatus = 'draft' | 'placed' | 'paid' | 'shipped' | 'cancelled';

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
  total_amount: number;
  total_quantity: number;
  currency: string;
  payment_method: string | null;
  notes: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
  order_items_b2b?: OrderItem[];
}

export interface OrderFilters {
  status?: OrderStatus | 'all';
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const useOrders = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch seller's orders
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
      toast({ title: 'Estado del pedido actualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar pedido', description: error.message, variant: 'destructive' });
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

  // Get order stats
  const useOrderStats = (sellerId?: string) => {
    return useQuery({
      queryKey: ['order-stats', sellerId],
      queryFn: async () => {
        let query = supabase.from('orders_b2b').select('status, total_amount');
        
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
          totalAmount: data.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + Number(o.total_amount), 0),
          paidAmount: data.filter(o => o.status === 'paid' || o.status === 'shipped').reduce((sum, o) => sum + Number(o.total_amount), 0),
        };

        return stats;
      },
    });
  };

  return {
    useSellerOrders,
    useAllOrders,
    useOrder,
    useOrderStats,
    updateOrderStatus,
    cancelOrder,
  };
};
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type BuyerOrderStatus = 'draft' | 'placed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

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

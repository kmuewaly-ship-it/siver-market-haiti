import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface MasterPurchaseOrder {
  id: string;
  po_number: string;
  status: string;
  cycle_start_at: string;
  cycle_end_at: string | null;
  closed_at: string | null;
  china_tracking_number: string | null;
  china_tracking_entered_at: string | null;
  total_orders: number;
  total_items: number;
  total_quantity: number;
  total_amount: number;
  shipped_from_china_at: string | null;
  arrived_usa_at: string | null;
  shipped_to_haiti_at: string | null;
  arrived_hub_at: string | null;
  created_by: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface POOrderLink {
  id: string;
  po_id: string;
  order_id: string;
  order_type: 'b2b' | 'b2c';
  customer_user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  department_code: string | null;
  commune_code: string | null;
  pickup_point_code: string | null;
  hybrid_tracking_id: string | null;
  short_order_id: string | null;
  unit_count: number;
  previous_status: string | null;
  current_status: string | null;
  status_synced_at: string | null;
  pickup_qr_code: string | null;
  pickup_qr_generated_at: string | null;
  delivery_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface POPickingItem {
  id: string;
  po_id: string;
  po_order_link_id: string;
  product_id: string | null;
  variant_id: string | null;
  sku: string;
  product_name: string;
  color: string | null;
  size: string | null;
  image_url: string | null;
  quantity: number;
  bin_location: string | null;
  picked_at: string | null;
  picked_by: string | null;
  created_at: string;
}

export interface POPickingManifest {
  po: MasterPurchaseOrder;
  customers: {
    customer_name: string;
    customer_phone: string | null;
    hybrid_tracking_id: string | null;
    department_code: string | null;
    commune_code: string | null;
    items: POPickingItem[];
  }[];
}

export const usePurchaseOrders = () => {
  const queryClient = useQueryClient();

  // Fetch all POs
  const usePOList = () => useQuery({
    queryKey: ['master-purchase-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_purchase_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MasterPurchaseOrder[];
    },
  });

  // Fetch single PO with links
  const usePODetails = (poId: string) => useQuery({
    queryKey: ['po-details', poId],
    queryFn: async () => {
      const { data: po, error: poError } = await supabase
        .from('master_purchase_orders')
        .select('*')
        .eq('id', poId)
        .single();
      if (poError) throw poError;

      const { data: links, error: linksError } = await supabase
        .from('po_order_links')
        .select('*')
        .eq('po_id', poId)
        .order('customer_name');
      if (linksError) throw linksError;

      return { po: po as MasterPurchaseOrder, links: links as POOrderLink[] };
    },
    enabled: !!poId,
  });

  // Fetch PO picking items for manifest
  const usePOPickingItems = (poId: string) => useQuery({
    queryKey: ['po-picking-items', poId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('po_picking_items')
        .select('*')
        .eq('po_id', poId)
        .order('product_name');
      if (error) throw error;
      return data as POPickingItem[];
    },
    enabled: !!poId,
  });

  // Get current open PO or create new one
  const useCurrentOpenPO = () => useQuery({
    queryKey: ['current-open-po'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('master_purchase_orders')
        .select('*')
        .in('status', ['draft', 'open'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as MasterPurchaseOrder | null;
    },
  });

  // Create new PO
  const createPO = useMutation({
    mutationFn: async (notes?: string) => {
      const { data: poNumber } = await supabase.rpc('generate_po_number');
      
      const { data, error } = await supabase
        .from('master_purchase_orders')
        .insert({
          po_number: poNumber || `PO${Date.now()}`,
          status: 'open',
          notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MasterPurchaseOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['current-open-po'] });
      toast.success('Nueva Orden de Compra creada');
    },
    onError: () => toast.error('Error al crear PO'),
  });

  // Link pending orders to PO
  const linkOrdersToPO = useMutation({
    mutationFn: async (poId: string) => {
      const { data, error } = await supabase.rpc('link_orders_to_po', { p_po_id: poId });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['master-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-details'] });
      queryClient.invalidateQueries({ queryKey: ['current-open-po'] });
      toast.success(`${data?.orders_linked || 0} pedidos vinculados a la PO`);
    },
    onError: () => toast.error('Error al vincular pedidos'),
  });

  // Enter China tracking and generate hybrid IDs
  const enterChinaTracking = useMutation({
    mutationFn: async ({ poId, chinaTracking }: { poId: string; chinaTracking: string }) => {
      const { data, error } = await supabase.rpc('process_po_china_tracking', {
        p_po_id: poId,
        p_china_tracking: chinaTracking,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['master-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-details'] });
      queryClient.invalidateQueries({ queryKey: ['po-order-links'] });
      toast.success(`Tracking registrado. ${data?.orders_updated || 0} pedidos actualizados con ID híbrido.`);
    },
    onError: (error: any) => toast.error(error.message || 'Error al registrar tracking'),
  });

  // Update PO logistics stage
  const updatePOStage = useMutation({
    mutationFn: async ({ poId, newStatus }: { poId: string; newStatus: string }) => {
      const { data, error } = await supabase.rpc('update_po_logistics_stage', {
        p_po_id: poId,
        p_new_status: newStatus,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['master-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['po-details'] });
      toast.success(`Estado actualizado a ${data?.new_status}. ${data?.orders_updated || 0} pedidos sincronizados.`);
    },
    onError: () => toast.error('Error al actualizar estado'),
  });

  // Generate pickup QR for confirmed payment orders
  const generatePickupQR = useMutation({
    mutationFn: async (orderLinkId: string) => {
      const { data, error } = await supabase.rpc('generate_po_pickup_qr', {
        p_order_link_id: orderLinkId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['po-details'] });
      toast.success('Código QR generado');
    },
    onError: (error: any) => toast.error(error.message || 'Error al generar QR'),
  });

  // Close PO (no more orders can be linked)
  const closePO = useMutation({
    mutationFn: async (poId: string) => {
      const { error } = await supabase
        .from('master_purchase_orders')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          cycle_end_at: new Date().toISOString(),
        })
        .eq('id', poId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['master-purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['current-open-po'] });
      toast.success('PO cerrada');
    },
    onError: () => toast.error('Error al cerrar PO'),
  });

  // Get picking manifest data for PDF
  const getPickingManifest = async (poId: string): Promise<POPickingManifest | null> => {
    const { data: po, error: poError } = await supabase
      .from('master_purchase_orders')
      .select('*')
      .eq('id', poId)
      .single();
    
    if (poError || !po) return null;

    const { data: links } = await supabase
      .from('po_order_links')
      .select('*')
      .eq('po_id', poId)
      .order('customer_name');

    const { data: items } = await supabase
      .from('po_picking_items')
      .select('*')
      .eq('po_id', poId);

    // Group items by customer
    const customerMap = new Map<string, {
      customer_name: string;
      customer_phone: string | null;
      hybrid_tracking_id: string | null;
      department_code: string | null;
      commune_code: string | null;
      items: POPickingItem[];
    }>();

    links?.forEach(link => {
      const customerItems = items?.filter(item => item.po_order_link_id === link.id) || [];
      const key = link.id;
      
      customerMap.set(key, {
        customer_name: link.customer_name || 'Sin nombre',
        customer_phone: link.customer_phone,
        hybrid_tracking_id: link.hybrid_tracking_id,
        department_code: link.department_code,
        commune_code: link.commune_code,
        items: customerItems,
      });
    });

    return {
      po: po as MasterPurchaseOrder,
      customers: Array.from(customerMap.values()),
    };
  };

  return {
    usePOList,
    usePODetails,
    usePOPickingItems,
    useCurrentOpenPO,
    createPO,
    linkOrdersToPO,
    enterChinaTracking,
    updatePOStage,
    generatePickupQR,
    closePO,
    getPickingManifest,
  };
};

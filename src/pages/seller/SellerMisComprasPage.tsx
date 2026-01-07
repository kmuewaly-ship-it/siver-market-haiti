import { useState, useEffect, useMemo } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useBuyerB2BOrders, useCancelBuyerOrder, BuyerOrder, BuyerOrderStatus, RefundStatus, BuyerOrderItem } from '@/hooks/useBuyerOrders';
import { usePackageTracking } from '@/hooks/usePackageTracking';
import { TrackingWidget } from '@/components/tracking/TrackingWidget';
import { useOrdersPOInfo, OrderPOInfo } from '@/hooks/useOrderPOInfo';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { generateInvoicePDF } from '@/services/pdfGenerators';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  Search, 
  Loader2,
  Eye,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  ExternalLink,
  MapPin,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Ban,
  ChevronRight,
  Printer,
  FileText,
  
  Boxes,
  Ship,
  Plane,
  Warehouse,
  PackageCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';

const statusConfig: Record<BuyerOrderStatus, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  draft: { label: 'Borrador', color: 'text-gray-600', icon: Clock, bgColor: 'bg-gray-100' },
  placed: { label: 'Confirmado', color: 'text-blue-600', icon: Package, bgColor: 'bg-blue-100' },
  paid: { label: 'Pagado', color: 'text-amber-600', icon: CheckCircle, bgColor: 'bg-amber-100' },
  shipped: { label: 'En camino', color: 'text-purple-600', icon: Truck, bgColor: 'bg-purple-100' },
  delivered: { label: 'Entregado', color: 'text-green-600', icon: CheckCircle, bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelado', color: 'text-red-600', icon: XCircle, bgColor: 'bg-red-100' },
};

const refundStatusConfig: Record<RefundStatus, { label: string; color: string; bgColor: string }> = {
  none: { label: 'Sin reembolso', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  requested: { label: 'Solicitado', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  processing: { label: 'En proceso', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  completed: { label: 'Completado', color: 'text-green-600', bgColor: 'bg-green-100' },
  rejected: { label: 'Rechazado', color: 'text-red-600', bgColor: 'bg-red-100' },
};

const carrierUrls: Record<string, string> = {
  "DHL": "https://www.dhl.com/en/express/tracking.html?AWB=",
  "FedEx": "https://www.fedex.com/fedextrack/?trknbr=",
  "UPS": "https://www.ups.com/track?tracknum=",
  "USPS": "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
};

const SellerMisComprasPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<BuyerOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);
  const [selectedItem, setSelectedItem] = useState<BuyerOrderItem | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);

  const { data: orders, isLoading } = useBuyerB2BOrders(statusFilter === 'all' ? undefined : statusFilter);
  const cancelOrder = useCancelBuyerOrder();

  // Get order IDs to fetch PO info
  const orderIds = useMemo(() => orders?.map(o => o.id) || [], [orders]);
  const { data: poInfoMap } = useOrdersPOInfo(orderIds);
  // Package tracking
  const { tracking, isLoading: trackingLoading, getCarrierTrackingUrl } = usePackageTracking(
    selectedOrder?.id || ''
  );

  // Real-time subscription for B2B order updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('seller-b2b-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders_b2b',
          filter: `buyer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('B2B Order update received:', payload);
          
          // Invalidate queries to refetch data with specific key matching
          queryClient.invalidateQueries({ queryKey: ['buyer-b2b-orders', user?.id] });
          
          // Show toast for important updates
          if (payload.eventType === 'UPDATE' && payload.new) {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            
            // Payment confirmed
            if (oldData?.payment_status !== 'paid' && newData.payment_status === 'paid') {
              toast.success('¡Pago Confirmado!', {
                description: 'Tu pago ha sido validado y tu pedido está en proceso.'
              });
            }
            
            // Status changes
            if (oldData?.status !== newData.status) {
              const statusMessages: Record<string, { title: string; desc: string }> = {
                'shipped': { title: '📦 Pedido Enviado', desc: 'Tu pedido está en camino' },
                'delivered': { title: '✅ Pedido Entregado', desc: '¡Tu pedido ha llegado a su destino!' },
              };
              
              const msg = statusMessages[newData.status];
              if (msg) {
                toast.success(msg.title, { description: msg.desc });
              }
            }

            // Logistics stage changes
            if (oldData?.metadata?.logistics_stage !== newData.metadata?.logistics_stage) {
              const stageMessages: Record<string, string> = {
                'in_china': '📍 Tu pedido está en China',
                'in_transit_usa': '✈️ Tu pedido está en tránsito hacia USA',
                'in_haiti_hub': '🏢 Tu pedido llegó al Hub en Haití',
                'ready_for_delivery': '🚚 Tu pedido está listo para entrega',
              };
              
              const msg = stageMessages[newData.metadata?.logistics_stage];
              if (msg) {
                toast.info('Actualización de Envío', { description: msg });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // PDF Generation handler - Invoice only (sellers don't need shipping labels for their purchases)

  const handlePrintInvoice = (order: BuyerOrder) => {
    const shippingAddress = order.metadata?.shipping_address || {};
    
    generateInvoicePDF({
      id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase(),
      customer_name: user?.name || shippingAddress.full_name || 'Cliente B2B',
      customer_phone: shippingAddress.phone || '',
      customer_address: shippingAddress.street || '',
      department: shippingAddress.department,
      commune: shippingAddress.commune,
      items: (order.order_items_b2b || []).map(item => ({
        sku: item.sku,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        color: item.sku?.split('-')[1],
        size: item.sku?.split('-')[2],
        image: item.image || undefined,
      })),
      total_amount: order.total_amount,
      payment_method: order.payment_method || 'N/A',
      created_at: order.created_at,
      hybrid_tracking_id: order.metadata?.hybrid_tracking_id,
    });
    
    toast.success('Factura generada', { description: 'Preparando impresión...' });
  };

  const getStatusBadge = (status: BuyerOrderStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.bgColor} ${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleCancelClick = (order: BuyerOrder) => {
    setSelectedOrder(order);
    setShowCancelDialog(true);
    setCancelReason('');
    setRequestRefund(false);
  };

  const handleConfirmCancel = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;

    await cancelOrder.mutateAsync({
      orderId: selectedOrder.id,
      reason: cancelReason,
      requestRefund: requestRefund && selectedOrder.status === 'paid',
    });

    setShowCancelDialog(false);
    setSelectedOrder(null);
  };

  const filteredOrders = orders || [];

  // Stats
  const stats = {
    total: filteredOrders.length,
    pending: filteredOrders.filter(o => o.status === 'placed').length,
    paid: filteredOrders.filter(o => o.status === 'paid').length,
    shipped: filteredOrders.filter(o => o.status === 'shipped').length,
    delivered: filteredOrders.filter(o => o.status === 'delivered').length,
    totalAmount: filteredOrders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
      .reduce((sum, o) => sum + o.total_amount, 0),
  };

  return (
    <SellerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mis Compras B2B</h1>
          <p className="text-muted-foreground">Historial y seguimiento de tus compras mayoristas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-500">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pagados</CardTitle>
              <CheckCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-amber-500">{stats.paid}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">En Camino</CardTitle>
              <Truck className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-purple-500">{stats.shipped}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Entregados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">{stats.delivered}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">${stats.totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as BuyerOrderStatus | 'all')}>
              <TabsList className="grid grid-cols-4 md:grid-cols-7 gap-1">
                <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
                <TabsTrigger value="placed" className="text-xs">Pendientes</TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">Pagados</TabsTrigger>
                <TabsTrigger value="shipped" className="text-xs">En Camino</TabsTrigger>
                <TabsTrigger value="delivered" className="text-xs hidden md:block">Entregados</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs hidden md:block">Cancelados</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </Card>
          ) : filteredOrders.length === 0 ? (
            <Card className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tienes compras aún</h3>
              <p className="text-muted-foreground mb-4">Explora el catálogo B2B y realiza tu primera compra</p>
              <Button asChild>
                <Link to="/seller/adquisicion-lotes">Ir al Catálogo B2B</Link>
              </Button>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const status = statusConfig[order.status];
              const Icon = status.icon;
              const trackingNumber = order.metadata?.tracking_number;
              const carrier = order.metadata?.carrier;
              const poInfo = poInfoMap?.[order.id];
              
              return (
                <Card 
                  key={order.id} 
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 ${
                    order.status === 'shipped' ? 'border-l-purple-500' : 
                    order.status === 'delivered' ? 'border-l-green-500' : 
                    order.status === 'paid' ? 'border-l-amber-500' : 
                    order.status === 'placed' ? 'border-l-blue-500' : 
                    order.status === 'cancelled' ? 'border-l-red-500' : 'border-l-gray-300'
                  }`}
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-14 h-14 rounded-xl bg-muted overflow-hidden shrink-0">
                          {order.order_items_b2b?.[0]?.image ? (
                            <img 
                              src={order.order_items_b2b[0].image} 
                              alt={order.order_items_b2b[0].nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className={`w-full h-full flex items-center justify-center ${status.bgColor}`}>
                              <Icon className={`h-5 w-5 ${status.color}`} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
                            {getStatusBadge(order.status)}
                            <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
                              <Boxes className="h-3 w-3 mr-1" />
                              B2B
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.order_items_b2b?.length || 0} productos • {order.total_quantity} unidades
                          </p>
                          {/* Show PO info if linked */}
                          {poInfo && (
                            <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              PO: {poInfo.po_number}
                              {poInfo.hybrid_tracking_id && (
                                <span className="ml-2 font-mono">{poInfo.hybrid_tracking_id}</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">${order.total_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{order.currency}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.status === 'shipped' && trackingNumber && (
                      <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-purple-600" />
                        <span className="text-muted-foreground">Rastreo:</span>
                        <span className="font-medium text-purple-600">{trackingNumber}</span>
                        {carrier && <span className="text-muted-foreground">({carrier})</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder && !showCancelDialog} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (() => {
            const selectedPoInfo = poInfoMap?.[selectedOrder.id];
            return (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${statusConfig[selectedOrder.status].bgColor} ${statusConfig[selectedOrder.status].color}`}>
                    {(() => {
                      const Icon = statusConfig[selectedOrder.status].icon;
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <span className="block">Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(selectedOrder.status)}
                      <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 text-xs">
                        <Boxes className="h-3 w-3 mr-1" />
                        B2B
                      </Badge>
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* PO Information Card - Show if linked to PO */}
                {selectedPoInfo && (
                  <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-indigo-700">
                        <Boxes className="h-5 w-5" />
                        Orden de Compra Consolidada
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-indigo-600">Número de PO:</span>
                        <Badge className="bg-indigo-600 text-white">{selectedPoInfo.po_number}</Badge>
                      </div>
                      {selectedPoInfo.hybrid_tracking_id && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-indigo-600">ID Híbrido:</span>
                          <span className="font-mono text-sm font-medium text-indigo-800">{selectedPoInfo.hybrid_tracking_id}</span>
                        </div>
                      )}
                      {selectedPoInfo.china_tracking_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-indigo-600">Guía China:</span>
                          <span className="font-mono text-sm font-medium text-indigo-800">{selectedPoInfo.china_tracking_number}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-indigo-600">Estado PO:</span>
                        <Badge variant="outline" className="border-indigo-300 text-indigo-700">
                          {selectedPoInfo.po_status === 'open' ? 'Abierta' : 
                           selectedPoInfo.po_status === 'closed' ? 'Cerrada' : 
                           selectedPoInfo.po_status === 'in_transit' ? 'En Tránsito' :
                           selectedPoInfo.po_status === 'arrived_hub' ? 'En Hub' : selectedPoInfo.po_status}
                        </Badge>
                      </div>
                      
                      {/* PO Logistics Timeline */}
                      <div className="mt-4 pt-3 border-t border-indigo-200">
                        <p className="text-xs font-medium text-indigo-700 mb-2">Progreso Logístico</p>
                        <div className="flex items-center gap-2 text-xs">
                          <div className={`flex items-center gap-1 ${selectedPoInfo.shipped_from_china_at ? 'text-green-600' : 'text-gray-400'}`}>
                            <Package className="h-3 w-3" />
                            <span>China</span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-gray-300" />
                          <div className={`flex items-center gap-1 ${selectedPoInfo.arrived_usa_at ? 'text-green-600' : 'text-gray-400'}`}>
                            <Plane className="h-3 w-3" />
                            <span>USA</span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-gray-300" />
                          <div className={`flex items-center gap-1 ${selectedPoInfo.arrived_hub_at ? 'text-green-600' : 'text-gray-400'}`}>
                            <Warehouse className="h-3 w-3" />
                            <span>Hub Haití</span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-gray-300" />
                          <div className={`flex items-center gap-1 ${selectedPoInfo.delivery_confirmed_at ? 'text-green-600' : 'text-gray-400'}`}>
                            <PackageCheck className="h-3 w-3" />
                            <span>Entregado</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Package Tracking Widget */}
                {selectedOrder && ['shipped', 'delivered'].includes(selectedOrder.status) && (
                  <TrackingWidget 
                    tracking={tracking}
                    isLoading={trackingLoading}
                    getCarrierTrackingUrl={getCarrierTrackingUrl}
                  />
                )}

                {/* Tracking Section */}
                {selectedOrder && (selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && selectedOrder.metadata?.tracking_number && (
                  <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                        <Truck className="h-5 w-5" />
                        Seguimiento de Envío
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Paquetería</p>
                          <p className="font-semibold text-purple-900">{selectedOrder.metadata.carrier || "No especificada"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Número de Guía</p>
                          <p className="font-mono font-semibold text-purple-900">{selectedOrder.metadata.tracking_number}</p>
                        </div>
                      </div>
                      
                      {selectedOrder.metadata.estimated_delivery && (
                        <div className="flex items-center gap-2 text-sm bg-white/60 p-2 rounded-lg">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          <span className="text-muted-foreground">Entrega estimada:</span>
                          <span className="font-medium">{selectedOrder.metadata.estimated_delivery}</span>
                        </div>
                      )}

                      {selectedOrder.metadata.carrier && carrierUrls[selectedOrder.metadata.carrier] && (
                        <a 
                          href={`${carrierUrls[selectedOrder.metadata.carrier]}${selectedOrder.metadata.tracking_number}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                        >
                          <MapPin className="h-4 w-4" />
                          Rastrear en {selectedOrder.metadata.carrier}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Estado del Pedido</h4>
                  <div className="relative">
                    {['placed', 'paid', 'shipped', 'delivered'].map((step, index) => {
                      const stepStatus = statusConfig[step as BuyerOrderStatus];
                      const StepIcon = stepStatus.icon;
                      const isCompleted = ['placed', 'paid', 'shipped', 'delivered'].indexOf(selectedOrder.status) >= index;
                      const isCurrent = selectedOrder.status === step;

                      return (
                        <div key={step} className="flex items-center gap-3 mb-3 last:mb-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                            ${isCompleted ? stepStatus.bgColor : 'bg-gray-100'}
                            ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''}`}>
                            <StepIcon className={`h-4 w-4 ${isCompleted ? stepStatus.color : 'text-gray-400'}`} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {stepStatus.label}
                            </p>
                          </div>
                          {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Productos ({selectedOrder.order_items_b2b?.length || 0})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedOrder.order_items_b2b?.map((item) => {
                      // Extract variant info from SKU
                      const skuParts = item.sku?.split('-') || [];
                      const color = skuParts[1] || null;
                      const size = skuParts[2] || null;
                      
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedItem(item)}
                        >
                          {/* Product Image */}
                          <div className="w-12 h-12 rounded-md bg-muted overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.nombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm line-clamp-1">{item.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {color && (
                                <span className="bg-muted px-1.5 py-0.5 rounded capitalize">{color}</span>
                              )}
                              {size && (
                                <span className="bg-muted px-1.5 py-0.5 rounded uppercase">{size}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold">${item.subtotal.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">× {item.cantidad} uds</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {selectedOrder.currency} ${selectedOrder.total_amount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Cancellation Info */}
                {selectedOrder.status === 'cancelled' && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Ban className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-red-700">Pedido Cancelado</span>
                      </div>
                      {selectedOrder.metadata?.cancellation_reason && (
                        <p className="text-sm text-red-600">
                          <span className="font-medium">Motivo:</span> {selectedOrder.metadata.cancellation_reason}
                        </p>
                      )}
                      {selectedOrder.metadata?.refund_status && selectedOrder.metadata.refund_status !== 'none' && (
                        <div className="border-t border-red-200 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-red-700">Estado del Reembolso</span>
                            <Badge className={`${refundStatusConfig[selectedOrder.metadata.refund_status as RefundStatus].bgColor} ${refundStatusConfig[selectedOrder.metadata.refund_status as RefundStatus].color}`}>
                              {refundStatusConfig[selectedOrder.metadata.refund_status as RefundStatus].label}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* PDF Generation Actions */}
                {['paid', 'shipped', 'delivered'].includes(selectedOrder.status) && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Printer className="h-4 w-4" />
                      Documentos
                    </h4>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintInvoice(selectedOrder)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Factura de Compra
                      </Button>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <Button asChild className="w-full">
                    <Link to="/seller/adquisicion-lotes">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Volver a Comprar
                    </Link>
                  </Button>

                  {['placed', 'paid'].includes(selectedOrder.status) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-50/50"
                      onClick={() => handleCancelClick(selectedOrder)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  )}
                </div>
              </div>
            </>
          );
          })()}
        </DialogContent>
      </Dialog>

      {/* Cancel Order Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cancelar Pedido
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Por favor indica el motivo de la cancelación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo de cancelación *</label>
              <Textarea
                placeholder="Escribe el motivo de la cancelación..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>

            {selectedOrder?.status === 'paid' && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  id="refund"
                  checked={requestRefund}
                  onChange={(e) => setRequestRefund(e.target.checked)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <label htmlFor="refund" className="font-medium text-amber-800 cursor-pointer">
                    Solicitar reembolso
                  </label>
                  <p className="text-xs text-amber-600">
                    Tu pedido ya fue pagado. Marca esta opción para solicitar el reembolso de ${selectedOrder?.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelOrder.isPending}>
              Volver
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmCancel}
              disabled={!cancelReason.trim() || cancelOrder.isPending}
            >
              {cancelOrder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Modal - Shows all variants of the same product */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedItem && selectedOrder && (() => {
            // Get the base SKU (first part before variants)
            const selectedSkuBase = selectedItem.sku?.split('-')[0] || selectedItem.sku;
            
            // Find all items with the same base SKU (same product, different variants)
            const allVariants = selectedOrder.order_items_b2b?.filter(item => {
              const itemSkuBase = item.sku?.split('-')[0] || item.sku;
              return itemSkuBase === selectedSkuBase;
            }) || [selectedItem];
            
            // Calculate totals for all variants
            const totalQuantity = allVariants.reduce((sum, item) => sum + item.cantidad, 0);
            const totalSubtotal = allVariants.reduce((sum, item) => sum + item.subtotal, 0);
            
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg">Detalle del Producto</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Product Image - Large */}
                  <div className="aspect-square w-full max-w-[200px] mx-auto rounded-lg bg-muted overflow-hidden">
                    {selectedItem.image ? (
                      <img 
                        src={selectedItem.image} 
                        alt={selectedItem.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  
                  {/* Product Name */}
                  <div className="text-center">
                    <h3 className="font-semibold text-base leading-tight">{selectedItem.nombre}</h3>
                    <p className="text-xs text-muted-foreground mt-1">SKU Base: {selectedSkuBase}</p>
                  </div>
                  
                  {/* All Variants Purchased */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Variantes Compradas ({allVariants.length})
                    </h4>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {allVariants.map((variant) => {
                        const skuParts = variant.sku?.split('-') || [];
                        const color = skuParts[1] || null;
                        const size = skuParts[2] || null;
                        
                        return (
                          <div 
                            key={variant.id} 
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {color && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium capitalize">
                                  {color}
                                </span>
                              )}
                              {size && (
                                <span className="bg-secondary/50 px-2 py-1 rounded text-xs font-medium uppercase">
                                  {size}
                                </span>
                              )}
                              {!color && !size && (
                                <span className="text-xs text-muted-foreground">Sin variantes</span>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-sm">{variant.cantidad} uds</p>
                              <p className="text-xs text-muted-foreground">${variant.precio_unitario.toFixed(2)} c/u</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total variantes</span>
                      <span className="font-medium">{allVariants.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Total unidades</span>
                      <span className="font-semibold text-lg">{totalQuantity} uds</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">Subtotal</span>
                      <span className="font-bold text-primary">${totalSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSelectedItem(null)}>
                    Cerrar
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
};

export default SellerMisComprasPage;

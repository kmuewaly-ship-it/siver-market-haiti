import { useState } from 'react';
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
import { useBuyerOrders, useCancelBuyerOrder, BuyerOrder, BuyerOrderStatus, RefundStatus } from '@/hooks/useBuyerOrders';
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
  ChevronRight
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
  const [statusFilter, setStatusFilter] = useState<BuyerOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);

  const { data: orders, isLoading } = useBuyerOrders(statusFilter === 'all' ? undefined : statusFilter);
  const cancelOrder = useCancelBuyerOrder();

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
                        <div className={`p-3 rounded-xl ${status.bgColor} ${status.color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
                            {getStatusBadge(order.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.order_items_b2b?.length || 0} productos • {order.total_quantity} unidades
                          </p>
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
          {selectedOrder && (
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
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Tracking Section */}
                {(selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && selectedOrder.metadata?.tracking_number && (
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
                    {selectedOrder.order_items_b2b?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.nombre}</p>
                          <p className="text-xs text-muted-foreground">SKU: {item.sku} • Cant: {item.cantidad}</p>
                        </div>
                        <p className="font-semibold">${item.subtotal.toLocaleString()}</p>
                      </div>
                    ))}
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
                      variant="outline" 
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleCancelClick(selectedOrder)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancelar Pedido
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
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
    </SellerLayout>
  );
};

export default SellerMisComprasPage;

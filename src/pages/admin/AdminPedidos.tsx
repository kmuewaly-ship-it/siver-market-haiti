import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useOrders, OrderStatus, Order } from '@/hooks/useOrders';
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
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Borrador', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock },
  placed: { label: 'Pendiente Pago', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertCircle },
  paid: { label: 'Pagado', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  shipped: { label: 'Enviado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Truck },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
};

const carrierOptions = [
  { value: 'DHL', label: 'DHL', url: 'https://www.dhl.com/en/express/tracking.html?AWB=' },
  { value: 'FedEx', label: 'FedEx', url: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { value: 'UPS', label: 'UPS', url: 'https://www.ups.com/track?tracknum=' },
  { value: 'USPS', label: 'USPS', url: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { value: 'Estafeta', label: 'Estafeta', url: 'https://rastreo3.estafeta.com/Tracking/searchByGet?wayBillType=1&wayBill=' },
  { value: 'other', label: 'Otra paquetería', url: '' },
];

const AdminPedidos = () => {
  const { useAllOrders, useOrderStats, updateOrderStatus, updateOrderTracking, cancelOrder } = useOrders();
  
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  
  // Tracking form state
  const [trackingCarrier, setTrackingCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [customCarrierUrl, setCustomCarrierUrl] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');

  const { data: orders, isLoading } = useAllOrders({ status: statusFilter, search: searchTerm });
  const { data: stats } = useOrderStats();

  const filteredOrders = orders?.filter(order => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(search) ||
      order.profiles?.full_name?.toLowerCase().includes(search) ||
      order.profiles?.email?.toLowerCase().includes(search)
    );
  });

  const handleUpdateStatus = async () => {
    if (selectedOrder && newStatus) {
      await updateOrderStatus.mutateAsync({ orderId: selectedOrder.id, status: newStatus });
      setSelectedOrder(null);
      setNewStatus('');
    }
  };

  const handleUpdateTracking = async () => {
    if (selectedOrder && trackingCarrier && trackingNumber) {
      const carrierOption = carrierOptions.find(c => c.value === trackingCarrier);
      const carrierUrl = trackingCarrier === 'other' ? customCarrierUrl : carrierOption?.url || '';
      
      await updateOrderTracking.mutateAsync({
        orderId: selectedOrder.id,
        carrier: trackingCarrier === 'other' ? 'Otro' : trackingCarrier,
        trackingNumber,
        carrierUrl,
        estimatedDelivery: estimatedDelivery || undefined,
      });
      
      setSelectedOrder(null);
      resetTrackingForm();
    }
  };

  const resetTrackingForm = () => {
    setTrackingCarrier('');
    setTrackingNumber('');
    setCustomCarrierUrl('');
    setEstimatedDelivery('');
  };

  const handleOpenOrder = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status as OrderStatus);
    // Pre-fill tracking info if exists
    const metadata = order.metadata as any;
    if (metadata?.carrier) {
      const matchingCarrier = carrierOptions.find(c => c.value === metadata.carrier);
      setTrackingCarrier(matchingCarrier ? metadata.carrier : 'other');
      if (!matchingCarrier) setCustomCarrierUrl(metadata.carrier_url || '');
    }
    if (metadata?.tracking_number) setTrackingNumber(metadata.tracking_number);
    if (metadata?.estimated_delivery) setEstimatedDelivery(metadata.estimated_delivery);
  };

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('¿Estás seguro de cancelar este pedido?')) {
      await cancelOrder.mutateAsync(orderId);
      setSelectedOrder(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Gestión de Pedidos B2B" subtitle="Administra todos los pedidos de mayoristas">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Borradores</CardTitle>
              <Clock className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-gray-500">{stats?.draft || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pend. Pago</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-500">{stats?.placed || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Pagados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">{stats?.paid || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Enviados</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-500">{stats?.shipped || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Cancelados</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-500">{stats?.cancelled || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Ingresos</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">${stats?.paidAmount?.toFixed(0) || '0'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, vendedor o email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="placed">Pendiente de Pago</SelectItem>
                  <SelectItem value="paid">Pagado</SelectItem>
                  <SelectItem value="shipped">Enviado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">ID Pedido</TableHead>
                    <TableHead className="text-muted-foreground">Vendedor</TableHead>
                    <TableHead className="text-muted-foreground">Fecha</TableHead>
                    <TableHead className="text-muted-foreground text-center">Productos</TableHead>
                    <TableHead className="text-muted-foreground text-right">Total</TableHead>
                    <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No hay pedidos</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => (
                      <TableRow key={order.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-sm text-foreground">
                          {order.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{order.profiles?.full_name || 'Sin nombre'}</p>
                            <p className="text-xs text-muted-foreground">{order.profiles?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-center text-foreground">
                          {order.total_quantity}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ${Number(order.total_amount).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(order.status as OrderStatus)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenOrder(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalle del Pedido
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">ID Pedido</p>
                  <p className="font-mono text-sm">{selectedOrder.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estado Actual</p>
                  {getStatusBadge(selectedOrder.status as OrderStatus)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendedor</p>
                  <p className="text-sm font-medium">{selectedOrder.profiles?.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="text-sm">{format(new Date(selectedOrder.created_at), "dd MMMM yyyy, HH:mm", { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Método de Pago</p>
                  <p className="text-sm capitalize">{selectedOrder.payment_method || 'No especificado'}</p>
                </div>
              </div>

              {/* Update Status */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <p className="text-sm font-medium">Cambiar Estado</p>
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="placed">Pendiente de Pago</SelectItem>
                      <SelectItem value="paid">Pagado</SelectItem>
                      <SelectItem value="shipped">Enviado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleUpdateStatus}
                    disabled={updateOrderStatus.isPending || newStatus === selectedOrder.status}
                  >
                    {updateOrderStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar'}
                  </Button>
                </div>
              </div>

              {/* Tracking Info Section */}
              {(selectedOrder.status === 'paid' || selectedOrder.status === 'shipped') && (
                <div className="p-4 bg-purple-500/10 rounded-lg space-y-4 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-purple-500" />
                    <p className="font-medium text-purple-500">Información de Envío</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="carrier">Paquetería</Label>
                      <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar paquetería" />
                        </SelectTrigger>
                        <SelectContent>
                          {carrierOptions.map((carrier) => (
                            <SelectItem key={carrier.value} value={carrier.value}>
                              {carrier.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="trackingNumber">Número de Guía</Label>
                      <Input
                        id="trackingNumber"
                        placeholder="Ej: 1234567890"
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                      />
                    </div>
                    
                    {trackingCarrier === 'other' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="customUrl">URL de rastreo (opcional)</Label>
                        <Input
                          id="customUrl"
                          placeholder="https://..."
                          value={customCarrierUrl}
                          onChange={(e) => setCustomCarrierUrl(e.target.value)}
                        />
                      </div>
                    )}
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="estimatedDelivery">Fecha estimada de entrega (opcional)</Label>
                      <Input
                        id="estimatedDelivery"
                        placeholder="Ej: 25 de Diciembre, 2024"
                        value={estimatedDelivery}
                        onChange={(e) => setEstimatedDelivery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleUpdateTracking}
                    disabled={!trackingCarrier || !trackingNumber || updateOrderTracking.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {updateOrderTracking.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Truck className="h-4 w-4 mr-2" />
                    )}
                    Guardar y Marcar como Enviado
                  </Button>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Productos ({selectedOrder.total_quantity})</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cant.</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.order_items_b2b?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.nombre}</p>
                              <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{item.cantidad}</TableCell>
                          <TableCell className="text-right">${Number(item.precio_unitario).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${Number(item.subtotal).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
                <span className="font-medium">Total del Pedido</span>
                <span className="text-2xl font-bold text-primary">${Number(selectedOrder.total_amount).toFixed(2)} {selectedOrder.currency}</span>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              <DialogFooter>
                {selectedOrder.status !== 'cancelled' && (
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={cancelOrder.isPending}
                  >
                    {cancelOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Cancelar Pedido
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminPedidos;
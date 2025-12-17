import { useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOrders, OrderStatus, Order } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
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
  AlertCircle
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

const SellerPedidosPage = () => {
  const { user } = useAuth();
  const { useSellerOrders, useOrderStats, cancelOrder } = useOrders();
  
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data: orders, isLoading } = useSellerOrders({ status: statusFilter });
  const { data: stats } = useOrderStats(user?.id);

  const filteredOrders = orders?.filter(order => {
    if (!searchTerm) return true;
    return order.id.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
    <SellerLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Mis Pedidos</h1>
          <p className="text-muted-foreground">Gestiona tus pedidos B2B</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">${stats?.paidAmount?.toFixed(2) || '0.00'}</div>
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
                  placeholder="Buscar por ID de pedido..."
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
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : filteredOrders?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No tienes pedidos aún</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => (
                      <TableRow key={order.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-sm text-foreground">
                          {order.id.substring(0, 8)}...
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
                            onClick={() => setSelectedOrder(order)}
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
                  <p className="text-sm text-muted-foreground">Estado</p>
                  {getStatusBadge(selectedOrder.status as OrderStatus)}
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

              {/* Order Items */}
              <div>
                <h4 className="font-medium mb-3">Productos</h4>
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
              <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span className="font-medium">Total</span>
                <span className="text-xl font-bold">${Number(selectedOrder.total_amount).toFixed(2)} {selectedOrder.currency}</span>
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notas</h4>
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Actions */}
              {(selectedOrder.status === 'draft' || selectedOrder.status === 'placed') && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    disabled={cancelOrder.isPending}
                  >
                    {cancelOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Cancelar Pedido
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
};

export default SellerPedidosPage;
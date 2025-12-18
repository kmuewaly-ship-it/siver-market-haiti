import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  RefreshCw, 
  Search, 
  Loader2,
  Eye,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type RefundStatus = 'requested' | 'processing' | 'completed' | 'rejected';

interface RefundOrder {
  id: string;
  seller_id: string;
  total_amount: number;
  status: string;
  metadata: Record<string, any>;
  created_at: string;
  profiles?: { full_name: string | null; email: string | null } | null;
}

const refundStatusConfig: Record<RefundStatus, { label: string; color: string; icon: React.ElementType }> = {
  requested: { label: 'Solicitado', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  processing: { label: 'Procesando', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: RefreshCw },
  completed: { label: 'Completado', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rechazado', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
};

const AdminReembolsos = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [statusFilter, setStatusFilter] = useState<RefundStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<RefundOrder | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');

  // Fetch orders with refund requests
  const { data: refundOrders, isLoading } = useQuery({
    queryKey: ['refund-orders', statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders_b2b')
        .select(`
          *,
          profiles!orders_b2b_seller_id_fkey (full_name, email)
        `)
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter only orders with refund requests
      return (data as RefundOrder[]).filter(order => {
        const metadata = order.metadata || {};
        return metadata.refund_status && metadata.refund_status !== 'none';
      });
    },
  });

  // Update refund status mutation
  const updateRefundStatus = useMutation({
    mutationFn: async ({ 
      orderId, 
      refundStatus, 
      notes,
      amount 
    }: { 
      orderId: string; 
      refundStatus: RefundStatus; 
      notes?: string;
      amount?: number;
    }) => {
      // Get current metadata first
      const { data: currentOrder } = await supabase
        .from('orders_b2b')
        .select('metadata')
        .eq('id', orderId)
        .single();

      const currentMetadata = (currentOrder?.metadata as Record<string, any>) || {};

      const updatedMetadata = {
        ...currentMetadata,
        refund_status: refundStatus,
        refund_admin_notes: notes || currentMetadata.refund_admin_notes,
        refund_amount: amount || currentMetadata.refund_amount,
        ...(refundStatus === 'completed' ? { refund_completed_at: new Date().toISOString() } : {}),
        ...(refundStatus === 'rejected' ? { refund_rejected_at: new Date().toISOString() } : {}),
      };

      const { data, error } = await supabase
        .from('orders_b2b')
        .update({ 
          metadata: updatedMetadata,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refund-orders'] });
      queryClient.invalidateQueries({ queryKey: ['all-orders'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-orders'] });
      toast({ title: 'Estado del reembolso actualizado' });
      setSelectedOrder(null);
      setAdminNotes('');
      setRefundAmount('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar reembolso', description: error.message, variant: 'destructive' });
    },
  });

  const filteredOrders = refundOrders?.filter(order => {
    const metadata = order.metadata || {};
    const matchesStatus = statusFilter === 'all' || metadata.refund_status === statusFilter;
    
    if (!searchTerm) return matchesStatus;
    const search = searchTerm.toLowerCase();
    return matchesStatus && (
      order.id.toLowerCase().includes(search) ||
      order.profiles?.full_name?.toLowerCase().includes(search) ||
      order.profiles?.email?.toLowerCase().includes(search)
    );
  });

  const handleOpenOrder = (order: RefundOrder) => {
    setSelectedOrder(order);
    const metadata = order.metadata || {};
    setAdminNotes(metadata.refund_admin_notes || '');
    setRefundAmount(metadata.refund_amount?.toString() || order.total_amount.toString());
  };

  const handleApprove = () => {
    if (selectedOrder) {
      updateRefundStatus.mutate({
        orderId: selectedOrder.id,
        refundStatus: 'processing',
        notes: adminNotes,
        amount: parseFloat(refundAmount) || selectedOrder.total_amount,
      });
    }
  };

  const handleComplete = () => {
    if (selectedOrder) {
      updateRefundStatus.mutate({
        orderId: selectedOrder.id,
        refundStatus: 'completed',
        notes: adminNotes,
        amount: parseFloat(refundAmount) || selectedOrder.total_amount,
      });
    }
  };

  const handleReject = () => {
    if (selectedOrder && adminNotes.trim()) {
      updateRefundStatus.mutate({
        orderId: selectedOrder.id,
        refundStatus: 'rejected',
        notes: adminNotes,
      });
    } else {
      toast({ title: 'Debe proporcionar una razón para rechazar', variant: 'destructive' });
    }
  };

  const getRefundStatusBadge = (status: RefundStatus) => {
    const config = refundStatusConfig[status];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // Stats calculation
  const stats = {
    total: refundOrders?.length || 0,
    requested: refundOrders?.filter(o => o.metadata?.refund_status === 'requested').length || 0,
    processing: refundOrders?.filter(o => o.metadata?.refund_status === 'processing').length || 0,
    completed: refundOrders?.filter(o => o.metadata?.refund_status === 'completed').length || 0,
    rejected: refundOrders?.filter(o => o.metadata?.refund_status === 'rejected').length || 0,
    totalAmount: refundOrders?.filter(o => o.metadata?.refund_status === 'completed')
      .reduce((sum, o) => sum + (o.metadata?.refund_amount || o.total_amount), 0) || 0,
  };

  return (
    <AdminLayout title="Gestión de Reembolsos" subtitle="Administra las solicitudes de reembolso">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
              <RefreshCw className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Solicitados</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-yellow-500">{stats.requested}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Procesando</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-500">{stats.processing}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-500">{stats.completed}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Rechazados</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-500">{stats.rejected}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Reembolsado</CardTitle>
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID, cliente o email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RefundStatus | 'all')}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="requested">Solicitados</SelectItem>
                  <SelectItem value="processing">Procesando</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refund Requests Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">ID Pedido</TableHead>
                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                    <TableHead className="text-muted-foreground">Fecha Solicitud</TableHead>
                    <TableHead className="text-muted-foreground text-right">Monto</TableHead>
                    <TableHead className="text-muted-foreground">Razón</TableHead>
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
                        <RefreshCw className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No hay solicitudes de reembolso</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders?.map((order) => {
                      const metadata = order.metadata || {};
                      return (
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
                            {metadata.refund_requested_at 
                              ? format(new Date(metadata.refund_requested_at), "dd MMM yyyy", { locale: es })
                              : format(new Date(order.created_at), "dd MMM yyyy", { locale: es })
                            }
                          </TableCell>
                          <TableCell className="text-right font-semibold text-foreground">
                            ${(metadata.refund_amount || order.total_amount).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {metadata.cancellation_reason || 'Sin razón'}
                          </TableCell>
                          <TableCell className="text-center">
                            {getRefundStatusBadge(metadata.refund_status)}
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
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Refund Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Gestión de Reembolso
            </DialogTitle>
            <DialogDescription>
              Revisa y gestiona la solicitud de reembolso
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">ID Pedido</p>
                  <p className="font-mono text-sm">{selectedOrder.id.substring(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Estado Actual</p>
                  {getRefundStatusBadge(selectedOrder.metadata?.refund_status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{selectedOrder.profiles?.full_name || 'Sin nombre'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedOrder.profiles?.email}</p>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-medium text-red-500">Razón de cancelación</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedOrder.metadata?.cancellation_reason || 'No se proporcionó razón'}
                </p>
              </div>

              {/* Refund Amount */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Monto a Reembolsar</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-10"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder={selectedOrder.total_amount.toString()}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Monto original del pedido: ${selectedOrder.total_amount.toFixed(2)}
                </p>
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notas del Admin</label>
                <Textarea
                  placeholder="Agregar notas sobre el reembolso..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              {selectedOrder.metadata?.refund_status === 'requested' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={handleApprove}
                    disabled={updateRefundStatus.isPending}
                  >
                    {updateRefundStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Aprobar y Procesar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={updateRefundStatus.isPending}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Rechazar
                  </Button>
                </div>
              )}

              {selectedOrder.metadata?.refund_status === 'processing' && (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleComplete}
                    disabled={updateRefundStatus.isPending}
                  >
                    {updateRefundStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Marcar como Completado
                  </Button>
                </div>
              )}

              {(selectedOrder.metadata?.refund_status === 'completed' || 
                selectedOrder.metadata?.refund_status === 'rejected') && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground text-center">
                    Este reembolso ya fue {selectedOrder.metadata?.refund_status === 'completed' ? 'completado' : 'rechazado'}
                  </p>
                  {selectedOrder.metadata?.refund_admin_notes && (
                    <p className="text-sm text-center mt-2">
                      <span className="font-medium">Notas:</span> {selectedOrder.metadata?.refund_admin_notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminReembolsos;

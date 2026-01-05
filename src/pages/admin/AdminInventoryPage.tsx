import React, { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useInventoryManagement } from '@/hooks/useInventoryManagement';
import { PDFGenerators } from '@/services/pdfGenerators';
import { 
  Package, Truck, AlertTriangle, FileText, Printer, 
  Plus, Search, TrendingDown, ShoppingCart, CheckCircle,
  Clock, Box, ArrowRight, Filter, Download
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AdminInventoryPage = () => {
  const [activeTab, setActiveTab] = useState('balance');
  const [searchQuery, setSearchQuery] = useState('');
  const [transitDialog, setTransitDialog] = useState(false);
  const [consolidationDialog, setConsolidationDialog] = useState(false);
  
  const {
    useStockBalance,
    useStockInTransit,
    useRotationAlerts,
    useDemandSummary,
    useConsolidations,
    createStockInTransit,
    updateTransitStatus,
    createConsolidation,
  } = useInventoryManagement();
  
  const { data: stockBalance, isLoading: loadingBalance } = useStockBalance();
  const { data: stockTransit, isLoading: loadingTransit } = useStockInTransit();
  const { data: rotationAlerts, isLoading: loadingAlerts } = useRotationAlerts();
  const { data: demandSummary, isLoading: loadingDemand } = useDemandSummary();
  const { data: consolidations, isLoading: loadingConsolidations } = useConsolidations();
  
  // Form state for new transit stock
  const [transitForm, setTransitForm] = useState({
    china_tracking_number: '',
    quantity: 0,
    expected_arrival_date: '',
    notes: '',
  });

  // Filter stock balance
  const filteredBalance = stockBalance?.filter(item => 
    item.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const totalStockHaiti = stockBalance?.reduce((sum, item) => sum + (item.stock_haiti || 0), 0) || 0;
  const totalInTransit = stockBalance?.reduce((sum, item) => sum + (item.stock_in_transit || 0), 0) || 0;
  const totalPendingOrders = stockBalance?.reduce((sum, item) => sum + (item.orders_pending || 0), 0) || 0;
  const alertCount = rotationAlerts?.length || 0;

  // Generate purchase order from demand
  const handleGeneratePurchaseOrder = () => {
    if (!demandSummary || demandSummary.length === 0) return;
    
    const itemsToOrder = demandSummary.filter(d => d.quantity_to_order > 0);
    
    PDFGenerators.generatePurchaseOrderPDF({
      consolidation_number: `PO-${Date.now()}`,
      supplier_name: 'Proveedor China',
      items: itemsToOrder.map(item => ({
        sku: item.sku,
        product_name: item.product_name,
        color: item.color || undefined,
        size: item.size || undefined,
        quantity_to_order: item.quantity_to_order,
        unit_cost: 0,
        total_cost: 0,
      })),
      total_quantity: itemsToOrder.reduce((sum, i) => sum + i.quantity_to_order, 0),
      estimated_cost: 0,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <AdminLayout title="Gestión de Inventario" subtitle="Balance de stock, tránsito y consolidación B2B">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Stock Haití</p>
                  <p className="text-2xl font-bold text-green-600">{totalStockHaiti}</p>
                </div>
                <Box className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En Tránsito (China)</p>
                  <p className="text-2xl font-bold text-blue-600">{totalInTransit}</p>
                </div>
                <Truck className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">{totalPendingOrders}</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas Rotación</p>
                  <p className="text-2xl font-bold text-red-600">{alertCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="balance" className="gap-2">
              <Package className="h-4 w-4" />
              Balance Stock
            </TabsTrigger>
            <TabsTrigger value="transit" className="gap-2">
              <Truck className="h-4 w-4" />
              En Tránsito
            </TabsTrigger>
            <TabsTrigger value="demand" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Demanda B2B
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas
            </TabsTrigger>
            <TabsTrigger value="consolidations" className="gap-2">
              <FileText className="h-4 w-4" />
              Consolidaciones
            </TabsTrigger>
          </TabsList>

          {/* Balance Stock Tab */}
          <TabsContent value="balance">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Balance de Stock</CardTitle>
                  <CardDescription>Stock Haití + Tránsito - Pedidos = Disponible</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loadingBalance ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead className="text-right">Stock Haití</TableHead>
                        <TableHead className="text-right">En Tránsito</TableHead>
                        <TableHead className="text-right">Pedidos</TableHead>
                        <TableHead className="text-right">Disponible</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBalance?.slice(0, 50).map((item) => (
                        <TableRow key={`${item.product_id}-${item.variant_id}`}>
                          <TableCell>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">{item.sku}</div>
                          </TableCell>
                          <TableCell>{item.variant_name}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {item.stock_haiti}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            {item.stock_in_transit}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            {item.orders_pending}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {item.available_balance}
                          </TableCell>
                          <TableCell>
                            {item.available_balance < 0 ? (
                              <Badge variant="destructive">Déficit</Badge>
                            ) : item.available_balance === 0 ? (
                              <Badge variant="secondary">Agotado</Badge>
                            ) : item.available_balance < 5 ? (
                              <Badge variant="outline" className="text-orange-600">Bajo</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">OK</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* In Transit Tab */}
          <TabsContent value="transit">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Stock en Tránsito desde China</CardTitle>
                  <CardDescription>Seguimiento de envíos en camino</CardDescription>
                </div>
                <Button onClick={() => setTransitDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Registrar Envío
                </Button>
              </CardHeader>
              <CardContent>
                {loadingTransit ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tracking China</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead>Fecha Esperada</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockTransit?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono">{item.china_tracking_number || '-'}</TableCell>
                          <TableCell>{item.products?.nombre || 'Varios'}</TableCell>
                          <TableCell className="text-center font-bold">{item.quantity}</TableCell>
                          <TableCell>
                            {item.expected_arrival_date 
                              ? format(new Date(item.expected_arrival_date), 'PP', { locale: es })
                              : '-'
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              item.status === 'arrived' ? 'default' :
                              item.status === 'processing' ? 'secondary' : 'outline'
                            }>
                              {item.status === 'in_transit' ? 'En Tránsito' :
                               item.status === 'arrived' ? 'Llegó' :
                               item.status === 'processing' ? 'Procesando' : item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Select
                              value={item.status}
                              onValueChange={(status) => updateTransitStatus.mutate({ id: item.id, status })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="in_transit">En Tránsito</SelectItem>
                                <SelectItem value="arrived">Llegó</SelectItem>
                                <SelectItem value="processing">Procesando</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Demand Consolidation Tab */}
          <TabsContent value="demand">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Consolidación de Demanda B2B</CardTitle>
                  <CardDescription>Agrupado por Producto → Color → Talla</CardDescription>
                </div>
                <Button onClick={handleGeneratePurchaseOrder} className="gap-2">
                  <Download className="h-4 w-4" />
                  Generar Orden de Compra
                </Button>
              </CardHeader>
              <CardContent>
                {loadingDemand ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Talla</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Confirmados
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <Clock className="h-4 w-4 text-yellow-600" />
                            Pendientes
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center gap-1 justify-center">
                            <ShoppingCart className="h-4 w-4 text-blue-600" />
                            Carritos
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center font-bold">A Comprar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demandSummary?.map((item) => (
                        <TableRow key={item.sku}>
                          <TableCell>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">{item.sku}</div>
                          </TableCell>
                          <TableCell>{item.color || '-'}</TableCell>
                          <TableCell>{item.size || '-'}</TableCell>
                          <TableCell className="text-center font-medium text-green-600">
                            {item.quantity_confirmed}
                          </TableCell>
                          <TableCell className="text-center font-medium text-yellow-600">
                            {item.quantity_pending}
                          </TableCell>
                          <TableCell className="text-center font-medium text-blue-600">
                            {item.quantity_cart}
                          </TableCell>
                          <TableCell className="text-center">{item.stock_available}</TableCell>
                          <TableCell className="text-center">
                            {item.quantity_to_order > 0 ? (
                              <Badge variant="destructive">{item.quantity_to_order}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-green-600">0</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rotation Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Alertas de Rotación (30+ días sin ventas)
                </CardTitle>
                <CardDescription>Productos en stock Haití que requieren descuento</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAlerts ? (
                  <Skeleton className="h-48 w-full" />
                ) : rotationAlerts?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                    <p>¡No hay alertas! Todos los productos tienen rotación saludable.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Variante</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="text-center">Días sin Venta</TableHead>
                        <TableHead className="text-center">Descuento Sugerido</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rotationAlerts?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="font-medium">{item.product_name}</div>
                            <div className="text-xs text-muted-foreground">{item.sku}</div>
                          </TableCell>
                          <TableCell>{item.variant_name || '-'}</TableCell>
                          <TableCell className="text-center">{item.stock_quantity}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={
                              item.days_without_sale > 60 ? 'destructive' :
                              item.days_without_sale > 45 ? 'secondary' : 'outline'
                            }>
                              {item.days_without_sale} días
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-orange-600">
                              {item.days_without_sale > 60 ? '30%' :
                               item.days_without_sale > 45 ? '20%' : '10%'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              Aplicar Descuento
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consolidations Tab */}
          <TabsContent value="consolidations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Historial de Consolidaciones</CardTitle>
                  <CardDescription>Órdenes de compra generadas</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loadingConsolidations ? (
                  <Skeleton className="h-48 w-full" />
                ) : consolidations?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4" />
                    <p>No hay consolidaciones aún. Genera una desde la pestaña de Demanda.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Proveedor</TableHead>
                        <TableHead className="text-center">Items</TableHead>
                        <TableHead className="text-center">Cantidad</TableHead>
                        <TableHead className="text-right">Costo Est.</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidations?.map((cons: any) => (
                        <TableRow key={cons.id}>
                          <TableCell className="font-mono font-bold">{cons.consolidation_number}</TableCell>
                          <TableCell>{cons.suppliers?.name || '-'}</TableCell>
                          <TableCell className="text-center">{cons.total_items}</TableCell>
                          <TableCell className="text-center">{cons.total_quantity}</TableCell>
                          <TableCell className="text-right">${cons.estimated_cost?.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={
                              cons.status === 'received' ? 'default' :
                              cons.status === 'ordered' ? 'secondary' :
                              cons.status === 'submitted' ? 'outline' : 'outline'
                            }>
                              {cons.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(cons.created_at), 'PP', { locale: es })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transit Stock Dialog */}
        <Dialog open={transitDialog} onOpenChange={setTransitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Stock en Tránsito</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tracking de China</Label>
                <Input
                  value={transitForm.china_tracking_number}
                  onChange={(e) => setTransitForm({ ...transitForm, china_tracking_number: e.target.value })}
                  placeholder="YT2024123456789"
                />
              </div>
              <div>
                <Label>Cantidad Total</Label>
                <Input
                  type="number"
                  value={transitForm.quantity}
                  onChange={(e) => setTransitForm({ ...transitForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label>Fecha Esperada de Llegada</Label>
                <Input
                  type="date"
                  value={transitForm.expected_arrival_date}
                  onChange={(e) => setTransitForm({ ...transitForm, expected_arrival_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Notas</Label>
                <Input
                  value={transitForm.notes}
                  onChange={(e) => setTransitForm({ ...transitForm, notes: e.target.value })}
                  placeholder="Observaciones"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransitDialog(false)}>Cancelar</Button>
              <Button onClick={() => {
                createStockInTransit.mutate({
                  china_tracking_number: transitForm.china_tracking_number,
                  quantity: transitForm.quantity,
                  expected_arrival_date: transitForm.expected_arrival_date || null,
                  notes: transitForm.notes || null,
                  status: 'in_transit',
                  product_id: null,
                  variant_id: null,
                  supplier_id: null,
                  shipped_date: null,
                  batch_id: null,
                });
                setTransitDialog(false);
                setTransitForm({ china_tracking_number: '', quantity: 0, expected_arrival_date: '', notes: '' });
              }}>
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminInventoryPage;

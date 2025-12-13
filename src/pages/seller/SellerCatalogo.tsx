import { useState } from 'react';
import { useSellerCatalog, SellerCatalogItem } from '@/hooks/useSellerCatalog';
import { SellerLayout } from '@/components/seller/SellerLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Package,
  DollarSign,
  TrendingUp,
  Edit2,
  Search,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';

const SellerCatalogo = () => {
  const {
    items,
    isLoading,
    updatePrecioVenta,
    toggleActive,
    updateStock,
    getMargin,
    getStats,
    refetch,
  } = useSellerCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<SellerCatalogItem | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const stats = getStats();

  const filteredItems = items.filter(item =>
    item.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditClick = (item: SellerCatalogItem) => {
    setEditingItem(item);
    setEditPrice(item.precioVenta.toString());
    setEditStock(item.stock.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    setIsUpdating(true);
    const newPrice = parseFloat(editPrice);
    const newStock = parseInt(editStock, 10);

    let success = true;

    if (!isNaN(newPrice) && newPrice !== editingItem.precioVenta) {
      success = await updatePrecioVenta(editingItem.id, newPrice);
    }

    if (success && !isNaN(newStock) && newStock !== editingItem.stock) {
      success = await updateStock(editingItem.id, newStock);
    }

    setIsUpdating(false);
    if (success) {
      setEditingItem(null);
    }
  };

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 pb-8">
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </main>
          <Footer />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 pb-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Mi Catálogo</h1>
              <p className="text-muted-foreground">
                Gestiona tus productos importados para venta B2C
              </p>
            </div>
            <Button onClick={refetch} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Actualizar
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Productos</p>
                  <p className="text-2xl font-bold">{stats.totalProducts}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeProducts} activos
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Inventario</p>
                  <p className="text-2xl font-bold">${stats.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Stock Total</p>
                  <p className="text-2xl font-bold">{stats.totalStock}</p>
                  <p className="text-xs text-muted-foreground">unidades</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <TrendingUp className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margen Promedio</p>
                  <p className="text-2xl font-bold">{stats.avgMargin.toFixed(1)}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Empty State */}
          {items.length === 0 ? (
            <Card className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin productos en tu catálogo</h3>
              <p className="text-muted-foreground mb-4">
                Compra lotes mayoristas en el catálogo B2B para agregar productos a tu tienda.
              </p>
              <Button asChild>
                <a href="/seller/adquisicion-lotes">Ir al Catálogo B2B</a>
              </Button>
            </Card>
          ) : (
            /* Products Table */
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio Costo</TableHead>
                    <TableHead className="text-right">Precio Venta</TableHead>
                    <TableHead className="text-right">Margen</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const margin = getMargin(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {item.images[0] ? (
                                <img
                                  src={item.images[0]}
                                  alt={item.nombre}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium line-clamp-1">{item.nombre}</p>
                              <p className="text-sm text-muted-foreground">{item.sku}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-muted-foreground">
                            ${item.precioCosto.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-green-600">
                            ${item.precioVenta.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={margin >= 30 ? 'default' : margin >= 15 ? 'secondary' : 'destructive'}
                          >
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.stock > 0 ? 'outline' : 'destructive'}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={() => toggleActive(item.id)}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </main>

        <Footer />

        {/* Edit Dialog */}
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Producto</DialogTitle>
            </DialogHeader>

            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-background">
                    {editingItem.images[0] ? (
                      <img
                        src={editingItem.images[0]}
                        alt={editingItem.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Package className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{editingItem.nombre}</p>
                    <p className="text-sm text-muted-foreground">{editingItem.sku}</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="edit-price">Precio de Venta (USD)</Label>
                    <div className="relative mt-1">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="edit-price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Costo: ${editingItem.precioCosto.toFixed(2)} | Margen sugerido: 30%
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="edit-stock">Stock Disponible</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      min="0"
                      value={editStock}
                      onChange={(e) => setEditStock(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isUpdating}>
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
};

export default SellerCatalogo;

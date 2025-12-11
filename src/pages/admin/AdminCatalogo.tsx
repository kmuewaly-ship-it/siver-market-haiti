import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCatalog, Product, ProductFilters } from '@/hooks/useCatalog';
import { Package, AlertTriangle, TrendingDown, Search, Upload, Plus, Download, Settings, Loader2 } from 'lucide-react';
import BulkImportDialog from '@/components/catalog/BulkImportDialog';
import ProductFormDialog from '@/components/catalog/ProductFormDialog';
import ProductEditDialog from '@/components/catalog/ProductEditDialog';

const AdminCatalogo = () => {
  const { useProducts, useCategories, useSuppliers, useCatalogKPIs } = useCatalog();
  const [filters, setFilters] = useState<ProductFilters>({ stockStatus: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);

  const { data: products, isLoading: loadingProducts } = useProducts({ ...filters, search: searchTerm });
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const { data: kpis, isLoading: loadingKPIs } = useCatalogKPIs();

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const exportToCSV = () => {
    if (!products) return;
    
    const headers = ['SKU Interno', 'Nombre', 'Precio Mayorista', 'MOQ', 'Stock', 'Estado', 'Categoría', 'Proveedor'];
    const rows = products.map(p => [
      p.sku_interno,
      p.nombre,
      p.precio_mayorista,
      p.moq,
      p.stock_fisico,
      p.stock_status,
      p.categories?.name || '',
      p.suppliers?.name || ''
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `catalogo_siver_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getStockBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">En Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Bajo MOQ</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Agotado</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Catálogo Maestro B2B" subtitle="Logística Central - Gestión de Inventario">
      <div className="space-y-6">
        {/* Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Carga Masiva
            </Button>
            <Button variant="outline" onClick={() => setNewProductOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entrada
            </Button>
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SKUs Activos</CardTitle>
              <Package className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingKPIs ? <Loader2 className="h-5 w-5 animate-spin" /> : kpis?.totalSKUs || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stock Total</CardTitle>
              <Package className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loadingKPIs ? <Loader2 className="h-5 w-5 animate-spin" /> : kpis?.totalStock?.toLocaleString() || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Bajo MOQ</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {loadingKPIs ? <Loader2 className="h-5 w-5 animate-spin" /> : kpis?.lowMoqAlerts || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Agotados</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {loadingKPIs ? <Loader2 className="h-5 w-5 animate-spin" /> : kpis?.outOfStock || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por SKU o nombre..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <Select
                value={filters.category || 'all'}
                onValueChange={(value) => setFilters(f => ({ ...f, category: value }))}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Categorías</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.supplier || 'all'}
                onValueChange={(value) => setFilters(f => ({ ...f, supplier: value }))}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Proveedores</SelectItem>
                  {suppliers?.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>{sup.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.stockStatus || 'all'}
                onValueChange={(value) => setFilters(f => ({ ...f, stockStatus: value as ProductFilters['stockStatus'] }))}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Estado Stock" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="in_stock">En Stock</SelectItem>
                  <SelectItem value="low_stock">Bajo MOQ</SelectItem>
                  <SelectItem value="out_of_stock">Agotado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">SKU Interno</TableHead>
                    <TableHead className="text-muted-foreground">Producto</TableHead>
                    <TableHead className="text-muted-foreground text-right">Precio Mayorista</TableHead>
                    <TableHead className="text-muted-foreground text-center">MOQ</TableHead>
                    <TableHead className="text-muted-foreground text-center">Stock</TableHead>
                    <TableHead className="text-muted-foreground text-center">Estado</TableHead>
                    <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProducts ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                      </TableCell>
                    </TableRow>
                  ) : products?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No hay productos en el catálogo
                      </TableCell>
                    </TableRow>
                  ) : (
                    products?.map((product) => (
                      <TableRow key={product.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono text-sm text-foreground">{product.sku_interno}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.imagen_principal && (
                              <img
                                src={product.imagen_principal}
                                alt={product.nombre}
                                className="h-10 w-10 rounded object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-foreground">{product.nombre}</p>
                              <p className="text-xs text-muted-foreground">{product.categories?.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-foreground">
                          ${product.precio_mayorista.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center text-foreground">{product.moq}</TableCell>
                        <TableCell className="text-center text-foreground">{product.stock_fisico}</TableCell>
                        <TableCell className="text-center">{getStockBadge(product.stock_status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditProductId(product.id)}
                          >
                            <Settings className="h-4 w-4" />
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

      {/* Dialogs */}
      <BulkImportDialog open={bulkImportOpen} onOpenChange={setBulkImportOpen} />
      <ProductFormDialog open={newProductOpen} onOpenChange={setNewProductOpen} />
      {editProductId && (
        <ProductEditDialog
          productId={editProductId}
          open={!!editProductId}
          onOpenChange={(open) => !open && setEditProductId(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminCatalogo;

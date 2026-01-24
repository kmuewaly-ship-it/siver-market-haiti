import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWeightBasedPricing } from '@/hooks/useWeightBasedPricing';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Check, 
  Package, 
  Weight, 
  Ruler, 
  Save, 
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

interface ProductLogisticsData {
  id: string;
  sku_interno: string;
  nombre: string;
  weight_kg: number | null;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  is_oversize: boolean;
  shipping_mode: string | null;
  categoria_id: string | null;
  category_name?: string;
}

interface EditableField {
  productId: string;
  field: keyof Pick<ProductLogisticsData, 'weight_kg' | 'length_cm' | 'width_cm' | 'height_cm' | 'is_oversize' | 'shipping_mode'>;
  value: any;
}

const ProductWeightEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const { getWeightStatus, calculateVolumetricWeight } = useWeightBasedPricing();
  
  const [filter, setFilter] = useState<'all' | 'missing' | 'oversize'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingChanges, setPendingChanges] = useState<Map<string, Partial<ProductLogisticsData>>>(new Map());
  
  // Fetch products with logistics data
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products-logistics', filter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          id,
          sku_interno,
          nombre,
          weight_kg,
          length_cm,
          width_cm,
          height_cm,
          is_oversize,
          shipping_mode,
          categoria_id,
          categories:categoria_id (name)
        `)
        .eq('is_active', true)
        .order('nombre', { ascending: true });
      
      if (filter === 'missing') {
        query = query.is('weight_kg', null);
      } else if (filter === 'oversize') {
        query = query.eq('is_oversize', true);
      }
      
      const { data, error } = await query.limit(500);
      
      if (error) throw error;
      
      return (data || []).map((p: any) => ({
        ...p,
        category_name: p.categories?.name || 'Sin categoría',
      })) as ProductLogisticsData[];
    },
  });

  // Bulk update mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Array<{ id: string; data: Partial<ProductLogisticsData> }>) => {
      const promises = updates.map(({ id, data }) => 
        supabase
          .from('products')
          .update({
            weight_kg: data.weight_kg,
            length_cm: data.length_cm,
            width_cm: data.width_cm,
            height_cm: data.height_cm,
            is_oversize: data.is_oversize,
            shipping_mode: data.shipping_mode,
          })
          .eq('id', id)
      );
      
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setPendingChanges(new Map());
      toast.success('Cambios guardados correctamente');
    },
    onError: (error) => {
      console.error('Error updating products:', error);
      toast.error('Error al guardar los cambios');
    },
  });

  // Handle field change
  const handleFieldChange = useCallback((productId: string, field: string, value: any) => {
    setPendingChanges(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(productId) || {};
      newMap.set(productId, { ...existing, [field]: value });
      return newMap;
    });
  }, []);

  // Get current value (pending or original)
  const getCurrentValue = useCallback((product: ProductLogisticsData, field: keyof ProductLogisticsData) => {
    const pending = pendingChanges.get(product.id);
    if (pending && field in pending) {
      return pending[field as keyof typeof pending];
    }
    return product[field];
  }, [pendingChanges]);

  // Save all pending changes
  const handleSaveAll = () => {
    const updates = Array.from(pendingChanges.entries()).map(([id, data]) => ({
      id,
      data,
    }));
    
    if (updates.length === 0) {
      toast.info('No hay cambios pendientes');
      return;
    }
    
    updateMutation.mutate(updates);
  };

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.nombre.toLowerCase().includes(query) ||
      p.sku_interno?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = products.length;
    const missing = products.filter(p => p.weight_kg === null).length;
    const oversize = products.filter(p => p.is_oversize).length;
    const hasChanges = pendingChanges.size > 0;
    
    return { total, missing, oversize, hasChanges };
  }, [products, pendingChanges]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5" />
            Editor de Pesos y Dimensiones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5" />
            Editor de Pesos y Dimensiones
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {stats.hasChanges && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {pendingChanges.size} cambios pendientes
              </Badge>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={!stats.hasChanges || updateMutation.isPending}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
            <Button
              variant="outline"
              onClick={() => refetch()}
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats & Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total} productos</Badge>
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {stats.missing} sin peso
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {stats.oversize} oversize
            </Badge>
          </div>
          
          <div className="flex-1 flex items-center gap-2 justify-end">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU o nombre..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="missing">Sin peso</SelectItem>
                <SelectItem value="oversize">Oversize</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Table */}
        <ScrollArea className="h-[600px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[100px]">Estado</TableHead>
                <TableHead className="w-[120px]">SKU</TableHead>
                <TableHead className="min-w-[200px]">Producto</TableHead>
                <TableHead className="w-[100px]">Peso (kg)</TableHead>
                <TableHead className="w-[100px]">L (cm)</TableHead>
                <TableHead className="w-[100px]">W (cm)</TableHead>
                <TableHead className="w-[100px]">H (cm)</TableHead>
                <TableHead className="w-[100px]">Oversize</TableHead>
                <TableHead className="w-[120px]">Modo envío</TableHead>
                <TableHead className="w-[120px]">Peso Vol.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const weightStatus = getWeightStatus({
                  id: product.id,
                  weight_kg: getCurrentValue(product, 'weight_kg') as number | null,
                  length_cm: getCurrentValue(product, 'length_cm') as number | null,
                  width_cm: getCurrentValue(product, 'width_cm') as number | null,
                  height_cm: getCurrentValue(product, 'height_cm') as number | null,
                  is_oversize: getCurrentValue(product, 'is_oversize') as boolean,
                });
                
                const volWeight = calculateVolumetricWeight(
                  getCurrentValue(product, 'length_cm') as number | null,
                  getCurrentValue(product, 'width_cm') as number | null,
                  getCurrentValue(product, 'height_cm') as number | null
                );
                
                const hasChanges = pendingChanges.has(product.id);
                
                return (
                  <TableRow 
                    key={product.id}
                    className={hasChanges ? 'bg-amber-50' : undefined}
                  >
                    <TableCell>
                      {weightStatus.status === 'valid' ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          OK
                        </Badge>
                      ) : weightStatus.status === 'missing' ? (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Pendiente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Revisar
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {product.sku_interno || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="truncate max-w-[200px]" title={product.nombre}>
                        {product.nombre}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.category_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        value={String(getCurrentValue(product, 'weight_kg') ?? '')}
                        onChange={(e) => handleFieldChange(
                          product.id, 
                          'weight_kg', 
                          e.target.value ? parseFloat(e.target.value) : null
                        )}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={String(getCurrentValue(product, 'length_cm') ?? '')}
                        onChange={(e) => handleFieldChange(
                          product.id, 
                          'length_cm', 
                          e.target.value ? parseFloat(e.target.value) : null
                        )}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={String(getCurrentValue(product, 'width_cm') ?? '')}
                        onChange={(e) => handleFieldChange(
                          product.id, 
                          'width_cm', 
                          e.target.value ? parseFloat(e.target.value) : null
                        )}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="0.0"
                        value={String(getCurrentValue(product, 'height_cm') ?? '')}
                        onChange={(e) => handleFieldChange(
                          product.id, 
                          'height_cm', 
                          e.target.value ? parseFloat(e.target.value) : null
                        )}
                        className="h-8 w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={getCurrentValue(product, 'is_oversize') as boolean}
                        onCheckedChange={(checked) => handleFieldChange(
                          product.id,
                          'is_oversize',
                          checked
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={getCurrentValue(product, 'shipping_mode') as string || 'standard'}
                        onValueChange={(v) => handleFieldChange(product.id, 'shipping_mode', v)}
                      >
                        <SelectTrigger className="h-8 w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Estándar</SelectItem>
                          <SelectItem value="express">Express</SelectItem>
                          <SelectItem value="both">Ambos</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {volWeight !== null ? (
                        <span className="text-sm font-mono">
                          {volWeight.toFixed(3)} kg
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ProductWeightEditor;

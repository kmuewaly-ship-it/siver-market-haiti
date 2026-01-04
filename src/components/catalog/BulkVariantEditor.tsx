import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useProductVariants } from '@/hooks/useProductVariants';
import { useVariantManagement } from '@/hooks/useVariantManagement';
import { 
  Save, Trash2, DollarSign, Package, Percent, RefreshCw,
  ChevronUp, ChevronDown, Filter, CheckSquare, Square,
  AlertCircle, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BulkVariantEditorProps {
  productId: string;
  productName?: string;
  onClose?: () => void;
}

interface EditableVariant {
  id: string;
  sku: string;
  name: string;
  option_type: string;
  option_value: string;
  price: number | null;
  stock: number;
  moq: number;
  is_active: boolean;
  images: string[];
  attribute_combination: Record<string, string> | null;
  isSelected: boolean;
  isModified: boolean;
  originalData: {
    price: number | null;
    stock: number;
    moq: number;
    is_active: boolean;
  };
}

type BulkAction = 'price' | 'stock' | 'moq' | 'delete' | 'toggle';
type PriceAdjustType = 'fixed' | 'percent_increase' | 'percent_decrease' | 'add' | 'subtract';
type StockAdjustType = 'fixed' | 'add' | 'subtract' | 'zero';

const BulkVariantEditor = ({ productId, productName, onClose }: BulkVariantEditorProps) => {
  const { toast } = useToast();
  const { data: variants, isLoading, refetch } = useProductVariants(productId);
  const { updateVariant, deleteVariant, bulkUpdateStock, toggleVariantActive } = useVariantManagement(productId);
  
  const [editableVariants, setEditableVariants] = useState<EditableVariant[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState<BulkAction | null>(null);
  const [bulkPriceType, setBulkPriceType] = useState<PriceAdjustType>('fixed');
  const [bulkPriceValue, setBulkPriceValue] = useState<number>(0);
  const [bulkStockType, setBulkStockType] = useState<StockAdjustType>('fixed');
  const [bulkStockValue, setBulkStockValue] = useState<number>(0);
  const [bulkMoqValue, setBulkMoqValue] = useState<number>(1);
  const [filterAttribute, setFilterAttribute] = useState<string>('all');
  const [filterValue, setFilterValue] = useState<string>('all');
  const [sortField, setSortField] = useState<'sku' | 'price' | 'stock'>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editable variants when data loads
  useMemo(() => {
    if (variants && editableVariants.length === 0) {
      setEditableVariants(variants.map(v => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        option_type: v.option_type,
        option_value: v.option_value,
        price: v.price,
        stock: v.stock,
        moq: v.moq,
        is_active: v.is_active ?? true,
        images: v.images || [],
        attribute_combination: v.attribute_combination as Record<string, string> | null,
        isSelected: false,
        isModified: false,
        originalData: {
          price: v.price,
          stock: v.stock,
          moq: v.moq,
          is_active: v.is_active ?? true,
        },
      })));
    }
  }, [variants]);

  // Extract unique attribute types and values for filtering
  const attributeOptions = useMemo(() => {
    const attrs: Record<string, Set<string>> = {};
    editableVariants.forEach(v => {
      if (v.attribute_combination) {
        Object.entries(v.attribute_combination).forEach(([key, value]) => {
          if (!attrs[key]) attrs[key] = new Set();
          attrs[key].add(value);
        });
      }
    });
    return Object.fromEntries(
      Object.entries(attrs).map(([key, set]) => [key, Array.from(set)])
    );
  }, [editableVariants]);

  // Filtered and sorted variants
  const displayedVariants = useMemo(() => {
    let filtered = [...editableVariants];

    // Apply attribute filter
    if (filterAttribute !== 'all' && filterValue !== 'all') {
      filtered = filtered.filter(v => 
        v.attribute_combination?.[filterAttribute] === filterValue
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'sku':
          comparison = a.sku.localeCompare(b.sku);
          break;
        case 'price':
          comparison = (a.price || 0) - (b.price || 0);
          break;
        case 'stock':
          comparison = a.stock - b.stock;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [editableVariants, filterAttribute, filterValue, sortField, sortDirection]);

  const selectedCount = editableVariants.filter(v => v.isSelected).length;
  const modifiedCount = editableVariants.filter(v => v.isModified).length;

  // Selection handlers
  const toggleSelectAll = () => {
    const allSelected = displayedVariants.every(v => v.isSelected);
    setEditableVariants(prev => prev.map(v => ({
      ...v,
      isSelected: displayedVariants.some(dv => dv.id === v.id) ? !allSelected : v.isSelected,
    })));
  };

  const toggleSelect = (id: string) => {
    setEditableVariants(prev => prev.map(v => 
      v.id === id ? { ...v, isSelected: !v.isSelected } : v
    ));
  };

  // Field update handlers
  const updateField = (id: string, field: 'price' | 'stock' | 'moq', value: number) => {
    setEditableVariants(prev => prev.map(v => {
      if (v.id !== id) return v;
      const newVariant = { ...v, [field]: value };
      newVariant.isModified = 
        newVariant.price !== v.originalData.price ||
        newVariant.stock !== v.originalData.stock ||
        newVariant.moq !== v.originalData.moq ||
        newVariant.is_active !== v.originalData.is_active;
      return newVariant;
    }));
  };

  const toggleActive = (id: string) => {
    setEditableVariants(prev => prev.map(v => {
      if (v.id !== id) return v;
      const newVariant = { ...v, is_active: !v.is_active };
      newVariant.isModified = 
        newVariant.price !== v.originalData.price ||
        newVariant.stock !== v.originalData.stock ||
        newVariant.moq !== v.originalData.moq ||
        newVariant.is_active !== v.originalData.is_active;
      return newVariant;
    }));
  };

  // Bulk action handlers
  const applyBulkPrice = () => {
    setEditableVariants(prev => prev.map(v => {
      if (!v.isSelected) return v;
      
      let newPrice = v.price || 0;
      switch (bulkPriceType) {
        case 'fixed':
          newPrice = bulkPriceValue;
          break;
        case 'percent_increase':
          newPrice = newPrice * (1 + bulkPriceValue / 100);
          break;
        case 'percent_decrease':
          newPrice = newPrice * (1 - bulkPriceValue / 100);
          break;
        case 'add':
          newPrice = newPrice + bulkPriceValue;
          break;
        case 'subtract':
          newPrice = Math.max(0, newPrice - bulkPriceValue);
          break;
      }
      
      const updated = { ...v, price: Math.round(newPrice * 100) / 100 };
      updated.isModified = true;
      return updated;
    }));
    setShowBulkDialog(null);
    toast({ title: `Precio actualizado para ${selectedCount} variantes` });
  };

  const applyBulkStock = () => {
    setEditableVariants(prev => prev.map(v => {
      if (!v.isSelected) return v;
      
      let newStock = v.stock;
      switch (bulkStockType) {
        case 'fixed':
          newStock = bulkStockValue;
          break;
        case 'add':
          newStock = newStock + bulkStockValue;
          break;
        case 'subtract':
          newStock = Math.max(0, newStock - bulkStockValue);
          break;
        case 'zero':
          newStock = 0;
          break;
      }
      
      const updated = { ...v, stock: newStock };
      updated.isModified = true;
      return updated;
    }));
    setShowBulkDialog(null);
    toast({ title: `Stock actualizado para ${selectedCount} variantes` });
  };

  const applyBulkMoq = () => {
    setEditableVariants(prev => prev.map(v => {
      if (!v.isSelected) return v;
      const updated = { ...v, moq: bulkMoqValue };
      updated.isModified = true;
      return updated;
    }));
    setShowBulkDialog(null);
    toast({ title: `MOQ actualizado para ${selectedCount} variantes` });
  };

  const applyBulkToggle = () => {
    setEditableVariants(prev => prev.map(v => {
      if (!v.isSelected) return v;
      const updated = { ...v, is_active: !v.is_active };
      updated.isModified = true;
      return updated;
    }));
    setShowBulkDialog(null);
    toast({ title: `Estado actualizado para ${selectedCount} variantes` });
  };

  // Save all changes
  const saveChanges = async () => {
    const modifiedVariants = editableVariants.filter(v => v.isModified);
    if (modifiedVariants.length === 0) {
      toast({ title: 'No hay cambios para guardar' });
      return;
    }

    setIsSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const variant of modifiedVariants) {
      try {
        await updateVariant.mutateAsync({
          id: variant.id,
          updates: {
            price: variant.price,
            stock: variant.stock,
            moq: variant.moq,
            is_active: variant.is_active,
          },
        });
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    setIsSaving(false);
    
    if (successCount > 0) {
      toast({ 
        title: `${successCount} variantes actualizadas`,
        description: errorCount > 0 ? `${errorCount} fallaron` : undefined,
      });
      refetch();
      // Reset modified state
      setEditableVariants(prev => prev.map(v => ({
        ...v,
        isModified: false,
        originalData: {
          price: v.price,
          stock: v.stock,
          moq: v.moq,
          is_active: v.is_active,
        },
      })));
    }
  };

  // Delete selected variants
  const deleteSelected = async () => {
    const selectedVariants = editableVariants.filter(v => v.isSelected);
    if (selectedVariants.length === 0) return;

    if (!confirm(`¿Eliminar ${selectedVariants.length} variantes? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsSaving(true);
    let successCount = 0;

    for (const variant of selectedVariants) {
      try {
        await deleteVariant.mutateAsync(variant.id);
        successCount++;
      } catch (error) {
        console.error('Error deleting variant:', error);
      }
    }

    setIsSaving(false);
    toast({ title: `${successCount} variantes eliminadas` });
    refetch();
    setEditableVariants(prev => prev.filter(v => !v.isSelected));
    setShowBulkDialog(null);
  };

  const handleSort = (field: 'sku' | 'price' | 'stock') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{productName || 'Edición Masiva de Variantes'}</h3>
          <p className="text-sm text-muted-foreground">
            {editableVariants.length} variantes • {selectedCount} seleccionadas • {modifiedCount} modificadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Recargar
          </Button>
          <Button 
            size="sm"
            onClick={saveChanges}
            disabled={modifiedCount === 0 || isSaving}
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Guardar Cambios ({modifiedCount})
          </Button>
        </div>
      </div>

      {/* Filters & Bulk Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Filters */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterAttribute} onValueChange={(v) => { setFilterAttribute(v); setFilterValue('all'); }}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Filtrar por..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.keys(attributeOptions).map(attr => (
                    <SelectItem key={attr} value={attr}>{attr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filterAttribute !== 'all' && (
                <Select value={filterValue} onValueChange={setFilterValue}>
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue placeholder="Valor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {attributeOptions[filterAttribute]?.map(val => (
                      <SelectItem key={val} value={val}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="h-6 w-px bg-border" />

            {/* Bulk Actions */}
            {selectedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedCount} seleccionadas:</span>
                <Button size="sm" variant="outline" onClick={() => setShowBulkDialog('price')}>
                  <DollarSign className="h-3 w-3 mr-1" />
                  Precio
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowBulkDialog('stock')}>
                  <Package className="h-3 w-3 mr-1" />
                  Stock
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowBulkDialog('moq')}>
                  MOQ
                </Button>
                <Button size="sm" variant="outline" onClick={applyBulkToggle}>
                  Activar/Desactivar
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setShowBulkDialog('delete')}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Eliminar
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox 
                    checked={displayedVariants.length > 0 && displayedVariants.every(v => v.isSelected)}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-1">
                    SKU
                    {sortField === 'sku' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Precio
                    {sortField === 'price' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('stock')}
                >
                  <div className="flex items-center gap-1 justify-end">
                    Stock
                    {sortField === 'stock' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-center">Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedVariants.map(variant => (
                <TableRow 
                  key={variant.id}
                  className={cn(
                    variant.isModified && 'bg-primary/5',
                    variant.isSelected && 'bg-primary/10'
                  )}
                >
                  <TableCell>
                    <Checkbox 
                      checked={variant.isSelected}
                      onCheckedChange={() => toggleSelect(variant.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {variant.sku}
                    {variant.isModified && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">Modificado</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {variant.attribute_combination && Object.entries(variant.attribute_combination).map(([key, value]) => (
                        <Badge key={key} variant="outline" className="text-[10px]">
                          {key}: {value}
                        </Badge>
                      ))}
                      {!variant.attribute_combination && (
                        <Badge variant="outline" className="text-[10px]">
                          {variant.option_value}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={variant.price ?? ''}
                      onChange={(e) => updateField(variant.id, 'price', parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-right"
                      step="0.01"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateField(variant.id, 'stock', parseInt(e.target.value) || 0)}
                      className={cn(
                        "w-20 h-8 text-right",
                        variant.stock === 0 && "border-destructive text-destructive"
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={variant.moq}
                      onChange={(e) => updateField(variant.id, 'moq', parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-right"
                      min={1}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={variant.is_active}
                      onCheckedChange={() => toggleActive(variant.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Bulk Price Dialog */}
      <Dialog open={showBulkDialog === 'price'} onOpenChange={() => setShowBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Precio Masivamente</DialogTitle>
            <DialogDescription>
              Aplicar cambio de precio a {selectedCount} variantes seleccionadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de ajuste</Label>
              <Select value={bulkPriceType} onValueChange={(v: PriceAdjustType) => setBulkPriceType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Precio fijo</SelectItem>
                  <SelectItem value="percent_increase">Aumentar %</SelectItem>
                  <SelectItem value="percent_decrease">Disminuir %</SelectItem>
                  <SelectItem value="add">Sumar cantidad</SelectItem>
                  <SelectItem value="subtract">Restar cantidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor</Label>
              <div className="flex items-center gap-2">
                {(bulkPriceType === 'fixed' || bulkPriceType === 'add' || bulkPriceType === 'subtract') && (
                  <span className="text-muted-foreground">$</span>
                )}
                <Input
                  type="number"
                  value={bulkPriceValue}
                  onChange={(e) => setBulkPriceValue(parseFloat(e.target.value) || 0)}
                  step="0.01"
                />
                {(bulkPriceType === 'percent_increase' || bulkPriceType === 'percent_decrease') && (
                  <span className="text-muted-foreground">%</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(null)}>Cancelar</Button>
            <Button onClick={applyBulkPrice}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Stock Dialog */}
      <Dialog open={showBulkDialog === 'stock'} onOpenChange={() => setShowBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Stock Masivamente</DialogTitle>
            <DialogDescription>
              Aplicar cambio de stock a {selectedCount} variantes seleccionadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de ajuste</Label>
              <Select value={bulkStockType} onValueChange={(v: StockAdjustType) => setBulkStockType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor fijo</SelectItem>
                  <SelectItem value="add">Incrementar</SelectItem>
                  <SelectItem value="subtract">Decrementar</SelectItem>
                  <SelectItem value="zero">Establecer en 0</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {bulkStockType !== 'zero' && (
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input
                  type="number"
                  value={bulkStockValue}
                  onChange={(e) => setBulkStockValue(parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(null)}>Cancelar</Button>
            <Button onClick={applyBulkStock}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk MOQ Dialog */}
      <Dialog open={showBulkDialog === 'moq'} onOpenChange={() => setShowBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar MOQ Masivamente</DialogTitle>
            <DialogDescription>
              Establecer cantidad mínima de pedido para {selectedCount} variantes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nuevo MOQ</Label>
              <Input
                type="number"
                value={bulkMoqValue}
                onChange={(e) => setBulkMoqValue(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(null)}>Cancelar</Button>
            <Button onClick={applyBulkMoq}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showBulkDialog === 'delete'} onOpenChange={() => setShowBulkDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar {selectedCount} variantes? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteSelected}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Eliminar {selectedCount} Variantes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkVariantEditor;

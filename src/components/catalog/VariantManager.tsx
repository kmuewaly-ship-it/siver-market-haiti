import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAllProductVariants, ProductVariant } from '@/hooks/useProductVariants';
import { useVariantManagement } from '@/hooks/useVariantManagement';
import { Plus, Trash2, Edit2, Package, Loader2, Save, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VariantManagerProps {
  productId: string;
  productSku: string;
  basePrice: number;
}

const OPTION_TYPES = [
  { value: 'color', label: 'Color' },
  { value: 'size', label: 'Talla' },
  { value: 'material', label: 'Material' },
  { value: 'style', label: 'Estilo' },
  { value: 'capacity', label: 'Capacidad' },
  { value: 'other', label: 'Otro' },
];

interface VariantFormData {
  sku: string;
  name: string;
  option_type: string;
  option_value: string;
  price: string;
  stock: string;
  moq: string;
}

const defaultFormData: VariantFormData = {
  sku: '',
  name: '',
  option_type: 'color',
  option_value: '',
  price: '',
  stock: '0',
  moq: '1',
};

const VariantManager = ({ productId, productSku, basePrice }: VariantManagerProps) => {
  const { data: variants = [], isLoading } = useAllProductVariants(productId);
  const { createVariant, updateVariant, deleteVariant, toggleVariantActive } = useVariantManagement(productId);
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [formData, setFormData] = useState<VariantFormData>(defaultFormData);

  // Group variants by option type
  const groupedVariants = variants.reduce((acc, variant) => {
    const type = variant.option_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingVariant(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    // Auto-generate SKU based on product SKU
    setFormData(prev => ({
      ...prev,
      sku: `${productSku}-V${(variants.length + 1).toString().padStart(2, '0')}`,
    }));
    setIsAddDialogOpen(true);
  };

  const handleOpenEdit = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setFormData({
      sku: variant.sku,
      name: variant.name,
      option_type: variant.option_type,
      option_value: variant.option_value,
      price: variant.price?.toString() || '',
      stock: variant.stock.toString(),
      moq: variant.moq.toString(),
    });
    setIsAddDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.option_value.trim()) {
      toast({ title: 'Error', description: 'El valor de la opción es requerido', variant: 'destructive' });
      return;
    }

    const variantData = {
      product_id: productId,
      sku: formData.sku || `${productSku}-${formData.option_type}-${formData.option_value}`.toUpperCase(),
      name: formData.name || `${formData.option_type}: ${formData.option_value}`,
      option_type: formData.option_type,
      option_value: formData.option_value,
      price: formData.price ? parseFloat(formData.price) : null,
      stock: parseInt(formData.stock) || 0,
      moq: parseInt(formData.moq) || 1,
    };

    if (editingVariant) {
      await updateVariant.mutateAsync({
        id: editingVariant.id,
        updates: variantData,
      });
    } else {
      await createVariant.mutateAsync(variantData);
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('¿Eliminar esta variante?')) return;
    await deleteVariant.mutateAsync(variantId);
  };

  const handleToggleActive = async (variant: ProductVariant) => {
    await toggleVariantActive.mutateAsync({
      id: variant.id,
      isActive: !variant.is_active,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Variantes del Producto
          <Badge variant="secondary" className="ml-2">{variants.length}</Badge>
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4 mr-1" />
              Agregar Variante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingVariant ? 'Editar Variante' : 'Nueva Variante'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de Opción *</Label>
                  <Select 
                    value={formData.option_type} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, option_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTION_TYPES.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor *</Label>
                  <Input
                    placeholder="ej: Rojo, XL, 500ml"
                    value={formData.option_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, option_value: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>SKU Variante</Label>
                <Input
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  placeholder="Se genera automáticamente"
                />
              </div>

              <div className="space-y-2">
                <Label>Nombre (opcional)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Se genera automáticamente"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Precio USD</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder={basePrice.toFixed(2)}
                  />
                  <p className="text-[10px] text-muted-foreground">Vacío = precio base</p>
                </div>
                <div className="space-y-2">
                  <Label>Stock *</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>MOQ</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.moq}
                    onChange={(e) => setFormData(prev => ({ ...prev, moq: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={createVariant.isPending || updateVariant.isPending}
                >
                  {(createVariant.isPending || updateVariant.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingVariant ? 'Actualizar' : 'Crear'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No hay variantes configuradas</p>
            <p className="text-sm">Agrega variantes como tallas, colores o materiales</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedVariants).map(([type, typeVariants]) => (
              <div key={type} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground capitalize flex items-center gap-2">
                  {OPTION_TYPES.find(t => t.value === type)?.label || type}
                  <Badge variant="outline" className="text-xs">{typeVariants.length}</Badge>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {typeVariants.map((variant) => (
                    <div
                      key={variant.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        variant.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={variant.is_active}
                          onCheckedChange={() => handleToggleActive(variant)}
                          className="scale-75"
                        />
                        <div>
                          <div className="font-medium text-sm">{variant.option_value}</div>
                          <div className="text-xs text-muted-foreground">
                            SKU: {variant.sku} | Stock: {variant.stock}
                            {variant.price && ` | $${variant.price.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(variant)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(variant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VariantManager;

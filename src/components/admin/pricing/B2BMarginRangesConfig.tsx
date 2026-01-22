import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  TrendingUp, 
  DollarSign, 
  Percent,
  AlertCircle,
  Shield,
  Truck,
  Info
} from 'lucide-react';
import { useB2BMarginRanges, B2BMarginRange } from '@/hooks/useB2BMarginRanges';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function B2BMarginRangesConfig() {
  const {
    useMarginRanges,
    createMarginRange,
    updateMarginRange,
    deleteMarginRange,
    toggleMarginRangeActive,
  } = useB2BMarginRanges();

  const { data: marginRanges, isLoading } = useMarginRanges();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRange, setEditingRange] = useState<B2BMarginRange | null>(null);
  const [formData, setFormData] = useState({
    min_cost: '',
    max_cost: '',
    margin_percent: '',
    description: '',
    is_active: true,
    sort_order: 0,
  });

  const resetForm = () => {
    setFormData({
      min_cost: '',
      max_cost: '',
      margin_percent: '',
      description: '',
      is_active: true,
      sort_order: (marginRanges?.length || 0) + 1,
    });
    setEditingRange(null);
  };

  const handleOpenDialog = (range?: B2BMarginRange) => {
    if (range) {
      setEditingRange(range);
      setFormData({
        min_cost: range.min_cost.toString(),
        max_cost: range.max_cost?.toString() || '',
        margin_percent: range.margin_percent.toString(),
        description: range.description || '',
        is_active: range.is_active,
        sort_order: range.sort_order,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const minCost = parseFloat(formData.min_cost);
    const maxCost = formData.max_cost ? parseFloat(formData.max_cost) : null;
    const marginPercent = parseFloat(formData.margin_percent);

    if (isNaN(minCost) || isNaN(marginPercent)) {
      return;
    }

    const data = {
      min_cost: minCost,
      max_cost: maxCost,
      margin_percent: marginPercent,
      description: formData.description || null,
      is_active: formData.is_active,
      sort_order: formData.sort_order,
    };

    if (editingRange) {
      updateMarginRange.mutate({ id: editingRange.id, ...data });
    } else {
      createMarginRange.mutate(data);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteMarginRange.mutate(id);
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    toggleMarginRangeActive.mutate({ id, is_active });
  };

  const formatCostRange = (range: B2BMarginRange) => {
    if (range.max_cost === null) {
      return `> $${range.min_cost}`;
    }
    return `$${range.min_cost} - $${range.max_cost}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Explanation Card */}
        <Alert className="border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4" />
          <AlertTitle>Regla de Protección de Márgenes</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              El margen de beneficio se calcula sobre el <strong>costo base (fábrica)</strong> únicamente.
              Los costos de logística se suman <strong>después</strong> de aplicar el margen, garantizando
              que los costos de envío nunca reduzcan el beneficio neto.
            </p>
            <div className="flex items-center gap-4 mt-3 p-3 bg-background rounded-lg text-sm font-mono">
              <span className="text-muted-foreground">Fórmula:</span>
              <span className="text-primary font-semibold">
                Precio B2B = (Costo Base × (1 + Margen%)) + Logística + Categoría + Gastos
              </span>
            </div>
          </AlertDescription>
        </Alert>

        {/* Main Configuration Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Rangos de Márgenes B2B
              </CardTitle>
              <CardDescription>
                Configure el porcentaje de beneficio según el rango de costo base del producto
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Rango
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingRange ? 'Editar Rango de Margen' : 'Nuevo Rango de Margen'}
                  </DialogTitle>
                  <DialogDescription>
                    Define el porcentaje de beneficio para un rango de costos base
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Costo Mínimo
                      </Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={formData.min_cost}
                        onChange={(e) => setFormData({ ...formData, min_cost: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Costo Máximo
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Dejar vacío para "sin límite"</p>
                          </TooltipContent>
                        </Tooltip>
                      </Label>
                      <Input
                        type="number"
                        placeholder="Sin límite"
                        value={formData.max_cost}
                        onChange={(e) => setFormData({ ...formData, max_cost: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Percent className="h-4 w-4" />
                      Porcentaje de Margen
                    </Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={formData.margin_percent}
                      onChange={(e) => setFormData({ ...formData, margin_percent: e.target.value })}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción (opcional)</Label>
                    <Input
                      placeholder="Ej: Productos de bajo costo"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                    />
                    <Label>Activo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave}
                    disabled={
                      !formData.min_cost || 
                      !formData.margin_percent ||
                      createMarginRange.isPending ||
                      updateMarginRange.isPending
                    }
                  >
                    {editingRange ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {marginRanges && marginRanges.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Rango de Costo Base</TableHead>
                    <TableHead>Margen (%)</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marginRanges.map((range) => (
                    <TableRow 
                      key={range.id}
                      className={!range.is_active ? 'opacity-50' : ''}
                    >
                      <TableCell>
                        <Switch
                          checked={range.is_active}
                          onCheckedChange={(v) => handleToggleActive(range.id, v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {formatCostRange(range)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-lg font-bold text-primary">
                          {range.margin_percent}%
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {range.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(range)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar rango?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El rango "{formatCostRange(range)}" 
                                  será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(range.id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-lg font-medium mb-2">No hay rangos configurados</p>
                <p className="text-sm mb-4">
                  Agrega rangos de márgenes para calcular automáticamente los precios B2B
                </p>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Primer Rango
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Example */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Ejemplo de Cálculo con Protección
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Datos de entrada:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Costo Fábrica: <span className="font-mono">$25.00</span></li>
                  <li>• Rango aplicable: <span className="font-mono">$10-$50 → 30%</span></li>
                  <li>• Logística: <span className="font-mono">$8.00</span></li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Cálculo protegido:</h4>
                <ul className="text-sm space-y-1">
                  <li>1. Margen sobre base: <span className="font-mono">$25 × 30% = $7.50</span></li>
                  <li>2. Subtotal con margen: <span className="font-mono">$25 + $7.50 = $32.50</span></li>
                  <li>3. + Logística: <span className="font-mono">$32.50 + $8.00 = <strong className="text-primary">$40.50</strong></span></li>
                </ul>
              </div>
            </div>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              ✓ El margen de $7.50 queda protegido independientemente del costo de envío
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

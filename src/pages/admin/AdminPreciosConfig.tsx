import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { usePriceEngine, DynamicExpense } from '@/hooks/usePriceEngine';
import { Plus, Pencil, Trash2, Calculator, Percent, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminPreciosConfig() {
  const {
    usePriceSettings,
    useDynamicExpenses,
    getProfitMargin,
    updatePriceSetting,
    createExpense,
    updateExpense,
    deleteExpense,
    toggleExpenseActive,
    calculateB2BPrice,
  } = usePriceEngine();

  const { data: priceSettings, isLoading: loadingSettings } = usePriceSettings();
  const { data: expenses, isLoading: loadingExpenses } = useDynamicExpenses();

  const profitMargin = getProfitMargin(priceSettings);

  const [marginInput, setMarginInput] = useState<string>('');
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<DynamicExpense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    nombre_gasto: '',
    valor: '',
    tipo: 'fijo' as 'fijo' | 'porcentual',
    operacion: 'suma' as 'suma' | 'resta',
    is_active: true,
  });

  // Test calculation
  const [testCost, setTestCost] = useState<string>('100');
  const testCalc = calculateB2BPrice(Number(testCost) || 0, expenses, profitMargin);

  const handleSaveMargin = () => {
    const value = parseFloat(marginInput);
    if (!isNaN(value) && value >= 0) {
      updatePriceSetting.mutate({ key: 'profit_margin', value });
      setMarginInput('');
    }
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      nombre_gasto: '',
      valor: '',
      tipo: 'fijo',
      operacion: 'suma',
      is_active: true,
    });
    setEditingExpense(null);
  };

  const handleOpenExpenseDialog = (expense?: DynamicExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        nombre_gasto: expense.nombre_gasto,
        valor: expense.valor.toString(),
        tipo: expense.tipo,
        operacion: expense.operacion,
        is_active: expense.is_active,
      });
    } else {
      resetExpenseForm();
    }
    setIsExpenseDialogOpen(true);
  };

  const handleSaveExpense = () => {
    const valor = parseFloat(expenseForm.valor);
    if (!expenseForm.nombre_gasto || isNaN(valor)) return;

    const data = {
      nombre_gasto: expenseForm.nombre_gasto,
      valor,
      tipo: expenseForm.tipo,
      operacion: expenseForm.operacion,
      is_active: expenseForm.is_active,
    };

    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, ...data });
    } else {
      createExpense.mutate(data);
    }

    setIsExpenseDialogOpen(false);
    resetExpenseForm();
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpense.mutate(id);
  };

  if (loadingSettings || loadingExpenses) {
    return (
      <AdminLayout title="Configuración de Precios">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Configuración de Precios B2B" subtitle="Motor de precios dinámico">
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Margen de Ganancia */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Margen de Ganancia Global
              </CardTitle>
              <CardDescription>
                Porcentaje aplicado sobre el subtotal (costo + gastos)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-primary">{profitMargin}%</div>
                <Badge variant="secondary">Actual</Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Nuevo porcentaje"
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  min="0"
                  step="0.1"
                />
                <Button 
                  onClick={handleSaveMargin}
                  disabled={updatePriceSetting.isPending || !marginInput}
                >
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Simulador de Precios */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Simulador de Precios
              </CardTitle>
              <CardDescription>
                Prueba el cálculo con un costo base
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Costo Base (Excel)</Label>
                <Input
                  type="number"
                  value={testCost}
                  onChange={(e) => setTestCost(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Costo Base:</span>
                  <span className="font-mono">${testCalc.costoBase.toFixed(2)}</span>
                </div>
                {testCalc.gastosAplicados.map((g, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{g.nombre}:</span>
                    <span className="font-mono">
                      {g.resultado >= 0 ? '+' : ''}{g.resultado.toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between border-t pt-2">
                  <span>Subtotal:</span>
                  <span className="font-mono">${testCalc.subtotalConGastos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Margen ({testCalc.margenPorcentaje}%):</span>
                  <span className="font-mono">+{testCalc.margenValor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                  <span>Precio B2B Final:</span>
                  <span className="font-mono">${testCalc.precioFinal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gastos Dinámicos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Gastos Dinámicos
              </CardTitle>
              <CardDescription>
                Gastos adicionales que se aplican al costo base (Flete, Aduana, etc.)
              </CardDescription>
            </div>
            <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenExpenseDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Gasto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingExpense ? 'Editar Gasto' : 'Nuevo Gasto'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure el gasto que se aplicará al calcular precios B2B
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre del Gasto</Label>
                    <Input
                      placeholder="Ej: Flete Internacional"
                      value={expenseForm.nombre_gasto}
                      onChange={(e) => setExpenseForm({ ...expenseForm, nombre_gasto: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={expenseForm.valor}
                        onChange={(e) => setExpenseForm({ ...expenseForm, valor: e.target.value })}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select
                        value={expenseForm.tipo}
                        onValueChange={(v) => setExpenseForm({ ...expenseForm, tipo: v as 'fijo' | 'porcentual' })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fijo">Fijo ($)</SelectItem>
                          <SelectItem value="porcentual">Porcentual (%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Operación</Label>
                    <Select
                      value={expenseForm.operacion}
                      onValueChange={(v) => setExpenseForm({ ...expenseForm, operacion: v as 'suma' | 'resta' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suma">Sumar (+)</SelectItem>
                        <SelectItem value="resta">Restar (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={expenseForm.is_active}
                      onCheckedChange={(v) => setExpenseForm({ ...expenseForm, is_active: v })}
                    />
                    <Label>Activo</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveExpense}>
                    {editingExpense ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {expenses && expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Estado</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className={!expense.is_active ? 'opacity-50' : ''}>
                      <TableCell>
                        <Switch
                          checked={expense.is_active}
                          onCheckedChange={(v) => toggleExpenseActive.mutate({ id: expense.id, is_active: v })}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{expense.nombre_gasto}</TableCell>
                      <TableCell className="font-mono">
                        {expense.tipo === 'fijo' ? `$${expense.valor}` : `${expense.valor}%`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={expense.tipo === 'fijo' ? 'default' : 'secondary'}>
                          {expense.tipo === 'fijo' ? 'Fijo' : 'Porcentual'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={expense.operacion === 'suma' ? 'default' : 'destructive'}>
                          {expense.operacion === 'suma' ? (
                            <><TrendingUp className="h-3 w-3 mr-1" /> Suma</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 mr-1" /> Resta</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenExpenseDialog(expense)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. El gasto "{expense.nombre_gasto}" será eliminado permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)}>
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
              <div className="text-center py-8 text-muted-foreground">
                No hay gastos configurados. Agrega uno para comenzar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

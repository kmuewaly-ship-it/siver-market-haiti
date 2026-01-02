import React, { useState } from 'react';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { useDiscountCodes, CreateDiscountCodeParams } from '@/hooks/useDiscountCodes';
import { useStoreByOwner } from '@/hooks/useStore';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Ticket, Percent, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const SellerDiscountCodes = () => {
  const { user } = useAuth();
  const storeQuery = useStoreByOwner(user?.id);
  const store = storeQuery.data;
  const storeLoading = storeQuery.isLoading;
  const { discountCodes, isLoading, createDiscountCode, updateDiscountCode, toggleDiscountCode, deleteDiscountCode } = useDiscountCodes(store?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<CreateDiscountCodeParams, 'store_id'>>({
    code: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 10,
    min_purchase_amount: 0,
    max_uses: null,
    max_uses_per_user: 1,
    valid_from: new Date().toISOString().slice(0, 16),
    valid_until: null,
    applies_to: 'all',
  });

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 10,
      min_purchase_amount: 0,
      max_uses: null,
      max_uses_per_user: 1,
      valid_from: new Date().toISOString().slice(0, 16),
      valid_until: null,
      applies_to: 'all',
    });
    setEditingCode(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!store) return;

    if (editingCode) {
      await updateDiscountCode(editingCode, formData);
    } else {
      await createDiscountCode({
        ...formData,
        store_id: store.id,
      });
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (code: typeof discountCodes[0]) => {
    setEditingCode(code.id);
    setFormData({
      code: code.code,
      description: code.description || '',
      discount_type: code.discount_type,
      discount_value: code.discount_value,
      min_purchase_amount: code.min_purchase_amount,
      max_uses: code.max_uses,
      max_uses_per_user: code.max_uses_per_user,
      valid_from: code.valid_from?.slice(0, 16),
      valid_until: code.valid_until?.slice(0, 16) || null,
      applies_to: code.applies_to,
    });
    setIsDialogOpen(true);
  };

  const isCodeActive = (code: typeof discountCodes[0]) => {
    if (!code.is_active) return false;
    const now = new Date();
    if (code.valid_from && new Date(code.valid_from) > now) return false;
    if (code.valid_until && new Date(code.valid_until) < now) return false;
    if (code.max_uses && code.used_count >= code.max_uses) return false;
    return true;
  };

  if (storeLoading) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center h-64">
          <p>Cargando...</p>
        </div>
      </SellerLayout>
    );
  }

  if (!store) {
    return (
      <SellerLayout>
        <div className="flex items-center justify-center h-64">
          <p>No tienes una tienda configurada</p>
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Mis Códigos de Descuento</h1>
            <p className="text-muted-foreground">Crea códigos de descuento para tu tienda</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Código
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingCode ? 'Editar Código' : 'Nuevo Código de Descuento'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="MITIENDA10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descuento para clientes nuevos"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de descuento</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: 'percentage' | 'fixed_amount') => 
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                        <SelectItem value="fixed_amount">Monto fijo ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount_value">Valor</Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_purchase">Compra mínima ($)</Label>
                    <Input
                      id="min_purchase"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.min_purchase_amount || 0}
                      onChange={(e) => setFormData({ ...formData, min_purchase_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_uses">Usos máximos</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      min="1"
                      value={formData.max_uses || ''}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Ilimitado"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">Válido desde</Label>
                    <Input
                      id="valid_from"
                      type="datetime-local"
                      value={formData.valid_from || ''}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valid_until">Válido hasta</Label>
                    <Input
                      id="valid_until"
                      type="datetime-local"
                      value={formData.valid_until || ''}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value || null })}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  {editingCode ? 'Guardar Cambios' : 'Crear Código'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Códigos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{discountCodes.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Códigos Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {discountCodes.filter(isCodeActive).length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-bold">
                  {discountCodes.reduce((sum, c) => sum + c.used_count, 0)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Usos</TableHead>
                  <TableHead>Validez</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : discountCodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tienes códigos de descuento
                    </TableCell>
                  </TableRow>
                ) : (
                  discountCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono font-bold">{code.code}</span>
                          {code.description && (
                            <p className="text-xs text-muted-foreground">{code.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {code.discount_type === 'percentage' ? (
                          <span>{code.discount_value}%</span>
                        ) : (
                          <span>${code.discount_value.toFixed(2)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.used_count} / {code.max_uses || '∞'}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {code.valid_from && (
                            <div>Desde: {format(new Date(code.valid_from), 'dd/MM/yy', { locale: es })}</div>
                          )}
                          {code.valid_until && (
                            <div>Hasta: {format(new Date(code.valid_until), 'dd/MM/yy', { locale: es })}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={code.is_active}
                            onCheckedChange={(checked) => toggleDiscountCode(code.id, checked)}
                          />
                          <Badge variant={isCodeActive(code) ? 'default' : 'secondary'}>
                            {isCodeActive(code) ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(code)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteDiscountCode(code.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
};

export default SellerDiscountCodes;

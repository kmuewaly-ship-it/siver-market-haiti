import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePaymentMethods, PaymentMethodInput } from '@/hooks/usePaymentMethods';
import { Building2, Smartphone, CreditCard, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminPaymentMethodsPage() {
  const { methods, isLoading, upsertMethod, getMethodByType } = usePaymentMethods('admin');
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  // Bank form state
  const bankMethod = getMethodByType('bank');
  const [bankForm, setBankForm] = useState({
    bank_name: bankMethod?.bank_name || '',
    account_type: bankMethod?.account_type || 'Ahorros',
    account_number: bankMethod?.account_number || '',
    account_holder: bankMethod?.account_holder || '',
    bank_swift: bankMethod?.bank_swift || '',
    is_active: bankMethod?.is_active ?? true,
  });

  // MonCash form state
  const moncashMethod = getMethodByType('moncash');
  const [moncashForm, setMoncashForm] = useState({
    phone_number: moncashMethod?.phone_number || '',
    holder_name: moncashMethod?.holder_name || '',
    is_active: moncashMethod?.is_active ?? true,
  });

  // NatCash form state
  const natcashMethod = getMethodByType('natcash');
  const [natcashForm, setNatcashForm] = useState({
    phone_number: natcashMethod?.phone_number || '',
    holder_name: natcashMethod?.holder_name || '',
    is_active: natcashMethod?.is_active ?? true,
  });

  // Update forms when methods load
  useState(() => {
    if (bankMethod) {
      setBankForm({
        bank_name: bankMethod.bank_name || '',
        account_type: bankMethod.account_type || 'Ahorros',
        account_number: bankMethod.account_number || '',
        account_holder: bankMethod.account_holder || '',
        bank_swift: bankMethod.bank_swift || '',
        is_active: bankMethod.is_active ?? true,
      });
    }
    if (moncashMethod) {
      setMoncashForm({
        phone_number: moncashMethod.phone_number || '',
        holder_name: moncashMethod.holder_name || '',
        is_active: moncashMethod.is_active ?? true,
      });
    }
    if (natcashMethod) {
      setNatcashForm({
        phone_number: natcashMethod.phone_number || '',
        holder_name: natcashMethod.holder_name || '',
        is_active: natcashMethod.is_active ?? true,
      });
    }
  });

  const handleSaveBank = async () => {
    setSaving('bank');
    const input: PaymentMethodInput = {
      method_type: 'bank',
      display_name: 'Transferencia Bancaria',
      ...bankForm,
    };
    await upsertMethod(input);
    setSaving(null);
  };

  const handleSaveMoncash = async () => {
    setSaving('moncash');
    const input: PaymentMethodInput = {
      method_type: 'moncash',
      display_name: 'MonCash',
      ...moncashForm,
    };
    await upsertMethod(input);
    setSaving(null);
  };

  const handleSaveNatcash = async () => {
    setSaving('natcash');
    const input: PaymentMethodInput = {
      method_type: 'natcash',
      display_name: 'NatCash',
      ...natcashForm,
    };
    await upsertMethod(input);
    setSaving(null);
  };

  if (isLoading) {
    return (
      <AdminLayout title="Métodos de Pago">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Métodos de Pago" 
      subtitle="Configure los métodos de pago para recibir pagos B2B de los sellers"
    >
      <div className="space-y-6">
        {/* Status Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={bankMethod?.is_active ? 'border-purple-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="font-medium">Banco</p>
                    <p className="text-sm text-muted-foreground">
                      {bankMethod ? 'Configurado' : 'Sin configurar'}
                    </p>
                  </div>
                </div>
                <Badge variant={bankMethod?.is_active ? 'default' : 'secondary'}>
                  {bankMethod?.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={moncashMethod?.is_active ? 'border-red-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(148, 17, 31, 0.1)' }}>
                    <Smartphone className="h-5 w-5" style={{ color: '#94111f' }} />
                  </div>
                  <div>
                    <p className="font-medium">MonCash</p>
                    <p className="text-sm text-muted-foreground">
                      {moncashMethod ? 'Configurado' : 'Sin configurar'}
                    </p>
                  </div>
                </div>
                <Badge variant={moncashMethod?.is_active ? 'default' : 'secondary'}>
                  {moncashMethod?.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className={natcashMethod?.is_active ? 'border-blue-500/50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(7, 29, 127, 0.1)' }}>
                    <CreditCard className="h-5 w-5" style={{ color: '#071d7f' }} />
                  </div>
                  <div>
                    <p className="font-medium">NatCash</p>
                    <p className="text-sm text-muted-foreground">
                      {natcashMethod ? 'Configurado' : 'Sin configurar'}
                    </p>
                  </div>
                </div>
                <Badge variant={natcashMethod?.is_active ? 'default' : 'secondary'}>
                  {natcashMethod?.is_active ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Tabs */}
        <Tabs defaultValue="bank" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bank" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Banco
            </TabsTrigger>
            <TabsTrigger value="moncash" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              MonCash
            </TabsTrigger>
            <TabsTrigger value="natcash" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              NatCash
            </TabsTrigger>
          </TabsList>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-purple-500" />
                  Transferencia Bancaria
                </CardTitle>
                <CardDescription>
                  Configure los datos bancarios para recibir transferencias de los sellers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={bankForm.is_active}
                    onCheckedChange={(v) => setBankForm({ ...bankForm, is_active: v })}
                  />
                  <Label>Método activo</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Nombre del Banco</Label>
                    <Input
                      id="bank_name"
                      placeholder="Ej: Banco Nacional de Haití"
                      value={bankForm.bank_name}
                      onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_type">Tipo de Cuenta</Label>
                    <Input
                      id="account_type"
                      placeholder="Ej: Ahorros, Corriente"
                      value={bankForm.account_type}
                      onChange={(e) => setBankForm({ ...bankForm, account_type: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="account_number">Número de Cuenta</Label>
                    <Input
                      id="account_number"
                      placeholder="Ej: 001-234567-89"
                      value={bankForm.account_number}
                      onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account_holder">Titular de la Cuenta</Label>
                    <Input
                      id="account_holder"
                      placeholder="Ej: Siver Market 509 SRL"
                      value={bankForm.account_holder}
                      onChange={(e) => setBankForm({ ...bankForm, account_holder: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_swift">Código SWIFT (opcional)</Label>
                  <Input
                    id="bank_swift"
                    placeholder="Ej: BNHAHTHX"
                    value={bankForm.bank_swift}
                    onChange={(e) => setBankForm({ ...bankForm, bank_swift: e.target.value })}
                  />
                </div>

                <Button 
                  onClick={handleSaveBank} 
                  disabled={saving === 'bank'}
                  className="w-full md:w-auto"
                >
                  {saving === 'bank' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Datos Bancarios
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MonCash Tab */}
          <TabsContent value="moncash">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" style={{ color: '#94111f' }} />
                  MonCash
                </CardTitle>
                <CardDescription>
                  Configure los datos de MonCash para recibir pagos móviles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={moncashForm.is_active}
                    onCheckedChange={(v) => setMoncashForm({ ...moncashForm, is_active: v })}
                  />
                  <Label>Método activo</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="moncash_phone">Número de Teléfono</Label>
                    <Input
                      id="moncash_phone"
                      placeholder="Ej: +509 3XXX XXXX"
                      value={moncashForm.phone_number}
                      onChange={(e) => setMoncashForm({ ...moncashForm, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moncash_name">Nombre en MonCash</Label>
                    <Input
                      id="moncash_name"
                      placeholder="Ej: Siver Market 509"
                      value={moncashForm.holder_name}
                      onChange={(e) => setMoncashForm({ ...moncashForm, holder_name: e.target.value })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveMoncash} 
                  disabled={saving === 'moncash'}
                  className="w-full md:w-auto"
                  style={{ backgroundColor: '#94111f' }}
                >
                  {saving === 'moncash' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar MonCash
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* NatCash Tab */}
          <TabsContent value="natcash">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" style={{ color: '#071d7f' }} />
                  NatCash
                </CardTitle>
                <CardDescription>
                  Configure los datos de NatCash para recibir pagos móviles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={natcashForm.is_active}
                    onCheckedChange={(v) => setNatcashForm({ ...natcashForm, is_active: v })}
                  />
                  <Label>Método activo</Label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="natcash_phone">Número de Teléfono</Label>
                    <Input
                      id="natcash_phone"
                      placeholder="Ej: +509 3XXX XXXX"
                      value={natcashForm.phone_number}
                      onChange={(e) => setNatcashForm({ ...natcashForm, phone_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="natcash_name">Nombre en NatCash</Label>
                    <Input
                      id="natcash_name"
                      placeholder="Ej: Siver Market 509"
                      value={natcashForm.holder_name}
                      onChange={(e) => setNatcashForm({ ...natcashForm, holder_name: e.target.value })}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveNatcash} 
                  disabled={saving === 'natcash'}
                  className="w-full md:w-auto"
                  style={{ backgroundColor: '#071d7f' }}
                >
                  {saving === 'natcash' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar NatCash
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">Sobre los métodos de pago</h4>
                <p className="text-sm text-muted-foreground">
                  Los métodos de pago configurados aquí se mostrarán a los sellers (B2B) cuando realicen 
                  pedidos en la plataforma. Los sellers verán estos datos para poder realizar sus pagos.
                  Los pagos con tarjeta se procesan automáticamente a través de Stripe.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

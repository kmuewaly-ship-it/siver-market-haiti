import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { usePaymentMethods, PaymentMethodInput, IntegrationMode } from '@/hooks/usePaymentMethods';
import { Building2, Smartphone, CreditCard, Save, Loader2, Zap, Hand, AlertCircle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminPaymentMethodsPage() {
  const { methods, isLoading, upsertMethod, getMethodByType, refetch } = usePaymentMethods('admin');
  const { toast } = useToast();
  const [saving, setSaving] = useState<string | null>(null);

  // Bank form state
  const bankMethod = getMethodByType('bank');
  const [bankForm, setBankForm] = useState({
    bank_name: '',
    account_type: 'Ahorros',
    account_number: '',
    account_holder: '',
    bank_swift: '',
    is_active: true,
  });

  // MonCash form state
  const moncashMethod = getMethodByType('moncash');
  const [moncashForm, setMoncashForm] = useState({
    phone_number: '',
    holder_name: '',
    is_active: true,
    integration_mode: 'manual' as IntegrationMode,
    // API credentials for automatic mode
    client_id: '',
    client_secret: '',
    business_key: '',
  });

  // NatCash form state
  const natcashMethod = getMethodByType('natcash');
  const [natcashForm, setNatcashForm] = useState({
    phone_number: '',
    holder_name: '',
    is_active: true,
    integration_mode: 'manual' as IntegrationMode,
    // API credentials for automatic mode
    api_key: '',
    api_secret: '',
  });

  // Update forms when methods load
  useEffect(() => {
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
      const meta = moncashMethod.metadata || {};
      setMoncashForm({
        phone_number: moncashMethod.phone_number || '',
        holder_name: moncashMethod.holder_name || '',
        is_active: moncashMethod.is_active ?? true,
        integration_mode: (moncashMethod.integration_mode as IntegrationMode) || 'manual',
        client_id: (meta.client_id as string) || '',
        client_secret: (meta.client_secret as string) || '',
        business_key: (meta.business_key as string) || '',
      });
    }
    if (natcashMethod) {
      const meta = natcashMethod.metadata || {};
      setNatcashForm({
        phone_number: natcashMethod.phone_number || '',
        holder_name: natcashMethod.holder_name || '',
        is_active: natcashMethod.is_active ?? true,
        integration_mode: (natcashMethod.integration_mode as IntegrationMode) || 'manual',
        api_key: (meta.api_key as string) || '',
        api_secret: (meta.api_secret as string) || '',
      });
    }
  }, [bankMethod, moncashMethod, natcashMethod]);

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
      phone_number: moncashForm.phone_number,
      holder_name: moncashForm.holder_name,
      is_active: moncashForm.is_active,
      integration_mode: moncashForm.integration_mode,
      metadata: moncashForm.integration_mode === 'automatic' ? {
        client_id: moncashForm.client_id,
        client_secret: moncashForm.client_secret,
        business_key: moncashForm.business_key,
      } : {},
    };
    await upsertMethod(input);
    await refetch();
    setSaving(null);
  };

  const handleSaveNatcash = async () => {
    setSaving('natcash');
    const input: PaymentMethodInput = {
      method_type: 'natcash',
      display_name: 'NatCash',
      phone_number: natcashForm.phone_number,
      holder_name: natcashForm.holder_name,
      is_active: natcashForm.is_active,
      integration_mode: natcashForm.integration_mode,
      metadata: natcashForm.integration_mode === 'automatic' ? {
        api_key: natcashForm.api_key,
        api_secret: natcashForm.api_secret,
      } : {},
    };
    await upsertMethod(input);
    await refetch();
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
                      {moncashMethod && (
                        <span className="ml-2">
                          {moncashMethod.integration_mode === 'automatic' ? (
                            <span className="inline-flex items-center text-yellow-600">
                              <Zap className="h-3 w-3 mr-0.5" /> API
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-muted-foreground">
                              <Hand className="h-3 w-3 mr-0.5" /> Manual
                            </span>
                          )}
                        </span>
                      )}
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
                      {natcashMethod && (
                        <span className="ml-2">
                          {natcashMethod.integration_mode === 'automatic' ? (
                            <span className="inline-flex items-center text-yellow-600">
                              <Zap className="h-3 w-3 mr-0.5" /> API
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-muted-foreground">
                              <Hand className="h-3 w-3 mr-0.5" /> Manual
                            </span>
                          )}
                        </span>
                      )}
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
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={moncashForm.is_active}
                    onCheckedChange={(v) => setMoncashForm({ ...moncashForm, is_active: v })}
                  />
                  <Label>Método activo</Label>
                </div>

                {/* Integration Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Modo de Integración</Label>
                  <RadioGroup
                    value={moncashForm.integration_mode}
                    onValueChange={(v) => setMoncashForm({ ...moncashForm, integration_mode: v as IntegrationMode })}
                    className="grid gap-3"
                  >
                    <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="manual" id="moncash-manual" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="moncash-manual" className="flex items-center gap-2 cursor-pointer">
                          <Hand className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Manual</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          El cliente paga y proporciona referencia. Admin confirma manualmente.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="automatic" id="moncash-automatic" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="moncash-automatic" className="flex items-center gap-2 cursor-pointer">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Automático (API)</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Integración con API de MonCash. Verificación automática de pagos.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Basic Info - Always shown */}
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

                {/* API Credentials - Only shown for automatic mode */}
                {moncashForm.integration_mode === 'automatic' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Key className="h-4 w-4" />
                      Credenciales API de MonCash
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Obtenga estas credenciales desde el portal de desarrolladores de MonCash (Digicel Business)
                      </AlertDescription>
                    </Alert>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="moncash_client_id">Client ID</Label>
                        <Input
                          id="moncash_client_id"
                          type="password"
                          placeholder="Ingrese su Client ID"
                          value={moncashForm.client_id}
                          onChange={(e) => setMoncashForm({ ...moncashForm, client_id: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="moncash_client_secret">Client Secret</Label>
                        <Input
                          id="moncash_client_secret"
                          type="password"
                          placeholder="Ingrese su Client Secret"
                          value={moncashForm.client_secret}
                          onChange={(e) => setMoncashForm({ ...moncashForm, client_secret: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="moncash_business_key">Business Key</Label>
                        <Input
                          id="moncash_business_key"
                          type="password"
                          placeholder="Ingrese su Business Key"
                          value={moncashForm.business_key}
                          onChange={(e) => setMoncashForm({ ...moncashForm, business_key: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

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
              <CardContent className="space-y-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={natcashForm.is_active}
                    onCheckedChange={(v) => setNatcashForm({ ...natcashForm, is_active: v })}
                  />
                  <Label>Método activo</Label>
                </div>

                {/* Integration Mode Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">Modo de Integración</Label>
                  <RadioGroup
                    value={natcashForm.integration_mode}
                    onValueChange={(v) => setNatcashForm({ ...natcashForm, integration_mode: v as IntegrationMode })}
                    className="grid gap-3"
                  >
                    <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="manual" id="natcash-manual" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="natcash-manual" className="flex items-center gap-2 cursor-pointer">
                          <Hand className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Manual</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          El cliente paga y proporciona referencia. Admin confirma manualmente.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value="automatic" id="natcash-automatic" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="natcash-automatic" className="flex items-center gap-2 cursor-pointer">
                          <Zap className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">Automático (API)</span>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          Integración con API de NatCash (si disponible). Verificación automática de pagos.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Basic Info - Always shown */}
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

                {/* API Credentials - Only shown for automatic mode */}
                {natcashForm.integration_mode === 'automatic' && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Key className="h-4 w-4" />
                      Credenciales API de NatCash
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Obtenga estas credenciales desde el portal de desarrolladores de NatCash (Natcom)
                      </AlertDescription>
                    </Alert>
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="natcash_api_key">API Key</Label>
                        <Input
                          id="natcash_api_key"
                          type="password"
                          placeholder="Ingrese su API Key"
                          value={natcashForm.api_key}
                          onChange={(e) => setNatcashForm({ ...natcashForm, api_key: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="natcash_api_secret">API Secret</Label>
                        <Input
                          id="natcash_api_secret"
                          type="password"
                          placeholder="Ingrese su API Secret"
                          value={natcashForm.api_secret}
                          onChange={(e) => setNatcashForm({ ...natcashForm, api_secret: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

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

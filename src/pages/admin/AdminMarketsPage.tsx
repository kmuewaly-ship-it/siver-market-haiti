import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useMarkets, 
  useMarketPaymentMethods, 
  useMarketValidation,
  MarketDashboard,
  MarketPaymentMethod,
} from "@/hooks/useMarkets";
import { useCountriesRoutes } from "@/hooks/useCountriesRoutes";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  CreditCard, 
  AlertTriangle, 
  CheckCircle2, 
  Store, 
  Loader2,
  ArrowRight,
  Route,
  Settings,
  Package,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminMarketsPage() {
  const navigate = useNavigate();
  const { markets, activeMarkets, isLoading, createMarket, updateMarket, deleteMarket, toggleMarketActive } = useMarkets();
  const { countries, routes, isLoading: loadingRoutes } = useCountriesRoutes();
  
  // Dialog states
  const [showMarketDialog, setShowMarketDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<MarketDashboard | null>(null);
  const [editingMarket, setEditingMarket] = useState<MarketDashboard | null>(null);

  // Form state
  const [marketForm, setMarketForm] = useState({
    name: "",
    code: "",
    description: "",
    destination_country_id: "",
    shipping_route_id: "",
    currency: "USD",
    timezone: "America/Port-au-Prince",
    sort_order: 0,
    is_active: false,
  });

  // Payment method form
  const [paymentForm, setPaymentForm] = useState({
    name: "",
    method_type: "bank_transfer",
    currency: "USD",
    account_number: "",
    account_holder: "",
    bank_name: "",
    instructions: "",
    sort_order: 0,
    is_active: true,
  });
  const [editingPayment, setEditingPayment] = useState<MarketPaymentMethod | null>(null);

  // Fetch payment methods for selected market
  const { paymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } = 
    useMarketPaymentMethods(selectedMarket?.id);

  // Validation state
  const [availableRoutes, setAvailableRoutes] = useState<typeof routes>([]);
  const [noRoutesWarning, setNoRoutesWarning] = useState(false);

  // Filter routes when destination country changes
  useEffect(() => {
    if (marketForm.destination_country_id && routes) {
      const filtered = routes.filter(
        r => r.destination_country_id === marketForm.destination_country_id && r.is_active
      );
      setAvailableRoutes(filtered);
      setNoRoutesWarning(filtered.length === 0);
      // Reset route selection if current selection is invalid
      if (!filtered.find(r => r.id === marketForm.shipping_route_id)) {
        setMarketForm(prev => ({ ...prev, shipping_route_id: "" }));
      }
    } else {
      setAvailableRoutes([]);
      setNoRoutesWarning(false);
    }
  }, [marketForm.destination_country_id, routes]);

  // Open market dialog for create/edit
  const openMarketDialog = (market?: MarketDashboard) => {
    if (market) {
      setEditingMarket(market);
      setMarketForm({
        name: market.name,
        code: market.code,
        description: market.description || "",
        destination_country_id: market.destination_country_id,
        shipping_route_id: market.shipping_route_id || "",
        currency: market.currency,
        timezone: market.timezone || "America/Port-au-Prince",
        sort_order: market.sort_order,
        is_active: market.is_active,
      });
    } else {
      setEditingMarket(null);
      setMarketForm({
        name: "",
        code: "",
        description: "",
        destination_country_id: "",
        shipping_route_id: "",
        currency: "USD",
        timezone: "America/Port-au-Prince",
        sort_order: 0,
        is_active: false,
      });
    }
    setShowMarketDialog(true);
  };

  // Submit market form
  const handleMarketSubmit = () => {
    // Validate route selection for activation
    if (marketForm.is_active && !marketForm.shipping_route_id) {
      return; // Cannot activate without route
    }

    const data = {
      ...marketForm,
      description: marketForm.description || null,
      shipping_route_id: marketForm.shipping_route_id || null,
      metadata: {},
    };

    if (editingMarket) {
      updateMarket.mutate({ id: editingMarket.id, ...data }, {
        onSuccess: () => setShowMarketDialog(false),
      });
    } else {
      createMarket.mutate(data, {
        onSuccess: () => setShowMarketDialog(false),
      });
    }
  };

  // Payment methods handlers
  const openPaymentDialog = (payment?: MarketPaymentMethod) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        name: payment.name,
        method_type: payment.method_type,
        currency: payment.currency,
        account_number: payment.account_number || "",
        account_holder: payment.account_holder || "",
        bank_name: payment.bank_name || "",
        instructions: payment.instructions || "",
        sort_order: payment.sort_order,
        is_active: payment.is_active,
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({
        name: "",
        method_type: "bank_transfer",
        currency: selectedMarket?.currency || "USD",
        account_number: "",
        account_holder: "",
        bank_name: "",
        instructions: "",
        sort_order: 0,
        is_active: true,
      });
    }
    setShowPaymentDialog(true);
  };

  const handlePaymentSubmit = () => {
    if (!selectedMarket) return;

    const data = {
      ...paymentForm,
      market_id: selectedMarket.id,
      account_number: paymentForm.account_number || null,
      account_holder: paymentForm.account_holder || null,
      bank_name: paymentForm.bank_name || null,
      instructions: paymentForm.instructions || null,
      metadata: {},
    };

    if (editingPayment) {
      updatePaymentMethod.mutate({ id: editingPayment.id, ...data }, {
        onSuccess: () => setShowPaymentDialog(false),
      });
    } else {
      createPaymentMethod.mutate(data, {
        onSuccess: () => setShowPaymentDialog(false),
      });
    }
  };

  const handleDeleteMarket = (id: string) => {
    if (confirm("¿Estás seguro de eliminar este mercado? Esta acción es irreversible.")) {
      deleteMarket.mutate(id);
    }
  };

  const handleDeletePayment = (id: string) => {
    if (confirm("¿Eliminar este método de pago?")) {
      deletePaymentMethod.mutate(id);
    }
  };

  const paymentMethodTypes = [
    { value: "bank_transfer", label: "Transferencia Bancaria" },
    { value: "moncash", label: "Moncash" },
    { value: "natcash", label: "Natcash" },
    { value: "cash", label: "Efectivo" },
    { value: "credit_card", label: "Tarjeta de Crédito" },
    { value: "paypal", label: "PayPal" },
    { value: "crypto", label: "Criptomonedas" },
    { value: "other", label: "Otro" },
  ];

  if (isLoading || loadingRoutes) {
    return (
      <AdminLayout title="Mercados" subtitle="Cargando...">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Gestión de Mercados" 
      subtitle="Configura mercados, rutas logísticas y métodos de pago localizados"
    >
      <Tabs defaultValue="markets" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="markets" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Mercados
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alertas
          </TabsTrigger>
        </TabsList>

        {/* ========== MARKETS TAB ========== */}
        <TabsContent value="markets">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mercados Configurados</CardTitle>
                <CardDescription>
                  Cada mercado representa un país destino con su ruta logística y métodos de pago
                </CardDescription>
              </div>
              <Button onClick={() => openMarketDialog()} className="gap-2">
                <Plus className="h-4 w-4" />
                Crear Mercado
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead className="text-center">Productos</TableHead>
                    <TableHead className="text-center">Pagos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {markets?.map((market) => (
                    <TableRow key={market.id}>
                      <TableCell className="font-mono font-bold">{market.code}</TableCell>
                      <TableCell className="font-medium">{market.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          {market.destination_country_name || "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {market.shipping_route_id ? (
                          <Badge variant="outline" className="gap-1">
                            <Route className="h-3 w-3" />
                            {market.transit_hub_name || "Directo"}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Sin Ruta
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          <Package className="h-3 w-3 mr-1" />
                          {market.product_count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {market.payment_method_count > 0 ? (
                          <Badge variant="secondary">
                            <CreditCard className="h-3 w-3 mr-1" />
                            {market.payment_method_count}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            0
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={market.is_active}
                          disabled={!market.shipping_route_id}
                          onCheckedChange={(checked) => 
                            toggleMarketActive.mutate({ id: market.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedMarket(market);
                          }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openMarketDialog(market)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteMarket(market.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!markets?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No hay mercados configurados. Crea uno para comenzar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Payment Methods Panel */}
          {selectedMarket && (
            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Métodos de Pago: {selectedMarket.name}
                  </CardTitle>
                  <CardDescription>
                    Configura los métodos de pago disponibles para este mercado
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedMarket(null)}>
                    Cerrar
                  </Button>
                  <Button onClick={() => openPaymentDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Agregar Método
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Moneda</TableHead>
                      <TableHead>Cuenta/Número</TableHead>
                      <TableHead>Titular</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentMethods?.map((method) => (
                      <TableRow key={method.id}>
                        <TableCell className="font-medium">{method.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {paymentMethodTypes.find(t => t.value === method.method_type)?.label || method.method_type}
                          </Badge>
                        </TableCell>
                        <TableCell>{method.currency}</TableCell>
                        <TableCell className="font-mono text-sm">{method.account_number || "-"}</TableCell>
                        <TableCell>{method.account_holder || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={method.is_active ? "default" : "secondary"}>
                            {method.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openPaymentDialog(method)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeletePayment(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!paymentMethods?.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No hay métodos de pago configurados para este mercado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========== ALERTS TAB ========== */}
        <TabsContent value="alerts">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Alertas de Cobertura
                </CardTitle>
                <CardDescription>
                  Problemas de configuración que requieren atención
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Markets without routes */}
                {markets?.filter(m => !m.shipping_route_id).map(market => (
                  <Alert key={market.id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Mercado sin ruta logística</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        El mercado <strong>{market.name}</strong> no tiene una ruta logística asignada.
                      </span>
                      <Button size="sm" variant="outline" onClick={() => openMarketDialog(market)}>
                        Configurar
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}

                {/* Markets without payment methods */}
                {markets?.filter(m => m.payment_method_count === 0 && m.is_active).map(market => (
                  <Alert key={`pay-${market.id}`}>
                    <CreditCard className="h-4 w-4" />
                    <AlertTitle>Mercado sin métodos de pago</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>
                        El mercado <strong>{market.name}</strong> no tiene métodos de pago activos.
                      </span>
                      <Button size="sm" variant="outline" onClick={() => setSelectedMarket(market)}>
                        Agregar Pagos
                      </Button>
                    </AlertDescription>
                  </Alert>
                ))}

                {/* No issues */}
                {markets?.every(m => m.shipping_route_id && (m.payment_method_count > 0 || !m.is_active)) && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle>Todo en orden</AlertTitle>
                    <AlertDescription>
                      Todos los mercados activos tienen rutas y métodos de pago configurados.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========== MARKET DIALOG ========== */}
      <Dialog open={showMarketDialog} onOpenChange={setShowMarketDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMarket ? "Editar Mercado" : "Crear Mercado"}</DialogTitle>
            <DialogDescription>
              Configura un nuevo mercado con su destino y ruta logística
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="market-name">Nombre del Mercado</Label>
                <Input
                  id="market-name"
                  value={marketForm.name}
                  onChange={(e) => setMarketForm({ ...marketForm, name: e.target.value })}
                  placeholder="Ej: Haití Principal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="market-code">Código</Label>
                <Input
                  id="market-code"
                  value={marketForm.code}
                  onChange={(e) => setMarketForm({ ...marketForm, code: e.target.value.toUpperCase() })}
                  placeholder="Ej: HT-PAP"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="market-description">Descripción</Label>
              <Textarea
                id="market-description"
                value={marketForm.description}
                onChange={(e) => setMarketForm({ ...marketForm, description: e.target.value })}
                placeholder="Descripción opcional del mercado"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination-country">País Destino *</Label>
              <Select
                value={marketForm.destination_country_id}
                onValueChange={(value) => setMarketForm({ ...marketForm, destination_country_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar país destino" />
                </SelectTrigger>
                <SelectContent>
                  {countries?.map((country) => (
                    <SelectItem key={country.id} value={country.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{country.code}</span>
                        <span>{country.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Route Selection with Validation */}
            {marketForm.destination_country_id && (
              <div className="space-y-2">
                <Label htmlFor="shipping-route">Ruta Logística *</Label>
                {noRoutesWarning ? (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No hay rutas disponibles</AlertTitle>
                    <AlertDescription className="flex items-center justify-between">
                      <span>Este destino no tiene rutas logísticas configuradas.</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setShowMarketDialog(false);
                          navigate("/admin/paises-rutas");
                        }}
                      >
                        Crear Ruta
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={marketForm.shipping_route_id}
                    onValueChange={(value) => setMarketForm({ ...marketForm, shipping_route_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar ruta" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoutes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          <div className="flex items-center gap-2">
                            {route.is_direct ? (
                              <span>Directo → {route.destination_country?.name}</span>
                            ) : (
                              <span>
                                Vía {route.transit_hub?.name} → {route.destination_country?.name}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="market-currency">Moneda</Label>
                <Select
                  value={marketForm.currency}
                  onValueChange={(value) => setMarketForm({ ...marketForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - Dólar</SelectItem>
                    <SelectItem value="HTG">HTG - Gourde</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="market-order">Orden</Label>
                <Input
                  id="market-order"
                  type="number"
                  value={marketForm.sort_order}
                  onChange={(e) => setMarketForm({ ...marketForm, sort_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Mercado Activo</Label>
                <p className="text-sm text-muted-foreground">
                  Requiere una ruta logística asignada
                </p>
              </div>
              <Switch
                checked={marketForm.is_active}
                disabled={!marketForm.shipping_route_id}
                onCheckedChange={(checked) => setMarketForm({ ...marketForm, is_active: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarketDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleMarketSubmit}
              disabled={!marketForm.name || !marketForm.code || !marketForm.destination_country_id || createMarket.isPending || updateMarket.isPending}
            >
              {(createMarket.isPending || updateMarket.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingMarket ? "Guardar Cambios" : "Crear Mercado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== PAYMENT METHOD DIALOG ========== */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? "Editar Método de Pago" : "Agregar Método de Pago"}</DialogTitle>
            <DialogDescription>
              Configura los datos del método de pago para {selectedMarket?.name}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="payment-name">Nombre</Label>
                <Input
                  id="payment-name"
                  value={paymentForm.name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, name: e.target.value })}
                  placeholder="Ej: Moncash Haiti"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={paymentForm.method_type}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, method_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={paymentForm.currency}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="HTG">HTG</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-account">Número de Cuenta/Teléfono</Label>
                <Input
                  id="payment-account"
                  value={paymentForm.account_number}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                  placeholder="Ej: +509 1234 5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-holder">Titular de la Cuenta</Label>
                <Input
                  id="payment-holder"
                  value={paymentForm.account_holder}
                  onChange={(e) => setPaymentForm({ ...paymentForm, account_holder: e.target.value })}
                  placeholder="Nombre del titular"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-bank">Banco/Proveedor</Label>
                <Input
                  id="payment-bank"
                  value={paymentForm.bank_name}
                  onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                  placeholder="Ej: Digicel, Natcom"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-instructions">Instrucciones de Pago</Label>
                <Textarea
                  id="payment-instructions"
                  value={paymentForm.instructions}
                  onChange={(e) => setPaymentForm({ ...paymentForm, instructions: e.target.value })}
                  placeholder="Instrucciones detalladas para el cliente..."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <Label>Activo</Label>
                <Switch
                  checked={paymentForm.is_active}
                  onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, is_active: checked })}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePaymentSubmit}
              disabled={!paymentForm.name || createPaymentMethod.isPending || updatePaymentMethod.isPending}
            >
              {(createPaymentMethod.isPending || updatePaymentMethod.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPayment ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

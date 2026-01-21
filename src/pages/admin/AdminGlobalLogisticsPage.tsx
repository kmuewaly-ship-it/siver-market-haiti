import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Globe, 
  Plane, 
  Building2, 
  MapPin,
  Store,
  Package,
  Calculator,
  DollarSign,
  Clock,
  Plus,
  Edit,
  Trash2,
  ArrowRight,
  Info,
  Tag,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Route,
  Layers,
  Settings,
} from 'lucide-react';
import { useCountriesRoutes, TransitHub, DestinationCountry, ShippingRoute, RouteLogisticsCost } from '@/hooks/useCountriesRoutes';
import { useShippingOrigins, ShippingOrigin } from '@/hooks/useShippingOrigins';
import { useMarkets } from '@/hooks/useMarkets';
import { useLogisticsEngine, CategoryShippingRate } from '@/hooks/useLogisticsEngine';
import { useCategories } from '@/hooks/useCategories';
import { useRoutePricing } from '@/hooks/useRoutePricing';
import { RouteSegmentTimeline } from '@/components/admin/pricing/RouteSegmentTimeline';
import { cn } from '@/lib/utils';

// ============ SEGMENT LABELS ============
const SEGMENT_LABELS: Record<string, string> = {
  china_to_transit: 'Tramo A (Origen → Hub)',
  transit_to_destination: 'Tramo B (Hub → Destino)',
  china_to_destination: 'Ruta Directa',
};

export default function AdminGlobalLogisticsPage() {
  const [activeTab, setActiveTab] = useState('routes');

  // ========== HOOKS ==========
  const {
    transitHubs,
    countries,
    routes,
    logisticsCosts,
    isLoading: loadingRoutes,
    createHub,
    updateHub,
    createCountry,
    updateCountry,
    createRoute,
    updateRoute,
    createCost,
    updateCost,
  } = useCountriesRoutes();

  const {
    origins,
    isLoading: loadingOrigins,
    createOrigin,
    updateOrigin,
    deleteOrigin,
  } = useShippingOrigins();

  const { markets, isLoading: loadingMarkets, updateMarket } = useMarkets();
  
  const {
    useCategoryShippingRates,
    createCategoryShippingRate,
    updateCategoryShippingRate,
  } = useLogisticsEngine();
  
  const { data: categoryRates, isLoading: loadingCategoryRates } = useCategoryShippingRates();
  const { data: categories } = useCategories();
  const { routes: formattedRoutes, calculateRouteCost } = useRoutePricing();

  // ========== DIALOG STATES ==========
  const [showHubDialog, setShowHubDialog] = useState(false);
  const [showCountryDialog, setShowCountryDialog] = useState(false);
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showOriginDialog, setShowOriginDialog] = useState(false);
  const [showCategoryRateDialog, setShowCategoryRateDialog] = useState(false);

  // ========== EDITING STATES ==========
  const [editingHub, setEditingHub] = useState<TransitHub | null>(null);
  const [editingCountry, setEditingCountry] = useState<DestinationCountry | null>(null);
  const [editingRoute, setEditingRoute] = useState<ShippingRoute | null>(null);
  const [editingCost, setEditingCost] = useState<RouteLogisticsCost | null>(null);
  const [editingOrigin, setEditingOrigin] = useState<ShippingOrigin | null>(null);
  const [editingCategoryRate, setEditingCategoryRate] = useState<CategoryShippingRate | null>(null);

  // ========== FORM STATES ==========
  const [hubForm, setHubForm] = useState({ name: '', code: '', description: '', is_active: true });
  const [countryForm, setCountryForm] = useState({ name: '', code: '', currency: 'USD', is_active: true });
  const [routeForm, setRouteForm] = useState({ destination_country_id: '', transit_hub_id: '', is_direct: false, is_active: true });
  const [originForm, setOriginForm] = useState({ name: '', code: '', description: '', is_active: true });
  const [costForm, setCostForm] = useState({
    shipping_route_id: '',
    segment: 'china_to_transit',
    cost_per_kg: 0,
    cost_per_cbm: 0,
    min_cost: 0,
    estimated_days_min: 7,
    estimated_days_max: 21,
    notes: '',
    is_active: true,
  });
  const [categoryRateForm, setCategoryRateForm] = useState({
    category_id: '',
    fixed_fee: 0,
    percentage_fee: 0,
    description: '',
  });

  // ========== CALCULATOR STATE ==========
  const [calcOrigin, setCalcOrigin] = useState('');
  const [calcDestination, setCalcDestination] = useState('');
  const [calcWeight, setCalcWeight] = useState('1');
  const [calcCategory, setCalcCategory] = useState('');

  // ========== HELPER FUNCTIONS ==========
  const getRouteCosts = (routeId: string) => logisticsCosts?.filter(c => c.shipping_route_id === routeId) || [];

  const getRouteForDestination = (countryId: string) => {
    return routes?.find(r => r.destination_country_id === countryId && r.is_active);
  };

  // ========== HANDLERS ==========
  
  // Hub handlers
  const openHubDialog = (hub?: TransitHub) => {
    if (hub) {
      setEditingHub(hub);
      setHubForm({ name: hub.name, code: hub.code, description: hub.description || '', is_active: hub.is_active });
    } else {
      setEditingHub(null);
      setHubForm({ name: '', code: '', description: '', is_active: true });
    }
    setShowHubDialog(true);
  };

  const handleHubSubmit = () => {
    const data = { ...hubForm, description: hubForm.description || null };
    if (editingHub) {
      updateHub.mutate({ id: editingHub.id, ...data }, { onSuccess: () => setShowHubDialog(false) });
    } else {
      createHub.mutate(data, { onSuccess: () => setShowHubDialog(false) });
    }
  };

  // Country handlers
  const openCountryDialog = (country?: DestinationCountry) => {
    if (country) {
      setEditingCountry(country);
      setCountryForm({ name: country.name, code: country.code, currency: country.currency, is_active: country.is_active });
    } else {
      setEditingCountry(null);
      setCountryForm({ name: '', code: '', currency: 'USD', is_active: true });
    }
    setShowCountryDialog(true);
  };

  const handleCountrySubmit = () => {
    if (editingCountry) {
      updateCountry.mutate({ id: editingCountry.id, ...countryForm }, { onSuccess: () => setShowCountryDialog(false) });
    } else {
      createCountry.mutate(countryForm, { onSuccess: () => setShowCountryDialog(false) });
    }
  };

  // Origin handlers
  const openOriginDialog = (origin?: ShippingOrigin) => {
    if (origin) {
      setEditingOrigin(origin);
      setOriginForm({ name: origin.name, code: origin.code, description: origin.description || '', is_active: origin.is_active });
    } else {
      setEditingOrigin(null);
      setOriginForm({ name: '', code: '', description: '', is_active: true });
    }
    setShowOriginDialog(true);
  };

  const handleOriginSubmit = () => {
    const data = { ...originForm, description: originForm.description || null };
    if (editingOrigin) {
      updateOrigin.mutate({ id: editingOrigin.id, ...data }, { onSuccess: () => setShowOriginDialog(false) });
    } else {
      createOrigin.mutate(data, { onSuccess: () => setShowOriginDialog(false) });
    }
  };

  // Route handlers
  const openRouteDialog = (route?: ShippingRoute) => {
    if (route) {
      setEditingRoute(route);
      setRouteForm({
        destination_country_id: route.destination_country_id,
        transit_hub_id: route.transit_hub_id || '',
        is_direct: route.is_direct,
        is_active: route.is_active,
      });
    } else {
      setEditingRoute(null);
      setRouteForm({ destination_country_id: '', transit_hub_id: '', is_direct: false, is_active: true });
    }
    setShowRouteDialog(true);
  };

  const handleRouteSubmit = () => {
    const routeData = {
      destination_country_id: routeForm.destination_country_id,
      transit_hub_id: routeForm.is_direct ? null : routeForm.transit_hub_id || null,
      is_direct: routeForm.is_direct,
      is_active: routeForm.is_active,
    };
    if (editingRoute) {
      updateRoute.mutate({ id: editingRoute.id, ...routeData }, { onSuccess: () => setShowRouteDialog(false) });
    } else {
      createRoute.mutate(routeData, { onSuccess: () => setShowRouteDialog(false) });
    }
  };

  // Cost handlers
  const openCostDialog = (cost?: RouteLogisticsCost, routeId?: string) => {
    if (cost) {
      setEditingCost(cost);
      setCostForm({
        shipping_route_id: cost.shipping_route_id,
        segment: cost.segment,
        cost_per_kg: cost.cost_per_kg,
        cost_per_cbm: cost.cost_per_cbm,
        min_cost: cost.min_cost,
        estimated_days_min: cost.estimated_days_min,
        estimated_days_max: cost.estimated_days_max,
        notes: cost.notes || '',
        is_active: cost.is_active,
      });
    } else {
      setEditingCost(null);
      setCostForm({
        shipping_route_id: routeId || '',
        segment: 'china_to_transit',
        cost_per_kg: 0,
        cost_per_cbm: 0,
        min_cost: 0,
        estimated_days_min: 7,
        estimated_days_max: 21,
        notes: '',
        is_active: true,
      });
    }
    setShowCostDialog(true);
  };

  const handleCostSubmit = () => {
    const costData = { ...costForm, notes: costForm.notes || null };
    if (editingCost) {
      updateCost.mutate({ id: editingCost.id, ...costData }, { onSuccess: () => setShowCostDialog(false) });
    } else {
      createCost.mutate(costData, { onSuccess: () => setShowCostDialog(false) });
    }
  };

  // Category rate handlers
  const openCategoryRateDialog = (rate?: CategoryShippingRate) => {
    if (rate) {
      setEditingCategoryRate(rate);
      setCategoryRateForm({
        category_id: rate.category_id,
        fixed_fee: rate.fixed_fee,
        percentage_fee: rate.percentage_fee,
        description: rate.description || '',
      });
    } else {
      setEditingCategoryRate(null);
      setCategoryRateForm({ category_id: '', fixed_fee: 0, percentage_fee: 0, description: '' });
    }
    setShowCategoryRateDialog(true);
  };

  const handleCategoryRateSubmit = () => {
    if (editingCategoryRate) {
      updateCategoryShippingRate.mutate({ id: editingCategoryRate.id, ...categoryRateForm, is_active: true });
    } else {
      createCategoryShippingRate.mutate({ ...categoryRateForm, is_active: true });
    }
    setShowCategoryRateDialog(false);
  };

  // ========== CALCULATOR LOGIC ==========
  const calculatorResult = useMemo(() => {
    if (!calcDestination) return null;
    
    const route = formattedRoutes.find(r => {
      const matchingRoute = routes?.find(sr => sr.id === r.id);
      return matchingRoute?.destination_country?.code === calcDestination;
    });
    
    if (!route) return null;

    const weight = parseFloat(calcWeight) || 1;
    const routeCalc = calculateRouteCost(route.id, weight);

    // Add category fees if selected
    let categoryFee = 0;
    const categoryRate = categoryRates?.find((cr: any) => cr.category_id === calcCategory);
    if (categoryRate) {
      categoryFee = (categoryRate.fixed_fee || 0) + ((routeCalc.cost * (categoryRate.percentage_fee || 0)) / 100);
    }

    return {
      route,
      routeCost: routeCalc.cost,
      daysMin: routeCalc.days.min,
      daysMax: routeCalc.days.max,
      categoryFee,
      totalCost: routeCalc.cost + categoryFee,
    };
  }, [calcDestination, calcWeight, calcCategory, formattedRoutes, routes, calculateRouteCost, categoryRates]);

  // ========== LOADING STATE ==========
  if (loadingRoutes || loadingOrigins || loadingMarkets) {
    return (
      <AdminLayout title="Logística Global" subtitle="Cargando configuración...">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      title="Logística Global" 
      subtitle="Gestión centralizada de rutas, hubs, mercados y costos de envío"
    >
      <TooltipProvider>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="routes" className="gap-2">
              <Plane className="h-4 w-4" />
              <span className="hidden sm:inline">Rutas y Tramos</span>
            </TabsTrigger>
            <TabsTrigger value="hubs" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Hubs</span>
            </TabsTrigger>
            <TabsTrigger value="markets" className="gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Mercados</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Tarifas Categoría</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Calculadora</span>
            </TabsTrigger>
          </TabsList>

          {/* ========== ROUTES TAB ========== */}
          <TabsContent value="routes">
            <div className="space-y-6">
              {/* Origins and Destinations Summary */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Origins Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Países de Origen
                      </CardTitle>
                      <CardDescription>Fuentes de abastecimiento</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openOriginDialog()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {origins?.filter(o => o.is_active).map(origin => (
                        <Badge 
                          key={origin.id} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-primary/20"
                          onClick={() => openOriginDialog(origin)}
                        >
                          {origin.code} - {origin.name}
                        </Badge>
                      ))}
                      {!origins?.length && (
                        <span className="text-sm text-muted-foreground">Sin orígenes configurados</span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Destinations Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Países Destino
                      </CardTitle>
                      <CardDescription>Mercados habilitados</CardDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => openCountryDialog()}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {countries?.filter(c => c.is_active).map(country => (
                        <Badge 
                          key={country.id} 
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary/20"
                          onClick={() => openCountryDialog(country)}
                        >
                          {country.code} - {country.name} ({country.currency})
                        </Badge>
                      ))}
                      {!countries?.length && (
                        <span className="text-sm text-muted-foreground">Sin destinos configurados</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Routes List */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Rutas de Envío y Tramos
                    </CardTitle>
                    <CardDescription>
                      Configura los tramos logísticos con sus costos y tiempos de tránsito
                    </CardDescription>
                  </div>
                  <Button onClick={() => openRouteDialog()} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva Ruta
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {routes?.map(route => {
                      const routeCosts = getRouteCosts(route.id);
                      const countryName = route.destination_country?.name || 'Desconocido';
                      const hubName = route.transit_hub?.name;
                      
                      return (
                        <Card key={route.id} className={cn(
                          "border-l-4",
                          route.is_active ? "border-l-primary" : "border-l-muted"
                        )}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CardTitle className="text-base">
                                  {route.is_direct ? (
                                    <span className="flex items-center gap-2">
                                      China <ArrowRight className="h-4 w-4" /> {countryName}
                                      <Badge variant="secondary">Directo</Badge>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2">
                                      China <ArrowRight className="h-4 w-4" /> {hubName} <ArrowRight className="h-4 w-4" /> {countryName}
                                    </span>
                                  )}
                                </CardTitle>
                                <Badge variant={route.is_active ? "default" : "secondary"}>
                                  {route.is_active ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openCostDialog(undefined, route.id)}>
                                  <Plus className="h-4 w-4 mr-1" />
                                  Tramo
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => openRouteDialog(route)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {routeCosts.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Tramo</TableHead>
                                    <TableHead className="text-right">$/kg</TableHead>
                                    <TableHead className="text-right">Costo Mín.</TableHead>
                                    <TableHead className="text-right">Días Est.</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {routeCosts.map(cost => (
                                    <TableRow key={cost.id}>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <Plane className="h-4 w-4 text-muted-foreground" />
                                          {SEGMENT_LABELS[cost.segment] || cost.segment}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right font-mono">${cost.cost_per_kg.toFixed(2)}</TableCell>
                                      <TableCell className="text-right font-mono">${cost.min_cost.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">
                                        <span className="flex items-center justify-end gap-1">
                                          <Clock className="h-3 w-3" />
                                          {cost.estimated_days_min}-{cost.estimated_days_max} días
                                        </span>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant={cost.is_active ? "default" : "secondary"}>
                                          {cost.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openCostDialog(cost)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <div className="text-center py-4 text-muted-foreground">
                                <Plane className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                Sin tramos configurados. Agrega al menos un tramo para activar esta ruta.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                    {!routes?.length && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay rutas configuradas. Crea una ruta para comenzar.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ========== HUBS TAB ========== */}
          <TabsContent value="hubs">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Hubs de Tránsito
                  </CardTitle>
                  <CardDescription>
                    Puntos de consolidación intermedios (ej: Panamá, Miami)
                  </CardDescription>
                </div>
                <Button onClick={() => openHubDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Hub
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Rutas Asignadas</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transitHubs?.map(hub => {
                      const assignedRoutes = routes?.filter(r => r.transit_hub_id === hub.id).length || 0;
                      return (
                        <TableRow key={hub.id}>
                          <TableCell className="font-mono font-bold">{hub.code}</TableCell>
                          <TableCell className="font-medium">{hub.name}</TableCell>
                          <TableCell className="text-muted-foreground">{hub.description || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{assignedRoutes} rutas</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={hub.is_active ? "default" : "secondary"}>
                              {hub.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openHubDialog(hub)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!transitHubs?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay hubs configurados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== MARKETS TAB ========== */}
          <TabsContent value="markets">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Configurador de Mercados
                </CardTitle>
                <CardDescription>
                  Vinculación entre países destino y rutas logísticas. Los cambios en rutas se reflejan automáticamente aquí.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mercado</TableHead>
                      <TableHead>País Destino</TableHead>
                      <TableHead>Ruta Asignada</TableHead>
                      <TableHead>ETA Total</TableHead>
                      <TableHead>Costo/kg</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markets?.map(market => {
                      const route = formattedRoutes.find(r => r.id === market.shipping_route_id);
                      const routeSummary = route ? {
                        daysRange: route.segments.reduce((acc, s) => ({
                          min: acc.min + s.estimatedDaysMin,
                          max: acc.max + s.estimatedDaysMax,
                        }), { min: 0, max: 0 }),
                        costPerKg: route.segments.reduce((sum, s) => sum + s.costPerKg, 0),
                      } : null;

                      return (
                        <TableRow key={market.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">{market.code}</Badge>
                              <span className="font-medium">{market.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{market.destination_country_name || '-'}</TableCell>
                          <TableCell>
                            {route ? (
                              <Badge variant="secondary" className="gap-1">
                                <Route className="h-3 w-3" />
                                {route.isDirect ? 'Directo' : `Vía ${route.hubName}`}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Sin ruta
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {routeSummary ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Clock className="h-3 w-3" />
                                {routeSummary.daysRange.min}-{routeSummary.daysRange.max} días
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {routeSummary ? (
                              <span className="font-mono">${routeSummary.costPerKg.toFixed(2)}</span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={market.is_active ? "default" : "secondary"}>
                              {market.is_active ? 'Activo' : 'Inactivo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {!markets?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay mercados configurados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Sincronización Automática</AlertTitle>
                  <AlertDescription>
                    Los costos y tiempos mostrados se actualizan automáticamente cuando modificas los tramos en la sección de Rutas.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== CATEGORY RATES TAB ========== */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Tarifas por Categoría
                  </CardTitle>
                  <CardDescription>
                    Recargos logísticos adicionales según el tipo de producto
                  </CardDescription>
                </div>
                <Button onClick={() => openCategoryRateDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Tarifa
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Cargo Fijo ($)</TableHead>
                      <TableHead className="text-right">Cargo % (sobre costo)</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryRates?.map((rate: any) => (
                      <TableRow key={rate.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{rate.categories?.name || 'Desconocida'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">${rate.fixed_fee.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono">{rate.percentage_fee}%</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {rate.description || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rate.is_active ? "default" : "secondary"}>
                            {rate.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openCategoryRateDialog(rate)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!categoryRates?.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No hay tarifas por categoría configuradas
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                
                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Impacto en Precios B2B</AlertTitle>
                  <AlertDescription>
                    Estas tarifas se suman al costo logístico base y afectan directamente el precio B2B final en la calculadora de precios.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== CALCULATOR TAB ========== */}
          <TabsContent value="calculator">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Calculator Input */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Calculadora de Costos Aterrizados
                  </CardTitle>
                  <CardDescription>
                    Simula el costo total de envío antes de aplicar a productos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>País de Origen</Label>
                      <Select value={calcOrigin} onValueChange={setCalcOrigin}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona origen" />
                        </SelectTrigger>
                        <SelectContent>
                          {origins?.filter(o => o.is_active).map(origin => (
                            <SelectItem key={origin.id} value={origin.code}>
                              {origin.name} ({origin.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>País de Destino</Label>
                      <Select value={calcDestination} onValueChange={setCalcDestination}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries?.filter(c => c.is_active).map(country => (
                            <SelectItem key={country.id} value={country.code}>
                              {country.name} ({country.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Peso (kg)</Label>
                      <Input
                        type="number"
                        value={calcWeight}
                        onChange={e => setCalcWeight(e.target.value)}
                        min="0.1"
                        step="0.1"
                        placeholder="1.0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Categoría (opcional)</Label>
                      <Select value={calcCategory} onValueChange={setCalcCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sin categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin categoría</SelectItem>
                          {categories?.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Calculator Result */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Resultado del Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calculatorResult ? (
                    <div className="space-y-4">
                      {/* Route visualization */}
                      <RouteSegmentTimeline 
                        route={calculatorResult.route}
                        weightKg={parseFloat(calcWeight) || 1}
                        showCosts={true}
                      />
                      
                      <Separator />
                      
                      {/* Cost breakdown */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Costo Logístico Base</span>
                          <span className="font-mono">${calculatorResult.routeCost.toFixed(2)}</span>
                        </div>
                        {calculatorResult.categoryFee > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">+ Tarifa Categoría</span>
                            <span className="font-mono text-amber-600">+${calculatorResult.categoryFee.toFixed(2)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                          <span>Costo Total Logístico</span>
                          <span className="font-mono text-primary">${calculatorResult.totalCost.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      {/* Time estimate */}
                      <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Tiempo de Entrega Estimado</span>
                        </div>
                        <Badge variant="outline" className="text-base">
                          {calculatorResult.daysMin}-{calculatorResult.daysMax} días
                        </Badge>
                      </div>

                      {/* Route indicator */}
                      <div className="flex items-center justify-between bg-primary/5 rounded-lg p-3">
                        <span className="text-sm">Ruta Activa</span>
                        <Badge>
                          {calculatorResult.route.isDirect 
                            ? `China → ${calculatorResult.route.countryName} (Directo)`
                            : `China → ${calculatorResult.route.hubName} → ${calculatorResult.route.countryName}`
                          }
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Selecciona origen y destino para ver el cálculo</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ========== DIALOGS ========== */}
        
        {/* Origin Dialog */}
        <Dialog open={showOriginDialog} onOpenChange={setShowOriginDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingOrigin ? 'Editar' : 'Nuevo'} País de Origen</DialogTitle>
              <DialogDescription>Países de donde se adquieren los productos</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Código (2-3 letras)</Label>
                <Input
                  value={originForm.code}
                  onChange={e => setOriginForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  maxLength={3}
                  placeholder="CN"
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input
                  value={originForm.name}
                  onChange={e => setOriginForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="China"
                />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={originForm.description}
                  onChange={e => setOriginForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={originForm.is_active}
                  onCheckedChange={checked => setOriginForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowOriginDialog(false)}>Cancelar</Button>
              <Button onClick={handleOriginSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Country Dialog */}
        <Dialog open={showCountryDialog} onOpenChange={setShowCountryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCountry ? 'Editar' : 'Nuevo'} País Destino</DialogTitle>
              <DialogDescription>Países habilitados para envío</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Código (2 letras)</Label>
                <Input
                  value={countryForm.code}
                  onChange={e => setCountryForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  maxLength={2}
                  placeholder="HT"
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input
                  value={countryForm.name}
                  onChange={e => setCountryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Haití"
                />
              </div>
              <div className="grid gap-2">
                <Label>Moneda</Label>
                <Select value={countryForm.currency} onValueChange={v => setCountryForm(prev => ({ ...prev, currency: v }))}>
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
              <div className="flex items-center gap-2">
                <Switch
                  checked={countryForm.is_active}
                  onCheckedChange={checked => setCountryForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCountryDialog(false)}>Cancelar</Button>
              <Button onClick={handleCountrySubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hub Dialog */}
        <Dialog open={showHubDialog} onOpenChange={setShowHubDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHub ? 'Editar' : 'Nuevo'} Hub de Tránsito</DialogTitle>
              <DialogDescription>Punto de consolidación intermedio</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Código (2-3 letras)</Label>
                <Input
                  value={hubForm.code}
                  onChange={e => setHubForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  maxLength={3}
                  placeholder="PA"
                />
              </div>
              <div className="grid gap-2">
                <Label>Nombre</Label>
                <Input
                  value={hubForm.name}
                  onChange={e => setHubForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Panamá"
                />
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={hubForm.description}
                  onChange={e => setHubForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción del hub"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={hubForm.is_active}
                  onCheckedChange={checked => setHubForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowHubDialog(false)}>Cancelar</Button>
              <Button onClick={handleHubSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Route Dialog */}
        <Dialog open={showRouteDialog} onOpenChange={setShowRouteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Editar' : 'Nueva'} Ruta de Envío</DialogTitle>
              <DialogDescription>Define el camino logístico hacia un destino</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>País Destino</Label>
                <Select 
                  value={routeForm.destination_country_id} 
                  onValueChange={v => setRouteForm(prev => ({ ...prev, destination_country_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona país" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries?.map(country => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name} ({country.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={routeForm.is_direct}
                  onCheckedChange={checked => setRouteForm(prev => ({ ...prev, is_direct: checked }))}
                />
                <Label>Ruta Directa (sin hub intermedio)</Label>
              </div>
              {!routeForm.is_direct && (
                <div className="grid gap-2">
                  <Label>Hub de Tránsito</Label>
                  <Select 
                    value={routeForm.transit_hub_id} 
                    onValueChange={v => setRouteForm(prev => ({ ...prev, transit_hub_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona hub" />
                    </SelectTrigger>
                    <SelectContent>
                      {transitHubs?.filter(h => h.is_active).map(hub => (
                        <SelectItem key={hub.id} value={hub.id}>
                          {hub.name} ({hub.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={routeForm.is_active}
                  onCheckedChange={checked => setRouteForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRouteDialog(false)}>Cancelar</Button>
              <Button onClick={handleRouteSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cost Dialog */}
        <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCost ? 'Editar' : 'Nuevo'} Tramo Logístico</DialogTitle>
              <DialogDescription>Configura costos y tiempos para este segmento</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Tipo de Tramo</Label>
                <Select 
                  value={costForm.segment} 
                  onValueChange={v => setCostForm(prev => ({ ...prev, segment: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="china_to_transit">Tramo A: Origen → Hub</SelectItem>
                    <SelectItem value="transit_to_destination">Tramo B: Hub → Destino</SelectItem>
                    <SelectItem value="china_to_destination">Directo: Origen → Destino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Costo por kg ($)</Label>
                  <Input
                    type="number"
                    value={costForm.cost_per_kg}
                    onChange={e => setCostForm(prev => ({ ...prev, cost_per_kg: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Costo Mínimo ($)</Label>
                  <Input
                    type="number"
                    value={costForm.min_cost}
                    onChange={e => setCostForm(prev => ({ ...prev, min_cost: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Días Mínimo</Label>
                  <Input
                    type="number"
                    value={costForm.estimated_days_min}
                    onChange={e => setCostForm(prev => ({ ...prev, estimated_days_min: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Días Máximo</Label>
                  <Input
                    type="number"
                    value={costForm.estimated_days_max}
                    onChange={e => setCostForm(prev => ({ ...prev, estimated_days_max: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={costForm.notes}
                  onChange={e => setCostForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Incluye flete internacional y seguro..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={costForm.is_active}
                  onCheckedChange={checked => setCostForm(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCostDialog(false)}>Cancelar</Button>
              <Button onClick={handleCostSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Category Rate Dialog */}
        <Dialog open={showCategoryRateDialog} onOpenChange={setShowCategoryRateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCategoryRate ? 'Editar' : 'Nueva'} Tarifa por Categoría</DialogTitle>
              <DialogDescription>Recargo logístico adicional por tipo de producto</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Categoría</Label>
                <Select 
                  value={categoryRateForm.category_id} 
                  onValueChange={v => setCategoryRateForm(prev => ({ ...prev, category_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Cargo Fijo ($)</Label>
                  <Input
                    type="number"
                    value={categoryRateForm.fixed_fee}
                    onChange={e => setCategoryRateForm(prev => ({ ...prev, fixed_fee: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cargo % (sobre costo)</Label>
                  <Input
                    type="number"
                    value={categoryRateForm.percentage_fee}
                    onChange={e => setCategoryRateForm(prev => ({ ...prev, percentage_fee: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.1"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={categoryRateForm.description}
                  onChange={e => setCategoryRateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Ej: Productos frágiles requieren embalaje especial"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCategoryRateDialog(false)}>Cancelar</Button>
              <Button onClick={handleCategoryRateSubmit}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    </AdminLayout>
  );
}

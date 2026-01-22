import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Calculator, 
  Factory, 
  Truck, 
  Building2, 
  TrendingUp, 
  Info,
  DollarSign,
  Percent,
  Package,
  Tag,
  Layers
} from 'lucide-react';
import { RouteSegmentTimeline, RouteInfo } from './RouteSegmentTimeline';
import { DynamicExpense } from '@/hooks/usePriceEngine';
import { B2BMarginRange } from '@/hooks/useB2BMarginRanges';
import { cn } from '@/lib/utils';

export interface CategoryRate {
  id: string;
  categoryId: string;
  categoryName: string;
  fixedFee: number;
  percentageFee: number;
  description?: string | null;
  isActive: boolean;
}

interface B2BPriceCalculatorProps {
  routes: RouteInfo[];
  expenses: DynamicExpense[];
  categoryRates: CategoryRate[];
  categories: { id: string; name: string }[];
  profitMargin: number;
  platformFee?: number;
  marginRanges?: B2BMarginRange[];
  onCalculationChange?: (calculation: PriceBreakdown) => void;
}

export interface PriceBreakdown {
  factoryCost: number;
  weightKg: number;
  routeId: string | null;
  categoryId: string | null;
  // NEW: Margin is applied to factory cost BEFORE logistics
  appliedMarginRange: B2BMarginRange | null;
  marginPercent: number;
  marginValue: number;
  subtotalWithMargin: number; // Factory cost + margin (PROTECTED)
  // Logistics added AFTER margin
  logisticsCost: number;
  logisticsSegments: { name: string; cost: number }[];
  categoryFixedFee: number;
  categoryPercentageFee: number;
  categoryTotalFee: number;
  expensesCost: number;
  expensesDetails: { name: string; cost: number }[];
  platformFee: number;
  subtotal: number;
  b2bPrice: number;
  suggestedPVP: number;
  pvpMarginPercent: number;
  profitAmount: number;
}

// Margin ranges for PVP suggestion (when seller sets their price)
const SELLER_MARGIN_RANGES = [
  { min: 0, max: 20, margin: 50 },
  { min: 20, max: 50, margin: 45 },
  { min: 50, max: 100, margin: 40 },
  { min: 100, max: 200, margin: 35 },
  { min: 200, max: Infinity, margin: 30 },
];

function getSuggestedSellerMargin(b2bPrice: number): number {
  const range = SELLER_MARGIN_RANGES.find(r => b2bPrice >= r.min && b2bPrice < r.max);
  return range?.margin ?? 35;
}

/**
 * Finds the applicable B2B margin range for a given factory cost.
 * Returns the margin percentage to apply BEFORE logistics.
 */
function findMarginRangeForCost(
  baseCost: number, 
  ranges: B2BMarginRange[]
): B2BMarginRange | null {
  if (!ranges || ranges.length === 0) return null;
  
  return ranges.find(range => {
    const minOk = baseCost >= range.min_cost;
    const maxOk = range.max_cost === null || baseCost < range.max_cost;
    return minOk && maxOk && range.is_active;
  }) || null;
}

export function B2BPriceCalculator({
  routes,
  expenses,
  categoryRates,
  categories,
  profitMargin,
  platformFee = 0,
  marginRanges = [],
  onCalculationChange,
}: B2BPriceCalculatorProps) {
  const [factoryCost, setFactoryCost] = useState<string>('100');
  const [weightKg, setWeightKg] = useState<string>('1');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const selectedRoute = useMemo(() => 
    routes.find(r => r.id === selectedRouteId), 
    [routes, selectedRouteId]
  );

  const selectedCategoryRate = useMemo(() => 
    categoryRates.find(r => r.categoryId === selectedCategoryId && r.isActive),
    [categoryRates, selectedCategoryId]
  );

  const calculation = useMemo((): PriceBreakdown => {
    const cost = parseFloat(factoryCost) || 0;
    const weight = parseFloat(weightKg) || 1;

    // STEP 1: Find the applicable margin range based on factory cost
    // The margin is determined by the base cost BEFORE any logistics
    const appliedMarginRange = findMarginRangeForCost(cost, marginRanges);
    const marginPercent = appliedMarginRange?.margin_percent ?? profitMargin;
    
    // STEP 2: Apply margin to factory cost (PROTECTED - before logistics)
    const marginValue = (cost * marginPercent) / 100;
    const subtotalWithMargin = cost + marginValue;

    // STEP 3: Calculate logistics cost from route segments (added AFTER margin)
    let logisticsCost = 0;
    const logisticsSegments: { name: string; cost: number }[] = [];
    
    if (selectedRoute) {
      selectedRoute.segments.filter(s => s.isActive).forEach(segment => {
        const segmentCost = Math.max(segment.costPerKg * weight, segment.minCost);
        logisticsCost += segmentCost;
        
        const segmentLabel = segment.segment === 'china_to_transit' 
          ? 'Tramo A (Origen → Hub)' 
          : segment.segment === 'transit_to_destination'
          ? 'Tramo B (Hub → Destino)'
          : 'Ruta Directa';
        
        logisticsSegments.push({ name: segmentLabel, cost: segmentCost });
      });
    }

    // STEP 4: Calculate category fees (applied to factory cost)
    let categoryFixedFee = 0;
    let categoryPercentageFee = 0;
    
    if (selectedCategoryRate) {
      categoryFixedFee = selectedCategoryRate.fixedFee || 0;
      categoryPercentageFee = (cost * (selectedCategoryRate.percentageFee || 0)) / 100;
    }
    const categoryTotalFee = categoryFixedFee + categoryPercentageFee;

    // STEP 5: Calculate running total for expense calculations
    let runningTotal = subtotalWithMargin + logisticsCost + categoryTotalFee;

    // STEP 6: Apply additional expenses
    let expensesCost = 0;
    const expensesDetails: { name: string; cost: number }[] = [];

    const activeExpenses = expenses.filter(e => e.is_active);
    for (const expense of activeExpenses) {
      let expenseValue: number;
      
      if (expense.tipo === 'fijo') {
        expenseValue = expense.valor;
      } else {
        expenseValue = (runningTotal * expense.valor) / 100;
      }

      if (expense.operacion === 'resta') {
        expenseValue = -expenseValue;
      }

      runningTotal += expenseValue;
      expensesCost += expenseValue;
      expensesDetails.push({ name: expense.nombre_gasto, cost: expenseValue });
    }

    // STEP 7: Apply platform fee
    const feeValue = (runningTotal * platformFee) / 100;
    
    // STEP 8: Calculate final B2B price
    const subtotal = runningTotal + feeValue;
    const b2bPrice = subtotal;

    // STEP 9: Calculate suggested PVP for sellers (separate from B2B calculation)
    const pvpMarginPercent = getSuggestedSellerMargin(b2bPrice);
    const suggestedPVP = b2bPrice * (1 + pvpMarginPercent / 100);
    const profitAmount = suggestedPVP - b2bPrice;

    const result: PriceBreakdown = {
      factoryCost: cost,
      weightKg: weight,
      routeId: selectedRouteId || null,
      categoryId: selectedCategoryId || null,
      appliedMarginRange,
      marginPercent,
      marginValue: Math.round(marginValue * 100) / 100,
      subtotalWithMargin: Math.round(subtotalWithMargin * 100) / 100,
      logisticsCost,
      logisticsSegments,
      categoryFixedFee,
      categoryPercentageFee,
      categoryTotalFee,
      expensesCost,
      expensesDetails,
      platformFee: feeValue,
      subtotal,
      b2bPrice: Math.round(b2bPrice * 100) / 100,
      suggestedPVP: Math.round(suggestedPVP * 100) / 100,
      pvpMarginPercent,
      profitAmount: Math.round(profitAmount * 100) / 100,
    };

    onCalculationChange?.(result);
    return result;
  }, [factoryCost, weightKg, selectedRoute, selectedCategoryRate, expenses, profitMargin, platformFee, selectedRouteId, selectedCategoryId, marginRanges, onCalculationChange]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Input parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calculadora de Precio B2B
            </CardTitle>
            <CardDescription>
              Ingresa los parámetros para calcular el precio final con desglose completo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Factory className="h-4 w-4" />
                  Costo de Fábrica (USD)
                </Label>
                <Input
                  type="number"
                  value={factoryCost}
                  onChange={(e) => setFactoryCost(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="100.00"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  Peso (kg)
                </Label>
                <Input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  min="0.1"
                  step="0.1"
                  placeholder="1.0"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  Categoría
                </Label>
                <Select value={selectedCategoryId} onValueChange={(val) => setSelectedCategoryId(val === 'none' ? '' : val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories.map((cat) => {
                      const hasRate = categoryRates.some(r => r.categoryId === cat.id && r.isActive);
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} {hasRate && <span className="text-xs text-muted-foreground">(+tarifa)</span>}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Truck className="h-4 w-4" />
                  Ruta de Envío
                </Label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.filter(r => r.isActive).map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.isDirect 
                          ? `China → ${route.countryName} (Directo)` 
                          : `China → ${route.hubName} → ${route.countryName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route timeline */}
        {selectedRoute && (
          <RouteSegmentTimeline 
            route={selectedRoute} 
            weightKg={parseFloat(weightKg) || 1}
            showCosts={true}
          />
        )}

        {/* Price breakdown */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Desglose de Precio B2B
            </CardTitle>
            <CardDescription>
              Fórmula Protegida: (Costo × (1 + Margen%)) + Logística + Categoría + Gastos + Fee
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Factory cost */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Factory className="h-4 w-4 text-muted-foreground" />
                  <span>Costo de Fábrica (Origen)</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Precio FOB del producto en origen</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-mono text-lg">${calculation.factoryCost.toFixed(2)}</span>
              </div>

              {/* PROTECTED: Margin applied BEFORE logistics */}
              <div className="flex items-center justify-between py-2 bg-green-50 dark:bg-green-950/20 px-3 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Margen de Beneficio</span>
                  {calculation.appliedMarginRange && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Rango: ${calculation.appliedMarginRange.min_cost}-{calculation.appliedMarginRange.max_cost || '∞'} → {calculation.marginPercent}%
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p><strong>Regla de Protección:</strong> El margen se aplica sobre el costo base ANTES de sumar la logística, garantizando que el beneficio nunca se reduzca por costos de envío.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-mono font-medium text-green-600">+${calculation.marginValue.toFixed(2)}</span>
              </div>

              {/* Subtotal with margin (PROTECTED) */}
              <div className="flex items-center justify-between py-2 bg-muted/30 px-3 rounded-lg">
                <span className="font-medium">Subtotal Protegido (Base + Margen)</span>
                <span className="font-mono font-medium text-lg">${calculation.subtotalWithMargin.toFixed(2)}</span>
              </div>

              <Separator />

              {/* Logistics breakdown - ADDED AFTER MARGIN */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Desglose Logístico (sumado después del margen)
                  {selectedRoute && (
                    <Badge variant="outline" className="ml-2">
                      {selectedRoute.isDirect ? 'Directa' : `Vía ${selectedRoute.hubName}`}
                    </Badge>
                  )}
                </div>
                {calculation.logisticsSegments.length > 0 ? (
                  calculation.logisticsSegments.map((seg, i) => (
                    <div key={i} className="flex items-center justify-between pl-6 text-sm">
                      <span className="text-muted-foreground">{seg.name}</span>
                      <span className="font-mono">+${seg.cost.toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="pl-6 text-sm text-muted-foreground italic">
                    Selecciona una ruta para ver el desglose
                  </div>
                )}
                <div className="flex items-center justify-between pl-6 pt-1 border-t border-dashed">
                  <span className="font-medium">Subtotal Logística</span>
                  <span className="font-mono font-medium">+${calculation.logisticsCost.toFixed(2)}</span>
                </div>
              </div>

              <Separator />

              {/* Category fees */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Layers className="h-4 w-4" />
                  Tarifa por Categoría
                  {selectedCategoryRate && (
                    <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-700 border-amber-200">
                      {selectedCategoryRate.categoryName}
                    </Badge>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Cargos adicionales según el tipo de producto. Incluye cargo fijo más porcentaje sobre el costo de adquisición.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                {selectedCategoryRate ? (
                  <>
                    {selectedCategoryRate.fixedFee > 0 && (
                      <div className="flex items-center justify-between pl-6 text-sm">
                        <span className="text-muted-foreground">Cargo Fijo</span>
                        <span className="font-mono">+${calculation.categoryFixedFee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedCategoryRate.percentageFee > 0 && (
                      <div className="flex items-center justify-between pl-6 text-sm">
                        <span className="text-muted-foreground">
                          % sobre Adquisición ({selectedCategoryRate.percentageFee}%)
                        </span>
                        <span className="font-mono">+${calculation.categoryPercentageFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pl-6 pt-1 border-t border-dashed">
                      <span className="font-medium">Subtotal Categoría</span>
                      <span className="font-mono font-medium text-amber-600">+${calculation.categoryTotalFee.toFixed(2)}</span>
                    </div>
                    {selectedCategoryRate.description && (
                      <div className="pl-6 text-xs text-muted-foreground italic">
                        {selectedCategoryRate.description}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="pl-6 text-sm text-muted-foreground italic">
                    {selectedCategoryId 
                      ? 'Sin tarifa especial para esta categoría'
                      : 'Selecciona una categoría para ver tarifas aplicables'}
                  </div>
                )}
              </div>

              <Separator />

              {/* Expenses breakdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  Gastos Adicionales
                </div>
                {calculation.expensesDetails.length > 0 ? (
                  calculation.expensesDetails.map((exp, i) => (
                    <div key={i} className="flex items-center justify-between pl-6 text-sm">
                      <span className="text-muted-foreground">{exp.name}</span>
                      <span className={cn(
                        "font-mono",
                        exp.cost < 0 ? "text-destructive" : ""
                      )}>
                        {exp.cost >= 0 ? '+' : ''}{exp.cost.toFixed(2)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="pl-6 text-sm text-muted-foreground italic">
                    No hay gastos dinámicos configurados
                  </div>
                )}
              </div>

              {/* Platform fee */}
              {platformFee > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span>Fee de Plataforma ({platformFee}%)</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Comisión administrativa de la plataforma</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className="font-mono">+${calculation.platformFee.toFixed(2)}</span>
                  </div>
                </>
              )}

              <Separator />

              {/* Subtotal - Landed cost */}
              <div className="flex items-center justify-between py-2 bg-muted/50 px-3 rounded-lg">
                <span className="font-medium">Total Costos Aterrizados</span>
                <span className="font-mono font-medium text-lg">${calculation.subtotal.toFixed(2)}</span>
              </div>

              <Separator className="border-2" />

              {/* Final B2B price */}
              <div className="flex items-center justify-between py-3 bg-primary/10 px-4 rounded-lg">
                <div>
                  <span className="font-bold text-lg">PRECIO B2B FINAL</span>
                  <p className="text-xs text-muted-foreground">Precio que paga el Inversionista/Seller</p>
                </div>
                <span className="font-mono font-bold text-2xl text-primary">
                  ${calculation.b2bPrice.toFixed(2)}
                </span>
              </div>

              {/* PVP suggestion */}
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-green-600" />
                        <span className="font-medium">PVP Sugerido</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Margen {calculation.pvpMarginPercent}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Basado en el rango de precio B2B (${calculation.b2bPrice.toFixed(0)})
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xl text-green-600">
                        ${calculation.suggestedPVP.toFixed(2)}
                      </div>
                      <div className="text-sm text-green-600">
                        Ganancia: ${calculation.profitAmount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

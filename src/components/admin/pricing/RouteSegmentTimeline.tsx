import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plane, Ship, MapPin, Clock, DollarSign, Info, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RouteSegment {
  id: string;
  segment: 'china_to_transit' | 'transit_to_destination' | 'china_to_destination';
  costPerKg: number;
  costPerCbm: number;
  minCost: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  notes?: string | null;
  isActive: boolean;
}

export interface RouteInfo {
  id: string;
  countryName: string;
  countryCode: string;
  hubName?: string;
  hubCode?: string;
  isDirect: boolean;
  isActive: boolean;
  segments: RouteSegment[];
}

interface RouteSegmentTimelineProps {
  route: RouteInfo;
  weightKg?: number;
  showCosts?: boolean;
  compact?: boolean;
}

const segmentLabels: Record<string, { label: string; tooltip: string; icon: typeof Plane }> = {
  china_to_transit: {
    label: 'China → Hub',
    tooltip: 'Tramo A: Flete internacional desde China hasta el hub de tránsito. Incluye seguro de carga y manejo en origen.',
    icon: Plane,
  },
  transit_to_destination: {
    label: 'Hub → Destino',
    tooltip: 'Tramo B: Transporte desde el hub de tránsito hasta el país destino. Incluye despacho aduanal.',
    icon: Ship,
  },
  china_to_destination: {
    label: 'China → Destino',
    tooltip: 'Ruta directa: Envío directo sin hub de tránsito. Puede tener tiempos más largos.',
    icon: Plane,
  },
};

export function RouteSegmentTimeline({ 
  route, 
  weightKg = 1, 
  showCosts = true,
  compact = false 
}: RouteSegmentTimelineProps) {
  const calculateSegmentCost = (segment: RouteSegment) => {
    const weightCost = segment.costPerKg * weightKg;
    return Math.max(weightCost, segment.minCost);
  };

  const totalCost = route.segments.reduce((sum, seg) => sum + calculateSegmentCost(seg), 0);
  const totalDaysMin = route.segments.reduce((sum, seg) => sum + seg.estimatedDaysMin, 0);
  const totalDaysMax = route.segments.reduce((sum, seg) => sum + seg.estimatedDaysMax, 0);

  const activeSegments = route.segments.filter(s => s.isActive);

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Badge variant={route.isActive ? 'default' : 'secondary'}>
          {route.isDirect ? 'Directo' : `Vía ${route.hubName || 'Hub'}`}
        </Badge>
        <span className="text-muted-foreground">
          ${totalCost.toFixed(2)}/kg • {totalDaysMin}-{totalDaysMax} días
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Ruta: {route.isDirect ? 'China → ' : `China → ${route.hubName} → `}{route.countryName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={route.isActive ? 'default' : 'outline'}>
                {route.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
              {route.isDirect && (
                <Badge variant="secondary">Directa</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Timeline visualization */}
          <div className="relative">
            {/* Steps */}
            <div className="flex items-stretch">
              {activeSegments.map((segment, index) => {
                const segmentInfo = segmentLabels[segment.segment];
                const Icon = segmentInfo?.icon || Plane;
                const cost = calculateSegmentCost(segment);
                
                return (
                  <div key={segment.id} className="flex-1 relative">
                    {/* Segment card */}
                    <div className={cn(
                      "border rounded-lg p-3 bg-card",
                      index < activeSegments.length - 1 && "mr-2"
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium text-sm">
                            {segmentInfo?.label || segment.segment}
                          </span>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>{segmentInfo?.tooltip}</p>
                            {segment.notes && (
                              <p className="mt-1 text-xs opacity-80">{segment.notes}</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {showCosts && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Costo:
                            </span>
                            <span className="font-mono font-medium">
                              ${cost.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Tiempo:
                            </span>
                            <span className="font-mono">
                              {segment.estimatedDaysMin}-{segment.estimatedDaysMax} días
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ${segment.costPerKg}/kg (mín ${segment.minCost})
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Arrow connector */}
                    {index < activeSegments.length - 1 && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Totals */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Peso: </span>
                  <span className="font-medium">{weightKg} kg</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-muted-foreground">Tiempo Total: </span>
                  <span className="font-medium">{totalDaysMin}-{totalDaysMax} días</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Costo Total: </span>
                  <span className="font-mono font-bold text-primary text-lg">
                    ${totalCost.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

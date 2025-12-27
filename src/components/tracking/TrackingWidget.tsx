import { PackageTracking, TrackingStatus } from '@/hooks/usePackageTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Package,
  Truck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPinCheck,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TrackingWidgetProps {
  tracking: PackageTracking | null;
  isLoading: boolean;
  getCarrierTrackingUrl: (carrier: string, trackingNumber: string) => string;
}

const statusConfig: Record<TrackingStatus, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  pending: { label: 'Pendiente', color: 'text-gray-600', icon: Clock, bgColor: 'bg-gray-50' },
  in_transit: { label: 'En Tránsito', color: 'text-blue-600', icon: Truck, bgColor: 'bg-blue-50' },
  out_for_delivery: { label: 'En Reparto', color: 'text-purple-600', icon: MapPin, bgColor: 'bg-purple-50' },
  delivered: { label: 'Entregado', color: 'text-green-600', icon: CheckCircle2, bgColor: 'bg-green-50' },
  exception: { label: 'Problema', color: 'text-red-600', icon: AlertCircle, bgColor: 'bg-red-50' },
};

export const TrackingWidget = ({ tracking, isLoading, getCarrierTrackingUrl }: TrackingWidgetProps) => {
  if (!tracking && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-center h-20">
            <div className="animate-pulse text-muted-foreground">Cargando rastreo...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tracking) {
    return null;
  }

  const config = statusConfig[tracking.current_status];
  const StatusIcon = config.icon;
  const carrierUrl = getCarrierTrackingUrl(tracking.carrier, tracking.tracking_number);
  const sortedEvents = tracking.events ? [...tracking.events].reverse() : [];

  return (
    <div className="space-y-4">
      {/* Main Status Card */}
      <Card className={`border-l-4 ${
        tracking.current_status === 'delivered' ? 'border-l-green-500 bg-green-50/30' :
        tracking.current_status === 'out_for_delivery' ? 'border-l-purple-500 bg-purple-50/30' :
        tracking.current_status === 'in_transit' ? 'border-l-blue-500 bg-blue-50/30' :
        tracking.current_status === 'exception' ? 'border-l-red-500 bg-red-50/30' :
        'border-l-gray-300'
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-5 w-5 ${config.color}`} />
                <CardTitle className="text-lg">{config.label}</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {tracking.carrier} • {tracking.tracking_number}
              </p>
            </div>
            {carrierUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={carrierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Ver en {tracking.carrier}
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Location */}
          <div className="flex items-start gap-3">
            <MapPinCheck className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Ubicación Actual</p>
              <p className="font-medium">{tracking.current_location}</p>
            </div>
          </div>

          {/* Estimated Delivery */}
          {tracking.estimated_delivery && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Entrega Estimada</p>
                <p className="font-medium">
                  {format(new Date(tracking.estimated_delivery), 'dd MMMM, yyyy', { locale: es })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Timeline */}
      {sortedEvents.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Historial de Rastreo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedEvents.map((event, index) => {
                const eventConfig = statusConfig[event.status];
                const EventIcon = eventConfig.icon;
                const isLatest = index === 0;

                return (
                  <div
                    key={event.id}
                    className={`flex gap-4 pb-3 ${
                      index !== sortedEvents.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    {/* Timeline Dot */}
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full ${
                        isLatest
                          ? eventConfig.bgColor
                          : 'bg-muted'
                      }`}>
                        <EventIcon className={`h-4 w-4 ${
                          isLatest
                            ? eventConfig.color
                            : 'text-muted-foreground'
                        }`} />
                      </div>
                      {index !== sortedEvents.length - 1 && (
                        <div className="w-0.5 h-8 bg-border my-1" />
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{event.description}</p>
                        {isLatest && (
                          <Badge variant="outline" className="text-xs">Últimas noticias</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {event.location}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.timestamp), 'dd MMM, HH:mm', { locale: es })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

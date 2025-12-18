import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { useBuyerOrders, BuyerOrder, BuyerOrderStatus } from "@/hooks/useBuyerOrders";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Package, ShoppingBag, Truck, CheckCircle, XCircle, Clock, 
  ExternalLink, ChevronRight, ArrowLeft, MapPin, Calendar
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<BuyerOrderStatus, { label: string; color: string; icon: React.ReactNode; bgColor: string }> = {
  draft: { label: "Borrador", color: "text-gray-600", icon: <Clock className="h-4 w-4" />, bgColor: "bg-gray-100" },
  placed: { label: "Confirmado", color: "text-blue-600", icon: <Package className="h-4 w-4" />, bgColor: "bg-blue-100" },
  paid: { label: "Pagado", color: "text-amber-600", icon: <CheckCircle className="h-4 w-4" />, bgColor: "bg-amber-100" },
  shipped: { label: "En camino", color: "text-purple-600", icon: <Truck className="h-4 w-4" />, bgColor: "bg-purple-100" },
  delivered: { label: "Entregado", color: "text-green-600", icon: <CheckCircle className="h-4 w-4" />, bgColor: "bg-green-100" },
  cancelled: { label: "Cancelado", color: "text-red-600", icon: <XCircle className="h-4 w-4" />, bgColor: "bg-red-100" },
};

const carrierUrls: Record<string, string> = {
  "DHL": "https://www.dhl.com/en/express/tracking.html?AWB=",
  "FedEx": "https://www.fedex.com/fedextrack/?trknbr=",
  "UPS": "https://www.ups.com/track?tracknum=",
  "USPS": "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  "Estafeta": "https://rastreo3.estafeta.com/Tracking/searchByGet?wayBillType=1&wayBill=",
};

const OrderCard = ({ order, onClick }: { order: BuyerOrder; onClick: () => void }) => {
  const status = statusConfig[order.status] || statusConfig.draft;
  const itemCount = order.order_items_b2b?.length || 0;
  const firstItem = order.order_items_b2b?.[0];

  return (
    <Card 
      className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 group ${
        order.status === 'shipped' ? 'border-l-purple-500' :
        order.status === 'delivered' ? 'border-l-green-500' :
        order.status === 'paid' ? 'border-l-amber-500' :
        order.status === 'placed' ? 'border-l-blue-500' :
        order.status === 'cancelled' ? 'border-l-red-500' : 'border-l-gray-300'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`p-3 rounded-xl ${status.bgColor} ${status.color} shrink-0`}>
              {status.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm md:text-base text-foreground">
                  Pedido #{order.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge variant="outline" className={`${status.color} border-current text-xs`}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(order.created_at), "d 'de' MMMM, yyyy", { locale: es })}
              </p>
              <p className="text-sm text-muted-foreground truncate mt-1">
                {firstItem?.nombre} {itemCount > 1 && `y ${itemCount - 1} más`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between md:justify-end gap-4">
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">
                {order.currency} ${order.total_amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.total_quantity} {order.total_quantity === 1 ? 'artículo' : 'artículos'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>

        {order.status === 'shipped' && order.metadata?.tracking_number && (
          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm">
            <Truck className="h-4 w-4 text-purple-600" />
            <span className="text-muted-foreground">Rastreo:</span>
            <span className="font-medium text-purple-600">{order.metadata.tracking_number}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const OrderDetailDialog = ({ order, open, onClose }: { order: BuyerOrder | null; open: boolean; onClose: () => void }) => {
  if (!order) return null;
  
  const status = statusConfig[order.status] || statusConfig.draft;
  const carrier = order.metadata?.carrier || "";
  const trackingNumber = order.metadata?.tracking_number || "";
  const carrierBaseUrl = carrierUrls[carrier] || order.metadata?.carrier_url || "";
  const trackingUrl = carrierBaseUrl ? `${carrierBaseUrl}${trackingNumber}` : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${status.bgColor} ${status.color}`}>
              {status.icon}
            </div>
            <div>
              <span className="block">Pedido #{order.id.slice(0, 8).toUpperCase()}</span>
              <Badge variant="outline" className={`${status.color} border-current mt-1`}>
                {status.label}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Tracking Section */}
          {(order.status === 'shipped' || order.status === 'delivered') && trackingNumber && (
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                  <Truck className="h-5 w-5" />
                  Seguimiento de Envío
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Paquetería</p>
                    <p className="font-semibold text-purple-900">{carrier || "No especificada"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Número de Guía</p>
                    <p className="font-mono font-semibold text-purple-900">{trackingNumber}</p>
                  </div>
                </div>
                
                {order.metadata?.estimated_delivery && (
                  <div className="flex items-center gap-2 text-sm bg-white/60 p-2 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-muted-foreground">Entrega estimada:</span>
                    <span className="font-medium">{order.metadata.estimated_delivery}</span>
                  </div>
                )}

                {trackingUrl && (
                  <a 
                    href={trackingUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    <MapPin className="h-4 w-4" />
                    Rastrear en {carrier || "Paquetería"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Estado del Pedido</h4>
            <div className="relative">
              {['placed', 'paid', 'shipped', 'delivered'].map((step, index) => {
                const stepStatus = statusConfig[step as BuyerOrderStatus];
                const isCompleted = ['placed', 'paid', 'shipped', 'delivered'].indexOf(order.status) >= index;
                const isCurrent = order.status === step;
                
                return (
                  <div key={step} className="flex items-center gap-3 mb-3 last:mb-0">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center shrink-0
                      ${isCompleted ? stepStatus.bgColor : 'bg-gray-100'}
                      ${isCurrent ? 'ring-2 ring-offset-2 ring-primary' : ''}
                    `}>
                      <span className={isCompleted ? stepStatus.color : 'text-gray-400'}>
                        {stepStatus.icon}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {stepStatus.label}
                      </p>
                    </div>
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Productos ({order.order_items_b2b?.length || 0})
            </h4>
            <div className="space-y-2">
              {order.order_items_b2b?.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.nombre}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku} • Cant: {item.cantidad}</p>
                  </div>
                  <p className="font-semibold">
                    ${item.subtotal.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                {order.currency} ${order.total_amount.toLocaleString()}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MyPurchasesPage = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [statusFilter, setStatusFilter] = useState<BuyerOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);
  
  const { data: orders, isLoading } = useBuyerOrders(statusFilter);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isMobile && <Header />}
        <main className={`flex-1 container mx-auto px-4 flex items-center justify-center ${isMobile ? 'pb-20' : 'pb-8'}`}>
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-center text-primary">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="mb-4 text-muted-foreground">
                Por favor inicia sesión para ver tus compras.
              </p>
              <Link to="/login">
                <Button className="w-full">Ir al Login</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background flex flex-col ${isMobile ? 'pb-20' : ''}`}>
      {!isMobile && <Header />}
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/cuenta">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mis Compras</h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Historial y seguimiento de tus pedidos
            </p>
          </div>
        </div>

        {/* Filters */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as BuyerOrderStatus | 'all')} className="mb-6">
          <TabsList className="w-full md:w-auto flex overflow-x-auto no-scrollbar">
            <TabsTrigger value="all" className="flex-1 md:flex-initial">Todos</TabsTrigger>
            <TabsTrigger value="placed" className="flex-1 md:flex-initial">Confirmados</TabsTrigger>
            <TabsTrigger value="shipped" className="flex-1 md:flex-initial">En Camino</TabsTrigger>
            <TabsTrigger value="delivered" className="flex-1 md:flex-initial">Entregados</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order} 
                onClick={() => setSelectedOrder(order)}
              />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No tienes compras aún
              </h3>
              <p className="text-muted-foreground mb-4">
                Explora nuestro catálogo y encuentra productos increíbles
              </p>
              <Link to="/marketplace">
                <Button>
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Ir al Marketplace
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      {!isMobile && <Footer />}
      
      <OrderDetailDialog 
        order={selectedOrder} 
        open={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
      />
    </div>
  );
};

export default MyPurchasesPage;

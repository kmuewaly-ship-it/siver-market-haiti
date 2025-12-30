import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  User, Mail, Calendar, Package, MapPin, LogOut, Settings, Shield, CreditCard, Bell, Edit, Store, Loader2, CheckCircle, Clock, Truck, XCircle, ChevronRight, ExternalLink, Ban, DollarSign, AlertTriangle, RefreshCw, ShoppingBag, ArrowLeft, Phone, MessageCircle, Lock
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { UserRole } from "@/types/auth";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { AddressesDialog } from "@/components/account/AddressesDialog";
import { SettingsDialog } from "@/components/account/SettingsDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useBuyerOrders, useCancelBuyerOrder, BuyerOrder, BuyerOrderStatus, RefundStatus } from "@/hooks/useBuyerOrders";
import { addItemB2C } from "@/services/cartService";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Status configuration
const refundStatusConfig: Record<RefundStatus, {
  label: string;
  color: string;
  bgColor: string;
}> = {
  none: {
    label: "Sin reembolso",
    color: "text-gray-600",
    bgColor: "bg-gray-100"
  },
  requested: {
    label: "Solicitado",
    color: "text-amber-600",
    bgColor: "bg-amber-100"
  },
  processing: {
    label: "En proceso",
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  completed: {
    label: "Completado",
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  rejected: {
    label: "Rechazado",
    color: "text-red-600",
    bgColor: "bg-red-100"
  }
};

const statusConfig = {
  draft: {
    label: "Borrador",
    color: "text-gray-600",
    icon: <Clock className="h-4 w-4" />,
    bgColor: "bg-gray-100"
  },
  placed: {
    label: "Confirmado",
    color: "text-blue-600",
    icon: <Package className="h-4 w-4" />,
    bgColor: "bg-blue-100"
  },
  paid: {
    label: "Pagado",
    color: "text-amber-600",
    icon: <CheckCircle className="h-4 w-4" />,
    bgColor: "bg-amber-100"
  },
  shipped: {
    label: "En camino",
    color: "text-purple-600",
    icon: <Truck className="h-4 w-4" />,
    bgColor: "bg-purple-100"
  },
  delivered: {
    label: "Entregado",
    color: "text-green-600",
    icon: <CheckCircle className="h-4 w-4" />,
    bgColor: "bg-green-100"
  },
  cancelled: {
    label: "Cancelado",
    color: "text-red-600",
    icon: <XCircle className="h-4 w-4" />,
    bgColor: "bg-red-100"
  }
};

const carrierUrls: Record<string, string> = {
  "DHL": "https://www.dhl.com/en/express/tracking.html?AWB=",
  "FedEx": "https://www.fedex.com/fedextrack/?trknbr=",
  "UPS": "https://www.ups.com/track?tracknum=",
  "USPS": "https://tools.usps.com/go/TrackConfirmAction?tLabels=",
  "Estafeta": "https://rastreo3.estafeta.com/Tracking/searchByGet?wayBillType=1&wayBill="
};

// OrderCard Component
const OrderCard = ({
  order,
  onClick
}: {
  order: BuyerOrder;
  onClick: () => void;
}) => {
  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.draft;
  const itemCount = order.order_items_b2b?.length || 0;
  const firstItem = order.order_items_b2b?.[0];
  return <Card className={`cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 group ${order.status === 'shipped' ? 'border-l-purple-500' : order.status === 'delivered' ? 'border-l-green-500' : order.status === 'paid' ? 'border-l-amber-500' : order.status === 'placed' ? 'border-l-blue-500' : order.status === 'cancelled' ? 'border-l-red-500' : 'border-l-gray-300'}`} onClick={onClick}>
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
                {format(new Date(order.created_at), "d 'de' MMMM, yyyy", {
                locale: es
              })}
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
      </CardContent>
    </Card>;
};

// OrderDetailDialog Component
const OrderDetailDialog = ({
  order,
  open,
  onClose,
  onReorder,
  onCancelClick
}: {
  order: BuyerOrder | null;
  open: boolean;
  onClose: () => void;
  onReorder: (order: BuyerOrder) => void;
  onCancelClick: (order: BuyerOrder) => void;
}) => {
  if (!order) return null;

  const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.draft;
  const refundStatus = (order.metadata?.refund_status as RefundStatus) || 'none';
  const refundConfig = refundStatusConfig[refundStatus];
  const canCancel = order.status === 'placed' || order.status === 'paid';
  const trackingNumber = order.metadata?.tracking_number;
  const carrier = order.metadata?.carrier;
  const trackingUrl = carrier && trackingNumber ? `${carrierUrls[carrier]}${trackingNumber}` : null;

  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${status.bgColor} ${status.color}`}>
              {status.icon}
            </div>
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tracking Section */}
          {(order.status === 'shipped' || order.status === 'delivered') && trackingNumber && <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
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
                
                {order.metadata?.estimated_delivery && <div className="flex items-center gap-2 text-sm bg-white/60 p-2 rounded-lg">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    <span className="text-muted-foreground">Entrega estimada:</span>
                    <span className="font-medium">{order.metadata.estimated_delivery}</span>
                  </div>}

                {trackingUrl && <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                    <MapPin className="h-4 w-4" />
                    Rastrear en {carrier || "Paquetería"}
                    <ExternalLink className="h-4 w-4" />
                  </a>}
              </CardContent>
            </Card>}

          {/* Order Timeline */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Estado del Pedido</h4>
            <div className="relative">
              {['placed', 'paid', 'shipped', 'delivered'].map((step, index) => {
              const stepStatus = statusConfig[step as keyof typeof statusConfig];
              const isCompleted = ['placed', 'paid', 'shipped', 'delivered'].indexOf(order.status) >= index;
              const isCurrent = order.status === step;
              return <div key={step} className="flex items-center gap-3 mb-3 last:mb-0">
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
                    {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                  </div>;
            })}
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Productos ({order.order_items_b2b?.length || 0})
            </h4>
            <div className="space-y-2">
              {order.order_items_b2b?.map(item => <div key={item.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.nombre}</p>
                    <p className="text-xs text-muted-foreground">SKU: {item.sku} • Cant: {item.cantidad}</p>
                  </div>
                  <p className="font-semibold">
                    ${item.subtotal.toLocaleString()}
                  </p>
                </div>)}
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

          {order.notes && <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>}

          {/* Cancellation Info */}
          {order.status === 'cancelled' && <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700">Pedido Cancelado</span>
                </div>
                {order.metadata?.cancellation_reason && <p className="text-sm text-red-600">
                    <span className="font-medium">Motivo:</span> {order.metadata.cancellation_reason}
                  </p>}
                {order.metadata?.cancelled_at && <p className="text-xs text-red-500">
                    Cancelado el {format(new Date(order.metadata.cancelled_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                locale: es
              })}
                  </p>}
                
                {/* Refund Status */}
                {refundStatus !== 'none' && <div className="border-t border-red-200 pt-3 mt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-700">Estado del Reembolso</span>
                      </div>
                      <Badge className={`${refundConfig.bgColor} ${refundConfig.color}`}>
                        {refundConfig.label}
                      </Badge>
                    </div>
                    {order.metadata?.refund_amount && <p className="text-sm text-red-600 mt-2">
                        Monto: {order.currency} ${order.metadata.refund_amount.toLocaleString()}
                      </p>}
                  </div>}
              </CardContent>
            </Card>}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Reorder Button - Always show for non-draft orders */}
            {order.status !== 'draft' && <Button onClick={() => onReorder(order)} className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700" size="lg">
                <RefreshCw className="h-4 w-4 mr-2" />
                Volver a Comprar
              </Button>}

            {/* Cancel Button - Only for placed/paid orders */}
            {canCancel && <Button onClick={() => onCancelClick(order)} variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700" size="lg">
                <XCircle className="h-4 w-4 mr-2" />
                Cancelar Pedido
              </Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>;
};

// CancelOrderDialog Component
const CancelOrderDialog = ({
  order,
  open,
  onClose,
  onConfirm,
  isLoading
}: {
  order: BuyerOrder | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string, requestRefund: boolean) => void;
  isLoading: boolean;
}) => {
  const [reason, setReason] = useState('');
  const [requestRefund, setRequestRefund] = useState(false);
  if (!order) return null;
  const isPaid = order.status === 'paid';
  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason, requestRefund && isPaid);
      setReason('');
      setRequestRefund(false);
    }
  };
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Por favor indica el motivo de la cancelación.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo de cancelación *</Label>
            <Textarea id="reason" placeholder="Escribe el motivo de la cancelación..." value={reason} onChange={e => setReason(e.target.value)} rows={3} />
          </div>

          {isPaid && <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox id="refund" checked={requestRefund} onCheckedChange={checked => setRequestRefund(checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="refund" className="font-medium text-amber-800 cursor-pointer">
                  Solicitar reembolso
                </Label>
                <p className="text-xs text-amber-600">
                  Tu pedido ya fue pagado. Marca esta opción para solicitar el reembolso de {order.currency} ${order.total_amount.toLocaleString()}
                </p>
              </div>
            </div>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Volver
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
            Confirmar Cancelación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
};

const AccountPage = () => {
  const { user, signOut, role } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast: showToast } = useToast();
  const [showAddresses, setShowAddresses] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isRequestingUpgrade, setIsRequestingUpgrade] = useState(false);
  const [activeTab, setActiveTab] = useState("informacion");
  const [statusFilter, setStatusFilter] = useState<BuyerOrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<BuyerOrder | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<BuyerOrder | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: user?.name || '', email: user?.email || '', phone: '+1 234 567 8900' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    promotions: false,
    reviews: true,
  });
  
  // Fetch buyer orders
  const { data: orders, isLoading: ordersLoading } = useBuyerOrders(statusFilter);
  const cancelOrderMutation = useCancelBuyerOrder();

  // Check if user already has a pending seller upgrade request
  const { data: existingRequest, refetch: refetchRequest } = useQuery({
    queryKey: ['seller-upgrade-request', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('admin_approval_requests')
        .select('*')
        .eq('requester_id', user.id)
        .eq('request_type', 'seller_upgrade' as any)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching upgrade request:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id && role === UserRole.CLIENT,
  });

  const handleRequestSellerUpgrade = async () => {
    if (!user?.id) return;
    
    setIsRequestingUpgrade(true);
    try {
      // Check if there's already a pending request
      if (existingRequest?.status === 'pending') {
        toast.info('Ya tienes una solicitud pendiente de aprobación');
        return;
      }

      // Create a new upgrade request
      const { error } = await supabase
        .from('admin_approval_requests')
        .insert({
          requester_id: user.id,
          request_type: 'seller_upgrade' as any,
          status: 'pending',
          metadata: {
            user_email: user.email,
            user_name: user.name,
            requested_at: new Date().toISOString(),
          },
        });

      if (error) throw error;

      toast.success('¡Solicitud enviada! Un administrador revisará tu solicitud pronto.');
      refetchRequest();
    } catch (error) {
      console.error('Error requesting seller upgrade:', error);
      toast.error('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setIsRequestingUpgrade(false);
    }
  };

  const getUpgradeButtonContent = () => {
    if (existingRequest?.status === 'pending') {
      return (
        <>
          <Clock className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-lg text-amber-700">Solicitud Pendiente</h4>
            <p className="text-sm text-amber-600 mt-1">
              Tu solicitud está siendo revisada por un administrador.
            </p>
          </div>
        </>
      );
    }
    if (existingRequest?.status === 'approved') {
      return (
        <>
          <CheckCircle className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-lg text-green-700">¡Aprobado!</h4>
            <p className="text-sm text-green-600 mt-1">
              Tu cuenta ha sido actualizada a vendedor.
            </p>
          </div>
        </>
      );
    }
    if (existingRequest?.status === 'rejected') {
      return (
        <>
          <Store className="h-6 w-6" />
          <div>
            <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#071d7f] transition-colors">Solicitar de Nuevo</h4>
            <p className="text-sm text-gray-500 mt-1">
              Tu solicitud anterior fue rechazada. Puedes intentar de nuevo.
            </p>
          </div>
        </>
      );
    }
    return (
      <>
        <Store className="h-6 w-6" />
        <div>
          <h4 className="font-bold text-lg text-gray-900 group-hover:text-[#071d7f] transition-colors">Quiero ser Vendedor</h4>
          <p className="text-sm text-gray-500 mt-1">
            Solicita acceso para vender en SIVER Market.
          </p>
        </div>
      </>
    );
  };

  // Order handlers
  const handleReorder = (order: BuyerOrder) => {
    if (!order.order_items_b2b || order.order_items_b2b.length === 0) {
      showToast({
        title: "No hay productos para agregar",
        variant: "destructive"
      });
      return;
    }
    
    if (!user?.id) {
      showToast({ title: "Error", description: "Usuario no identificado", variant: 'destructive' });
      return;
    }

    order.order_items_b2b.forEach(async (item) => {
      try {
        await addItemB2C({
          userId: user.id,
          sku: item.sku,
          name: item.nombre,
          price: item.precio_unitario,
          quantity: item.cantidad,
          sellerCatalogId: (item as any).seller_catalog_id,
        });
      } catch (error) {
        console.error('Error adding item to cart:', error);
      }
    });
    showToast({
      title: "Productos agregados al carrito",
      description: `${order.order_items_b2b.length} productos añadidos`
    });
    setSelectedOrder(null);
    navigate('/carrito');
  };

  const handleCancelClick = (order: BuyerOrder) => {
    setSelectedOrder(null);
    setOrderToCancel(order);
  };

  const handleCancelConfirm = async (reason: string, requestRefund: boolean) => {
    if (!orderToCancel) return;
    await cancelOrderMutation.mutateAsync({
      orderId: orderToCancel.id,
      reason,
      requestRefund
    });
    setOrderToCancel(null);
  };

  const handleChangePassword = async () => {
    if (!passwordForm.newPassword.trim()) {
      showToast({ title: 'Error', description: 'Ingresa una nueva contraseña', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      showToast({ title: 'Éxito', description: 'Contraseña cambiada exitosamente' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowChangePassword(false);
    } catch (error: any) {
      showToast({ title: 'Error', description: error.message || 'Error al cambiar contraseña', variant: 'destructive' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleNotificationsSave = async () => {
    try {
      // Aquí guardarías las preferencias en la base de datos
      showToast({ title: 'Éxito', description: 'Configuración de notificaciones guardada' });
      setShowNotifications(false);
    } catch (error: any) {
      showToast({ title: 'Error', description: 'Error al guardar notificaciones', variant: 'destructive' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex flex-col">
        {!isMobile && <Header />}
        <main className={`flex-1 container mx-auto px-4 flex items-center justify-center ${isMobile ? 'pb-20 py-8' : 'py-16'}`}>
          <div className="w-full max-w-2xl space-y-8">
            {/* Header Section */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-[#071d7f]">Accede a Tu Cuenta</h1>
              <p className="text-lg text-gray-600">
                Inicia sesión para ver tu perfil, compras, direcciones y más
              </p>
            </div>

            {/* Main Card */}
            <Card className="shadow-2xl border-0 overflow-hidden">
              {/* Header Gradient */}
              <div className="bg-gradient-to-r from-[#071d7f] to-blue-600 h-32 md:h-40 flex items-center justify-center">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 border-4 border-white flex items-center justify-center backdrop-blur">
                    <User className="h-10 w-10 md:h-12 md:w-12 text-white" />
                  </div>
                  <div className="text-white">
                    <h2 className="text-2xl md:text-3xl font-bold">Mi Cuenta</h2>
                    <p className="text-blue-100">Acceso Premium</p>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 md:p-10">
                <div className="space-y-8">
                  {/* Benefits Grid */}
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-blue-50">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-[#071d7f]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Mis Compras</h3>
                        <p className="text-sm text-gray-600">Ver historial completo</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-green-50">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Direcciones</h3>
                        <p className="text-sm text-gray-600">Guardar direcciones</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center text-center space-y-3 p-4 rounded-lg bg-purple-50">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <Shield className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Seguridad</h3>
                        <p className="text-sm text-gray-600">Protege tu cuenta</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* CTA Section */}
                  <div className="space-y-3 text-center">
                    <p className="text-gray-700">
                      ¿No tienes cuenta aún? <Link to="/register" className="text-[#071d7f] font-semibold hover:underline">Regístrate gratis</Link>
                    </p>
                    <div className="flex flex-col gap-3 pt-4">
                      <Link to="/login" className="w-full">
                        <Button className="w-full bg-[#071d7f] hover:bg-[#0a2a9f] text-white h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all">
                          <Lock className="h-5 w-5 mr-2" />
                          Iniciar Sesión
                        </Button>
                      </Link>
                      <Link to="/" className="w-full">
                        <Button variant="outline" className="w-full h-12 text-lg font-semibold border-2 hover:bg-gray-50">
                          <ArrowLeft className="h-5 w-5 mr-2" />
                          Volver al Inicio
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-gray-700">
                <span className="text-[#071d7f] font-semibold">💳 Compra segura:</span> Todos tus datos están protegidos con cifrado SSL de nivel bancario
              </p>
            </div>
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  const Content = () => (
    <div className={`min-h-screen bg-gray-50/50 flex flex-col font-sans ${isMobile ? 'pb-14' : ''}`}>
      {!isMobile && <Header />}
      
      <main className="flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Sticky Navigation Bar - Responsive */}
          <div className={`fixed left-0 right-0 z-50 w-full bg-white border-b-2 border-gray-200 shadow-lg ${isMobile ? 'top-24' : 'top-31 lg:top-39'}`}>
            <div className={`${role === UserRole.CLIENT ? 'container mx-auto px-2 md:px-6' : 'w-full px-2 md:px-6'} py-0`}>
              <TabsList className="grid w-full grid-cols-4 gap-0 bg-transparent rounded-none p-0 h-auto border-b-0 mb-0">
                {/* Info Tab */}
                <TabsTrigger 
                  value="informacion" 
                  className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[10px] md:text-sm font-medium px-2 md:px-4 py-2 md:py-3 rounded-none border-b-3 md:border-b-4 border-transparent hover:bg-gray-50 transition-all data-[state=active]:border-b-[#071d7f] data-[state=active]:bg-[#071d7f] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <User className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Información</span>
                  <span className="sm:hidden">Info</span>
                </TabsTrigger>

                {/* Compras Tab */}
                <TabsTrigger 
                  value="compras" 
                  className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[10px] md:text-sm font-medium px-2 md:px-4 py-2 md:py-3 rounded-none border-b-3 md:border-b-4 border-transparent hover:bg-gray-50 transition-all data-[state=active]:border-b-[#071d7f] data-[state=active]:bg-[#071d7f] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <Package className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Mis Compras</span>
                  <span className="sm:hidden">Compras</span>
                </TabsTrigger>

                {/* Direcciones Tab */}
                <TabsTrigger 
                  value="direcciones" 
                  className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[10px] md:text-sm font-medium px-2 md:px-4 py-2 md:py-3 rounded-none border-b-3 md:border-b-4 border-transparent hover:bg-gray-50 transition-all data-[state=active]:border-b-[#071d7f] data-[state=active]:bg-[#071d7f] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Direcciones</span>
                  <span className="sm:hidden">Dirs</span>
                </TabsTrigger>

                {/* Configuración Tab */}
                <TabsTrigger 
                  value="configuracion" 
                  className="flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[10px] md:text-sm font-medium px-2 md:px-4 py-2 md:py-3 rounded-none border-b-3 md:border-b-4 border-transparent hover:bg-gray-50 transition-all data-[state=active]:border-b-[#071d7f] data-[state=active]:bg-[#071d7f] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Configuración</span>
                  <span className="sm:hidden">Config</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Tab Contents */}
          <div className={`${role === UserRole.CLIENT ? 'container mx-auto px-4 md:px-6 py-6 md:py-8' : 'w-full px-4 md:px-6 py-6 md:py-8'} ${isMobile ? 'pt-12' : 'pt-30'}`}>
            
            {/* Información Tab */}
            <TabsContent value="informacion" className={`${isMobile ? 'space-y-3 mt-0' : 'space-y-6 md:space-y-8 mt-0'}`}>
              <div className="w-full max-w-2xl mx-auto">
                <Card className="shadow-lg border-none overflow-hidden">
                  {/* Header */}
                  <CardHeader className="bg-gradient-to-r from-[#071d7f] to-blue-600 text-white pb-8">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16 border-4 border-white">
                          <AvatarImage src={user?.avatar_url || ""} />
                          <AvatarFallback className="bg-blue-100 text-[#071d7f] font-bold text-lg">
                            {user?.name?.charAt(0)?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h2 className="text-2xl font-bold">{user?.name || "Mi Cuenta"}</h2>
                          {role === UserRole.SELLER && (
                            <Badge className="mt-2 bg-amber-100 text-amber-800 hover:bg-amber-200">
                              Vendedor Verificado
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        className="bg-white text-[#071d7f] hover:bg-blue-50 border-white p-2"
                        size="sm"
                        onClick={() => {
                          setEditFormData({ name: user?.name || '', email: user?.email || '', phone: '+1 234 567 8900' });
                          setShowEditProfile(true);
                        }}
                      >
                        <Edit className="h-5 w-5" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 md:p-8">
                    {/* Contact Information */}
                    <div className="space-y-4 mb-8 pb-8 border-b">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#071d7f]" />
                        Información de Contacto
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm">Correo Electrónico</span>
                          <span className="font-semibold text-gray-900">{user?.email}</span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            Teléfono
                          </span>
                          <span className="font-semibold text-gray-900">+1 234 567 8900</span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm flex items-center gap-1">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                            WhatsApp
                          </span>
                          <span className="font-semibold text-gray-900">+1 234 567 8900</span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm">Nombre Completo</span>
                          <span className="font-semibold text-gray-900">{user?.name || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Account Information */}
                    <div className="space-y-4 mb-8 pb-8 border-b">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="h-4 w-4 text-[#071d7f]" />
                        Información de la Cuenta
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Miembro Desde
                          </span>
                          <span className="font-semibold text-gray-900">
                            {new Date(user?.created_at || '').toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Estado de Cuenta
                          </span>
                          <span className="font-semibold text-green-600">Activa ✓</span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm">ID de Usuario</span>
                          <span className="font-mono text-gray-900 text-xs font-semibold">{user?.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                          <span className="text-gray-600 text-sm flex items-center gap-1">
                            {role === UserRole.SELLER ? (
                              <>
                                <Store className="h-4 w-4" />
                                Tipo de Usuario
                              </>
                            ) : (
                              <>
                                <User className="h-4 w-4" />
                                Tipo de Usuario
                              </>
                            )}
                          </span>
                          <span className="font-semibold text-[#071d7f]">
                            {role === UserRole.SELLER ? "Vendedor" : "Comprador"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-3 justify-start">
                      <button 
                        onClick={() => setShowChangePassword(true)}
                        className="p-3 bg-white rounded-lg shadow-md hover:shadow-lg border border-blue-100 hover:border-blue-300 transition-all duration-300 group text-[#071d7f] hover:bg-blue-50"
                        title="Cambiar Contraseña"
                      >
                        <Shield className="h-5 w-5" />
                      </button>

                      <button 
                        onClick={() => setShowNotifications(true)}
                        className="p-3 bg-white rounded-lg shadow-md hover:shadow-lg border border-blue-100 hover:border-blue-300 transition-all duration-300 group text-[#071d7f] hover:bg-blue-50"
                        title="Notificaciones"
                      >
                        <Bell className="h-5 w-5" />
                      </button>

                      <button 
                        onClick={signOut}
                        className="p-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg shadow-md hover:shadow-lg border border-red-600 transition-all duration-300 text-white"
                        title="Cerrar Sesión"
                      >
                        <LogOut className="h-5 w-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Mis Compras Tab */}
            <TabsContent value="compras" className="space-y-4 mt-0">
              {/* Filters */}
              <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as BuyerOrderStatus | 'all')} className="mb-6">
                <TabsList className="w-full md:w-auto flex overflow-x-auto no-scrollbar">
                  <TabsTrigger value="all" className="flex-1 md:flex-initial">Todos</TabsTrigger>
                  <TabsTrigger value="placed" className="flex-1 md:flex-initial">Confirmados</TabsTrigger>
                  <TabsTrigger value="shipped" className="flex-1 md:flex-initial">En Camino</TabsTrigger>
                  <TabsTrigger value="delivered" className="flex-1 md:flex-initial">Entregados</TabsTrigger>
                  <TabsTrigger value="cancelled" className="flex-1 md:flex-initial">Cancelados</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Orders List */}
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
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
                  {orders.map(order => (
                    <OrderCard key={order.id} order={order} onClick={() => setSelectedOrder(order)} />
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
                    <Link to="/">
                      <Button>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Ir a la Tienda
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Direcciones Tab */}
            <TabsContent value="direcciones" className="space-y-4 mt-0">
              <Card className="shadow-md">
                <CardContent className="p-6">
                  <Button 
                    onClick={() => setShowAddresses(true)}
                    className="w-full bg-[#071d7f] hover:bg-[#0a2a9f]"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Gestionar Direcciones
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Configuración Tab */}
            <TabsContent value="configuracion" className="space-y-4 mt-0">
              <div className="max-w-4xl">
                {/* Top 3 Cards - Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="flex flex-col items-start p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200 text-left group"
                  >
                    <div className="p-2 rounded-lg bg-blue-100 text-[#071d7f] mb-3">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Métodos de Pago</h4>
                    <p className="text-sm text-gray-600">Gestiona tus tarjetas y cuentas.</p>
                  </button>

                  <button 
                    onClick={() => setShowNotifications(true)}
                    className="flex flex-col items-start p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200 text-left group"
                  >
                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 mb-3">
                      <Bell className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Notificaciones</h4>
                    <p className="text-sm text-gray-600">Configura alertas de pedidos.</p>
                  </button>

                  <button 
                    onClick={() => setShowChangePassword(true)}
                    className="flex flex-col items-start p-4 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all duration-200 text-left group"
                  >
                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600 mb-3">
                      <Shield className="h-5 w-5" />
                    </div>
                    <h4 className="font-semibold text-gray-900">Seguridad</h4>
                    <p className="text-sm text-gray-600">Contraseña y accesos.</p>
                  </button>
                </div>

                {/* Logout Button - Bottom Right */}
                <div className="flex justify-end">
                  <button 
                    onClick={signOut}
                    className="flex items-center gap-3 p-3 px-6 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all duration-200 text-left group"
                  >
                    <div className="p-1.5 rounded-lg bg-red-100 text-red-600">
                      <LogOut className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">Cerrar Sesión</h4>
                      <p className="text-xs text-gray-600">Salir de tu cuenta.</p>
                    </div>
                  </button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </main>
      {!isMobile && <Footer />}
      
      <AddressesDialog open={showAddresses} onOpenChange={setShowAddresses} />
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      
      <OrderDetailDialog order={selectedOrder} open={!!selectedOrder} onClose={() => setSelectedOrder(null)} onReorder={handleReorder} onCancelClick={handleCancelClick} />

      <CancelOrderDialog order={orderToCancel} open={!!orderToCancel} onClose={() => setOrderToCancel(null)} onConfirm={handleCancelConfirm} isLoading={cancelOrderMutation.isPending} />

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#071d7f]">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Ingresa tu nueva contraseña. Debe tener al menos 6 caracteres.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva Contraseña</Label>
              <input
                id="new-password"
                type="password"
                placeholder="Nueva contraseña"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#071d7f] focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Contraseña</Label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Confirmar contraseña"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#071d7f] focus:border-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePassword(false)}>Cancelar</Button>
            <Button onClick={handleChangePassword} disabled={isChangingPassword} className="bg-[#071d7f] hover:bg-[#0a2a9f]">
              {isChangingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#071d7f]">
              <Bell className="h-5 w-5" />
              Preferencias de Notificaciones
            </DialogTitle>
            <DialogDescription>
              Configura qué notificaciones deseas recibir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="email-notif"
                checked={notificationSettings.emailNotifications}
                onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked as boolean })}
              />
              <Label htmlFor="email-notif" className="cursor-pointer">Recibir notificaciones por email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="order-updates"
                checked={notificationSettings.orderUpdates}
                onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, orderUpdates: checked as boolean })}
              />
              <Label htmlFor="order-updates" className="cursor-pointer">Actualizaciones de pedidos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="promotions"
                checked={notificationSettings.promotions}
                onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, promotions: checked as boolean })}
              />
              <Label htmlFor="promotions" className="cursor-pointer">Ofertas y promociones</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="reviews"
                checked={notificationSettings.reviews}
                onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, reviews: checked as boolean })}
              />
              <Label htmlFor="reviews" className="cursor-pointer">Solicitudes de reseñas</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotifications(false)}>Cancelar</Button>
            <Button onClick={handleNotificationsSave} className="bg-[#071d7f] hover:bg-[#0a2a9f]">
              Guardar Preferencias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditProfile} onOpenChange={setShowEditProfile}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#071d7f]">
              <Edit className="h-5 w-5" />
              Editar Perfil
            </DialogTitle>
            <DialogDescription>
              Actualiza tu información personal
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre Completo</Label>
              <input
                id="edit-name"
                type="text"
                placeholder="Nombre completo"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#071d7f] focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Correo Electrónico</Label>
              <input
                id="edit-email"
                type="email"
                placeholder="ejemplo@email.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#071d7f] focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Teléfono</Label>
              <input
                id="edit-phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#071d7f] focus:border-transparent"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditProfile(false)}>Cancelar</Button>
            <Button onClick={() => {
              showToast({ title: 'Éxito', description: 'Perfil actualizado correctamente' });
              setShowEditProfile(false);
            }} className="bg-[#071d7f] hover:bg-[#0a2a9f]">
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  if (role === UserRole.SELLER) {
    return (
      <SellerLayout>
        <Content />
      </SellerLayout>
    );
  }

  return <Content />;
};

export default AccountPage;

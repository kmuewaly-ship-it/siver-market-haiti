import { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useB2CCartSupabase } from '@/hooks/useB2CCartSupabase';
import { useAddresses, Address } from '@/hooks/useAddresses';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCreateB2COrder } from '@/hooks/useB2COrders';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AddressesDialog } from '@/components/account/AddressesDialog';
import { UserRole } from '@/types/auth';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Smartphone,
  Building2,
  Loader2,
  ShoppingBag,
  MapPin,
  Plus,
  Package,
  Star,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = 'stripe' | 'moncash' | 'transfer';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user, role, isLoading: authLoading } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  const { completeCart, cart: b2cCart } = useB2CCartSupabase();
  const { addresses, isLoading: addressesLoading } = useAddresses();
  const isMobile = useIsMobile();
  const createOrder = useCreateB2COrder();

  // Redirect sellers/admins to B2B checkout
  const isB2BUser = role === UserRole.SELLER || role === UserRole.ADMIN;
  
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [showAddressDialog, setShowAddressDialog] = useState(false);

  // Redirect after hooks are called
  if (isB2BUser && !authLoading) {
    return <Navigate to="/seller/checkout" replace />;
  }

  // Auto-select default address
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = addresses.find(a => a.is_default);
      setSelectedAddress(defaultAddr?.id || addresses[0].id);
    }
  }, [addresses, selectedAddress]);

  const selectedAddressData = addresses.find(a => a.id === selectedAddress);

  const paymentMethods = [
    {
      id: 'stripe' as PaymentMethod,
      name: 'Tarjeta de Crédito',
      description: 'Visa, Mastercard, American Express',
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'moncash' as PaymentMethod,
      name: 'MonCash',
      description: 'Billetera digital haitiana',
      icon: Smartphone,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      id: 'transfer' as PaymentMethod,
      name: 'Transferencia Bancaria',
      description: 'Transferencia directa',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  const bankDetails = {
    bank: 'Banco Nacional de Haití',
    account: '001-234567-89',
    beneficiary: 'Siver Market 509 SRL',
  };

  const moncashDetails = {
    number: '+509 3XXX XXXX',
    name: 'Siver Market 509',
  };

  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = totalPrice();

  if (authLoading || addressesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-[#071d7f]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isMobile && <Header />}
        <main className="flex-1 container mx-auto px-4 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Inicia Sesión</h1>
            <p className="text-muted-foreground mb-6">
              Debes iniciar sesión para completar tu compra.
            </p>
            <Button asChild className="w-full bg-[#071d7f] hover:bg-[#0a2a9f]">
              <Link to="/login">Iniciar Sesión</Link>
            </Button>
          </Card>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  if (items.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isMobile && <Header />}
        <main className="flex-1 container mx-auto px-4 flex items-center justify-center">
          <Card className="p-8 text-center max-w-md">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Carrito Vacío</h1>
            <p className="text-muted-foreground mb-6">
              No tienes productos en tu carrito.
            </p>
            <Button asChild className="bg-[#071d7f] hover:bg-[#0a2a9f]">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ir a Comprar
              </Link>
            </Button>
          </Card>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {!isMobile && <Header />}
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold mb-2">¡Pedido Confirmado!</h1>
              <p className="text-muted-foreground mb-4">
                Tu pedido ha sido recibido exitosamente.
              </p>
              {orderId && (
                <div className="bg-muted p-4 rounded-lg mb-6">
                  <p className="text-sm text-muted-foreground">Número de Pedido</p>
                  <p className="font-mono font-bold text-lg">{orderId}</p>
                </div>
              )}
              
              {selectedAddressData && (
                <div className="text-left bg-blue-50 p-4 rounded-lg mb-6">
                  <p className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Dirección de Envío
                  </p>
                  <p className="text-sm">{selectedAddressData.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAddressData.street_address}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAddressData.city}, {selectedAddressData.country}
                  </p>
                </div>
              )}

              {paymentMethod !== 'stripe' && (
                <div className="text-left bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                  <p className="font-semibold text-yellow-800">Pendiente de Verificación</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Tu pedido está pendiente de verificación de pago. Te notificaremos una vez confirmado.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild variant="outline">
                  <Link to="/mis-compras">Ver Mis Pedidos</Link>
                </Button>
                <Button asChild className="bg-[#071d7f] hover:bg-[#0a2a9f]">
                  <Link to="/">Seguir Comprando</Link>
                </Button>
              </div>
            </Card>
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Selecciona una dirección de envío');
      return;
    }

    if (paymentMethod !== 'stripe' && !paymentReference.trim()) {
      toast.error('Ingresa la referencia de pago');
      return;
    }

    if (items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare order items from cart
      const orderItems = items.map(item => ({
        sku: item.sku,
        nombre: item.name,
        cantidad: item.quantity,
        precio_unitario: item.price,
        subtotal: item.price * item.quantity,
        image: item.image,
        store_id: item.storeId,
        store_name: item.storeName,
      }));

      // Prepare shipping address
      const shippingAddress = selectedAddressData ? {
        id: selectedAddressData.id,
        full_name: selectedAddressData.full_name,
        phone: selectedAddressData.phone || undefined,
        street_address: selectedAddressData.street_address,
        city: selectedAddressData.city,
        state: selectedAddressData.state || undefined,
        postal_code: selectedAddressData.postal_code || undefined,
        country: selectedAddressData.country,
        notes: selectedAddressData.notes || undefined,
      } : undefined;

      // Create the order in database
      const order = await createOrder.mutateAsync({
        items: orderItems,
        total_amount: totalPrice(),
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        notes: orderNotes || undefined,
        shipping_address: shippingAddress,
      });

      if (order) {
        setOrderId(order.id.slice(0, 8).toUpperCase());
        
        // Complete the B2C cart in Supabase if it exists
        if (b2cCart?.id) {
          await completeCart();
        }
        
        // Clear the local cart (zustand)
        clearCart();
        setOrderPlaced(true);
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Error al procesar el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <Header />}
      
      <main className={`flex-1 container mx-auto px-4 py-6 ${isMobile ? 'pb-24' : 'pb-8'}`}>
        <div className="mb-6">
          <Link to="/carrito" className="flex items-center gap-2 text-[#071d7f] hover:underline mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver al Carrito
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold">Finalizar Compra</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-[#071d7f]" />
                  Dirección de Envío
                </h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAddressDialog(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Gestionar
                </Button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-6 bg-muted/50 rounded-lg">
                  <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">No tienes direcciones guardadas</p>
                  <Button 
                    onClick={() => setShowAddressDialog(true)}
                    className="bg-[#071d7f] hover:bg-[#0a2a9f]"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Dirección
                  </Button>
                </div>
              ) : (
                <RadioGroup 
                  value={selectedAddress || ''} 
                  onValueChange={setSelectedAddress}
                  className="space-y-3"
                >
                  {addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedAddress === address.id
                          ? 'border-[#071d7f] bg-blue-50/50'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                      onClick={() => setSelectedAddress(address.id)}
                    >
                      <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Predeterminada
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">{address.full_name}</p>
                        <p className="text-sm text-muted-foreground">{address.street_address}</p>
                        <p className="text-sm text-muted-foreground">
                          {address.city}{address.state ? `, ${address.state}` : ''} - {address.country}
                        </p>
                        {address.phone && (
                          <p className="text-sm text-muted-foreground">Tel: {address.phone}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </Card>

            {/* Order Items */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-[#071d7f]" />
                Resumen del Pedido ({totalItems} productos)
              </h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 pb-3 border-b last:border-b-0">
                    <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity} x ${item.price.toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Payment Method */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#071d7f]" />
                Método de Pago
              </h2>
              
              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;

                  return (
                    <div
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#071d7f] bg-blue-50/50'
                          : 'border-border hover:border-muted-foreground'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${method.bgColor}`}>
                        <Icon className={`h-5 w-5 ${method.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          isSelected ? 'border-[#071d7f] bg-[#071d7f]' : 'border-muted-foreground'
                        }`}
                      >
                        {isSelected && <Check className="h-full w-full text-white p-0.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Payment Details */}
              {paymentMethod === 'transfer' && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-semibold text-green-800 mb-2">Datos Bancarios</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <p><span className="font-medium">Banco:</span> {bankDetails.bank}</p>
                    <p><span className="font-medium">Cuenta:</span> {bankDetails.account}</p>
                    <p><span className="font-medium">Beneficiario:</span> {bankDetails.beneficiary}</p>
                  </div>
                  <div className="mt-3">
                    <Label>Referencia de Transferencia *</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Número de referencia"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'moncash' && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">Datos MonCash</h4>
                  <div className="space-y-1 text-sm text-orange-700">
                    <p><span className="font-medium">Número:</span> {moncashDetails.number}</p>
                    <p><span className="font-medium">Nombre:</span> {moncashDetails.name}</p>
                  </div>
                  <div className="mt-3">
                    <Label>Código de Transacción *</Label>
                    <Input
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Código de transacción MonCash"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Order Notes */}
            <Card className="p-6">
              <h2 className="text-lg font-bold mb-4">Notas del Pedido</h2>
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Instrucciones especiales para tu pedido (opcional)"
                rows={3}
              />
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-bold mb-4">Resumen</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal ({totalItems} productos)</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-green-600">Gratis</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[#071d7f]">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              {selectedAddressData && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Enviar a:</p>
                  <p className="text-sm font-medium">{selectedAddressData.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAddressData.city}, {selectedAddressData.country}</p>
                </div>
              )}

              <Button
                onClick={handlePlaceOrder}
                disabled={isProcessing || !selectedAddress || addresses.length === 0}
                className="w-full mt-6 bg-[#071d7f] hover:bg-[#0a2a9f]"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Pedido
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-3">
                Al confirmar, aceptas nuestros términos y condiciones
              </p>
            </Card>
          </div>
        </div>
      </main>

      {!isMobile && <Footer />}
      
      <AddressesDialog open={showAddressDialog} onOpenChange={setShowAddressDialog} />
    </div>
  );
};

export default CheckoutPage;

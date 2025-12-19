import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useB2BCartSupabase } from '@/hooks/useB2BCartSupabase';
import { useKYC } from '@/hooks/useKYC';
import { useSellerCredits } from '@/hooks/useSellerCredits';
import { useAddresses, Address } from '@/hooks/useAddresses';
import { SellerLayout } from '@/components/seller/SellerLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Smartphone,
  Building2,
  Loader2,
  AlertCircle,
  ShoppingBag,
  Copy,
  Wallet,
  Info,
  MapPin,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

type PaymentMethod = 'stripe' | 'moncash' | 'transfer';

const SellerCheckout = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { cart, isLoading: cartLoading, createOrder, markOrderAsPaid, clearCart } = useB2BCartSupabase();
  const { isVerified } = useKYC();
  const { credit, availableCredit, hasActiveCredit, calculateMaxCreditForCart } = useSellerCredits();
  const { addresses, isLoading: addressesLoading, createAddress } = useAddresses();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [creditAmount, setCreditAmount] = useState(0);
  const [useSiverCredit, setUseSiverCredit] = useState(false);
  
  // Shipping address states
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Negocio',
    full_name: '',
    phone: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Haití',
    notes: '',
  });

  // Set default address on load
  useState(() => {
    const defaultAddress = addresses.find(a => a.is_default);
    if (defaultAddress && !selectedAddressId) {
      setSelectedAddressId(defaultAddress.id);
    }
  });

  // Calculate max credit for current cart (never 100% - max is what admin configured, typically less)
  const maxCreditAmount = calculateMaxCreditForCart(cart.subtotal);
  const remainingToPay = cart.subtotal - creditAmount;

  // Can use credit only if verified and has active credit
  const canUseCredit = isVerified && hasActiveCredit && maxCreditAmount > 0;

  // Payment method details (no siver_credit as standalone)
  const paymentMethods = [
    {
      id: 'stripe' as PaymentMethod,
      name: 'Tarjeta de Crédito (Stripe)',
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
      description: 'Transferencia directa a nuestra cuenta',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  // Bank details for transfer
  const bankDetails = {
    bank: 'Banco Nacional de Haití',
    account: '001-234567-89',
    beneficiary: 'Siver Market 509 SRL',
    swift: 'BNHAHTHX',
  };

  // MonCash details
  const moncashDetails = {
    number: '+509 3XXX XXXX',
    name: 'Siver Market 509',
  };

  const isLoading = authLoading || cartLoading || addressesLoading;

  // Get selected address
  const selectedAddress = addresses.find(a => a.id === selectedAddressId);

  // Handle saving new address
  const handleSaveNewAddress = async () => {
    if (!newAddress.full_name || !newAddress.street_address || !newAddress.city) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    
    try {
      const result = await createAddress.mutateAsync({
        ...newAddress,
        is_default: addresses.length === 0,
      });
      setSelectedAddressId(result.id);
      setShowNewAddressForm(false);
      setNewAddress({
        label: 'Negocio',
        full_name: '',
        phone: '',
        street_address: '',
        city: '',
        state: '',
        postal_code: '',
        country: 'Haití',
        notes: '',
      });
    } catch (error) {
      console.error('Error creating address:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (cart.totalItems === 0 && !orderPlaced) {
    return (
      <SellerLayout>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 pb-8">
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 text-center">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h1 className="text-2xl font-bold mb-4">Carrito Vacío</h1>
                <p className="text-muted-foreground mb-8">
                  No tienes productos en tu carrito. Vuelve al catálogo para continuar comprando.
                </p>
                <Button asChild>
                  <Link to="/seller/adquisicion-lotes">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Catálogo
                  </Link>
                </Button>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SellerLayout>
    );
  }

  if (orderPlaced) {
    return (
      <SellerLayout>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 pb-8">
            <div className="max-w-2xl mx-auto">
              <Card className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold mb-2">¡Pedido Confirmado!</h1>
                <p className="text-muted-foreground mb-4">
                  Tu pedido ha sido creado exitosamente.
                </p>
                {orderId && (
                  <div className="bg-muted p-4 rounded-lg mb-6">
                    <p className="text-sm text-muted-foreground">ID del Pedido</p>
                    <p className="font-mono font-bold">{orderId.slice(0, 8).toUpperCase()}</p>
                  </div>
                )}
                
                {paymentMethod !== 'stripe' && (
                  <div className="text-left bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-yellow-800">Pendiente de Verificación</p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Tu pedido está pendiente de verificación de pago. 
                          Los productos serán agregados a tu catálogo una vez confirmado el pago.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild variant="outline">
                    <Link to="/seller/catalogo">Ver Mi Catálogo</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/seller/adquisicion-lotes">Continuar Comprando</Link>
                  </Button>
                </div>
              </Card>
            </div>
          </main>
          <Footer />
        </div>
      </SellerLayout>
    );
  }

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    // Validate payment reference for non-Stripe methods
    if (paymentMethod !== 'stripe' && !paymentReference.trim()) {
      toast.error('Ingresa la referencia de pago');
      return;
    }

    // Validate that remaining amount is positive (credit can't cover 100%)
    if (useSiverCredit && creditAmount > 0 && remainingToPay <= 0) {
      toast.error('El crédito no puede cubrir el 100% del pedido');
      return;
    }

    setIsProcessing(true);

    try {
      // Create the order with the primary payment method
      const order = await createOrder(paymentMethod);

      if (!order) {
        throw new Error('Error al crear el pedido');
      }

      setOrderId(order.id);

      // Handle Siver Credit as complement (if used)
      if (useSiverCredit && creditAmount > 0) {
        const { data: currentCredit } = await supabase
          .from('seller_credits')
          .select('balance_debt')
          .eq('user_id', user.id)
          .single();

        if (currentCredit) {
          const newDebt = Number(currentCredit.balance_debt) + creditAmount;
          
          // Update debt
          await supabase
            .from('seller_credits')
            .update({ balance_debt: newDebt })
            .eq('user_id', user.id);
          
          // Record movement
          await supabase
            .from('credit_movements')
            .insert({
              user_id: user.id,
              movement_type: 'purchase',
              amount: creditAmount,
              balance_before: currentCredit.balance_debt,
              balance_after: newDebt,
              reference_id: order.id,
              description: `Crédito aplicado - Pedido ${order.id.slice(0, 8).toUpperCase()} (Pago combinado)`,
            });
        }
      }

      // Handle payment completion based on method
      if (paymentMethod === 'stripe') {
        // For Stripe, simulate payment success
        const paid = await markOrderAsPaid(order.id);
        if (paid) {
          toast.success(useSiverCredit && creditAmount > 0 
            ? 'Pago procesado con crédito combinado' 
            : 'Pago procesado correctamente');
        }
      } else {
        // For MonCash/Transfer, order stays pending until admin verifies
        toast.success(useSiverCredit && creditAmount > 0
          ? 'Pedido creado con crédito aplicado. Pago restante pendiente de verificación.'
          : 'Pedido creado. Pendiente de verificación de pago.');
      }

      setOrderPlaced(true);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Error al procesar el pedido');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <SellerLayout>
      <div className="min-h-screen bg-background">
        <Header />

        <main className="container mx-auto px-4 pb-8">
          <div className="mb-8">
            <Link
              to="/seller/adquisicion-lotes"
              className="flex items-center gap-2 text-primary hover:underline mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Catálogo
            </Link>
            <h1 className="text-3xl font-bold">Checkout B2B</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Seller Info */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Información del Comprador</h2>
                <div className="space-y-2 text-muted-foreground">
                  <p>
                    <span className="font-semibold text-foreground">Nombre:</span>{' '}
                    {user?.name || 'N/A'}
                  </p>
                  <p>
                    <span className="font-semibold text-foreground">Email:</span>{' '}
                    {user?.email}
                  </p>
                </div>
              </Card>

              {/* Shipping Address */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Dirección de Envío
                </h2>
                
                {addresses.length > 0 && !showNewAddressForm ? (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        onClick={() => setSelectedAddressId(address.id)}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedAddressId === address.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold">{address.full_name}</span>
                              {address.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Predeterminada
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {address.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {address.street_address}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.city}{address.state ? `, ${address.state}` : ''}{address.postal_code ? ` ${address.postal_code}` : ''}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {address.country}
                            </p>
                            {address.phone && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Tel: {address.phone}
                              </p>
                            )}
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
                              selectedAddressId === address.id
                                ? 'border-primary bg-primary'
                                : 'border-muted-foreground'
                            }`}
                          >
                            {selectedAddressId === address.id && (
                              <Check className="h-full w-full text-primary-foreground p-0.5" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <Button
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setShowNewAddressForm(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Nueva Dirección
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {addresses.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewAddressForm(false)}
                        className="mb-2"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver a direcciones guardadas
                      </Button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address_name">Nombre completo *</Label>
                        <Input
                          id="address_name"
                          placeholder="Nombre del destinatario"
                          value={newAddress.full_name}
                          onChange={(e) => setNewAddress({ ...newAddress, full_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_phone">Teléfono</Label>
                        <Input
                          id="address_phone"
                          placeholder="+509 XXXX XXXX"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address_street">Dirección *</Label>
                      <Input
                        id="address_street"
                        placeholder="Calle, número, local..."
                        value={newAddress.street_address}
                        onChange={(e) => setNewAddress({ ...newAddress, street_address: e.target.value })}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="address_city">Ciudad *</Label>
                        <Input
                          id="address_city"
                          placeholder="Ciudad"
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_state">Departamento</Label>
                        <Input
                          id="address_state"
                          placeholder="Departamento"
                          value={newAddress.state}
                          onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address_postal">Código postal</Label>
                        <Input
                          id="address_postal"
                          placeholder="Código postal"
                          value={newAddress.postal_code}
                          onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="address_notes">Notas de entrega</Label>
                      <Textarea
                        id="address_notes"
                        placeholder="Instrucciones especiales para el repartidor..."
                        value={newAddress.notes}
                        onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    
                    <Button
                      onClick={handleSaveNewAddress}
                      disabled={createAddress.isPending}
                      className="w-full"
                    >
                      {createAddress.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Guardar Dirección
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </Card>


              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  Productos ({cart.items.length})
                </h2>
                <div className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex gap-4 pb-4 border-b last:border-b-0"
                    >
                      <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{item.nombre}</p>
                        <p className="text-sm text-muted-foreground mb-1">
                          SKU: {item.sku}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>{item.quantity} unidades</span>
                          <span>×</span>
                          <span>${item.unitPrice.toFixed(2)}</span>
                          <span>=</span>
                          <span className="font-semibold text-primary">
                            ${item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Payment Method */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Método de Pago</h2>
                
                {/* Show KYC prompt if not verified */}
                {!isVerified && (
                  <Alert className="mb-4 border-purple-300 bg-purple-50 dark:bg-purple-950/30">
                    <Info className="h-4 w-4 text-purple-600" />
                    <AlertDescription className="text-purple-700 dark:text-purple-300">
                      <span className="font-semibold">¿Quieres pagar con crédito?</span>{' '}
                      <Link to="/seller/kyc" className="underline">Verifica tu identidad</Link> para acceder al Crédito Siver.
                    </AlertDescription>
                  </Alert>
                )}

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
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${method.bgColor}`}>
                          <Icon className={`h-5 w-5 ${method.color}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{method.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {method.description}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground'
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-full w-full text-primary-foreground p-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Siver Credit Section - Always visible for verified users */}
                {canUseCredit && (
                  <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-purple-600" />
                        Complementar con Crédito Siver
                        <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                          Opcional
                        </Badge>
                      </h3>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useSiverCredit}
                          onChange={(e) => {
                            setUseSiverCredit(e.target.checked);
                            if (!e.target.checked) setCreditAmount(0);
                          }}
                          className="w-4 h-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm">Usar crédito</span>
                      </label>
                    </div>
                    
                    {useSiverCredit && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-muted-foreground">Crédito disponible:</span>
                            <span className="font-medium">${availableCredit.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm mb-4">
                            <span className="text-muted-foreground">Máximo para este pedido ({credit?.max_cart_percentage}%):</span>
                            <span className="font-medium">${maxCreditAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm">Monto de crédito a usar: ${creditAmount.toFixed(2)}</Label>
                          <Slider
                            value={[creditAmount]}
                            onValueChange={(values) => setCreditAmount(values[0])}
                            max={maxCreditAmount}
                            step={1}
                            className="mt-2"
                          />
                        </div>

                        {creditAmount > 0 && (
                          <div className="pt-3 border-t border-purple-200">
                            <div className="flex justify-between text-sm">
                              <span>Total del pedido:</span>
                              <span>${cart.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-purple-600">
                              <span>Crédito Siver aplicado:</span>
                              <span>-${creditAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold mt-2 pt-2 border-t text-primary">
                              <span>A pagar con {paymentMethods.find(m => m.id === paymentMethod)?.name}:</span>
                              <span>${remainingToPay.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              El crédito usado se agregará a tu deuda. El resto debe pagarse con el método seleccionado.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {!useSiverCredit && (
                      <p className="text-sm text-muted-foreground">
                        Activa esta opción para usar parte de tu crédito disponible (${availableCredit.toFixed(2)}) y reducir el monto a pagar.
                      </p>
                    )}
                  </div>
                )}

                {/* Payment Instructions */}
                {paymentMethod === 'transfer' && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Datos para Transferencia</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Banco:</span>
                        <span className="font-medium">{bankDetails.bank}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Cuenta:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{bankDetails.account}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(bankDetails.account)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Beneficiario:</span>
                        <span className="font-medium">{bankDetails.beneficiary}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">SWIFT:</span>
                        <span className="font-mono font-medium">{bankDetails.swift}</span>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'moncash' && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-3">Datos MonCash</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Número:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{moncashDetails.number}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => copyToClipboard(moncashDetails.number)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Nombre:</span>
                        <span className="font-medium">{moncashDetails.name}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Reference (for non-Stripe methods) */}
                {paymentMethod !== 'stripe' && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <Label htmlFor="payment-reference">
                        Referencia de Pago *
                      </Label>
                      <Input
                        id="payment-reference"
                        placeholder="Ej: Número de transacción o confirmación"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment-notes">Notas (opcional)</Label>
                      <Textarea
                        id="payment-notes"
                        placeholder="Información adicional sobre el pago"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-8">
                <h3 className="text-lg font-bold mb-4">Resumen del Pedido</h3>

                <div className="space-y-3 mb-6 pb-6 border-b">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-foreground">
                      ${cart.subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Unidades:</span>
                    <span className="font-semibold text-foreground">
                      {cart.totalQuantity}
                    </span>
                  </div>
                </div>

                {useSiverCredit && creditAmount > 0 && (
                  <div className="space-y-2 mb-4 pb-4 border-b">
                    <div className="flex justify-between text-sm text-purple-600">
                      <span>Crédito Siver:</span>
                      <span className="font-medium">-${creditAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-xl font-bold mb-6">
                  <span>Total a Pagar:</span>
                  <span className="text-primary">
                    ${remainingToPay.toFixed(2)}
                  </span>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || cart.totalItems === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Al confirmar, aceptas los términos de servicio
                </p>

                {useSiverCredit && creditAmount > 0 && (
                  <Badge variant="outline" className="w-full justify-center mt-4 border-purple-300 text-purple-600">
                    Pago combinado con crédito
                  </Badge>
                )}

                {paymentMethod !== 'stripe' && (
                  <Badge variant="outline" className="w-full justify-center mt-4">
                    Verificación manual requerida
                  </Badge>
                )}
              </Card>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </SellerLayout>
  );
};

export default SellerCheckout;

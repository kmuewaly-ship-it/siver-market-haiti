import { useState } from "react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, Trash2, Package, AlertCircle, MessageCircle, X, Banknote, Wallet, DollarSign } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useB2BCartItems } from "@/hooks/useB2BCartItems";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo } from "react";

const SellerCartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, isLoading, refetch } = useB2BCartItems();
  const isMobile = useIsMobile();
  const [showClearCartDialog, setShowClearCartDialog] = useState(false);
  const [showRemoveItemDialog, setShowRemoveItemDialog] = useState(false);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; name: string } | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.cantidad, 0);

  // Calculate profit analysis
  const profitAnalysis = useMemo(() => {
    let totalInversion = 0; // Total cost (precio B2B * cantidad)
    let totalVenta = 0;      // Total retail (precio de venta * cantidad)
    let ganancia = 0;        // Profit (totalVenta - totalInversion)
    let margen = 0;          // Profit margin percentage

    items.forEach(item => {
      const costoItem = item.precioB2B * item.cantidad;
      const precioVenta = item.precioVenta || item.precioB2B; // Fallback to B2B price if no retail price
      const ventaItem = precioVenta * item.cantidad;
      
      totalInversion += costoItem;
      totalVenta += ventaItem;
    });

    ganancia = totalVenta - totalInversion;
    margen = totalInversion > 0 ? (ganancia / totalInversion) * 100 : 0;

    return {
      inversion: totalInversion,
      venta: totalVenta,
      ganancia: ganancia,
      margen: margen
    };
  }, [items]);

  // Get unique payment methods - Default to Tarjetas, Transferencia, MonCash, NatCash
  const paymentMethods = useMemo(() => {
    return ['Tarjetas', 'Transferencia', 'MonCash', 'NatCash'];
  }, []);

  // Map payment method names to display info
  const getPaymentMethodDisplay = (method: string) => {
    const methodMap: Record<string, { label: string; color: string; icon?: string }> = {
      'tarjetas': { label: 'Tarjetas', color: '#1435CB', icon: 'card' },
      'transferencia': { label: 'Transferencia', color: '#071d7f', icon: 'bank' },
      'moncash': { label: 'MonCash', color: '#94111f', icon: 'wallet' },
      'natcash': { label: 'NatCash', color: '#1e40af', icon: 'wallet' },
    };

    const lowerMethod = method.toLowerCase();
    return methodMap[lowerMethod] || { label: method, color: '#6B7280', icon: 'wallet' };
  };

  // Remove item from cart after confirmation
  const removeItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('b2b_cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Producto eliminado del carrito');
      setShowRemoveItemDialog(false);
      setItemToRemove(null);
      refetch();
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('No se pudo eliminar el producto');
    }
  };

  // Update item quantity
  const updateQuantity = async (itemId: string, newQty: number) => {
    if (newQty < 1) {
      await removeItem(itemId);
      return;
    }

    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const newSubtotal = item.precioB2B * newQty;

      const { error } = await supabase
        .from('b2b_cart_items')
        .update({
          quantity: newQty,
          total_price: newSubtotal
        })
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Cantidad actualizada');
      refetch();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('No se pudo actualizar la cantidad');
    }
  };

  // Show confirmation dialog for removing item
  const handleRemoveItem = (itemId: string, itemName: string) => {
    setItemToRemove({ id: itemId, name: itemName });
    setShowRemoveItemDialog(true);
  };

  // Show confirmation dialog for clearing cart
  const handleClearCart = () => {
    setShowClearCartDialog(true);
  };

  // Clear entire cart after confirmation
  const clearCart = async () => {
    try {
      if (!user?.id) {
        toast.error('Usuario no identificado');
        return;
      }

      // Get all cart IDs for this user
      const { data: carts } = await supabase
        .from('b2b_carts')
        .select('id')
        .eq('buyer_user_id', user.id)
        .eq('status', 'open');

      if (carts && carts.length > 0) {
        for (const cart of carts) {
          await supabase
            .from('b2b_cart_items')
            .delete()
            .eq('cart_id', cart.id);
        }
      }

      toast.success('Carrito vaciado');
      setShowClearCartDialog(false);
      refetch();
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error al vaciar carrito');
    }
  };

  const handleWhatsAppContact = async () => {
    try {
      // Get admin WhatsApp number from settings
      const { data: settingsData } = await supabase
        .from('price_settings')
        .select('value')
        .eq('key', 'admin_whatsapp')
        .maybeSingle();

      const adminWhatsApp = settingsData?.value?.toString() || '50937000000';
      const whatsappUrl = `https://wa.me/${adminWhatsApp}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      toast.error('Error al abrir WhatsApp');
    }
  };

  return (
    <SellerLayout>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Fixed Cart Section - Top (Only Mobile) */}
        {items.length > 0 && isMobile && (
          <div className="sticky top-0 z-40 bg-white shadow-md border-b border-gray-200">
            <div className="container mx-auto px-4 py-2">
              {/* Header */}
              <div 
                className="text-gray-900 p-1.5 rounded-lg flex items-center gap-1.5 bg-white border-b border-gray-200"
              >
                <ShoppingCart className="w-4 h-4" />
                <h1 className="font-bold text-sm">Carrito B2B</h1>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-bold">
                  {items.length}
                </span>
              </div>

              {/* Summary */}
              <div className="mt-2 flex items-center justify-between text-xs bg-gray-50 p-2 rounded-lg border border-gray-200">
                <div className="flex gap-4">
                  <div>
                    <span className="text-gray-900">Total Items:</span>
                    <span className="font-bold ml-1 text-gray-900">{items.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-900">Unidades:</span>
                    <span className="font-bold ml-1 text-gray-900">{totalQuantity}</span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-900">Total:</span>
                  <span className="font-bold ml-1 text-gray-900">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className={`flex-1 ${isMobile ? 'container mx-auto px-4 pb-40' : 'max-w-7xl mx-auto px-4 py-6'}`}>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
              <p className="text-xs text-gray-500 mb-4">Visita el catálogo de lotes para abastecer tu inventario</p>
              <Button asChild style={{ backgroundColor: '#071d7f' }} className="text-white hover:opacity-90">
                <Link to="/seller/adquisicion-lotes">Ir al Catálogo</Link>
              </Button>
            </div>
          ) : !isMobile ? (
            // PC LAYOUT - Two columns
            <div className="grid grid-cols-3 gap-6">
              {/* Left Column - Items (2/3) */}
              <div className="lg:col-span-2">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h2 className="font-bold text-lg text-gray-900">Productos ({items.length})</h2>
                    <p className="text-xs text-gray-600 mt-1">Cantidad: {totalQuantity}</p>
                  </div>

                  <div className="p-3 space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/producto/${item.sku}`)}
                        className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-white cursor-pointer"
                      >
                        <div className="flex gap-3">
                          {/* Product Image */}
                          <div className="w-18 h-18 flex-shrink-0 rounded-md bg-muted overflow-hidden" style={{ width: '72px', height: '72px' }}>
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              </div>
                            )}
                          </div>
                          
                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 line-clamp-2">
                                  {item.name}
                                </p>
                                <p className="text-xs text-gray-600 mt-0.5">Cantidad: {item.cantidad}</p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(item.id, item.name);
                                }}
                                className="text-gray-400 hover:text-red-600 transition ml-2 flex-shrink-0"
                                title="Eliminar del carrito"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Price and Quantity */}
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold" style={{ color: '#29892a' }}>
                                  ${item.precioB2B.toFixed(2)}
                                </span>
                              </div>
                              <span className="text-sm font-bold" style={{ color: '#071d7f' }}>
                                ${item.subtotal.toFixed(2)}
                              </span>
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 mt-2 w-fit">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, Math.max(1, item.cantidad - 1));
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-xs font-medium">
                                {item.cantidad}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.id, item.cantidad + 1);
                                }}
                                className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Order Summary (1/3) */}
              <div className="lg:col-span-1">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden sticky top-20">
                  {/* Summary Header */}
                  <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <h2 className="font-bold text-lg text-gray-900">Resumen del Pedido</h2>
                    <p className="text-xs text-gray-600 mt-1">Procesa descuentos y asientos luego confirmar precio final</p>
                  </div>

                  {/* Pricing Details */}
                  <div className="p-4 space-y-3 border-b border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Precio Mayorista:</span>
                      <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Promociones:</span>
                      <span className="font-semibold text-red-600">—</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Cupón:</span>
                      <span className="font-semibold text-blue-600">—</span>
                    </div>
                  </div>

                  {/* Total Price */}
                  <div className="p-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 font-medium">Precio Estimado:</span>
                      <span className="text-2xl font-bold" style={{ color: '#071d7f' }}>
                        ${subtotal.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Se confirma el precio final en confirmar pedido</p>
                  </div>

                  {/* Business Analysis Panel */}
                  <div className="p-4 bg-white border-b border-gray-200">
                    <p className="text-sm font-bold text-gray-900 mb-3">PANEL DE NEGOCIO</p>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Inversión:</span>
                        <span className="font-semibold text-gray-900">${profitAnalysis.inversion.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Venta (PVP):</span>
                        <span className="font-semibold text-gray-900">${profitAnalysis.venta.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t pt-2 mt-2">
                        <span className="text-gray-600 font-medium">
                          {profitAnalysis.ganancia >= 0 ? '📈 Ganancia:' : '📉 Pérdida:'}
                        </span>
                        <div className="text-right">
                          <div className="font-bold" style={{ color: profitAnalysis.ganancia >= 0 ? '#29892a' : '#dc2626' }}>
                            {profitAnalysis.ganancia >= 0 ? '+' : ''}{profitAnalysis.ganancia.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-semibold" style={{ color: profitAnalysis.margen >= 0 ? '#29892a' : '#dc2626' }}>
                            {profitAnalysis.margen.toFixed(0)}% margen
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Aceptamos:</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {/* Credit Cards Section - Show individual card types */}
                      {paymentMethods.includes('Tarjetas') && (
                        <>
                          {/* VISA */}
                          <div 
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                            title="VISA"
                          >
                            <img src="/visa.png" alt="VISA" className="h-5 w-auto" />
                          </div>

                          {/* MASTERCARD */}
                          <div 
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                            title="Mastercard"
                          >
                            <img src="/mastercard.png" alt="Mastercard" className="h-5 w-auto" />
                          </div>

                          {/* AMEX */}
                          <div 
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                            title="American Express"
                          >
                            <img src="/american express.png" alt="American Express" className="h-5 w-auto" />
                          </div>

                          {/* APPLE PAY */}
                          <div 
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                            title="Apple Pay"
                          >
                            <img src="/apple pay.png" alt="Apple Pay" className="h-5 w-auto" />
                          </div>

                          {/* GOOGLE PAY */}
                          <div 
                            className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                            title="Google Pay"
                          >
                            <img src="/google pay.png" alt="Google Pay" className="h-5 w-auto" />
                          </div>
                        </>
                      )}

                      {/* Transferencia */}
                      {paymentMethods.includes('Transferencia') && (
                        <div 
                          className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                          title="Transferencia Bancaria"
                        >
                          <Banknote className="h-5 w-5" style={{ color: '#071d7f' }} />
                        </div>
                      )}

                      {/* MonCash */}
                      {paymentMethods.includes('MonCash') && (
                        <div 
                          className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                          title="MonCash"
                        >
                          <Banknote className="h-5 w-5" style={{ color: '#94111f' }} />
                        </div>
                      )}

                      {/* NatCash */}
                      {paymentMethods.includes('NatCash') && (
                        <div 
                          className="bg-white border border-gray-200 rounded p-2 flex flex-col items-center justify-center hover:border-gray-300 transition"
                          title="NatCash"
                        >
                          <Banknote className="h-5 w-5" style={{ color: '#1e40af' }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkout Button and Support */}
                  <div className="p-4 flex gap-3 justify-center">
                    <button
                      onClick={handleWhatsAppContact}
                      className="px-6 py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 bg-transparent border border-gray-300"
                      style={{ color: '#29892a' }}
                      title="Contactar por WhatsApp"
                    >
                      <MessageCircle className="w-5 h-5" style={{ color: '#29892a' }} />
                      WhatsApp
                    </button>
                    <Link
                      to="/seller/checkout"
                      className="px-6 py-3 rounded-lg font-bold text-white transition hover:opacity-90 flex items-center justify-center gap-2 shadow-lg"
                      style={{ backgroundColor: '#071d7f' }}
                    >
                      <ShoppingCart className="w-5 h-5" />
                      Comprar ({totalQuantity})
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // MOBILE LAYOUT - Keep as original
            <>
              {/* Items */}
              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-1 space-y-0 bg-white" style={{ backgroundColor: '#d9d9d9' }}>
                    {items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/producto/${item.sku}`)}
                        className="border-b border-gray-200 last:border-b-0 p-1 hover:bg-gray-100 transition flex gap-2 cursor-pointer"
                        style={{ backgroundColor: 'white' }}
                      >
                        {/* Product Image */}
                        <div className="flex-shrink-0 rounded-md bg-muted overflow-hidden" style={{ width: '70px', height: '70px' }}>
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm text-gray-900 line-clamp-1">
                                  {item.name}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveItem(item.id, item.name);
                                }}
                                className="text-gray-400 hover:text-red-600 transition ml-2 flex-shrink-0"
                                title="Eliminar del carrito"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Price */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: '#29892a' }}>
                                ${item.precioB2B.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, Math.max(1, item.cantidad - 1));
                                  }}
                                  className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-medium">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateQuantity(item.id, item.cantidad + 1);
                                  }}
                                  className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-sm font-bold" style={{ color: '#071d7f' }}>
                                ${item.subtotal.toFixed(2)}
                              </span>
                            </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </>
            )}
        </main>

        {/* Botones Fijos - Solo Mobile */}
        {items.length > 0 && isMobile && (
          <div className="fixed left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 bottom-10 z-40 flex justify-center">
            <div className="rounded-lg p-2 border border-gray-300 shadow-md w-full" style={{ backgroundColor: '#efefef' }}>
              <div className="flex gap-2 justify-between">
                {/* Botón WhatsApp */}
                <button
                  onClick={handleWhatsAppContact}
                  className="px-3 py-2 rounded-lg font-semibold text-sm transition shadow-lg hover:bg-gray-100 flex items-center justify-center gap-1.5 border border-gray-300 bg-transparent"
                  style={{ color: '#29892a' }}
                  title="Contactar por WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" style={{ color: '#29892a' }} />
                  WhatsApp
                </button>

                {/* Botón Comprar B2B */}
                <Link
                  to="/seller/checkout"
                  className="px-4 py-2 rounded-lg font-semibold text-sm transition shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5 text-white"
                  style={{ backgroundColor: '#071d7f' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Comprar B2B ({totalQuantity})
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clear Cart Confirmation Dialog */}
      <AlertDialog open={showClearCartDialog} onOpenChange={setShowClearCartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vaciar carrito</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar todos los productos de tu carrito B2B? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearCart()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Vaciar carrito
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Item Confirmation Dialog */}
      <AlertDialog open={showRemoveItemDialog} onOpenChange={setShowRemoveItemDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar producto</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas eliminar "{itemToRemove?.name}" de tu carrito B2B?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToRemove && removeItem(itemToRemove.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </SellerLayout>
  );
};

export default SellerCartPage;

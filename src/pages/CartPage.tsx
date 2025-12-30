import GlobalHeader from "@/components/layout/GlobalHeader";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Package, MessageCircle } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useB2CCartItems } from "@/hooks/useB2CCartItems";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { UserRole } from "@/types/auth";

const CartPage = () => {
  const navigate = useNavigate();
  const { items, isLoading } = useB2CCartItems();
  const isMobile = useIsMobile();
  const { user, role } = useAuth();
  const [isNegotiating, setIsNegotiating] = useState(false);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Redirect sellers/admins to B2B cart
  const isB2BUser = role === UserRole.SELLER || role === UserRole.ADMIN;
  if (isB2BUser) {
    return <Navigate to="/seller/carrito" replace />;
  }

  // Stub functions for now
  const removeItem = (itemId: string) => {
    toast.message('Funcionalidad próximamente');
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    toast.message('Funcionalidad próximamente');
  };

  const clearCart = () => {
    toast.message('Funcionalidad próximamente');
  };

  // Group items by store
  const itemsByStore = useMemo(() => {
    const grouped = new Map<string, typeof items>();
    items.forEach(item => {
      const storeKey = item.storeId || 'unknown';
      const existing = grouped.get(storeKey) || [];
      grouped.set(storeKey, [...existing, item]);
    });
    return grouped;
  }, [items]);

  const handleNegotiate = (storeItems: typeof items) => {
    const storeName = storeItems[0]?.storeName || 'Vendedor';
    const storeWhatsapp = storeItems[0]?.storeWhatsapp;
    const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const storeQty = storeItems.reduce((sum, item) => sum + item.quantity, 0);
    const customerName = user?.name || 'Cliente';
    
    const itemsList = storeItems
      .map((item, idx) => `${idx + 1}. ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`)
      .join('\n');
    
    const message = `📱 *Consulta de Pedido - ${storeName}*\n\n` +
      `Cliente: ${customerName}\n\n` +
      `*Detalle del pedido:*\n${itemsList}\n\n` +
      `*Total:* $${storeTotal.toFixed(2)}\n` +
      `*Unidades:* ${storeQty}\n\n` +
      `Me gustaría consultar sobre este pedido. ¿Está disponible?`;
    
    const whatsappUrl = `https://wa.me/${storeWhatsapp?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleWhatsAppSupport = () => {
    const customerName = user?.name || 'Cliente';
    const cartSummary = Array.from(itemsByStore.entries())
      .map(([_, storeItems]) => {
        const storeName = storeItems[0]?.storeName || 'Tienda';
        const items_text = storeItems
          .map((item, idx) => `• ${item.name} x${item.quantity}`)
          .join('\n');
        return `*${storeName}:*\n${items_text}`;
      })
      .join('\n\n');
    
    const message = `¡Hola! Soy ${customerName}\n\n` +
      `Tengo una consulta sobre mi carrito de compra:\n\n` +
      `${cartSummary}\n\n` +
      `*Total:* $${totalPrice.toFixed(2)}\n` +
      `*Unidades:* ${totalQuantity}\n\n` +
      `¿Podrían ayudarme?`;
    
    // Número de soporte (reemplazar con número real de soporte)
    const supportPhone = '5712345678'; // Cambiar al número real de soporte
    const whatsappUrl = `https://wa.me/${supportPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <GlobalHeader />}
      
      {/* Fixed Cart Header - Top */}
      {items.length > 0 && (
        <div className="sticky top-0 z-40 bg-white shadow-md border-b border-gray-200">
          <div className="container mx-auto px-4 py-2">
            {/* Header */}
            <div 
              className="text-gray-900 p-1.5 rounded-lg flex items-center gap-1.5 bg-white border-b border-gray-200"
            >
              <ShoppingCart className="w-4 h-4" />
              <h1 className="font-bold text-sm">Mi Carrito</h1>
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
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'pb-40' : 'pb-20'}`}>
        {items.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
            <p className="text-xs text-gray-500 mb-4">Explora el catálogo para encontrar productos</p>
            <Button asChild style={{ backgroundColor: '#071d7f' }} className="text-white hover:opacity-90">
              <Link to="/catalogo">Ir al Catálogo</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Items Grouped by Store */}
            {Array.from(itemsByStore.entries()).map(([storeId, storeItems]) => {
              const storeName = storeItems[0]?.storeName || 'Tienda';
              const storeWhatsapp = storeItems[0]?.storeWhatsapp;
              const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

              return (
                <div key={storeId} className="mb-4">
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Store Header */}
                    <div className="p-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-gray-600" />
                        <h3 className="font-semibold text-sm text-gray-900">{storeName}</h3>
                      </div>
                      <button
                        onClick={() => handleNegotiate(storeItems)}
                        className="p-1.5 hover:bg-green-100 rounded transition flex-shrink-0"
                        title={`Contactar a ${storeName}`}
                      >
                        <MessageCircle className="w-5 h-5" style={{ color: '#29892a' }} />
                      </button>
                    </div>

                    {/* Store Items */}
                    <div className="p-1 space-y-0 bg-white" style={{ backgroundColor: '#d9d9d9' }}>
                      {storeItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => navigate(`/producto/${item.sellerCatalogId || item.sku}`)}
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
                                onClick={() => removeItem(item.id)}
                                className="text-gray-400 hover:text-red-600 transition ml-2 flex-shrink-0"
                                title="Eliminar del carrito"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            
                            {/* Price */}
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: '#29892a' }}>
                                ${item.price.toFixed(2)}
                              </span>
                            </div>
                            
                            {/* Quantity Controls */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                                <button
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                                >
                                  +
                                </button>
                              </div>
                              <span className="text-sm font-bold" style={{ color: '#071d7f' }}>
                                ${(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Store Actions */}
                    {storeWhatsapp && (
                      <Button
                        variant="outline"
                        onClick={() => handleNegotiate(storeItems)}
                        className="w-full border-green-500 text-green-600 hover:bg-green-50 gap-2"
                        size="sm"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Consultar a {storeName}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </main>

      {/* Botones Fijos - Comprar y Vaciar */}
      {items.length > 0 && (
        <div className={`fixed left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 ${isMobile ? 'bottom-10' : 'bottom-4'} z-40 flex justify-center`}>
          <div className="rounded-lg p-2 border border-gray-300 shadow-md w-full" style={{ backgroundColor: '#efefef' }}>
            <div className="flex gap-2 justify-between">
              {/* Botón WhatsApp */}
              <button
                onClick={handleWhatsAppSupport}
                className="px-3 py-2 rounded-lg font-semibold text-sm transition hover:bg-gray-200 border border-gray-300 flex items-center justify-center gap-1.5"
                style={{ color: '#29892a' }}
                title="Contactar por WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                Soporte
              </button>

              {/* Botón Comprar */}
              <Link
                to="/checkout"
                className="px-4 py-2 rounded-lg font-semibold text-sm transition shadow-lg hover:opacity-90 flex items-center justify-center gap-1.5 text-white"
                style={{ backgroundColor: '#071d7f' }}
              >
                <ShoppingCart className="w-4 h-4" />
                Comprar ({totalQuantity})
              </Link>
            </div>
          </div>
        </div>
      )}

      {!isMobile && <Footer />}
    </div>
  );
};

export default CartPage;

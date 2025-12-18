import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Package, AlertCircle, MessageCircle, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { useCart } from "@/hooks/useCart";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const CartPage = () => {
  const { items, removeItem, updateQuantity, totalPrice, clearCart, getItemsByStore } = useCart();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNegotiating, setIsNegotiating] = useState(false);
  const totalQuantity = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <Header />}
      <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        {/* Header */}
        <div 
          className="text-white p-4 rounded-t-lg flex items-center gap-2 mb-0"
          style={{ backgroundColor: '#071d7f' }}
        >
          <ShoppingCart className="w-6 h-6" />
          <h1 className="font-bold text-lg">Mi Carrito</h1>
          {items.length > 0 && (
            <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
              {items.length}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="bg-white rounded-b-lg shadow-lg p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
              <p className="text-xs text-gray-500 mb-4">¡Explora nuestros productos y encuentra algo que te guste!</p>
              <Button asChild style={{ backgroundColor: '#071d7f' }} className="text-white hover:opacity-90">
                <Link to="/">Ir a comprar</Link>
              </Button>
            </div>
          ) : (
            <>
              {/* Aviso importante */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Revisa el total antes de proceder al pago. Puedes modificar cantidades.
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-white"
                  >
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="flex-shrink-0 rounded-md bg-muted overflow-hidden" style={{ width: '72px', height: '72px' }}>
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
                            <p className="font-medium text-sm text-gray-900 line-clamp-1">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            {/* Store Badge */}
                            {item.storeName && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium mt-1">
                                <Store className="w-3 h-3" />
                                {item.storeName}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition ml-2"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </span>
                          <span className="text-sm font-bold" style={{ color: '#071d7f' }}>
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium transition"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs font-medium"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium transition"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Resumen */}
              <div className="border-t border-gray-200 pt-4 mt-4 space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total de Unidades:</span>
                  <span className="font-bold text-gray-900">{totalQuantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total de Items:</span>
                  <span className="font-bold text-gray-900">{items.length}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="font-bold" style={{ color: '#071d7f' }}>
                    ${totalPrice().toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón Checkout */}
              <Link
                to="/checkout"
                className="w-full text-white py-3 rounded-lg font-bold text-center transition block mt-4 shadow-lg hover:opacity-90"
                style={{ backgroundColor: '#071d7f' }}
              >
                Proceder al Pago
              </Link>

              {/* Botón Negociar por WhatsApp */}
              {(() => {
                const itemsByStore = getItemsByStore();
                const storesWithWhatsapp = Array.from(itemsByStore.entries()).filter(
                  ([_, storeItems]) => storeItems[0]?.storeWhatsapp
                );
                
                if (storesWithWhatsapp.length === 0) return null;
                
                return (
                  <div className="space-y-2 mt-3">
                    <p className="text-xs text-gray-500 text-center">¿Quieres negociar el precio?</p>
                    {storesWithWhatsapp.map(([storeId, storeItems]) => {
                      const storeName = storeItems[0]?.storeName || 'Vendedor';
                      const storeWhatsapp = storeItems[0]?.storeWhatsapp;
                      const storeTotal = storeItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      const storeQty = storeItems.reduce((sum, item) => sum + item.quantity, 0);
                      
                      const handleNegotiate = () => {
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
                      
                      return (
                        <Button
                          key={storeId}
                          variant="outline"
                          onClick={handleNegotiate}
                          className="w-full border-green-500 text-green-600 hover:bg-green-50 gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Consultar a {storeName}
                        </Button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Botón Vaciar Carrito */}
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full mt-2"
              >
                Vaciar Carrito
              </Button>
            </>
          )}
        </div>
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default CartPage;

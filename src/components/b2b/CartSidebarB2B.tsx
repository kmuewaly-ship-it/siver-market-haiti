import { useState } from 'react';
import { ShoppingCart, X, Trash2, AlertCircle, Package, MessageCircle, Loader2 } from 'lucide-react';
import { CartB2B, CartItemB2B } from '@/types/b2b';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface CartSidebarB2BProps {
  cart: CartB2B;
  onUpdateQuantity: (productId: string, cantidad: number) => void;
  onRemoveItem: (productId: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CartSidebarB2B = ({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  isOpen,
  onToggle,
}: CartSidebarB2BProps) => {
  const { user } = useAuth();
  const [isNegotiating, setIsNegotiating] = useState(false);

  const handleNegotiateViaWhatsApp = async () => {
    if (!user?.id || cart.items.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setIsNegotiating(true);

    try {
      // Get admin WhatsApp number from settings
      const { data: settingsData } = await supabase
        .from('price_settings')
        .select('value')
        .eq('key', 'admin_whatsapp')
        .maybeSingle();

      const adminWhatsApp = settingsData?.value?.toString() || '50937000000';

      // Save quote to database
      const cartSnapshot = {
        items: cart.items.map(item => ({
          productId: item.productId,
          sku: item.sku,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_b2b: item.precio_b2b,
          subtotal: item.subtotal,
        })),
        totalItems: cart.totalItems,
        totalQuantity: cart.totalQuantity,
        subtotal: cart.subtotal,
      };

      const { data: quote, error } = await supabase
        .from('pending_quotes' as any)
        .insert({
          seller_id: user.id,
          cart_snapshot: cartSnapshot,
          total_amount: cart.subtotal,
          total_quantity: cart.totalQuantity,
          whatsapp_sent_at: new Date().toISOString(),
        })
        .select('quote_number')
        .single() as { data: { quote_number: string } | null; error: any };

      if (error) throw error;

      const quoteNumber = quote?.quote_number || 'N/A';

      // Generate WhatsApp message
      const itemsList = cart.items
        .map((item, index) => `${index + 1}. ${item.nombre} x ${item.cantidad} uds - $${item.subtotal.toFixed(2)}`)
        .join('\n');

      const message = `📱 *Nuevo Pedido para Negociación - Siver Market*

👤 *Seller:* ${user.name || user.email}
🆔 *Cotización:* ${quoteNumber}

📦 *Detalle del pedido:*
${itemsList}

💰 *Total estimado:* $${cart.subtotal.toFixed(2)}
📊 *Total unidades:* ${cart.totalQuantity}

Me gustaría negociar condiciones para este pedido. Quedo atento.`;

      // Open WhatsApp
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${adminWhatsApp}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      toast.success('Cotización guardada. Abriendo WhatsApp...');
    } catch (error) {
      console.error('Error al crear cotización:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsNegotiating(false);
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-6 z-40 text-white rounded-full p-4 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ backgroundColor: '#94111f' }}
      >
        <ShoppingCart className="w-6 h-6" />
        {cart.totalItems > 0 && (
          <span 
            className="absolute -top-1 -right-1 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center"
            style={{ backgroundColor: '#071d7f' }}
          >
            {cart.totalItems}
          </span>
        )}
      </button>

      {/* Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={onToggle} />
      )}

      <div
        className={`fixed right-0 top-0 h-screen w-full sm:w-96 bg-white shadow-2xl z-50 transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 text-white p-4 flex items-center justify-between shadow-lg" style={{ backgroundColor: '#071d7f' }}>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-6 h-6" />
            <h2 className="font-bold text-lg">Carrito B2B</h2>
            {cart.totalItems > 0 && (
              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold">
                {cart.totalItems}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1 hover:bg-white/20 rounded transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Tu carrito está vacío</p>
              <p className="text-xs text-gray-500">Comienza a añadir productos para verlos aquí</p>
            </div>
          ) : (
            <>
              {/* Aviso importante */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Revisa el total antes de proceder al checkout. Puedes modificar cantidades.
                </p>
              </div>

              {/* Items */}
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div
                    key={item.productId}
                    className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-white"
                  >
                    <div className="flex gap-3">
                      {/* Product Image */}
                      <div className="w-18 h-18 flex-shrink-0 rounded-md bg-muted overflow-hidden" style={{ width: '72px', height: '72px' }}>
                        {item.imagen_principal ? (
                          <img 
                            src={item.imagen_principal} 
                            alt={item.nombre}
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
                              {item.nombre}
                            </p>
                            <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                          </div>
                          <button
                            onClick={() => onRemoveItem(item.productId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition ml-2"
                            title="Eliminar del carrito"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        {/* Price */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-600">
                            ${item.precio_b2b.toFixed(2)} × {item.cantidad}
                          </span>
                          <span className="text-sm font-bold" style={{ color: '#071d7f' }}>
                            ${item.subtotal.toFixed(2)}
                          </span>
                        </div>
                        
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                item.productId,
                                Math.max(item.moq, item.cantidad - 1)
                              )
                            }
                            className="px-2 py-0.5 border border-gray-300 rounded hover:bg-gray-100 text-xs font-medium transition"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={item.moq}
                            max={item.stock_fisico}
                            value={item.cantidad}
                            onChange={(e) =>
                              onUpdateQuantity(
                                item.productId,
                                parseInt(e.target.value) || item.moq
                              )
                            }
                            className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs font-medium"
                          />
                          <button
                            onClick={() =>
                              onUpdateQuantity(
                                item.productId,
                                Math.min(item.stock_fisico, item.cantidad + 1)
                              )
                            }
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
                  <span className="font-bold text-gray-900">{cart.totalQuantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total de Items:</span>
                  <span className="font-bold text-gray-900">{cart.items.length}</span>
                </div>
                <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-gray-900">Total:</span>
                  <span className="font-bold" style={{ color: '#071d7f' }}>
                    ${cart.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Botón Checkout */}
              <Link
                to="/seller/checkout"
                className="w-full text-white py-3 rounded-lg font-bold text-center transition block mt-4 shadow-lg hover:opacity-90"
                style={{ backgroundColor: '#071d7f' }}
              >
                Proceder al Checkout
              </Link>

              {/* Botón Negociar por WhatsApp */}
              <button
                onClick={handleNegotiateViaWhatsApp}
                disabled={isNegotiating}
                className="w-full py-3 rounded-lg font-bold text-center transition flex items-center justify-center gap-2 shadow-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#25D366', color: 'white' }}
              >
                {isNegotiating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    Negociar por WhatsApp
                  </>
                )}
              </button>

              {/* Botón Continuar comprando */}
              <button
                onClick={onToggle}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-900 py-2 rounded-lg font-medium text-center transition"
              >
                Continuar Comprando
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default CartSidebarB2B;

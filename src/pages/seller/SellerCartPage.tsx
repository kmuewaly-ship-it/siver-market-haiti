import { useState } from "react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Package, AlertCircle, MessageCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SellerCartPage = () => {
  const { user } = useAuth();
  const { cart, removeItem, updateQuantity, clearCart } = useCartB2B();
  const isLoading = false;
  const items = cart.items;
  const subtotal = cart.subtotal;
  const totalQuantity = cart.totalQuantity;
  const isMobile = useIsMobile();
  const [isNegotiating, setIsNegotiating] = useState(false);

  const handleNegotiateViaWhatsApp = async () => {
    if (!user?.id || items.length === 0) {
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
        items: items.map(item => ({
          productId: item.productId,
          sku: item.sku,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio_b2b: item.precio_b2b,
          subtotal: item.subtotal,
        })),
        totalItems: items.length,
        totalQuantity: totalQuantity,
        subtotal: subtotal,
      };

      const { data: quote, error } = await supabase
        .from('pending_quotes' as any)
        .insert({
          seller_id: user.id,
          cart_snapshot: cartSnapshot,
          total_amount: subtotal,
          total_quantity: totalQuantity,
          whatsapp_sent_at: new Date().toISOString(),
        })
        .select('quote_number')
        .single() as { data: { quote_number: string } | null; error: any };

      if (error) throw error;

      const quoteNumber = quote?.quote_number || 'N/A';

      // Generate WhatsApp message
      const itemsList = items
        .map((item, index) => `${index + 1}. ${item.nombre} x ${item.cantidad} uds - $${item.subtotal.toFixed(2)}`)
        .join('\n');

      const message = `📱 *Nuevo Pedido para Negociación - Siver Market*

👤 *Seller:* ${user.name || user.email}
🆔 *Cotización:* ${quoteNumber}

📦 *Detalle del pedido:*
${itemsList}

💰 *Total estimado:* $${subtotal.toFixed(2)}
📊 *Total unidades:* ${totalQuantity}

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
    <SellerLayout>
      <div className="min-h-screen bg-background flex flex-col">
        <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'pb-20 pt-4' : 'py-8'}`}>
          {/* Header */}
          <div 
            className="text-white p-4 rounded-t-lg flex items-center gap-2 mb-0"
            style={{ backgroundColor: '#071d7f' }}
          >
            <ShoppingCart className="w-6 h-6" />
            <h1 className="font-bold text-lg">Carrito B2B</h1>
            {items.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-[#071d7f] text-white text-xs rounded-full font-bold">
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
                <p className="text-xs text-gray-500 mb-4">Visita el catálogo de lotes para abastecer tu inventario</p>
                <Button asChild style={{ backgroundColor: '#071d7f' }} className="text-white hover:opacity-90">
                  <Link to="/seller/adquisicion-lotes">Ir al Catálogo</Link>
                </Button>
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
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition bg-white"
                    >
                      <div className="flex gap-3">
                        {/* Product Image */}
                        <div className="flex-shrink-0 rounded-md bg-muted overflow-hidden" style={{ width: '72px', height: '72px' }}>
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
                              onClick={() => removeItem(item.productId)}
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
                                updateQuantity(
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
                                updateQuantity(
                                  item.productId,
                                  parseInt(e.target.value) || item.moq
                                )
                              }
                              className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center text-xs font-medium"
                            />
                            <button
                              onClick={() =>
                                updateQuantity(
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
                    <span className="font-bold text-gray-900">{totalQuantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Total de Items:</span>
                    <span className="font-bold text-gray-900">{items.length}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-3 flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Total:</span>
                    <span className="font-bold" style={{ color: '#071d7f' }}>
                      ${subtotal.toFixed(2)}
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

                {/* Botón Vaciar carrito */}
                <button
                  onClick={clearCart}
                  className="text-left text-xs text-muted-foreground hover:text-destructive transition-colors py-2"
                >
                  Vaciar Carrito
                </button>
              </>
            )}
          </div>
        </main>
      </div>
    </SellerLayout>
  );
};

export default SellerCartPage;

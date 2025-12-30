import { useState } from "react";
import { SellerLayout } from "@/components/seller/SellerLayout";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Package, AlertCircle, MessageCircle, Loader2, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useB2BCartItems } from "@/hooks/useB2BCartItems";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SellerCartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, isLoading } = useB2BCartItems();
  const isMobile = useIsMobile();
  const [isNegotiating, setIsNegotiating] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalQuantity = items.reduce((sum, item) => sum + item.cantidad, 0);

  // Stub functions for now
  const removeItem = (productId: string) => {
    toast.message('Funcionalidad próximamente');
  };

  const updateQuantity = (productId: string, newQty: number) => {
    toast.message('Funcionalidad próximamente');
  };

  const clearCart = () => {
    toast.message('Funcionalidad próximamente');
  };

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
          name: item.name,
          cantidad: item.cantidad,
          precioB2B: item.precioB2B,
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
        {/* Fixed Cart Section - Top */}
        {items.length > 0 && (
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

        <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'pb-40' : 'pb-20'}`}>
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
              {/* Items */}
              {items.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-1 space-y-0 bg-white" style={{ backgroundColor: '#d9d9d9' }}>
                    {items.map((item) => (
                      <div
                        key={item.productId}
                        onClick={() => navigate(`/producto/${item.productId}`)}
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
                                onClick={() => removeItem(item.productId)}
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
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      Math.max(item.moq || 1, item.cantidad - 1)
                                    )
                                  }
                                  className="p-0.5 hover:bg-gray-200 rounded text-xs font-medium transition"
                                >
                                  −
                                </button>
                                <span className="w-6 text-center text-xs font-medium">
                                  {item.cantidad}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(
                                      item.productId,
                                      item.cantidad + 1
                                    )
                                  }
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

        {/* Botones Fijos - Comprar y Negociar */}
        {items.length > 0 && (
          <div className={`fixed left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 ${isMobile ? 'bottom-10' : 'bottom-4'} z-40 flex justify-center`}>
            <div className="rounded-lg p-2 border border-gray-300 shadow-md w-full" style={{ backgroundColor: '#efefef' }}>
              <div className="flex gap-2 justify-between">
                {/* Botón Negociar - Blanco con icono verde */}
                <button
                  onClick={handleNegotiateViaWhatsApp}
                  disabled={isNegotiating}
                  className="px-3 py-2 rounded-lg font-semibold text-sm transition shadow-lg hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-1.5 border border-gray-300"
                  style={{ backgroundColor: 'white', color: '#29892a' }}
                  title="Negociar por WhatsApp"
                >
                  {isNegotiating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <MessageCircle className="w-4 h-4" />
                  )}
                  WhatsApp
                </button>

                {/* Botón Comprar B2B */}
                <Link
                  to="/checkout"
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
    </SellerLayout>
  );
};

export default SellerCartPage;

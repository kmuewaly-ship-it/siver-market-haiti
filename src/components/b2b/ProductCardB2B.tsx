import { useState, MouseEvent } from 'react';
import { ShoppingCart, AlertCircle, Check, MessageCircle, ShieldCheck } from 'lucide-react';
import { ProductB2BCard, CartItemB2B } from '@/types/b2b';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';

interface ProductCardB2BProps {
  product: ProductB2BCard;
  onAddToCart: (item: CartItemB2B) => void;
  cartItem?: CartItemB2B;
  whatsappNumber?: string;
}

const ProductCardB2B = ({ product, onAddToCart, cartItem, whatsappNumber = "50312345678" }: ProductCardB2BProps) => {
  const [cantidad, setCantidad] = useState(product.moq);
  const isMobile = useIsMobile();

  const subtotal = cantidad * product.precio_b2b;
  const isOutOfStock = product.stock_fisico === 0;

  // Calcular descuentos según cantidad
  const getDiscount = () => {
    if (cantidad >= product.moq * 10) return 0.20; // 20% descuento
    if (cantidad >= product.moq * 5) return 0.15; // 15% descuento
    if (cantidad >= product.moq * 3) return 0.10; // 10% descuento
    if (cantidad >= product.moq * 2) return 0.05; // 5% descuento
    return 0;
  };

  const discountPercent = getDiscount();
  const discountedPrice = product.precio_b2b * (1 - discountPercent);

  const handleAddToCart = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent card click if we add that later
    
    if (cantidad < product.moq || cantidad > product.stock_fisico) return;

    onAddToCart({
      productId: product.id,
      sku: product.sku,
      nombre: product.nombre,
      precio_b2b: product.precio_b2b,
      moq: product.moq,
      stock_fisico: product.stock_fisico,
      cantidad,
      subtotal: cantidad * discountedPrice,
    });

    // Reset cantidad a MOQ
    setCantidad(product.moq);
  };

  const handleWhatsApp = (e: MouseEvent) => {
    e.stopPropagation();
    const text = `Hola, estoy interesado en el siguiente producto:\n\n*${product.nombre}*\nSKU: ${product.sku}\nPrecio: $${discountedPrice.toFixed(2)}\nCantidad: ${cantidad}\n\nLink/Imagen: ${product.imagen_principal}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={`group bg-white rounded-lg border hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden ${
      cartItem ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'
    }`}>
      {/* Image Section */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        <img
          src={product.imagen_principal}
          alt={product.nombre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discountPercent > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              -{Math.round(discountPercent * 100)}%
            </span>
          )}
          {cartItem && (
            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
              <Check className="w-3 h-3" /> En carrito
            </span>
          )}
        </div>

        {/* Mobile Action Buttons on Image */}
        {isMobile && !isOutOfStock && (
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 rounded-full border-green-600 text-green-600 bg-white/90 hover:bg-green-50 shadow-sm"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        )}

        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold">Agotado</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-sm text-gray-700 line-clamp-2 mb-1 leading-snug min-h-[2.5em]" title={product.nombre}>
          {product.nombre}
        </h3>

        {/* Price */}
        <div className="mt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-gray-900">
              ${discountedPrice.toFixed(2)}
            </span>
            {discountPercent > 0 && (
              <span className="text-xs text-gray-400 line-through">
                ${product.precio_b2b.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Min Order */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">Min. order: {product.moq} pieces</p>
        </div>

        {/* Trust Badges (Mock) */}
        <div className="flex items-center gap-2 mt-2 mb-3">
          <div className="flex items-center gap-0.5 text-[10px] font-bold text-gray-700 bg-gray-100 px-1 rounded">
            <ShieldCheck className="w-3 h-3 text-orange-500" />
            Verified
          </div>
          <span className="text-[10px] text-gray-400">3 yrs  CN</span>
        </div>

        {/* Spacer to push actions to bottom */}
        <div className="flex-1"></div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
          {/* Quantity Selector - Compact */}
          <div className="flex items-center border border-gray-200 rounded-md h-8 bg-white">
            <button
              onClick={() => setCantidad(Math.max(product.moq, cantidad - 1))}
              disabled={isOutOfStock || cantidad <= product.moq}
              className="px-2 h-full text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center"
            >
              -
            </button>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(product.moq, parseInt(e.target.value) || product.moq))}
              className="w-10 text-center text-xs border-none p-0 h-full focus:ring-0"
              disabled={isOutOfStock}
            />
            <button
              onClick={() => setCantidad(Math.min(product.stock_fisico, cantidad + 1))}
              disabled={isOutOfStock || cantidad >= product.stock_fisico}
              className="px-2 h-full text-gray-500 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center"
            >
              +
            </button>
          </div>

          {/* Desktop Action Buttons */}
          {!isMobile && (
            <div className="flex gap-2 flex-1 justify-end">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-green-600 text-green-600 hover:bg-green-50"
                onClick={handleWhatsApp}
              >
                Contactar
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                Agregar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCardB2B;

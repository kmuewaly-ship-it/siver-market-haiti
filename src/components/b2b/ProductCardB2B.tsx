import { useState, MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ShieldCheck, TrendingUp, Layers, ArrowUpRight } from 'lucide-react';
import { ProductB2BCard, CartItemB2B } from '@/types/b2b';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductBottomSheet } from "@/components/products/ProductBottomSheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProductCardB2BProps {
  product: ProductB2BCard;
  onAddToCart: (item: CartItemB2B) => void;
  cartItem?: CartItemB2B;
  whatsappNumber?: string;
}

const ProductCardB2B = ({ product, onAddToCart, cartItem, whatsappNumber = "50312345678" }: ProductCardB2BProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isOutOfStock = product.stock_fisico === 0;
  const hasMultipleVariants = (product.variant_count || 1) > 1;
  const hasPriceRange = product.precio_b2b_max && product.precio_b2b_max !== product.precio_b2b;

  // Use market-referenced profit calculation
  const profit = product.profit_amount ?? ((product.precio_sugerido || 0) - product.precio_b2b);
  const roiPercent = product.roi_percent ?? (product.precio_b2b > 0 ? (profit / product.precio_b2b) * 100 : 0);
  const isMarketSynced = product.is_market_synced ?? false;
  const pvpSource = product.pvp_source ?? 'calculated';

  const handleAddToCart = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSheetOpen(true);
  };

  const handleWhatsApp = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `Hola, estoy interesado en el siguiente producto:\n\n*${product.nombre}*\nSKU: ${product.sku}\nPrecio: $${product.precio_b2b.toFixed(2)}\n\nLink/Imagen: ${product.imagen_principal}`;
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Format price range
  const formatPriceRange = () => {
    if (hasPriceRange) {
      return `$${product.precio_b2b.toFixed(2)} - $${product.precio_b2b_max!.toFixed(2)}`;
    }
    return `$${product.precio_b2b.toFixed(2)}`;
  };

  return (
    <div className={`group bg-white rounded-lg border hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden ${
      cartItem ? 'border-primary ring-1 ring-primary' : 'border-border'
    }`}>
      {/* Image Section */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Link to={`/producto/${product.sku}`} className="block w-full h-full">
          <img
            src={product.imagen_principal}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/placeholder.svg';
            }}
          />
        </Link>
        
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {/* Profit Badge */}
          {profit > 0 && (
            <Badge className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-1.5 py-0.5 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +${profit.toFixed(2)}
            </Badge>
          )}
          
          {/* In Cart Badge */}
          {cartItem && (
            <Badge className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5">
              En carrito
            </Badge>
          )}
        </div>

        {/* Stock Badge - Top Right */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <div className="flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-white/90 px-1.5 py-0.5 rounded">
            <ShieldCheck className="w-3 h-3 text-orange-500" />
            Verified
          </div>
        </div>

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs font-bold">Agotado</Badge>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3 flex flex-col flex-1">
        {/* Title */}
        <Link to={`/producto/${product.sku}`}>
          <h3 className="text-sm text-foreground line-clamp-1 mb-2 leading-snug hover:text-primary transition-colors font-medium" title={product.nombre}>
            {product.nombre}
          </h3>
        </Link>

        {/* Price Section */}
        <div className="mt-1 space-y-0.5">
          {/* B2B Price - Single Line */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-0.5 bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded-md">
              <span className="text-destructive font-bold text-xs">
                {formatPriceRange()}
              </span>
              <span className="text-[8px] font-medium text-destructive">USD</span>
            </span>
          </div>
          
          {/* Rating & PVP - Same Line */}
          <div className="flex items-center gap-2 justify-between">
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-yellow-500">
              <span>★</span>
              {(product.rating || 0).toFixed(1)}
              {product.review_count && (
                <span className="text-[10px] text-muted-foreground">
                  ({product.review_count})
                </span>
              )}
            </span>
            
            {product.precio_sugerido > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-semibold cursor-help">
                      {isMarketSynced && (
                        <ArrowUpRight className="w-3 h-3 text-green-500" />
                      )}
                      PVP: ${product.precio_sugerido.toFixed(2)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {isMarketSynced ? (
                      <span className="text-green-600">
                        ✓ Precio máximo del mercado B2C ({product.num_b2c_sellers || 0} vendedores)
                      </span>
                    ) : pvpSource === 'admin' ? (
                      <span>Precio sugerido por administrador</span>
                    ) : (
                      <span>Precio calculado (+30% margen)</span>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Profit & ROI indicator */}
          {profit > 0 && (
            <div className="flex items-center justify-between mt-1 px-1.5 py-0.5 bg-green-50 rounded text-[10px]">
              <span className="text-green-700 font-medium">
                Ganancia: +${profit.toFixed(2)}
              </span>
              <span className="text-green-600 font-bold">
                ROI {roiPercent.toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Min Order & Variants Info */}
        <div className="mt-1 text-xs">
          {/* Flexible MOQ message - removed */}
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Actions Row */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border">
          {/* WhatsApp Button */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg border-emerald-500 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-600 transition-colors"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="w-4 h-4" />
          </Button>
          
          {/* Add to Cart Button */}
          <Button
            size="sm"
            className="h-8 flex-1 text-xs font-medium bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            B2B
          </Button>
        </div>
      </div>

      {/* Product Bottom Sheet for variant selection */}
      <ProductBottomSheet 
        product={{
          id: product.id,
          name: product.nombre,
          price: product.precio_b2b,
          image: product.imagen_principal || '/placeholder.svg',
          sku: product.sku,
          priceB2B: product.precio_b2b,
          pvp: product.precio_sugerido,
          moq: product.moq,
          stock: product.stock_fisico,
          // Pass variant info for the selector
          variants: product.variants,
          variantIds: product.variant_ids,
          // Pass unified variant options with type
          variantOptions: product.variant_options,
          variantType: product.variant_type,
          // Backwards compatibility
          colorOptions: product.color_options,
          hasColorVariants: product.has_color_variants,
        }}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
    </div>
  );
};

export default ProductCardB2B;

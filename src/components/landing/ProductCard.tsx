import { Heart, Package, Store, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartCart } from "@/hooks/useSmartCart";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  badge?: string;
  sku?: string;
  storeId?: string;
  storeName?: string;
  storeWhatsapp?: string;
  // B2B fields
  priceB2B?: number;
  pvp?: number; // Precio sugerido de venta
  moq?: number;
  stock?: number;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, isB2BUser } = useSmartCart();

  // Calcular precios según el contexto
  const costB2B = product.priceB2B || product.price;
  const pvp = product.pvp || product.originalPrice || product.price;
  const profit = pvp - costB2B;
  const profitPercentage = costB2B > 0 ? Math.round((profit / costB2B) * 100) : 0;

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount || 0;

  // Precio a mostrar según rol
  const displayPrice = isB2BUser ? costB2B : product.price;
  const referencePrice = isB2BUser ? pvp : product.originalPrice;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      priceB2B: costB2B,
      pvp: pvp,
      moq: product.moq || 1,
      stock: product.stock,
      image: product.image,
      sku: product.sku || product.id,
      storeId: product.storeId,
      storeName: product.storeName,
      storeWhatsapp: product.storeWhatsapp,
    });
  };

  return (
    <div className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition group border border-border">
      {/* Image Container */}
      <Link to={product.sku ? `/producto/${product.sku}` : '#'}>
        <div className="relative overflow-hidden aspect-[3/4] bg-muted">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Discount Badge - Solo para B2C */}
          {!isB2BUser && discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-[#071d7f] text-white px-2 py-1 rounded text-xs font-bold">
              {discountPercentage}% DESC
            </div>
          )}

          {/* B2B Profitability Badge */}
          {isB2BUser && profit > 0 && (
            <Badge className="absolute top-2 left-2 bg-green-600 text-white gap-1">
              <TrendingUp className="h-3 w-3" />
              +${profit.toFixed(2)} ({profitPercentage}%)
            </Badge>
          )}

          {/* Custom Badge */}
          {product.badge && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
              {product.badge}
            </div>
          )}

          {/* Store Badge */}
          {product.storeName && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded flex items-center gap-1">
              <Store className="h-3 w-3" />
              {product.storeName}
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsFavorite(!isFavorite);
            }}
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition"
          >
            <Heart
              className={`w-4 h-4 ${
                isFavorite ? "fill-red-500 text-red-500" : "text-gray-600"
              }`}
            />
          </button>
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-3">
        <Link to={product.sku ? `/producto/${product.sku}` : '#'}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-2 hover:text-primary transition">
            {product.name}
          </h3>
        </Link>

        <div className="space-y-1">
          {/* Precio principal */}
          <div className="text-lg font-bold text-primary">
            ${displayPrice.toFixed(2)}
            {isB2BUser && (
              <span className="text-xs font-normal text-muted-foreground ml-1">costo</span>
            )}
          </div>
          
          {/* Precio de referencia */}
          {referencePrice && referencePrice > displayPrice && (
            <div className="text-sm text-muted-foreground">
              {isB2BUser ? (
                <span>PVP sugerido: ${referencePrice.toFixed(2)}</span>
              ) : (
                <span className="line-through">${referencePrice.toFixed(2)}</span>
              )}
            </div>
          )}

          {/* MOQ indicator para B2B */}
          {isB2BUser && product.moq && product.moq > 1 && (
            <div className="text-xs text-amber-600 font-medium">
              Mínimo: {product.moq} unidades
            </div>
          )}
        </div>

        <button 
          onClick={handleAddToCart}
          className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg text-sm font-medium transition"
        >
          {isB2BUser ? `Comprar B2B (×${product.moq || 1})` : "Agregar al Carrito"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
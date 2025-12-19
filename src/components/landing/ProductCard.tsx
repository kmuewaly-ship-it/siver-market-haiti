import { Heart, Package, Store } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartCart } from "@/hooks/useSmartCart";

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
  moq?: number;
  stock?: number;
}

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, isB2BUser } = useSmartCart();

  const discountPercentage = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : product.discount || 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      priceB2B: product.priceB2B || product.price,
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

          {/* Discount Badge */}
          {discountPercentage > 0 && (
            <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-xs font-bold">
              {discountPercentage}% DESC
            </div>
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
          <div className="text-lg font-bold text-primary">
            ${product.price.toFixed(2)}
          </div>
          {product.originalPrice && (
            <div className="text-sm text-muted-foreground line-through">
              ${product.originalPrice.toFixed(2)}
            </div>
          )}
        </div>

        <button 
          onClick={handleAddToCart}
          className="w-full mt-3 bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-lg text-sm font-medium transition"
        >
          {isB2BUser ? `Agregar (MOQ: ${product.moq || 1})` : "Agregar al Carrito"}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
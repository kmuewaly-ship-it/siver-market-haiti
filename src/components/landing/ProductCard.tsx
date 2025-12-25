import { Heart, Package, Store, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartCart } from "@/hooks/useSmartCart";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { ProductBottomSheet } from "@/components/products/ProductBottomSheet";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  discount?: number;
  badge?: string;
  sku: string;
  storeId?: string;
  storeName?: string;
  storeWhatsapp?: string;
  // B2B fields (legacy/fallback)
  priceB2B?: number;
  pvp?: number;
  moq?: number;
  stock?: number;
  // Promo fields from database
  precio_promocional?: number | null;
  promo_active?: boolean | null;
  promo_starts_at?: string | null;
  promo_ends_at?: string | null;
  currency_code?: string | null;
}

interface ProductB2BData {
  price_b2b: number;
  suggested_pvp: number;
  moq: number;
  stock: number;
}

interface ProductCardProps {
  product: Product;
  b2bData?: ProductB2BData;
}

const ProductCard = ({ product, b2bData }: ProductCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { addToCart } = useSmartCart();
  const { user } = useAuth();

  const isSeller = user?.role === UserRole.SELLER;

  // Calcular precios según el contexto
  // Priorizamos b2bData si existe, sino usamos los campos del producto (fallback)
  const costB2B = b2bData?.price_b2b || product.priceB2B || product.price;
  const pvp = b2bData?.suggested_pvp || product.pvp || product.originalPrice || product.price;
  const moq = b2bData?.moq || product.moq || 1;
  
  const profit = pvp - costB2B;
  
  // Check if promo is active using database fields
  const isPromoActive = (): boolean => {
    if (!product.promo_active || !product.precio_promocional) return false;
    const now = new Date();
    const startsAt = product.promo_starts_at ? new Date(product.promo_starts_at) : null;
    const endsAt = product.promo_ends_at ? new Date(product.promo_ends_at) : null;
    
    if (startsAt && now < startsAt) return false;
    if (endsAt && now > endsAt) return false;
    return true;
  };
  
  const promoActive = isPromoActive();
  const promoPrice = promoActive ? product.precio_promocional : null;
  const currency = product.currency_code || 'USD';

  // Calculate discount percentage for promo or legacy
  const discountPercentage = promoActive && promoPrice && product.price > promoPrice
    ? Math.round(((product.price - promoPrice) / product.price) * 100)
    : product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : product.discount || 0;

  // Precio a mostrar según rol
  // B2C: si hay promo activa, mostrar precio promo, sino precio normal
  // Seller: precio B2B
  const displayPrice = isSeller 
    ? costB2B 
    : (promoActive && promoPrice ? promoPrice : product.price);
  
  // Precio tachado/referencia
  // Si es seller: mostramos PVP tachado
  // Si es cliente B2C con promo: mostramos precio original tachado
  // Si es cliente sin promo: mostramos originalPrice si existe
  const strikethroughPrice = isSeller 
    ? pvp 
    : (promoActive && promoPrice ? product.price : product.originalPrice);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSheetOpen(true);
  };

  return (
    <>
    <div className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition group border border-border h-full flex flex-col">
      {/* Image Container */}
      <Link to={product.sku ? `/producto/${product.sku}` : '#'} className="relative block">
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

          {/* Promo/Discount Badge - Solo para B2C */}
          {!isSeller && discountPercentage > 0 && (
            <div className={`absolute top-2 left-2 ${promoActive ? 'bg-red-600' : 'bg-[#071d7f]'} text-white px-2 py-1 rounded text-xs font-bold z-10`}>
              {promoActive ? `🔥 ${discountPercentage}% OFF` : `${discountPercentage}% DESC`}
            </div>
          )}

          {/* B2B Profitability Badge - "Ganas: $..." */}
          {isSeller && profit > 0 && (
            <Badge className="absolute top-2 left-2 bg-green-600 hover:bg-green-700 text-white gap-1 z-10 shadow-sm border-0">
              <TrendingUp className="h-3 w-3" />
              Ganas: ${profit.toFixed(2)}
            </Badge>
          )}

          {/* Custom Badge */}
          {product.badge && !isSeller && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold z-10">
              {product.badge}
            </div>
          )}

          {/* Store Badge */}
          {product.storeName && (
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded flex items-center gap-1 z-10">
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
            className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white transition z-20"
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
      <div className="p-3 flex flex-col flex-1">
        <Link to={product.sku ? `/producto/${product.sku}` : '#'}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 hover:text-primary transition h-10">
            {product.name}
          </h3>
        </Link>

        {/* MOQ Label for Seller */}
        {isSeller && moq > 1 && (
          <div className="text-xs text-amber-600 font-medium mb-2">
            Mínimo: {moq} unidades
          </div>
        )}

        <div className="mt-auto space-y-2">
          {/* Precios */}
          <Link to={product.sku ? `/producto/${product.sku}` : '#'}>
            <div className="flex items-baseline gap-2 flex-wrap hover:opacity-80 transition-opacity">
              {/* Price badge with currency from database */}
              <span className="inline-flex items-center gap-1 bg-[#fff5f6] border border-[#f2dede] px-2 py-0.5 rounded-md">
                <span className="text-[#94111f] font-bold text-base">${displayPrice.toFixed(2)}</span>
                <span className="text-[10px] font-medium text-[#94111f]">{currency}</span>
              </span>
              
              {isSeller && strikethroughPrice && strikethroughPrice > displayPrice && (
                <span className="text-xs text-green-600 font-semibold">
                  ${strikethroughPrice.toFixed(2)} PVP
                </span>
              )}
              {!isSeller && strikethroughPrice && strikethroughPrice > displayPrice && (
                <span className="text-xs text-muted-foreground line-through">
                  ${strikethroughPrice.toFixed(2)}
                </span>
              )}
            </div>
          </Link>

          <button 
            onClick={handleAddToCart}
            className={`w-full py-2 rounded-lg text-sm font-medium transition shadow-sm ${
              isSeller 
                ? "bg-primary hover:bg-primary/90 text-white" 
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
          >
            {isSeller ? "Comprar B2B" : "Añadir al carrito"}
          </button>
        </div>
      </div>
    </div>
    <ProductBottomSheet 
      product={{
        ...product,
        priceB2B: costB2B,
        pvp: pvp,
        moq: moq,
        stock: b2bData?.stock || product.stock
      }} 
      isOpen={isSheetOpen} 
      onClose={() => setIsSheetOpen(false)} 
    />
    </>
  );
};

export default ProductCard;
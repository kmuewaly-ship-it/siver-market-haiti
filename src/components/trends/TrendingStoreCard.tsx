import { useNavigate } from "react-router-dom";
import { TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { Badge } from "@/components/ui/badge";
import type { TrendingStore } from "@/hooks/useTrendingStores";

interface TrendingStoreCardProps {
  store: TrendingStore;
}

const TrendingStoreCard = ({ store }: TrendingStoreCardProps) => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isB2B = user && (role === UserRole.SELLER || role === UserRole.ADMIN);

  const handleProductClick = (product: TrendingStore["products"][0]) => {
    if (isB2B) {
      navigate(`/seller/adquisicion-lotes?search=${encodeURIComponent(product.sku)}`);
    } else {
      navigate(`/producto/${product.sku}`);
    }
  };

  const handleStoreClick = () => {
    if (store.slug) {
      navigate(`/tienda/${store.slug}`);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden animate-fade-in">
      {/* Store Header */}
      <div className="p-4 flex items-center gap-3">
        {/* Store Logo */}
        <div 
          className="relative cursor-pointer"
          onClick={handleStoreClick}
        >
          <div className="w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-primary/20">
            {store.logo ? (
              <img 
                src={store.logo} 
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold text-xl">
                {store.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Trends Badge */}
          <Badge 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] px-1.5 py-0 hover:bg-orange-500"
          >
            Trends
          </Badge>
        </div>

        {/* Store Info */}
        <div className="flex-1 min-w-0">
          <h3 
            className="font-bold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
            onClick={handleStoreClick}
          >
            {store.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-orange-500" />
              {store.salesCount} vendido
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {store.followers.toLocaleString()} seguidores
            </span>
            {store.newProductsCount > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="text-orange-500 font-medium">
                  {store.newProductsCount}+ Nuevo
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid - 4 columns */}
      <div className="grid grid-cols-4 gap-1 px-2">
        {store.products.map((product) => (
          <div 
            key={product.id}
            className="cursor-pointer group"
            onClick={() => handleProductClick(product)}
          >
            <div className="aspect-[3/4] bg-muted overflow-hidden rounded-sm">
              <img
                src={product.imagen || '/placeholder.svg'}
                alt={product.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            <p className="text-orange-500 font-semibold text-sm mt-1 truncate">
              <span className="text-xs text-muted-foreground">$</span>
              {product.precio_venta.toFixed(2)}
            </p>
          </div>
        ))}
        
        {/* Fill empty slots if less than 4 products */}
        {store.products.length < 4 && 
          Array.from({ length: 4 - store.products.length }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-[3/4] bg-muted/50 rounded-sm" />
          ))
        }
      </div>

      {/* Recent Review */}
      {store.recentReview && (
        <div className="px-4 py-3 border-t border-border mt-2">
          <p className="text-sm text-muted-foreground line-clamp-1">
            <span className="text-orange-400 text-lg leading-none">"</span>
            <span className="font-medium text-foreground">{store.recentReview.author}:</span>
            {" "}{store.recentReview.text}
            <span className="text-orange-400 text-lg leading-none">"</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default TrendingStoreCard;

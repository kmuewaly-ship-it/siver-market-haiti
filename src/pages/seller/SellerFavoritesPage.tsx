import { SellerLayout } from "@/components/seller/SellerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ShoppingCart, Trash2, Loader2, Package } from "lucide-react";
import { useB2BWishlist } from "@/hooks/useWishlist";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useB2BPriceCalculator } from "@/hooks/useB2BPriceCalculator";

const SellerFavoritesPage = () => {
  const { items, isLoading, removeFromWishlist, isRemoving } = useB2BWishlist();
  const { addItem } = useCartB2B();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const priceCalculator = useB2BPriceCalculator();

  // Calcular precios con motor para cada favorito
  const itemsWithCalculatedPrices = useMemo(() => {
    return items.map(item => {
      const calculated = priceCalculator.calculateProductPrice({
        id: item.product_id || item.id,
        factoryCost: item.price || 0,
        categoryId: item.category_id,
        weight: 0.5, // peso promedio
      });
      return {
        ...item,
        calculatedPrice: calculated.finalB2BPrice,
        suggestedPVP: calculated.suggestedPVP,
        marginPercent: calculated.marginPercent,
        logisticsCost: calculated.logisticsCost,
      };
    });
  }, [items, priceCalculator]);

  const handleAddToCart = async (item: typeof itemsWithCalculatedPrices[0]) => {
    if (!item.product_id) return;
    
    setAddingItemId(item.id);
    try {
      // Usar el precio CALCULADO del motor, no el precio base
      await addItem({
        productId: item.product_id,
        sku: item.sku || '',
        nombre: item.name || 'Producto',
        precio_b2b: item.calculatedPrice, // ✅ AHORA USA EL PRECIO DEL MOTOR
        cantidad: item.moq || 1,
        moq: item.moq || 1,
        stock_fisico: 999,
        subtotal: item.calculatedPrice * (item.moq || 1),
      });
      toast.success('Producto agregado al carrito B2B');
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error al agregar al carrito');
    } finally {
      setAddingItemId(null);
    }
  };

  const handleRemove = (item: typeof items[0]) => {
    removeFromWishlist({ 
      productId: item.product_id || undefined,
      wishlistItemId: item.id 
    });
  };

  if (!user) {
    return (
      <SellerLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Card className="text-center py-12 max-w-md">
            <CardContent>
              <Heart className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Inicia sesión</h2>
              <p className="text-muted-foreground mb-6">
                Debes iniciar sesión para ver tus favoritos B2B.
              </p>
              <Button asChild>
                <Link to="/login">Iniciar Sesión</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SellerLayout>
    );
  }

  if (isLoading) {
    return (
      <SellerLayout>
        <div className="p-6 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-red-500 fill-current" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Mis Favoritos B2B</h1>
            <p className="text-muted-foreground text-sm">
              Productos del catálogo mayorista que te interesan
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No tienes favoritos aún</h2>
              <p className="text-muted-foreground mb-6">
                Explora el catálogo B2B y guarda los productos que te interesan.
              </p>
              <Button asChild>
                <Link to="/seller/adquisicion-lotes">Ver Catálogo B2B</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {itemsWithCalculatedPrices.map((item) => (
              <Card key={item.id} className="overflow-hidden group">
                <div className="aspect-square relative">
                  <img
                    src={item.image || '/placeholder.svg'}
                    alt={item.name}
                    className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => item.product_id && navigate(`/seller/producto/${item.product_id}`)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-500 hover:text-red-600 rounded-full h-8 w-8"
                    onClick={() => handleRemove(item)}
                    disabled={isRemoving}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {item.moq && item.moq > 1 && (
                    <span className="absolute bottom-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">
                      MOQ: {item.moq}
                    </span>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-sm truncate mb-1">{item.name}</h3>
                  <p className="text-xs text-muted-foreground truncate mb-2">SKU: {item.sku}</p>
                  
                  {/* Precio con motor de precios */}
                  <div className="mb-3">
                    <p className="text-lg font-bold" style={{ color: '#071d7f' }}>
                      ${item.calculatedPrice.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PVP: ${item.suggestedPVP.toFixed(2)}
                    </p>
                  </div>

                  {/* Botones */}
                  <div className="space-y-2">
                    <Button
                      className="w-full gap-2 h-9 text-sm bg-primary hover:bg-primary/90"
                      onClick={() => handleAddToCart(item)}
                      disabled={addingItemId === item.id}
                    >
                      {addingItemId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShoppingCart className="h-4 w-4" />
                      )}
                      Carrito
                    </Button>
                    <Button
                      className="w-full gap-2 h-9 text-sm"
                      variant="outline"
                      onClick={() => item.product_id && navigate(`/producto/${item.sku}`)}
                    >
                      <Package className="h-4 w-4" />
                      Ver
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SellerLayout>
  );
};

export default SellerFavoritesPage;

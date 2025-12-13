import { SellerLayout } from "@/components/seller/SellerLayout";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useSellerFavorites } from "@/hooks/useSellerFavorites";
import { useCartB2B } from "@/hooks/useCartB2B";

const SellerFavoritesPage = () => {
  const { items, removeFavorite } = useSellerFavorites();
  const { addItem } = useCartB2B();

  return (
    <SellerLayout>
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 pb-8">
          <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-current" />
            Lista de Deseos (Lotes)
          </h1>

          {items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <div className="flex justify-center mb-4">
                  <Heart className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <h2 className="text-xl font-semibold mb-2">No tienes lotes guardados</h2>
                <p className="text-muted-foreground mb-6">
                  Guarda los lotes que te interesan para revisarlos más tarde.
                </p>
                <Button asChild>
                  <Link to="/seller/adquisicion-lotes">Explorar Lotes</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-[3/4] relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 hover:text-red-600 rounded-full"
                      onClick={() => removeFavorite(item.id)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold truncate mb-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">SKU: {item.sku}</p>
                    <p className="text-lg font-bold text-primary mb-3">
                      ${item.price.toFixed(2)}
                    </p>
                    <Button
                      className="w-full gap-2"
                      onClick={() =>
                        addItem({
                          productId: item.id,
                          sku: item.sku,
                          nombre: item.name,
                          precio_b2b: item.price,
                          cantidad: item.moq,
                          moq: item.moq,
                          stock_fisico: 999, // TODO: Get real stock
                          subtotal: item.price * item.moq,
                        })
                      }
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Agregar Lote
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </SellerLayout>
  );
};

export default SellerFavoritesPage;

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useSellerProducts } from "@/hooks/useSellerProducts";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Store, Search, Package, Heart } from "lucide-react";

const MarketplacePage = () => {
  const isMobile = useIsMobile();
  const { data: products, isLoading } = useSellerProducts(100);
  const { addItem } = useCart();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Get unique stores from products
  const stores = products 
    ? Array.from(new Map(
        products
          .filter(p => p.store)
          .map(p => [p.store!.id, p.store!])
      ).values())
    : [];

  // Filter and sort products
  const filteredProducts = products?.filter(product => {
    const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = selectedStore === "all" || product.store?.id === selectedStore;
    return matchesSearch && matchesStore;
  }).sort((a, b) => {
    switch (sortBy) {
      case "price-asc":
        return a.precio_venta - b.precio_venta;
      case "price-desc":
        return b.precio_venta - a.precio_venta;
      case "name":
        return a.nombre.localeCompare(b.nombre);
      default: // newest
        return 0;
    }
  }) || [];

  const handleAddToCart = (product: typeof products[0]) => {
    const images = product.images as any;
    const mainImage = Array.isArray(images) && images.length > 0 
      ? images[0] 
      : typeof images === 'string' ? images : '';

    addItem({
      id: product.id,
      name: product.nombre,
      price: product.precio_venta,
      image: mainImage,
      sku: product.sku,
      storeId: product.store?.id,
      storeName: product.store?.name,
      storeWhatsapp: product.store?.whatsapp || undefined,
    });

    toast({
      title: "Añadido al carrito",
      description: product.nombre,
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <Header />}
      
      <main className={`flex-1 container mx-auto px-4 py-6 ${isMobile ? 'pb-20' : ''}`}>
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Marketplace B2C
          </h1>
          <p className="text-muted-foreground">
            Explora productos de nuestros vendedores verificados
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tiendas</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
              <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
              <SelectItem value="name">Nombre A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-muted-foreground mb-4">
            {filteredProducts.length} productos encontrados
            {selectedStore !== "all" && stores.find(s => s.id === selectedStore) && (
              <span> en <strong>{stores.find(s => s.id === selectedStore)?.name}</strong></span>
            )}
          </p>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-card rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No hay productos disponibles</p>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedStore !== "all" 
                ? "Intenta ajustar los filtros de búsqueda" 
                : "Los vendedores aún no han publicado productos"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredProducts.map((product) => {
              const images = product.images as any;
              const mainImage = Array.isArray(images) && images.length > 0 
                ? images[0] 
                : typeof images === 'string' ? images : '';

              return (
                <div 
                  key={product.id} 
                  className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition group border border-border"
                >
                  {/* Image */}
                  <Link to={`/producto/${product.sku}`} className="block">
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {mainImage ? (
                        <img
                          src={mainImage}
                          alt={product.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      
                      {/* Store Badge */}
                      {product.store && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {product.store.name}
                        </div>
                      )}
                      
                      {/* Stock Badge */}
                      {product.stock <= 0 && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded font-medium">
                          Agotado
                        </div>
                      )}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-3">
                    <Link to={`/producto/${product.sku}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 hover:text-primary transition">
                        {product.nombre}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary">
                        ${product.precio_venta.toFixed(2)}
                      </span>
                      {product.stock > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Stock: {product.stock}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock <= 0}
                      size="sm"
                      className="w-full gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {product.stock > 0 ? 'Agregar' : 'Sin Stock'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {!isMobile && <Footer />}
    </div>
  );
};

export default MarketplacePage;

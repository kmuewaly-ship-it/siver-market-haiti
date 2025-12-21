import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useStore, useStoreProducts } from "@/hooks/useStore";
import ProductCard from "@/components/landing/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Star, Store as StoreIcon, Filter, ShoppingBag } from "lucide-react";
import { useState } from "react";

const StorePage = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const { data: store, isLoading: isLoadingStore } = useStore(sellerId);
  const { data: productsData, isLoading: isLoadingProducts } = useStoreProducts(sellerId);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter products client-side for now
  const filteredProducts = productsData?.products?.filter((item: any) => {
    const product = item.product;
    if (!product) return false;
    return product.nombre.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="h-64 bg-gray-200 animate-pulse" />
        <main className="container mx-auto px-4 -mt-20 relative z-10 pb-12">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                <div className="flex gap-4 items-end">
                    <div className="w-32 h-32 bg-gray-300 rounded-lg animate-pulse" />
                    <div className="space-y-2 flex-1">
                        <div className="h-8 bg-gray-300 rounded w-1/3 animate-pulse" />
                        <div className="h-4 bg-gray-300 rounded w-1/4 animate-pulse" />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse" />
                ))}
            </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 flex items-center justify-center">
            <div className="text-center space-y-4">
                <StoreIcon className="h-16 w-16 text-gray-300 mx-auto" />
                <h1 className="text-2xl font-bold text-gray-900">Tienda no encontrada</h1>
                <p className="text-gray-500">La tienda que buscas no existe o ha sido desactivada.</p>
                <Button onClick={() => window.history.back()}>Volver</Button>
            </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header />
      
      {/* Hero Section */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden bg-gray-900">
        {store.banner ? (
            <img 
                src={store.banner} 
                alt={store.name} 
                className="w-full h-full object-cover opacity-80"
            />
        ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-900 opacity-90" />
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <main className="container mx-auto px-4 pb-16 -mt-24 relative z-10">
        {/* Store Profile Card */}
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 md:p-8 mb-10">
            <div className="flex flex-col md:flex-row gap-6 md:items-end">
                <div className="relative -mt-16 md:-mt-20">
                    <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-white shadow-lg rounded-xl">
                        <AvatarImage src={store.logo || ""} alt={store.name} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-blue-50 text-blue-900 rounded-xl">
                            {store.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {store.is_active && (
                        <div className="absolute bottom-2 right-2 bg-green-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm" title="Verificado">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 space-y-3 text-center md:text-left">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{store.name}</h1>
                        <p className="text-gray-500 mt-1 flex items-center justify-center md:justify-start gap-2">
                            <MapPin className="h-4 w-4" />
                            {store.slug ? `@${store.slug}` : "Vendedor Verificado"}
                        </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1">
                            <Star className="h-3 w-3 mr-1 fill-blue-700" />
                            4.9 Calificación
                        </Badge>
                        <Badge variant="outline" className="border-gray-200 text-gray-600">
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            {productsData?.total || 0} Productos
                        </Badge>
                    </div>
                </div>

                <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                        Contactar Vendedor
                    </Button>
                </div>
            </div>

            {store.description && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-2">Sobre la tienda</h3>
                    <p className="text-gray-600 leading-relaxed max-w-3xl">
                        {store.description}
                    </p>
                </div>
            )}
        </div>

        {/* Products Section */}
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    Catálogo de Productos
                </h2>
                
                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                            placeholder="Buscar en esta tienda..." 
                            className="pl-10 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" className="bg-white">
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {isLoadingProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="h-48 w-full rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredProducts.map((item: any) => {
                        const product = item.product;
                        
                        // Map Supabase product to ProductCard interface
                        const mappedProduct = {
                            id: product.id,
                            name: product.nombre,
                            price: product.precio_b2c || 0,
                            image: product.galeria_imagenes?.[0] || "/placeholder.png",
                            originalPrice: undefined,
                            discount: 0,
                            badge: undefined,
                            sku: product.sku || product.id
                        };

                        return (
                            <ProductCard key={item.id} product={mappedProduct} />
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-200">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No se encontraron productos</h3>
                    <p className="text-gray-500 mt-1">Intenta con otra búsqueda o revisa más tarde.</p>
                    {searchQuery && (
                        <Button variant="link" onClick={() => setSearchQuery("")} className="mt-2 text-blue-600">
                            Limpiar búsqueda
                        </Button>
                    )}
                </div>
            )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StorePage;

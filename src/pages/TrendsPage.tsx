import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { usePublicCategories } from "@/hooks/useCategories";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/landing/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TrendsPage = () => {
  const navigate = useNavigate();
  const { data: productsData, isLoading: productsLoading } = useProducts(0, 20);
  const { data: categories, isLoading: categoriesLoading } = usePublicCategories();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Simulate "Trending" by taking the first 8 products
  const trendingProducts = productsData?.products.slice(0, 8) || [];
  
  // Simulate "New Arrivals" by taking the next 8 products (or same for now if not enough)
  const newArrivals = productsData?.products.slice(8, 16) || [];

  // Get top categories (root categories)
  const topCategories = categories?.filter(c => !c.parent_id).slice(0, 6) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <div className="bg-gray-900 text-white py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-red-500 text-white px-4 py-1 rounded-full text-sm font-bold mb-6 animate-bounce">
            <Flame className="w-4 h-4" />
            <span>HOT TRENDS</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Descubre lo que todos <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
              están comprando
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Explora las últimas tendencias, los productos más deseados y las novedades que acaban de llegar a Siver Market.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-16">
        
        {/* Trending Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Tendencias de la Semana</h2>
                <p className="text-gray-500 text-sm">Los productos más populares en este momento</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2" onClick={() => navigate('/categorias')}>
              Ver todo <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={{
                  id: product.id,
                  name: product.nombre,
                  price: product.precio_sugerido_venta || product.precio_mayorista,
                  image: product.imagen_principal || '/placeholder.svg',
                }} />
              ))}
            </div>
          )}
        </section>

        {/* Categories Section */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Categorías en Tendencia</h2>
          {categoriesLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-32 rounded-full flex-shrink-0" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topCategories.map((cat) => (
                <div 
                  key={cat.id}
                  onClick={() => navigate(`/categoria/${cat.slug}`)}
                  className="group cursor-pointer flex flex-col items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-red-500 transition-all">
                    {cat.icon ? (
                      <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-gray-400">{cat.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-red-600 transition-colors text-center">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* New Arrivals Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recién Llegados</h2>
                <p className="text-gray-500 text-sm">Lo último que hemos agregado al catálogo</p>
              </div>
            </div>
            <Button variant="ghost" className="gap-2" onClick={() => navigate('/categorias')}>
              Ver todo <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-64 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {newArrivals.length > 0 ? (
                newArrivals.map((product) => (
                  <ProductCard key={product.id} product={{
                    id: product.id,
                    name: product.nombre,
                    price: product.precio_sugerido_venta || product.precio_mayorista,
                    image: product.imagen_principal || '/placeholder.svg',
                  }} />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500">
                  No hay suficientes productos nuevos para mostrar.
                </div>
              )}
            </div>
          )}
        </section>

      </div>
      <Footer />
    </div>
  );
};

export default TrendsPage;

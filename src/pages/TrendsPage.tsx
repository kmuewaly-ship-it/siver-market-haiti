import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Flame, Clock, ArrowRight, TrendingUp, Filter, X } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { usePublicCategories } from "@/hooks/useCategories";
import { useTrendingProducts } from "@/hooks/useTrendingProducts";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductCard from "@/components/landing/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import FeaturedCarousel from "@/components/shared/FeaturedCarousel";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";

const TrendsPage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { role, user } = useAuth();
  const { data: productsData, isLoading: productsLoading } = useProducts(0, 50);
  const { data: categories, isLoading: categoriesLoading } = usePublicCategories();
  const { data: trendingProducts, isLoading: trendingLoading } = useTrendingProducts(7, 20);

  const isB2B = user && (role === UserRole.SELLER || role === UserRole.ADMIN);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("trending");
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Calculate max price from products
  const maxPrice = useMemo(() => {
    if (!productsData?.products) return 1000;
    return Math.max(...productsData.products.map(p => p.precio_sugerido_venta || p.precio_mayorista || 0), 1000);
  }, [productsData]);

  // Get filtered and sorted trending products
  const filteredTrendingProducts = useMemo(() => {
    let products = trendingProducts || [];

    // Filter by category
    if (selectedCategory !== "all") {
      products = products.filter(p => p.categoria_id === selectedCategory);
    }

    // Filter by price range
    products = products.filter(p => {
      const price = p.precio_sugerido_venta || p.precio_mayorista;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort
    if (sortBy === "price-low") {
      products = [...products].sort((a, b) => 
        (a.precio_sugerido_venta || a.precio_mayorista) - (b.precio_sugerido_venta || b.precio_mayorista)
      );
    } else if (sortBy === "price-high") {
      products = [...products].sort((a, b) => 
        (b.precio_sugerido_venta || b.precio_mayorista) - (a.precio_sugerido_venta || a.precio_mayorista)
      );
    }
    // "trending" is default order from API

    return products;
  }, [trendingProducts, selectedCategory, priceRange, sortBy]);

  // Get new arrivals (recent products)
  const newArrivals = useMemo(() => {
    let products = productsData?.products.slice(0, 16) || [];
    
    if (selectedCategory !== "all") {
      products = products.filter(p => p.categoria_id === selectedCategory);
    }

    products = products.filter(p => {
      const price = p.precio_sugerido_venta || p.precio_mayorista || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    return products.slice(0, 8);
  }, [productsData, selectedCategory, priceRange]);

  // Get top categories (root categories)
  const topCategories = categories?.filter(c => !c.parent_id).slice(0, 6) || [];

  const clearFilters = () => {
    setSelectedCategory("all");
    setPriceRange([0, maxPrice]);
    setSortBy("trending");
  };

  const hasActiveFilters = selectedCategory !== "all" || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const FilterControls = () => (
    <div className="space-y-6">
      {/* Category Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories?.filter(c => !c.parent_id).map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rango de Precio: ${priceRange[0]} - ${priceRange[1]}
        </label>
        <Slider
          value={priceRange}
          onValueChange={(value) => setPriceRange(value as [number, number])}
          min={0}
          max={maxPrice}
          step={10}
          className="mt-2"
        />
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Ordenar por</label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="trending">Más populares</SelectItem>
            <SelectItem value="price-low">Precio: Menor a Mayor</SelectItem>
            <SelectItem value="price-high">Precio: Mayor a Menor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearFilters} className="w-full">
          <X className="w-4 h-4 mr-2" />
          Limpiar Filtros
        </Button>
      )}
    </div>
  );

  // Featured products for carousel
  const featuredProducts = useMemo(() => {
    return (trendingProducts || []).slice(0, 8).map(p => ({
      id: p.id,
      sku: p.sku_interno,
      nombre: p.nombre,
      precio: p.precio_sugerido_venta || p.precio_mayorista,
      imagen_principal: p.imagen_principal || '/placeholder.svg',
      stock: p.stock_status === 'out_of_stock' ? 0 : 1,
      moq: 1
    }));
  }, [trendingProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && <Header />}

      {/* Featured Carousel - Mobile Only */}
      {isMobile && featuredProducts.length > 0 && (
        <div className="pt-2">
          <FeaturedCarousel products={featuredProducts} showMoq={isB2B} />
        </div>
      )}
      
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

      <div className={`container mx-auto px-4 py-12 ${isMobile ? 'pb-20' : ''}`}>
        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-4 rounded-lg shadow-sm">
          {/* Desktop Filters */}
          <div className="hidden md:flex items-center gap-4 flex-1">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories?.filter(c => !c.parent_id).map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trending">Más populares</SelectItem>
                <SelectItem value="price-low">Menor precio</SelectItem>
                <SelectItem value="price-high">Mayor precio</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Precio:</span>
              <div className="w-48">
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  min={0}
                  max={maxPrice}
                  step={10}
                />
              </div>
              <span className="text-xs">${priceRange[0]}-${priceRange[1]}</span>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                Filtros
                {hasActiveFilters && <span className="w-2 h-2 bg-red-500 rounded-full" />}
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterControls />
              </div>
            </SheetContent>
          </Sheet>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
              <X className="w-4 h-4 mr-1" />
              Limpiar
            </Button>
          )}

          <div className="text-sm text-gray-500">
            {filteredTrendingProducts.length} productos
          </div>
        </div>

        <div className="space-y-16">
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

            {trendingLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="space-y-4">
                    <Skeleton className="h-64 w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredTrendingProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {filteredTrendingProducts.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={{
                    id: product.id,
                    name: product.nombre,
                    price: product.precio_sugerido_venta || product.precio_mayorista,
                    image: product.imagen_principal || '/placeholder.svg',
                    badge: product.view_count > 10 ? `${product.view_count} vistas` : undefined,
                  }} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No hay productos que coincidan con los filtros seleccionados.
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
            ) : newArrivals.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {newArrivals.map((product) => (
                  <ProductCard key={product.id} product={{
                    id: product.id,
                    name: product.nombre,
                    price: product.precio_sugerido_venta || product.precio_mayorista,
                    image: product.imagen_principal || '/placeholder.svg',
                  }} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                No hay productos nuevos que coincidan con los filtros.
              </div>
            )}
          </section>
        </div>
      </div>
      {!isMobile && <Footer />}
    </div>
  );
};

export default TrendsPage;

import GlobalHeader from "@/components/layout/GlobalHeader";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import ProductCarousel from "@/components/landing/ProductCarousel";
import CategoryGrid from "@/components/landing/CategoryGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePublicCategories } from "@/hooks/useCategories";
import { useMemo } from "react";
import {
  useFeaturedProducts,
  useBestSellers,
  useNewArrivals,
  useTopStores,
  useProductsByCategory,
} from "@/hooks/useMarketplaceData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, Star, Package, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const isMobile = useIsMobile();
  const { data: categories } = usePublicCategories();

  // Fetch marketplace data from database
  const { data: featuredProducts = [], isLoading: loadingFeatured } = useFeaturedProducts(10);
  const { data: bestSellers = [], isLoading: loadingBestSellers } = useBestSellers(10);
  const { data: newArrivals = [], isLoading: loadingNewArrivals } = useNewArrivals(10);
  const { data: topStores = [] } = useTopStores(6);

  // Get root categories for category-based product carousels
  const rootCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => !c.parent_id).slice(0, 4);
  }, [categories]);

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <GlobalHeader />}
      
      <main className={isMobile ? "pb-14" : ""}>
        <HeroSection />
        <CategoryGrid />

        {/* Productos Destacados */}
        <ProductCarousel
          title="Productos destacados"
          products={featuredProducts}
          itemsPerView={5}
          isLoading={loadingFeatured}
        />

        {/* Más Vendidos */}
        {bestSellers.length > 0 && (
          <ProductCarousel
            title="Más vendidos"
            products={bestSellers}
            itemsPerView={5}
            isLoading={loadingBestSellers}
          />
        )}

        {/* Top Tiendas */}
        {topStores.length > 0 && (
          <section className="py-6 px-4">
            <div className="container mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl md:text-2xl font-bold">Tiendas destacadas</h2>
                <Link to="/trends" className="text-sm text-primary hover:underline">
                  Ver todas
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {topStores.map((store) => (
                  <Link key={store.id} to={`/tienda/${store.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-2 overflow-hidden">
                          {store.logo ? (
                            <img 
                              src={store.logo} 
                              alt={store.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-medium text-sm line-clamp-1 flex items-center gap-1">
                          {store.name}
                          {store.isVerified && (
                            <CheckCircle className="w-3 h-3 text-primary flex-shrink-0" />
                          )}
                        </h3>
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Package className="w-3 h-3" />
                          <span>{store.productCount} productos</span>
                        </div>
                        {store.rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs">{store.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Nuevos Productos */}
        {newArrivals.length > 0 && (
          <ProductCarousel
            title="Recién llegados"
            products={newArrivals}
            itemsPerView={5}
            isLoading={loadingNewArrivals}
          />
        )}

        {/* Products by Category */}
        {rootCategories.map(category => (
          <CategoryProductsSection 
            key={category.id} 
            categoryId={category.id}
            categoryName={category.name}
            categorySlug={category.slug}
          />
        ))}
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

// Separate component for category products to avoid conditional hook calls
const CategoryProductsSection = ({ 
  categoryId, 
  categoryName, 
  categorySlug 
}: { 
  categoryId: string; 
  categoryName: string; 
  categorySlug: string;
}) => {
  const { data: products = [], isLoading } = useProductsByCategory(categoryId, 10);

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <ProductCarousel
      title={categoryName}
      products={products}
      itemsPerView={5}
      linkTo={`/categoria/${categorySlug}`}
      isLoading={isLoading}
    />
  );
};

export default Index;

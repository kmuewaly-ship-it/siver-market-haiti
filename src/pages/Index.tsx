import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import ProductCarousel from "@/components/landing/ProductCarousel";
import CategoryGrid from "@/components/landing/CategoryGrid";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSellerProducts } from "@/hooks/useSellerProducts";
import { usePublicCategories } from "@/hooks/useCategories";
import { useMemo } from "react";

const Index = () => {
  const isMobile = useIsMobile();
  const { data: sellerProducts, isLoading } = useSellerProducts(100);
  const { data: categories } = usePublicCategories();

  // Transform seller_catalog products to the format expected by ProductCarousel
  const transformProduct = (product: any) => {
    const images = product.images as any;
    const mainImage = Array.isArray(images) && images.length > 0 
      ? images[0] 
      : typeof images === 'string' ? images : 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=300&h=400&fit=crop';

    return {
      id: product.id,
      name: product.nombre,
      price: product.precio_venta,
      image: mainImage,
      sku: product.sku,
      storeId: product.store?.id,
      storeName: product.store?.name,
      storeWhatsapp: product.store?.whatsapp || undefined,
      categoryId: product.source_product?.categoria_id,
      categoryName: product.source_product?.category?.name,
      categorySlug: product.source_product?.category?.slug,
    };
  };

  // All products transformed
  const allProducts = useMemo(() => {
    if (!sellerProducts) return [];
    return sellerProducts.map(transformProduct);
  }, [sellerProducts]);

  // Get root categories that have products
  const categoriesWithProducts = useMemo(() => {
    if (!categories || !allProducts.length) return [];
    
    const rootCategories = categories.filter(c => !c.parent_id);
    
    return rootCategories
      .map(category => {
        // Get all category IDs (including children)
        const childIds = categories
          .filter(c => c.parent_id === category.id)
          .map(c => c.id);
        const allCategoryIds = [category.id, ...childIds];
        
        // Filter products for this category tree
        const categoryProducts = allProducts.filter(p => 
          p.categoryId && allCategoryIds.includes(p.categoryId)
        );
        
        return {
          ...category,
          products: categoryProducts.slice(0, 10),
        };
      })
      .filter(c => c.products.length > 0);
  }, [categories, allProducts]);

  // Featured products (first 10)
  const featuredProducts = allProducts.slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      {!isMobile && <Header />}
      
      <main className={isMobile ? "pb-14" : ""}>
        <HeroSection />
        <CategoryGrid />

        {/* Productos Destacados */}
        <ProductCarousel
          title="🔥 PRODUCTOS DESTACADOS"
          products={featuredProducts}
          itemsPerView={5}
          isLoading={isLoading}
        />

        {/* Products by Category */}
        {categoriesWithProducts.map(category => (
          <ProductCarousel
            key={category.id}
            title={category.name}
            products={category.products}
            itemsPerView={5}
            linkTo={`/categoria/${category.slug}`}
          />
        ))}
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default Index;
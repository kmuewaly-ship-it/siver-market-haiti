import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import ProductCarousel from "@/components/landing/ProductCarousel";
import ProductGrid from "@/components/landing/ProductGrid";
import CategoryGrid from "@/components/landing/CategoryGrid";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  // Datos de ejemplo - En la práctica, estos vendrían de tu base de datos
  const mockProducts = [
    {
      id: "1",
      name: "Blusa Elegante de Verano",
      price: 25.99,
      originalPrice: 45.99,
      image:
        "https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=300&h=400&fit=crop",
      badge: "TENDENCIA",
    },
    {
      id: "2",
      name: "Vestido Casual Cómodo",
      price: 34.99,
      originalPrice: 59.99,
      image:
        "https://images.unsplash.com/photo-1598888141096-94f9017f3a3c?w=300&h=400&fit=crop",
    },
    {
      id: "3",
      name: "Pantalón Vaquero Premium",
      price: 39.99,
      originalPrice: 69.99,
      image:
        "https://images.unsplash.com/photo-1542272604-787c62d465d1?w=300&h=400&fit=crop",
    },
    {
      id: "4",
      name: "Chaqueta de Cuero",
      price: 64.99,
      originalPrice: 129.99,
      image:
        "https://images.unsplash.com/photo-1591047990508-ea37cff4565d?w=300&h=400&fit=crop",
      badge: "VENTA FLASH",
    },
    {
      id: "5",
      name: "Zapatillas Deportivas",
      price: 44.99,
      originalPrice: 89.99,
      image:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=400&fit=crop",
    },
    {
      id: "6",
      name: "Accesorios de Moda",
      price: 15.99,
      originalPrice: 29.99,
      image:
        "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=400&fit=crop",
    },
    {
      id: "7",
      name: "Bolsa de Mano Moderna",
      price: 49.99,
      originalPrice: 99.99,
      image:
        "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&h=400&fit=crop",
    },
    {
      id: "8",
      name: "Sombrilla Elegante",
      price: 18.99,
      image:
        "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=400&fit=crop",
      discount: 40,
    },
    {
      id: "9",
      name: "Anillo de Plata",
      price: 22.99,
      originalPrice: 45.99,
      image:
        "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=400&fit=crop",
    },
    {
      id: "10",
      name: "Collar Dorado Vintage",
      price: 32.99,
      originalPrice: 65.99,
      image:
        "https://images.unsplash.com/photo-1535562141207-4b100cb4cb12?w=300&h=400&fit=crop",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop header - hidden on mobile since GlobalMobileHeader handles it */}
      {!isMobile && <Header />}
      
      <main className={isMobile ? "pb-14" : ""}>
        <HeroSection />
        {/* Categories grid from database */}
        <CategoryGrid />

        {/* Super Rebajas */}
        <ProductCarousel
          title="🔥 SÚPER REBAJAS"
          products={mockProducts}
          itemsPerView={5}
        />

        {/* Lo Más Nuevo */}
        <ProductCarousel
          title="⭐ LO MÁS NUEVO"
          products={mockProducts}
          itemsPerView={5}
        />

        {/* Top Ventas */}
        <ProductCarousel
          title="👑 TOP VENTAS"
          products={mockProducts}
          itemsPerView={5}
        />

        {/* Ropa de Mujer */}
        <ProductGrid
          title="ROPA DE MUJER"
          subtitle="Descubre nuestras mejores prendas para ti"
          products={mockProducts}
        />

        {/* Accesorios */}
        <ProductGrid
          title="ACCESORIOS"
          subtitle="Completa tu look con nuestros accesorios"
          products={mockProducts}
        />
      </main>
      {!isMobile && <Footer />}
    </div>
  );
};

export default Index;
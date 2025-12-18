import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCartB2B } from "@/hooks/useCartB2B";
import { SellerLayout } from "@/components/seller/SellerLayout";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SellerMobileHeader from "@/components/seller/SellerMobileHeader";
import SearchFilterB2B from "@/components/b2b/SearchFilterB2B";
import ProductCardB2B from "@/components/b2b/ProductCardB2B";
import CartSidebarB2B from "@/components/b2b/CartSidebarB2B";
import { B2BFilters, ProductB2BCard, CartItemB2B } from "@/types/b2b";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import FeaturedProductsCarousel from "@/components/b2b/FeaturedProductsCarousel";
const SellerAcquisicionLotesContent = () => {
  const {
    user,
    isLoading
  } = useAuth();
  const {
    cart,
    addItem,
    updateQuantity,
    removeItem
  } = useCartB2B();
  const isMobile = useIsMobile();
  const {
    toast
  } = useToast();
  const handleAddToCart = (item: CartItemB2B) => {
    addItem(item);
    toast({
      title: "Producto agregado",
      description: `${item.nombre} (${item.cantidad} unidades) se ha añadido al carrito.`
    });
  };
  const [products, setProducts] = useState<ProductB2BCard[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductB2BCard[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductB2BCard[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [filters, setFilters] = useState<B2BFilters>({
    searchQuery: "",
    category: null,
    stockStatus: "all",
    sortBy: "newest"
  });
  const [whatsappNumber, setWhatsappNumber] = useState("50369596772");
  useEffect(() => {
    const saved = localStorage.getItem("admin_whatsapp_b2b");
    if (saved) setWhatsappNumber(saved);
  }, []);
  useEffect(() => {
    const mockProducts: ProductB2BCard[] = [{
      id: "1",
      sku: "TSHIRT-001",
      nombre: "Camiseta Básica Blanca - Talla M",
      precio_b2b: 2.5,
      moq: 50,
      stock_fisico: 500,
      imagen_principal: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop",
      categoria_id: "cat1"
    }, {
      id: "2",
      sku: "JEANS-001",
      nombre: "Pantalón Vaquero Azul - Talla 32",
      precio_b2b: 8.5,
      moq: 30,
      stock_fisico: 200,
      imagen_principal: "https://images.unsplash.com/photo-1542272604-787c62d465d1?w=300&h=300&fit=crop",
      categoria_id: "cat1"
    }, {
      id: "3",
      sku: "SHOES-001",
      nombre: "Zapatillas Deportivas Negras",
      precio_b2b: 12.0,
      moq: 20,
      stock_fisico: 150,
      imagen_principal: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop",
      categoria_id: "cat2"
    }, {
      id: "4",
      sku: "DRESS-001",
      nombre: "Vestido Casual Floral",
      precio_b2b: 6.0,
      moq: 25,
      stock_fisico: 75,
      imagen_principal: "https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=300&h=300&fit=crop",
      categoria_id: "cat1"
    }, {
      id: "5",
      sku: "ACC-001",
      nombre: "Correa de Cuero Marrón",
      precio_b2b: 3.5,
      moq: 100,
      stock_fisico: 0,
      imagen_principal: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop",
      categoria_id: "cat3"
    }];
    setProducts(mockProducts);
    const savedIds = localStorage.getItem("admin_b2b_featured_ids");
    if (savedIds) {
      const ids = savedIds.split(",").map(id => id.trim());
      const featured = mockProducts.filter(p => ids.includes(p.id));
      setFeaturedProducts(featured);
    } else {
      setFeaturedProducts(mockProducts.slice(0, 3));
    }
  }, []);
  useEffect(() => {
    let result = [...products];
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(p => p.nombre.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
    }
    if (filters.category) {
      result = result.filter(p => p.categoria_id === filters.category);
    }
    if (filters.stockStatus !== "all") {
      if (filters.stockStatus === "in_stock") {
        result = result.filter(p => p.stock_fisico > 0);
      } else if (filters.stockStatus === "out_of_stock") {
        result = result.filter(p => p.stock_fisico === 0);
      } else if (filters.stockStatus === "low_stock") {
        result = result.filter(p => p.stock_fisico > 0 && p.stock_fisico < p.moq * 2);
      }
    }
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "price_asc":
          return a.precio_b2b - b.precio_b2b;
        case "price_desc":
          return b.precio_b2b - a.precio_b2b;
        case "moq_asc":
          return a.moq - b.moq;
        case "moq_desc":
          return b.moq - a.moq;
        default:
          return 0;
      }
    });
    setFilteredProducts(result);
  }, [products, filters]);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  const categories = [{
    id: "cat1",
    nombre: "Ropa"
  }, {
    id: "cat2",
    nombre: "Zapatos"
  }, {
    id: "cat3",
    nombre: "Accesorios"
  }];
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>;
  }
  const handleCategorySelect = (categoryId: string | null) => {
    setFilters({
      ...filters,
      category: categoryId
    });
  };
  const handleHeaderSearch = (query: string) => {
    setFilters({
      ...filters,
      searchQuery: query
    });
  };
  return <div className="min-h-screen bg-gray-50">
      {isMobile ? <SellerMobileHeader selectedCategoryId={filters.category} onCategorySelect={handleCategorySelect} onSearch={handleHeaderSearch} /> : <Header />}
      
      <main className="container mx-auto px-4 pb-24 pt-4">

        {/* Hero Carousel (Mobile Only) */}
        {isMobile && featuredProducts.length > 0 && <div className="mb-6 -mx-4">
            <FeaturedProductsCarousel products={featuredProducts} />
          </div>}

        {/* Encabezado Desktop */}
        {!isMobile && <div className="mb-8">
            
            <p className="text-gray-600">
              Bienvenido, {user?.name}
            </p>
          </div>}

        {/* Filtros */}
        {isMobile ? <div className="mb-6">
            {/* Categorías Horizontales */}
            
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros y Búsqueda
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <div className="py-4">
                  <h3 className="font-semibold mb-4">Filtros</h3>
                  <SearchFilterB2B filters={filters} onFiltersChange={setFilters} categories={categories} />
                </div>
              </SheetContent>
            </Sheet>
          </div> : <SearchFilterB2B filters={filters} onFiltersChange={setFilters} categories={categories} />}

        {/* Resultados */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Productos ({filteredProducts.length} encontrados)
            </h2>
            <div className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length}
            </div>
          </div>

          {filteredProducts.length === 0 ? <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600">
                No se encontraron productos que coincidan con tus filtros.
              </p>
            </div> : <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {paginatedProducts.map(product => <ProductCardB2B key={product.id} product={product} onAddToCart={handleAddToCart} cartItem={cart.items.find(item => item.productId === product.id)} whatsappNumber={whatsappNumber} />)}
              </div>

              {/* Paginación */}
              {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-8">
                  <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    {isMobile ? <ChevronLeft className="h-5 w-5" /> : "← Anterior"}
                  </button>

                  <div className="flex gap-1">
                    {Array.from({
                length: totalPages
              }, (_, i) => i + 1).map(page => <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-2 rounded-lg transition ${currentPage === page ? "bg-blue-600 text-white" : "border border-gray-300 hover:bg-gray-50"}`}>
                        {page}
                      </button>)}
                  </div>

                  <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition">
                    {isMobile ? <ChevronRight className="h-5 w-5" /> : "Siguiente →"}
                  </button>
                </div>}
            </>}
        </div>
      </main>

      {/* Carrito Flotante */}
      <CartSidebarB2B cart={cart} onUpdateQuantity={updateQuantity} onRemoveItem={removeItem} isOpen={isCartOpen} onToggle={() => setIsCartOpen(!isCartOpen)} />

      <Footer />
    </div>;
};
const SellerAcquisicionLotes = () => {
  return <SellerLayout>
      <SellerAcquisicionLotesContent />
    </SellerLayout>;
};
export default SellerAcquisicionLotes;
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCartB2B } from "@/hooks/useCartB2B";
import { SellerLayout } from "@/components/seller/SellerLayout";
import Footer from "@/components/layout/Footer";
import HeaderB2B from "@/components/b2b/HeaderB2B";
import ProductCardB2B from "@/components/b2b/ProductCardB2B";
import CartSidebarB2B from "@/components/b2b/CartSidebarB2B";
import { B2BFilters, CartItemB2B } from "@/types/b2b";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProductsB2B, useFeaturedProductsB2B } from "@/hooks/useProductsB2B";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import FeaturedProductsCarousel from "@/components/b2b/FeaturedProductsCarousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
const SellerAcquisicionLotesContent = () => {
  const {
    user,
    isLoading: authLoading
  } = useAuth();
  const {
    cart,
    addItem,
    updateQuantity,
    removeItem
  } = useCartB2B();
  const isMobile = useIsMobile();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 12;
  const [filters, setFilters] = useState<B2BFilters>({
    searchQuery: "",
    category: null,
    stockStatus: "all",
    sortBy: "newest"
  });
  const [whatsappNumber, setWhatsappNumber] = useState("50369596772");

  // Fetch products from database
  const {
    data: productsData,
    isLoading: productsLoading
  } = useProductsB2B(filters, currentPage, itemsPerPage);
  const {
    data: featuredProducts = []
  } = useFeaturedProductsB2B(6);
  const products = productsData?.products || [];
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / itemsPerPage);
  useEffect(() => {
    const saved = localStorage.getItem("admin_whatsapp_b2b");
    if (saved) setWhatsappNumber(saved);
  }, []);
  useEffect(() => {
    setCurrentPage(0);
  }, [filters]);
  const handleAddToCart = (item: CartItemB2B) => {
    addItem(item);
  };
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
  const handleSortChange = (value: string) => {
    setFilters({
      ...filters,
      sortBy: value as B2BFilters["sortBy"]
    });
  };
  const handleStockFilterChange = (value: string) => {
    setFilters({
      ...filters,
      stockStatus: value as B2BFilters["stockStatus"]
    });
  };
  const isLoading = authLoading || productsLoading;
  if (authLoading) {
    return <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p>Cargando...</p>
        </div>
      </div>;
  }
  const startIndex = currentPage * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalProducts);
  return <div className="min-h-screen bg-gray-50">
      
      
      <main className="container mx-auto px-4 pb-24 pt-4">
        {/* Hero Carousel (Mobile Only) */}
        {isMobile && featuredProducts.length > 0 && <div className="mb-6 -mx-4">
            <FeaturedProductsCarousel products={featuredProducts} />
          </div>}

        {/* Encabezado Desktop */}
        {!isMobile && <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Catálogo Mayorista</h1>
            <p className="text-gray-600">
              Bienvenido, {user?.name || "Vendedor"}. Explora nuestro catálogo de productos al por mayor.
            </p>
          </div>}

        {/* Filtros inline */}
        <div className="flex items-center gap-2 mb-6 bg-white px-3 py-2 rounded-lg border border-gray-200 overflow-x-auto">
          <span className="text-xs text-gray-500 whitespace-nowrap">Ordenar:</span>
          <Select value={filters.sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="price_asc">Precio: menor a mayor</SelectItem>
              <SelectItem value="price_desc">Precio: mayor a menor</SelectItem>
              <SelectItem value="moq_asc">MOQ: menor a mayor</SelectItem>
              <SelectItem value="moq_desc">MOQ: mayor a menor</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-xs text-gray-500 whitespace-nowrap">Stock:</span>
          <Select value={filters.stockStatus} onValueChange={handleStockFilterChange}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="in_stock">En stock</SelectItem>
              <SelectItem value="low_stock">Stock bajo</SelectItem>
              <SelectItem value="out_of_stock">Agotado</SelectItem>
            </SelectContent>
          </Select>

          {(filters.searchQuery || filters.category || filters.stockStatus !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFilters({
                searchQuery: "",
                category: null,
                stockStatus: "all",
                sortBy: "newest"
              })} 
              className="text-blue-600 hover:text-blue-700 text-xs h-8 whitespace-nowrap"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Resultados */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Productos ({totalProducts} encontrados)
            </h2>
            {totalProducts > 0 && <div className="text-sm text-gray-600">
                Mostrando {startIndex + 1}-{endIndex} de {totalProducts}
              </div>}
          </div>

          {productsLoading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div> : products.length === 0 ? <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600">
                No se encontraron productos que coincidan con tus filtros.
              </p>
            </div> : <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
                {products.map(product => <ProductCardB2B key={product.id} product={product} onAddToCart={handleAddToCart} cartItem={cart.items.find(item => item.productId === product.id)} whatsappNumber={whatsappNumber} />)}
              </div>

              {/* Paginación */}
              {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-8">
                  <Button variant="outline" onClick={() => setCurrentPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
                    {isMobile ? <ChevronLeft className="h-5 w-5" /> : "← Anterior"}
                  </Button>

                  <div className="flex gap-1">
                    {Array.from({
                length: Math.min(totalPages, 5)
              }, (_, i) => {
                let pageNum = i;
                if (totalPages > 5) {
                  if (currentPage < 2) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                }
                return <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(pageNum)} className={currentPage === pageNum ? "bg-blue-600 hover:bg-blue-700" : ""}>
                          {pageNum + 1}
                        </Button>;
              })}
                  </div>

                  <Button variant="outline" onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))} disabled={currentPage === totalPages - 1}>
                    {isMobile ? <ChevronRight className="h-5 w-5" /> : "Siguiente →"}
                  </Button>
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
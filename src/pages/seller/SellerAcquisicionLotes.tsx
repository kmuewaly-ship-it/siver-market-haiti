import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCartB2B } from '@/hooks/useCartB2B';
import { SellerLayout } from '@/components/seller/SellerLayout';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SearchFilterB2B from '@/components/b2b/SearchFilterB2B';
import ProductCardB2B from '@/components/b2b/ProductCardB2B';
import CartSidebarB2B from '@/components/b2b/CartSidebarB2B';
import { B2BFilters, ProductB2BCard } from '@/types/b2b';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Filter, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

interface Category {
  id: string;
  nombre: string;
}

const SellerAcquisicionLotes = () => {
  const { user, isLoading } = useAuth();
  const { cart, addItem, updateQuantity, removeItem } = useCartB2B();
  const isMobile = useIsMobile();

  const [products, setProducts] = useState<ProductB2BCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductB2BCard[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const itemsPerPage = 12;
  const [filters, setFilters] = useState<B2BFilters>({
    searchQuery: '',
    category: null,
    stockStatus: 'all',
    sortBy: 'newest',
  });

  // Fetch real products from Supabase
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoadingProducts(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, sku_interno, nombre, precio_mayorista, moq, stock_fisico, imagen_principal, categoria_id')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
      } else if (data) {
        const mapped: ProductB2BCard[] = data.map((p) => ({
          id: p.id,
          sku: p.sku_interno,
          nombre: p.nombre,
          precio_b2b: p.precio_mayorista,
          moq: p.moq,
          stock_fisico: p.stock_fisico,
          imagen_principal: p.imagen_principal || '/placeholder.svg',
          categoria_id: p.categoria_id || '',
        }));
        setProducts(mapped);
      }
      setIsLoadingProducts(false);
    };

    fetchProducts();
  }, []);

  // Fetch real categories from Supabase
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_visible_public', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
      } else if (data) {
        setCategories(data.map((c) => ({ id: c.id, nombre: c.name })));
      }
    };

    fetchCategories();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let result = [...products];

    // Búsqueda
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.sku.toLowerCase().includes(query) ||
          p.nombre.toLowerCase().includes(query)
      );
    }

    // Categoría
    if (filters.category) {
      result = result.filter((p) => p.categoria_id === filters.category);
    }

    // Stock
    if (filters.stockStatus === 'in_stock') {
      result = result.filter((p) => p.stock_fisico > 0);
    } else if (filters.stockStatus === 'low_stock') {
      result = result.filter((p) => p.stock_fisico > 0 && p.stock_fisico < p.moq * 2);
    } else if (filters.stockStatus === 'out_of_stock') {
      result = result.filter((p) => p.stock_fisico === 0);
    }

    // Ordenamiento
    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.precio_b2b - b.precio_b2b);
        break;
      case 'price_desc':
        result.sort((a, b) => b.precio_b2b - a.precio_b2b);
        break;
      case 'moq_asc':
        result.sort((a, b) => a.moq - b.moq);
        break;
      case 'moq_desc':
        result.sort((a, b) => b.moq - a.moq);
        break;
      case 'newest':
      default:
        break;
    }

    setFilteredProducts(result);
  }, [products, filters]);

  // Paginación
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset a página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);


  if (isLoading || isLoadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="container mx-auto px-4 pb-8 pt-4 md:pt-0">
          {/* Encabezado */}
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Catálogo de Adquisición B2B
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Bienvenido, {user?.name}. Busca y selecciona productos al por mayor.
            </p>
          </div>

        {/* Filtros - Mobile vs Desktop */}
        {isMobile ? (
          <div className="mb-6">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full flex items-center justify-center gap-2 h-12 text-base">
                  <SlidersHorizontal className="w-5 h-5" />
                  Filtrar y Ordenar
                  {(filters.category || filters.searchQuery || filters.stockStatus !== 'all') && (
                    <span className="ml-1 w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-xl">
                <SheetHeader className="mb-4">
                  <SheetTitle>Filtros de Búsqueda</SheetTitle>
                </SheetHeader>
                <SearchFilterB2B
                  filters={filters}
                  onFiltersChange={setFilters}
                  categories={categories}
                />
              </SheetContent>
            </Sheet>
          </div>
        ) : (
          <SearchFilterB2B
            filters={filters}
            onFiltersChange={setFilters}
            categories={categories}
          />
        )}

        {/* Resultados */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              Productos ({filteredProducts.length})
            </h2>
            <div className="text-sm text-gray-600">
              {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} de {filteredProducts.length}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600">
                No se encontraron productos que coincidan con tus filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {paginatedProducts.map((product) => (
                  <ProductCardB2B
                    key={product.id}
                    product={product}
                    onAddToCart={addItem}
                    cartItem={cart.items.find(item => item.productId === product.id)}
                  />
                ))}
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8 overflow-x-auto pb-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex gap-1">
                    {isMobile ? (
                      // Mobile Pagination (Simplified)
                      <span className="px-3 py-2 text-sm font-medium">
                        Página {currentPage} de {totalPages}
                      </span>
                    ) : (
                      // Desktop Pagination (Full)
                      Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={px-3 py-2 rounded-lg transition text-sm }
                        >
                          {page}
                        </button>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        </main>

      {/* Carrito Flotante */}
      <CartSidebarB2B
        cart={cart}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        isOpen={isCartOpen}
        onToggle={() => setIsCartOpen(!isCartOpen)}
      />

      <Footer />
      </div>
    </SellerLayout>
  );
};

export default SellerAcquisicionLotes;

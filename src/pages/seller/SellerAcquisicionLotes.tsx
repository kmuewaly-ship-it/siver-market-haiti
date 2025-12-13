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

const SellerAcquisicionLotes = () => {
  const { user, isLoading } = useAuth();
  const { cart, addItem, updateQuantity, removeItem } = useCartB2B();
  
  const [products, setProducts] = useState<ProductB2BCard[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductB2BCard[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [filters, setFilters] = useState<B2BFilters>({
    searchQuery: '',
    category: null,
    stockStatus: 'all',
    sortBy: 'newest',
  });

  // Mock products - Estos vendrían del backend
  useEffect(() => {
    const mockProducts: ProductB2BCard[] = [
      {
        id: '1',
        sku: 'TSHIRT-001',
        nombre: 'Camiseta Básica Blanca - Talla M',
        precio_b2b: 2.5,
        moq: 50,
        stock_fisico: 500,
        imagen_principal: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
        categoria_id: 'cat1',
      },
      {
        id: '2',
        sku: 'JEANS-001',
        nombre: 'Pantalón Vaquero Azul - Talla 32',
        precio_b2b: 8.5,
        moq: 30,
        stock_fisico: 200,
        imagen_principal: 'https://images.unsplash.com/photo-1542272604-787c62d465d1?w=300&h=300&fit=crop',
        categoria_id: 'cat1',
      },
      {
        id: '3',
        sku: 'SHOES-001',
        nombre: 'Zapatillas Deportivas Negras',
        precio_b2b: 12.0,
        moq: 20,
        stock_fisico: 150,
        imagen_principal: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=300&fit=crop',
        categoria_id: 'cat2',
      },
      {
        id: '4',
        sku: 'DRESS-001',
        nombre: 'Vestido Casual Floral',
        precio_b2b: 6.0,
        moq: 25,
        stock_fisico: 75,
        imagen_principal: 'https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=300&h=300&fit=crop',
        categoria_id: 'cat1',
      },
      {
        id: '5',
        sku: 'ACC-001',
        nombre: 'Correa de Cuero Marrón',
        precio_b2b: 3.5,
        moq: 100,
        stock_fisico: 0,
        imagen_principal: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop',
        categoria_id: 'cat3',
      },
    ];
    setProducts(mockProducts);
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

  const categories = [
    { id: 'cat1', nombre: 'Ropa' },
    { id: 'cat2', nombre: 'Zapatos' },
    { id: 'cat3', nombre: 'Accesorios' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <SellerLayout>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <main className="container mx-auto px-4 pb-8">
          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Catálogo de Adquisición B2B
            </h1>
            <p className="text-gray-600">
              Bienvenido, {user?.name}. Busca y selecciona productos al por mayor.
            </p>
          </div>

        {/* Filtros */}
        <SearchFilterB2B
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />

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

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-gray-600">
                No se encontraron productos que coincidan con tus filtros.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    ← Anterior
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg transition ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Siguiente →
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

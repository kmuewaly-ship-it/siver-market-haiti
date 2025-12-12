import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, MapPin, Star, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  seller: {
    id: string;
    name: string;
    logo?: string;
  };
  badge?: string;
  discount?: number;
}

interface FilterOptions {
  sortBy: "newest" | "price_asc" | "price_desc" | "rating";
  priceRange: [number, number];
}

const CategoryProductsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: "newest",
    priceRange: [0, 1000],
  });

  useEffect(() => {
    // Mock data - En producción, esto vendría de Supabase
    const mockProducts: Product[] = [
      {
        id: "1",
        sku: "DRESS-001",
        name: "Vestido Casual Floral Elegante",
        price: 34.99,
        originalPrice: 59.99,
        image: "https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=400&h=500&fit=crop",
        rating: 4.5,
        reviews: 234,
        seller: { id: "seller1", name: "Fashion World Store" },
        badge: "TENDENCIA",
        discount: 42,
      },
      {
        id: "2",
        sku: "TOP-002",
        name: "Top Básico de Algodón Premium",
        price: 15.99,
        originalPrice: 29.99,
        image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=500&fit=crop",
        rating: 4.8,
        reviews: 567,
        seller: { id: "seller2", name: "Premium Clothing Co" },
      },
      {
        id: "3",
        sku: "BLOUSE-003",
        name: "Blusa Elegante de Verano con Detalles",
        price: 25.99,
        originalPrice: 45.99,
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=500&fit=crop",
        rating: 4.6,
        reviews: 345,
        seller: { id: "seller1", name: "Fashion World Store" },
        badge: "ENVÍO GRATIS",
      },
      {
        id: "4",
        sku: "SHIRT-004",
        name: "Camiseta Básica Slim Fit",
        price: 12.99,
        originalPrice: 24.99,
        image: "https://images.unsplash.com/photo-1542060745-6b3bf4a5f5e6?w=400&h=500&fit=crop",
        rating: 4.4,
        reviews: 123,
        seller: { id: "seller3", name: "Casual Wear Plus" },
        discount: 48,
      },
      {
        id: "5",
        sku: "TUNIC-005",
        name: "Túnica Oversize Cómoda",
        price: 19.99,
        originalPrice: 39.99,
        image: "https://images.unsplash.com/photo-1514995669114-0a6c3c7d3b35?w=400&h=500&fit=crop",
        rating: 4.7,
        reviews: 456,
        seller: { id: "seller2", name: "Premium Clothing Co" },
      },
      {
        id: "6",
        sku: "CARDIGAN-006",
        name: "Cardigan de Punto Suave",
        price: 44.99,
        originalPrice: 79.99,
        image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=500&fit=crop",
        rating: 4.9,
        reviews: 678,
        seller: { id: "seller1", name: "Fashion World Store" },
      },
    ];

    setTimeout(() => {
      setProducts(mockProducts);
      setIsLoading(false);
    }, 500);
  }, [slug]);

  const handleViewStore = (sellerId: string) => {
    navigate(`/tienda/${sellerId}`);
  };

  const sortProducts = (prods: Product[]) => {
    const sorted = [...prods];
    switch (filters.sortBy) {
      case "price_asc":
        return sorted.sort((a, b) => a.price - b.price);
      case "price_desc":
        return sorted.sort((a, b) => b.price - a.price);
      case "rating":
        return sorted.sort((a, b) => b.rating - a.rating);
      case "newest":
      default:
        return sorted;
    }
  };

  const filteredProducts = sortProducts(products);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Cargando...</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">
              Inicio
            </button>
            <ChevronRight className="w-4 h-4" />
            <button onClick={() => navigate("/categorias")} className="hover:text-blue-600">
              Categorías
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="capitalize">{slug?.replace("-", " ")}</span>
          </div>
        </div>

        {/* Header con filtros */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 capitalize">
              {slug?.replace("-", " ")}
            </h1>
            <p className="text-gray-600 mt-1">{filteredProducts.length} productos disponibles</p>
          </div>

          {/* Ordenamiento */}
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters({ ...filters, sortBy: e.target.value as FilterOptions["sortBy"] })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Más Nuevo</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
              <option value="rating">Mejor Valorado</option>
            </select>
          </div>
        </div>

        {/* Grid de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition duration-300 flex flex-col"
            >
              {/* Imagen */}
              <div
                className="relative h-64 bg-gray-100 cursor-pointer overflow-hidden group"
                onClick={() => navigate(`/producto/${product.sku}`)}
              >
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                />

                {/* Badges */}
                {product.discount && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                    -{product.discount}%
                  </div>
                )}
                {product.badge && (
                  <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">
                    {product.badge}
                  </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4 flex-1 flex flex-col">
                {/* Nombre */}
                <h3
                  className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition"
                  onClick={() => navigate(`/producto/${product.sku}`)}
                >
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 mt-2">
                  <div className="flex text-yellow-400">
                    {Array.from({ length: Math.round(product.rating) }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-600">({product.reviews})</span>
                </div>

                {/* Precios */}
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Vendedor */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">Vendido por</p>
                      <button
                        onClick={() => handleViewStore(product.seller.id)}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                      >
                        {product.seller.name}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botón Comprar */}
                <Button
                  onClick={() => navigate(`/producto/${product.sku}`)}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Ver Detalles
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoryProductsPage;

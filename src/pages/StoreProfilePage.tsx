import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import {
  Star,
  MessageCircle,
  Heart,
  Share2,
  MapPin,
  Clock,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  ChevronRight,
  Search,
} from "lucide-react";

interface StoreProfile {
  id: string;
  name: string;
  logo: string;
  banner: string;
  rating: number;
  reviews: number;
  followers: number;
  products: number;
  joinDate: string;
  location: string;
  responseTime: string;
  description: string;
  categories: string[];
  badges: string[];
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviews: number;
  sales: number;
  category: string;
  discount?: number;
}

const StoreProfilePage = () => {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Mock data - En producción, esto vendría de Supabase
    const mockStore: StoreProfile = {
      id: "seller1",
      name: "Fashion World Store",
      logo: "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=100&h=100&fit=crop",
      banner: "https://images.unsplash.com/photo-1542682353-bf4f5216dcab?w=1200&h=300&fit=crop",
      rating: 4.7,
      reviews: 2543,
      followers: 125643,
      products: 1254,
      joinDate: "Enero 2020",
      location: "Colombia",
      responseTime: "1-2 horas",
      description:
        "Tienda especializada en moda femenina de alta calidad. Ropa casual, formal y deportiva para todas las edades. Envíos rápidos y garantía de satisfacción.",
      categories: ["Ropa Mujer", "Vestidos", "Tops", "Accesorios", "Zapatos"],
      badges: ["Top Seller", "Envío Gratis", "Respuesta Rápida"],
    };

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
        sales: 1250,
        category: "Vestidos",
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
        sales: 3200,
        category: "Tops",
      },
      {
        id: "3",
        sku: "BLOUSE-003",
        name: "Blusa Elegante de Verano",
        price: 25.99,
        originalPrice: 45.99,
        image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=500&fit=crop",
        rating: 4.6,
        reviews: 345,
        sales: 1800,
        category: "Ropa Mujer",
      },
      {
        id: "4",
        sku: "SHOES-004",
        name: "Zapatos Deportivos Modernos",
        price: 44.99,
        originalPrice: 79.99,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=500&fit=crop",
        rating: 4.7,
        reviews: 456,
        sales: 2100,
        category: "Zapatos",
        discount: 44,
      },
      {
        id: "5",
        sku: "ACC-005",
        name: "Collar de Moda Dorado",
        price: 12.99,
        originalPrice: 24.99,
        image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=500&fit=crop",
        rating: 4.9,
        reviews: 678,
        sales: 3400,
        category: "Accesorios",
        discount: 48,
      },
      {
        id: "6",
        sku: "DRESS-006",
        name: "Vestido de Noche Elegante",
        price: 64.99,
        originalPrice: 129.99,
        image: "https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=400&h=500&fit=crop",
        rating: 4.8,
        reviews: 234,
        sales: 890,
        category: "Vestidos",
        discount: 50,
      },
    ];

    setTimeout(() => {
      setStore(mockStore);
      setProducts(mockProducts);
      setIsLoading(false);
    }, 500);
  }, [storeId]);

  if (isLoading || !store) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 pb-8">
          <Skeleton className="h-80 mb-8" />
          <Skeleton className="h-60 mb-8" />
        </main>
        <Footer />
      </div>
    );
  }

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    const matchCategory = !selectedCategory || product.category === selectedCategory;
    const matchSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 pb-0">
        {/* Banner */}
        <div className="relative h-64 md:h-80 bg-gray-200 rounded-b-lg overflow-hidden -mx-4 mb-0">
          <img
            src={store.banner}
            alt={store.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        {/* Perfil de Tienda */}
        <div className="bg-white rounded-lg shadow-lg p-6 -mt-24 relative z-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-start md:gap-6">
            {/* Logo y Info Principal */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1 mb-4 md:mb-0">
              {/* Logo */}
              <img
                src={store.logo}
                alt={store.name}
                className="w-24 h-24 md:w-32 md:h-32 rounded-lg object-cover border-4 border-white shadow-lg"
              />

              {/* Info Básica */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {store.name}
                  </h1>
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {store.badges.map((badge) => (
                    <span
                      key={badge}
                      className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold"
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {/* Rating */}
                <div className="flex items-center gap-4 flex-wrap text-sm">
                  <div className="flex items-center gap-1">
                    <div className="flex text-yellow-400">
                      {Array.from({ length: Math.round(store.rating) }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="font-semibold text-gray-900">{store.rating}</span>
                    <span className="text-gray-600">({store.reviews.toLocaleString()})</span>
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">{store.followers.toLocaleString()}</span>{" "}
                    seguidores
                  </div>
                  <div className="text-gray-600">
                    <span className="font-semibold">{store.products}</span> productos
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button className="w-full md:w-40 bg-blue-600 hover:bg-blue-700 text-white">
                <Heart className="w-4 h-4 mr-2" />
                Seguir
              </Button>
              <Button
                variant="outline"
                className="w-full md:w-40 border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Contactar
              </Button>
              <Button
                variant="outline"
                className="w-full md:w-40 border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            </div>
          </div>

          {/* Info Adicional */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Ubicación</p>
                <p className="font-semibold text-gray-900">{store.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Tiempo de respuesta</p>
                <p className="font-semibold text-gray-900">{store.responseTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Se unió</p>
                <p className="font-semibold text-gray-900">{store.joinDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Tasa de envío</p>
                <p className="font-semibold text-gray-900">99.8%</p>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-gray-600">{store.description}</p>
          </div>
        </div>

        {/* Sección de Productos */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Productos de {store.name}</h2>

          {/* Búsqueda y Filtros */}
          <div className="bg-white rounded-lg p-4 mb-6 shadow">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar en esta tienda..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Filtro de Categorías */}
              <div className="md:w-48">
                <select
                  value={selectedCategory || ""}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {store.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categorías como chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  selectedCategory === null
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Todos
              </button>
              {store.categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition duration-300 cursor-pointer"
                onClick={() => navigate(`/producto/${product.sku}`)}
              >
                {/* Imagen */}
                <div className="relative h-56 bg-gray-100 overflow-hidden group">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    loading="lazy"
                  />
                  {product.discount && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      -{product.discount}%
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2">
                    {product.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-2">
                    <div className="flex text-yellow-400">
                      {Array.from({ length: Math.round(product.rating) }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-current" />
                      ))}
                    </div>
                    <span className="text-xs text-gray-600">({product.reviews})</span>
                  </div>

                  {/* Precio */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-lg font-bold text-gray-900">
                      ${product.price.toFixed(2)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-xs text-gray-500 line-through">
                        ${product.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Ventas */}
                  <p className="text-xs text-gray-500">
                    {product.sales.toLocaleString()} vendidos
                  </p>

                  {/* Botones de Acción */}
                  <div className="mt-3 space-y-2">
                    {(role === UserRole.ADMIN || role === UserRole.SELLER) ? (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/producto/${product.sku}`);
                        }}
                        className="w-full bg-green-600 text-white hover:bg-green-700"
                      >
                        Vender (Agregar al Carrito)
                      </Button>
                    ) : (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/producto/${product.sku}`);
                        }}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Ver Detalles
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron productos</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoreProfilePage;

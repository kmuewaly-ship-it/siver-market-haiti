import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Truck,
  RotateCcw,
  Shield,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Zap,
  Award,
} from "lucide-react";

interface ProductDetail {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  rating: number;
  reviews: number;
  sales: number;
  stock: number;
  seller: {
    id: string;
    name: string;
    logo: string;
    rating: number;
    responseTime: string;
  };
  specifications: Record<string, string>;
  benefits: string[];
  b2bPrice?: number;
  moq?: number;
  colors?: string[];
  sizes?: string[];
  material?: string;
  care?: string;
}

const ProductPage = () => {
  const { sku } = useParams<{ sku: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    // Mock data - En producción, vendría de Supabase
    const mockProduct: ProductDetail = {
      sku: sku || "DRESS-001",
      name: "Vestido Casual Floral Elegante - Premium Collection",
      description:
        "Hermoso vestido casual con estampado floral, diseño elegante y cómodo para el día a día. Perfectamente ajustado, confeccionado en tela de algodón premium de alta calidad.",
      category: "Vestidos",
      price: 34.99,
      originalPrice: 59.99,
      discount: 42,
      images: [
        "https://images.unsplash.com/photo-1595777707802-a89fbc6ce338?w=800&h=1000&fit=crop",
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=1000&fit=crop",
        "https://images.unsplash.com/photo-1598888228900-26a26a59a23f?w=800&h=1000&fit=crop",
        "https://images.unsplash.com/photo-1568030157309-4711f723e474?w=800&h=1000&fit=crop",
      ],
      rating: 4.5,
      reviews: 234,
      sales: 1250,
      stock: 145,
      seller: {
        id: "seller1",
        name: "Fashion World Store",
        logo: "https://images.unsplash.com/photo-1552820728-8ac41f1ce891?w=100&h=100&fit=crop",
        rating: 4.7,
        responseTime: "1-2 horas",
      },
      specifications: {
        Material: "100% Algodón Premium",
        Largo: "Hasta la rodilla",
        Mangas: "Sin mangas",
        Cierre: "Cremallera trasera",
        Diseño: "Estampado floral",
      },
      benefits: [
        "Material transpirable y cómodo",
        "Diseño elegante y versátil",
        "Talla universal",
        "Fácil de cuidar",
        "Envío rápido",
        "Garantía de satisfacción",
      ],
      colors: ["Negro", "Azul Marino", "Rosa", "Verde"],
      sizes: ["XS", "S", "M", "L", "XL", "XXL"],
      material: "100% Algodón Premium",
      care: "Lavar a máquina a 30°C. No usar lejía. Secar al aire.",
      b2bPrice: 18.99,
      moq: 10,
    };

    setTimeout(() => {
      setProduct(mockProduct);
      setSelectedColor(mockProduct.colors?.[0] || "");
      setSelectedSize(mockProduct.sizes?.[0] || "");
      setIsLoading(false);
    }, 500);
  }, [sku]);

  if (isLoading || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        {!isMobile && <Header />}
        <main className={`container mx-auto px-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square" />
            <Skeleton className="h-screen" />
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && <Header />}

      <main className={`container mx-auto px-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button onClick={() => navigate("/")} className="hover:text-blue-600">
            Inicio
          </button>
          <ChevronRight className="w-4 h-4" />
          <button onClick={() => navigate("/categorias")} className="hover:text-blue-600">
            Categorías
          </button>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => navigate(`/categoria/${product.category.toLowerCase()}`)}
            className="hover:text-blue-600"
          >
            {product.category}
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-semibold">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Galería de Imágenes */}
          <div>
            {/* Imagen Principal */}
            <div className="relative bg-white rounded-lg overflow-hidden mb-4 aspect-square">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Descuento */}
              {product.discount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-lg font-bold text-lg">
                  -{product.discount}%
                </div>
              )}

              {/* Botones de navegación */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev === 0 ? product.images.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-900" />
                  </button>
                  <button
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev === product.images.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-900" />
                  </button>
                </>
              )}

              {/* Wishlist */}
              <button className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 transition">
                <Heart className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Miniaturas */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                      selectedImage === index ? "border-blue-600" : "border-transparent"
                    }`}
                  >
                    <img src={image} alt={`Vista ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info del Producto */}
          <div className="bg-white rounded-lg p-6">
            {/* Rating */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex text-yellow-400">
                {Array.from({ length: Math.round(product.rating) }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}
              </div>
              <span className="text-sm font-semibold">{product.rating}</span>
              <span className="text-sm text-gray-600">({product.reviews} opiniones)</span>
              <span className="text-sm text-gray-600">| {product.sales.toLocaleString()} vendidos</span>
            </div>

            {/* Nombre */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>

            {/* SKU */}
            <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>

            {/* Precio */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-500 line-through">
                    ${product.originalPrice.toFixed(2)}
                  </span>
                )}
              </div>
              {product.discount && (
                <p className="text-sm text-red-600 font-semibold">
                  ¡Ahorras ${(product.originalPrice! - product.price).toFixed(2)}!
                </p>
              )}
            </div>

            {/* Beneficios */}
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
              <p className="text-sm text-green-700 font-semibold mb-2">✓ Mejor oferta del día</p>
              <ul className="space-y-1">
                {product.benefits.slice(0, 3).map((benefit, i) => (
                  <li key={i} className="text-xs text-green-700">
                    ✓ {benefit}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-900">
                <strong>{product.stock}</strong> unidades disponibles
              </span>
            </div>

            {/* Opciones */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Color:</label>
                <div className="flex gap-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded border-2 transition ${
                        selectedColor === color
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Talla:</label>
                <div className="grid grid-cols-4 gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`py-2 rounded border-2 transition text-sm font-semibold ${
                        selectedSize === size
                          ? "border-blue-600 bg-blue-50 text-blue-600"
                          : "border-gray-300 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Cantidad */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Cantidad:</label>
              <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center border-none outline-none"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Info para ADMIN y SELLER */}
            {(role === UserRole.ADMIN || role === UserRole.SELLER) && (
              <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                <h4 className="font-semibold text-blue-900 mb-2">💼 Proceso B2B para Revendedores:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Selecciona color, talla y cantidad del producto</li>
                  <li>Haz click en "Vender" para agregar al carrito B2B</li>
                  <li>Puedes agregar más productos para tu compra</li>
                  <li>Una vez pagado, el producto se agregará a tu catálogo de tienda</li>
                  <li>Los clientes podrán ver y comprar con el stock actualizado</li>
                </ol>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="space-y-3 mb-6">
              {/* Para ADMIN y SELLER - Botón Vender para agregar al carrito B2B */}
              {(role === UserRole.ADMIN || role === UserRole.SELLER) ? (
                <>
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Vender (Agregar al Carrito B2B)
                  </Button>
                  <p className="text-sm text-gray-600 text-center">
                    Agrega este producto al carrito para comprar y revender en tu tienda B2C
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-6"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Añadir a Favoritos
                  </Button>
                </>
              ) : (
                /* Para CLIENT - Botón Comprar Normal */
                <>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Comprar Ahora
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-6"
                  >
                    <Heart className="w-5 h-5 mr-2" />
                    Añadir a Favoritos
                  </Button>
                </>
              )}
            </div>

            {/* Vendedor */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendido por:</h3>
              <div className="flex items-center gap-4">
                <img
                  src={product.seller.logo}
                  alt={product.seller.name}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h4
                    className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                    onClick={() => navigate(`/tienda/${product.seller.id}`)}
                  >
                    {product.seller.name}
                  </h4>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-gray-700">{product.seller.rating}</span>
                    <span className="text-gray-500">• {product.seller.responseTime}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs de Información */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Descripción */}
          <div className="md:col-span-2 bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Descripción del Producto</h2>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>

            {/* Especificaciones */}
            <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Especificaciones</h3>
            <div className="space-y-2">
              {Object.entries(product.specifications).map(([key, value]) => (
                <div key={key} className="flex border-b border-gray-200 py-2">
                  <span className="font-semibold text-gray-900 w-32">{key}:</span>
                  <span className="text-gray-700">{value}</span>
                </div>
              ))}
            </div>

            {/* Cuidados */}
            {product.care && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3">Instrucciones de Cuidado</h3>
                <p className="text-gray-700">{product.care}</p>
              </>
            )}
          </div>

          {/* Garantía y Envío */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start gap-3">
                <Truck className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Envío Rápido</h4>
                  <p className="text-sm text-gray-700">Entrega en 3-7 días hábiles</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <RotateCcw className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Devolución Fácil</h4>
                  <p className="text-sm text-gray-700">30 días para devolver</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-start gap-3">
                <Shield className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Protección del Comprador</h4>
                  <p className="text-sm text-gray-700">Garantía de satisfacción 100%</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-start gap-3">
                <Award className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Producto Certificado</h4>
                  <p className="text-sm text-gray-700">Calidad premium garantizada</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {!isMobile && <Footer />}
    </div>
  );
};

export default ProductPage;

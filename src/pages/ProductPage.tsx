import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTrackProductView } from "@/hooks/useTrendingProducts";
import { useSellerProduct } from "@/hooks/useSellerProducts";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
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
  Store as StoreIcon,
  Package,
} from "lucide-react";

const ProductPage = () => {
  const { sku } = useParams<{ sku: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const { trackView } = useTrackProductView();
  const { addItem } = useCart();
  const { toast } = useToast();
  
  const { data: product, isLoading } = useSellerProduct(sku);
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewTracked, setViewTracked] = useState(false);

  // Parse images from product
  const getImages = (): string[] => {
    if (!product) return [];
    let imgs = product.images;
    if (typeof imgs === 'string') {
      try {
        imgs = JSON.parse(imgs);
      } catch {
        imgs = [];
      }
    }
    return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
  };

  const images = getImages();

  // Track product view
  useEffect(() => {
    if (product && !viewTracked) {
      trackView(product.id, "product_page");
      setViewTracked(true);
    }
  }, [product, viewTracked, trackView]);

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.nombre,
        price: product.precio_venta,
        image: images[0] || '',
        sku: product.sku,
        storeId: product.store?.id,
        storeName: product.store?.name,
        storeWhatsapp: product.store?.whatsapp || undefined,
      });
    }
    
    toast({
      title: "Producto agregado",
      description: `${product.nombre} (x${quantity}) se agregó al carrito`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {!isMobile && <Header />}
        <main className={`container mx-auto px-4 py-8 ${isMobile ? 'pb-20' : 'pb-8'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-12 w-1/2" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        {!isMobile && <Header />}
        <main className={`container mx-auto px-4 py-12 text-center ${isMobile ? 'pb-20' : ''}`}>
          <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Producto no encontrado</h2>
          <p className="text-gray-600 mt-2">No pudimos encontrar el producto que buscas.</p>
          <Button onClick={() => navigate("/")} className="mt-4">Volver al inicio</Button>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && <Header />}

      <main className={`container mx-auto px-4 py-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button onClick={() => navigate("/")} className="hover:text-blue-600">
            Inicio
          </button>
          <ChevronRight className="w-4 h-4" />
          {product.store && (
            <>
              <button 
                onClick={() => navigate(`/tienda/${product.store?.id}`)} 
                className="hover:text-blue-600"
              >
                {product.store.name}
              </button>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
          <span className="text-gray-900 font-semibold line-clamp-1">{product.nombre}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Galería de Imágenes */}
          <div>
            <div className="relative bg-white rounded-lg overflow-hidden mb-4 aspect-square">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.nombre}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="h-24 w-24 text-gray-300" />
                </div>
              )}

              {/* Botones de navegación */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => prev === 0 ? images.length - 1 : prev - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-900" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => prev === images.length - 1 ? 0 : prev + 1)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 transition"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-900" />
                  </button>
                </>
              )}

              <button className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 transition">
                <Heart className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Miniaturas */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
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
            {/* Store Badge */}
            {product.store && (
              <button 
                onClick={() => navigate(`/tienda/${product.store?.id}`)}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-3 hover:bg-blue-100 transition"
              >
                <StoreIcon className="w-4 h-4" />
                {product.store.name}
              </button>
            )}

            {/* Nombre */}
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{product.nombre}</h1>

            {/* SKU */}
            <p className="text-sm text-gray-500 mb-4">SKU: {product.sku}</p>

            {/* Precio */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4">
              <span className="text-4xl font-bold text-gray-900">
                ${product.precio_venta.toFixed(2)}
              </span>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-orange-500" />
              <span className="text-sm text-gray-900">
                <strong>{product.stock}</strong> unidades disponibles
              </span>
            </div>

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
                  onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock, parseInt(e.target.value) || 1)))}
                  className="w-16 text-center border-none outline-none"
                />
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="space-y-3 mb-6">
              <Button 
                onClick={handleAddToCart}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold"
                disabled={product.stock === 0}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                {product.stock === 0 ? 'Sin Stock' : 'Agregar al Carrito'}
              </Button>
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-6"
              >
                <Heart className="w-5 h-5 mr-2" />
                Añadir a Favoritos
              </Button>
            </div>

            {/* Vendedor */}
            {product.store && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendido por:</h3>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
                    {product.store.logo ? (
                      <img
                        src={product.store.logo}
                        alt={product.store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <StoreIcon className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4
                      className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer"
                      onClick={() => navigate(`/tienda/${product.store?.id}`)}
                    >
                      {product.store.name}
                    </h4>
                    {product.store.is_active && (
                      <span className="text-xs text-green-600">✓ Tienda verificada</span>
                    )}
                  </div>
                  {product.store.whatsapp && (
                    <a
                      href={`https://wa.me/${product.store.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el producto: ${product.nombre}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="border-green-500 text-green-600 hover:bg-green-50">
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Descripción */}
        {product.descripcion && (
          <div className="bg-white rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Descripción del Producto</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.descripcion}</p>
          </div>
        )}

        {/* Garantía y Envío */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <Truck className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Envío Rápido</h4>
                <p className="text-xs text-gray-600">3-7 días</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-6 h-6 text-green-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Devolución</h4>
                <p className="text-xs text-gray-600">30 días</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-start gap-3">
              <Shield className="w-6 h-6 text-purple-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Protección</h4>
                <p className="text-xs text-gray-600">Garantía 100%</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-start gap-3">
              <Award className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 text-sm">Certificado</h4>
                <p className="text-xs text-gray-600">Calidad premium</p>
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

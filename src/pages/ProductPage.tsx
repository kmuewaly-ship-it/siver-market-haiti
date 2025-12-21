
import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import GlobalHeader from "@/components/layout/GlobalHeader";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronRight,
  ChevronLeft,
  ShoppingCart,
  Heart,
  Store as StoreIcon,
  Package,
  TrendingUp,
  Calculator,
  Shield,
  Truck,
  RotateCcw,
  Award,
  MessageCircle,
  Zap,
  Info
} from "lucide-react";
import { useSellerProduct } from "@/hooks/useSellerProducts";

const ProductPage = () => {
  const { sku } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Determine if user is B2B (Seller)
  const isB2BUser = user?.role === 'seller';

  // Fetch product data
  const { data: product, isLoading } = useSellerProduct(sku);
  
  // Local state
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewTracked, setViewTracked] = useState(false);

  // Cart hooks
  const { addItem: addItemB2C } = useCart();
  const { addItem: addItemB2B } = useCartB2B();

  // Derived data
  const images = useMemo(() => {
    if (!product) return [];
    const imgs = product.images as any;
    return Array.isArray(imgs) && imgs.length > 0 ? imgs : [''];
  }, [product]);

  // B2B Specific Data
  const costB2B = product?.source_product?.precio_mayorista || 0;
  const pvp = product?.precio_venta || 0;
  const moq = product?.source_product?.moq || 1;
  const stockB2B = product?.source_product?.stock_fisico || 0;
  
  // Limits
  const minQuantity = isB2BUser ? moq : 1;
  const maxQuantity = isB2BUser ? stockB2B : (product?.stock || 0);

  // Initialize quantity with MOQ for B2B
  useEffect(() => {
    if (isB2BUser && moq > 1) {
      setQuantity(moq);
    }
  }, [isB2BUser, moq]);

  // Business Logic for B2B
  const businessSummary = useMemo(() => {
    if (!isB2BUser || !product) return null;
    
    const investment = costB2B * quantity;
    const estimatedRevenue = pvp * quantity;
    const estimatedProfit = estimatedRevenue - investment;
    const profitPercentage = costB2B > 0 ? ((pvp - costB2B) / costB2B) * 100 : 0;
    const profitPerUnit = pvp - costB2B;

    return {
      investment,
      estimatedRevenue,
      estimatedProfit,
      profitPercentage: profitPercentage.toFixed(1),
      profitPerUnit
    };
  }, [isB2BUser, product, quantity, costB2B, pvp]);

  // Related Products Logic (simplified without allProducts)
  const relatedProducts: any[] = [];

  // Track view
  useEffect(() => {
    if (product && !viewTracked) {
      // trackView(product.id, "product_page"); // Assuming trackView exists or will be implemented
      setViewTracked(true);
    }
  }, [product, viewTracked]);

  const handleQuantityChange = (newQty: number) => {
    const validQty = Math.max(minQuantity, Math.min(maxQuantity, newQty));
    setQuantity(validQty);
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    if (isB2BUser) {
      addItemB2B({
        productId: product.source_product?.id || product.id,
        nombre: product.nombre,
        precio_b2b: costB2B,
        moq: moq,
        stock_fisico: stockB2B,
        sku: product.sku,
        imagen_principal: images[0] || '',
        cantidad: quantity,
        subtotal: costB2B * quantity
      });
      toast({
        title: "Agregado al pedido B2B",
        description: `${quantity} unidades de ${product.nombre}`,
        className: "bg-blue-600 text-white border-none"
      });
    } else {
      for (let i = 0; i < quantity; i++) {
        addItemB2C({
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
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {!isMobile && <GlobalHeader />}
        <main className={`container mx-auto px-4 py-8 ${isMobile ? 'pb-32' : 'pb-8'}`}>
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
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Package className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Producto no encontrado</h2>
        <Button onClick={() => navigate("/")} className="mt-4">Volver al inicio</Button>
      </div>
    );
  }

  const displayPrice = isB2BUser ? costB2B : product.precio_venta;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {!isMobile && <GlobalHeader />}

      <main className={`container mx-auto px-4 py-4 ${isMobile ? 'pb-40' : 'pb-12'}`}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-4 overflow-x-auto whitespace-nowrap pb-2">
          <button onClick={() => navigate("/")}>Inicio</button>
          <ChevronRight className="w-3 h-3" />
          {product.source_product?.category && (
            <>
              <Link to={`/categoria/${product.source_product.category.slug}`}>
                {product.source_product.category.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
            </>
          )}
          <span className="text-gray-900 font-medium">{product.nombre}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative bg-white rounded-2xl overflow-hidden aspect-square shadow-sm border border-gray-100">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.nombre}
                  className="w-full h-full object-contain p-4"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <Package className="h-20 w-20 text-gray-300" />
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage((prev) => prev === 0 ? images.length - 1 : prev - 1);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-md rounded-full p-2 hover:bg-white"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage((prev) => prev === images.length - 1 ? 0 : prev + 1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 shadow-md rounded-full p-2 hover:bg-white"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                </>
              )}

              {/* B2B Profit Badge Overlay */}
              {isB2BUser && businessSummary && businessSummary.profitPerUnit > 0 && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600 hover:bg-green-700 text-white border-none px-3 py-1.5 shadow-lg flex gap-1.5 items-center text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Ganas ${businessSummary.profitPerUnit.toFixed(2)}/u
                  </Badge>
                </div>
              )}
              
              <button className="absolute top-4 right-4 bg-white/80 hover:bg-white rounded-full p-2 shadow-sm transition">
                <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
              </button>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 px-1">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === index ? "border-blue-600 ring-2 ring-blue-100" : "border-transparent bg-white"
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {isB2BUser ? (
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
                    Mayorista
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                    Nuevo
                  </Badge>
                )}
                {product.store && (
                  <Link to={`/tienda/${product.store.id}`} className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors">
                    <StoreIcon className="w-3 h-3" />
                    {product.store.name}
                  </Link>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">
                {product.nombre}
              </h1>
              <p className="text-sm text-gray-500">SKU: {product.sku}</p>
            </div>

            {/* Price Section */}
            <div className={`p-5 rounded-xl ${isB2BUser ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100' : 'bg-gray-50'}`}>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className={`text-4xl font-bold ${isB2BUser ? 'text-blue-700' : 'text-gray-900'}`}>
                  ${displayPrice.toFixed(2)}
                </span>
                {isB2BUser && (
                  <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
                    Costo B2B
                  </span>
                )}
              </div>

              {isB2BUser && (
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 line-through">${pvp.toFixed(2)}</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">PVP</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="text-green-600 font-medium">
                    Margen: {businessSummary?.profitPercentage}%
                  </div>
                </div>
              )}
            </div>

            {/* B2B MOQ Warning */}
            {isB2BUser && moq > 1 && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-800 text-sm">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p>
                  Este producto tiene un <strong>mínimo de compra de {moq} unidades</strong> para acceder al precio mayorista.
                </p>
              </div>
            )}

            {/* Quantity Selector (Desktop) */}
            {!isMobile && (
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                  <button
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= minQuantity}
                    className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || minQuantity)}
                    className="w-16 text-center border-none focus:ring-0 p-0 text-gray-900 font-medium"
                  />
                  <button
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxQuantity}
                    className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 text-gray-600"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500">
                  {isB2BUser ? stockB2B : product.stock} disponibles
                </span>
              </div>
            )}

            {/* Desktop Actions */}
            {!isMobile && (
              <div className="flex gap-3">
                <Button 
                  onClick={handleAddToCart}
                  className={`flex-1 h-12 text-lg font-semibold ${isB2BUser ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-900 hover:bg-gray-800'}`}
                  disabled={(isB2BUser ? stockB2B : product.stock) === 0}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {isB2BUser ? 'Agregar al Pedido' : 'Agregar al Carrito'}
                </Button>
                <Button variant="outline" className="h-12 w-12 p-0">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            )}

            {/* Description */}
            <div className="prose prose-sm max-w-none text-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="whitespace-pre-line">{product.descripcion}</p>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Truck className="w-5 h-5 text-blue-600" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-900">Envío Nacional</p>
                  <p className="text-gray-500">24-48 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Shield className="w-5 h-5 text-green-600" />
                <div className="text-xs">
                  <p className="font-semibold text-gray-900">Compra Segura</p>
                  <p className="text-gray-500">Protección total</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Productos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {relatedProducts.map((p) => (
                <Link key={p.id} to={`/producto/${p.sku}`} className="group">
                  <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all">
                    <div className="aspect-square bg-gray-100 relative">
                      {Array.isArray(p.images) && p.images[0] && (
                        <img 
                          src={p.images[0]} 
                          alt={p.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600">
                        {p.nombre}
                      </h3>
                      <p className="text-sm font-bold text-gray-900">
                        ${p.precio_venta.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Mobile Sticky Footer */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 safe-area-bottom">
          {isB2BUser ? (
            // B2B Mobile Footer
            <div className="p-4 space-y-3">
              {/* Investment Summary */}
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Inversión Total</p>
                  <p className="font-bold text-gray-900 text-lg">${businessSummary?.investment.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 text-xs font-medium">Tu Ganancia</p>
                  <p className="font-bold text-green-600 text-lg">+${businessSummary?.estimatedProfit.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                {/* Quantity Selector Compact */}
                <div className="flex items-center border border-gray-300 rounded-lg h-12 bg-gray-50">
                  <button 
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= minQuantity}
                    className="px-3 h-full text-gray-600 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium text-sm">{quantity}</span>
                  <button 
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxQuantity}
                    className="px-3 h-full text-gray-600 disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                <Button 
                  onClick={handleAddToCart}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-200"
                  disabled={(isB2BUser ? stockB2B : product.stock) === 0}
                >
                  Comprar B2B
                </Button>
              </div>
            </div>
          ) : (
            // B2C Mobile Footer
            <div className="p-4 flex gap-3 items-center">
              <div className="flex flex-col">
                <span className="text-xs text-gray-500">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  ${(product.precio_venta * quantity).toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center border border-gray-300 rounded-lg h-10 ml-auto mr-2">
                <button 
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                  className="px-2 h-full text-gray-600 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center font-medium text-sm">{quantity}</span>
                <button 
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= (product.stock || 0)}
                  className="px-2 h-full text-gray-600 disabled:opacity-30"
                >
                  +
                </button>
              </div>

              <Button 
                onClick={handleAddToCart}
                className="flex-1 h-12 bg-gray-900 text-white font-bold rounded-xl"
                disabled={product.stock === 0}
              >
                Agregar
              </Button>
            </div>
          )}
        </div>
      )}

      {!isMobile && <Footer />}
    </div>
  );
};

export default ProductPage;

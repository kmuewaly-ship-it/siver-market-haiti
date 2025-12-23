
import { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from '@/types/auth';
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStore';
import { useIsMobile } from "@/hooks/use-mobile";
import { useProductVariants } from "@/hooks/useProductVariants";
import GlobalHeader from "@/components/layout/GlobalHeader";
import Footer from "@/components/layout/Footer";
import VariantSelector from "@/components/products/VariantSelector";
import ProductReviews from "@/components/products/ProductReviews";
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
  Info,
  Star,
} from "lucide-react";

// Hook to fetch product from both seller_catalog and products table
const useProductBySku = (sku: string | undefined) => {
  return useQuery({
    queryKey: ["product-by-sku", sku],
    queryFn: async () => {
      if (!sku) return null;

      // First try to find in seller_catalog (B2C)
      const { data: sellerProduct, error: sellerError } = await supabase
        .from("seller_catalog")
        .select(`
          *,
          store:stores!seller_catalog_seller_store_id_fkey(
            id, name, logo, whatsapp, is_active
          ),
          source_product:products!seller_catalog_source_product_id_fkey(
            id, categoria_id, precio_mayorista, precio_sugerido_venta, moq, stock_fisico, galeria_imagenes,
            category:categories!products_categoria_id_fkey(id, name, slug)
          )
        `)
        .eq("sku", sku)
        .eq("is_active", true)
        .maybeSingle();

      if (sellerProduct) {
        return {
          type: 'seller_catalog' as const,
          id: sellerProduct.id,
          sku: sellerProduct.sku,
          nombre: sellerProduct.nombre,
          descripcion: sellerProduct.descripcion,
          precio_venta: sellerProduct.precio_venta,
          precio_costo: sellerProduct.precio_costo,
          stock: sellerProduct.stock,
          images: sellerProduct.images || sellerProduct.source_product?.galeria_imagenes || [],
          store: sellerProduct.store,
          source_product: sellerProduct.source_product,
        };
      }

      // If not found in seller_catalog, try products table (B2B)
      const { data: b2bProduct, error: b2bError } = await supabase
        .from("products")
        .select(`
          *,
          category:categories!products_categoria_id_fkey(id, name, slug)
        `)
        .eq("sku_interno", sku)
        .eq("is_active", true)
        .maybeSingle();

      if (b2bProduct) {
        return {
          type: 'products' as const,
          id: b2bProduct.id,
          sku: b2bProduct.sku_interno,
          nombre: b2bProduct.nombre,
          descripcion: b2bProduct.descripcion_larga || b2bProduct.descripcion_corta,
          precio_venta: b2bProduct.precio_sugerido_venta || b2bProduct.precio_mayorista * 1.3,
          precio_costo: b2bProduct.precio_mayorista,
          stock: b2bProduct.stock_fisico,
          images: b2bProduct.galeria_imagenes || (b2bProduct.imagen_principal ? [b2bProduct.imagen_principal] : []),
          store: null,
          source_product: {
            id: b2bProduct.id,
            categoria_id: b2bProduct.categoria_id,
            precio_mayorista: b2bProduct.precio_mayorista,
            precio_sugerido_venta: b2bProduct.precio_sugerido_venta,
            moq: b2bProduct.moq,
            stock_fisico: b2bProduct.stock_fisico,
            category: b2bProduct.category,
          },
        };
      }

      console.error("Product not found for SKU:", sku);
      return null;
    },
    enabled: !!sku,
  });
};

const ProductPage = () => {
  // Sticky nav state
  const [showStickyNav, setShowStickyNav] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const recsRef = useRef<HTMLDivElement>(null);

  // Detect scroll past image
  useEffect(() => {
    const handleScroll = () => {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      setShowStickyNav(rect.bottom <= 64); // 64px header height
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to section
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const offset = isMobile ? 72 : 64;
      const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };
  const { sku } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Determine if user is B2B (Seller)
  const isB2BUser = user?.role === UserRole.SELLER;

  // Fetch product data from both tables
  const { data: product, isLoading } = useProductBySku(sku);
  // Load store profile when product comes from a seller catalog (used to determine currency)
  const { data: storeData } = useStore((product as any)?.store?.id);
  
  // Local state
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [viewTracked, setViewTracked] = useState(false);
  // Title collapse/expand
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [showTitleToggle, setShowTitleToggle] = useState(false);

  // Determine if title is long enough to show toggle
  useEffect(() => {
    setShowTitleToggle(Boolean(product && product.nombre && product.nombre.length > 60));
  }, [product]);

  // Variations state
  type Variation = { id: string; label: string; stock?: number; quantity: number };
  const [variations, setVariations] = useState<Variation[]>([]);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  // Derive variations from product fields (flexible: soporta varias estructuras)
  useEffect(() => {
    if (!product) return;

    // Prefer explicit 'variantes' / 'variations' field
    const raw: any = (product as any).variantes || (product as any).variations || (product as any).options;
    if (Array.isArray(raw) && raw.length > 0) {
      setVariations(raw.map((v: any, idx: number) => ({ id: v.id || String(idx), label: v.label || v.nombre || v, stock: v.stock || v.stock_fisico || undefined, quantity: 0 })));
      return;
    }

    // Try colores / tallas combinations
    const colores: string[] = (product as any).colores || (product as any).colors || [];
    const tallas: string[] = (product as any).tallas || (product as any).sizes || [];

    if (colores.length > 0 && tallas.length > 0) {
      const combos: Variation[] = [];
      colores.forEach((c, ci) => {
        tallas.forEach((t, ti) => {
          combos.push({ id: `${ci}-${ti}`, label: `${c} / ${t}`, quantity: 0 });
        });
      });
      setVariations(combos);
      return;
    }

    if (colores.length > 0) {
      setVariations(colores.map((c, i) => ({ id: `c-${i}`, label: String(c), quantity: 0 })));
      return;
    }

    if (tallas.length > 0) {
      setVariations(tallas.map((s, i) => ({ id: `s-${i}`, label: String(s), quantity: 0 })));
      return;
    }

    // Fallback: single default variation
    setVariations([{ id: product.id || 'default', label: 'Default', quantity: 0, stock: product.stock || (product.source_product && product.source_product.stock_fisico) || undefined }]);
  }, [product]);

  const totalSelectedQty = variations.reduce((sum, v) => sum + (v.quantity || 0), 0);
  // Guard accesses to 'product' to avoid runtime errors when product is undefined
  const currentMoq = product?.source_product?.moq || (product as any)?.moq || 1;

  const updateVariationQty = (id: string, newQty: number) => {
    setVariations((prev) => prev.map((v) => v.id === id ? { ...v, quantity: Math.max(0, newQty) } : v));
  };

  const handleOpenPurchase = () => {
    // If B2B enforce MOQ sum
    if (isB2BUser && totalSelectedQty > 0 && totalSelectedQty < currentMoq) {
      toast({ title: 'Cantidad mínima', description: `El pedido total debe ser al menos ${currentMoq} unidades.`, className: 'bg-yellow-100' });
      return;
    }
    // Open bottom sheet with selected variations
    setShowBottomSheet(true);
  };

  // Tabs state for Description / Reviews / Recs
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews' | 'recs'>('desc');

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setActiveTab((prev) => (prev === 'desc' ? 'reviews' : prev === 'reviews' ? 'recs' : 'desc'));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setActiveTab((prev) => (prev === 'recs' ? 'reviews' : prev === 'reviews' ? 'desc' : 'recs'));
    }
  };

  // IntersectionObserver to update active tab on scroll
  useEffect(() => {
    const mapping: { ref: React.RefObject<HTMLDivElement>; id: 'desc' | 'reviews' | 'recs' }[] = [
      { ref: descRef, id: 'desc' },
      { ref: reviewsRef, id: 'reviews' },
      { ref: recsRef, id: 'recs' },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const found = mapping.find((m) => m.ref.current === entry.target);
            if (found) setActiveTab(found.id);
          }
        });
      },
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    mapping.forEach((m) => {
      if (m.ref.current) observer.observe(m.ref.current);
    });

    return () => observer.disconnect();
  }, [descRef, reviewsRef, recsRef]);
  

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
    // Decide whether to show the "Mostrar más" toggle for long titles (>60 chars)
    if (product && product.nombre) {
      setShowTitleToggle(product.nombre.length > 60);
    }
  }, [product, viewTracked]);

  // DEBUG: log when product loads so developer can confirm updated bundle is used
  useEffect(() => {
    if (product) {
      // eslint-disable-next-line no-console
      console.log('[ProductPage] loaded product:', product.nombre, 'length:', product.nombre?.length);
    }
  }, [product]);

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

  // Quick-add: add selected variations (if any) or current quantity directly to cart
  const handleQuickAdd = () => {
    if (!product) return;

    // If there are variations selected, add them
    if (variations.length > 0 && totalSelectedQty > 0) {
      // Enforce MOQ for B2B
      if (isB2BUser && totalSelectedQty < currentMoq) {
        toast({ title: 'Cantidad mínima', description: `El pedido total debe ser al menos ${currentMoq} unidades.`, className: 'bg-yellow-100' });
        return;
      }

      variations.forEach((v) => {
        const qty = v.quantity || 0;
        if (qty <= 0) return;
        if (isB2BUser) {
          addItemB2B({
            productId: product.source_product?.id || product.id,
            nombre: product.nombre,
            precio_b2b: costB2B,
            moq: moq,
            stock_fisico: stockB2B,
            sku: product.sku,
            imagen_principal: images[0] || '',
            cantidad: qty,
            subtotal: costB2B * qty
          });
        } else {
          for (let i = 0; i < qty; i++) {
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
        }
      });

      toast({ title: isB2BUser ? 'Agregado al pedido B2B' : 'Producto agregado', description: `${product.nombre} (x${totalSelectedQty})`, });
      return;
    }

    // Fallback: use single quantity selector
    handleAddToCart();
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

      {/* Sticky Nav Tabs: reemplaza la barra de categorías */}
      {!isMobile && showStickyNav && (
        <div className="sticky top-0 z-40 bg-white border-b py-2 shadow-sm animate-fade-in">
          <div role="tablist" aria-label="Product sections" className="max-w-3xl mx-auto w-full px-2 py-1 flex items-center justify-center">
            <div className="w-full max-w-md mx-auto rounded-md border border-[#071d7f] bg-white px-2 py-1 flex items-center justify-center gap-1">
              <button
                id="tab-desc"
                role="tab"
                aria-selected={activeTab === 'desc'}
                aria-controls="section-desc"
                tabIndex={activeTab === 'desc' ? 0 : -1}
                onClick={() => { setActiveTab('desc'); scrollToSection(descRef); }}
                onKeyDown={handleTabKeyDown}
                className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'desc' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
              >
                Descripción
              </button>

              <button
                id="tab-reviews"
                role="tab"
                aria-selected={activeTab === 'reviews'}
                aria-controls="section-reviews"
                tabIndex={activeTab === 'reviews' ? 0 : -1}
                onClick={() => { setActiveTab('reviews'); scrollToSection(reviewsRef); }}
                onKeyDown={handleTabKeyDown}
                className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'reviews' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
              >
                Valoraciones
              </button>

              <button
                id="tab-recs"
                role="tab"
                aria-selected={activeTab === 'recs'}
                aria-controls="section-recs"
                tabIndex={activeTab === 'recs' ? 0 : -1}
                onClick={() => { setActiveTab('recs'); scrollToSection(recsRef); }}
                onKeyDown={handleTabKeyDown}
                className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'recs' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
              >
                Recomendados
              </button>
            </div>
          </div>
        </div>
      )}

      <main className={`container mx-auto ${isMobile ? 'px-0 pb-52' : 'px-4 pb-12'} py-4`}>
        {/* Breadcrumb */}
        <nav className={`flex items-center gap-2 text-xs text-gray-500 mb-4 overflow-x-auto whitespace-nowrap pb-2 ${isMobile ? 'px-4' : ''}`}>
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
          <div ref={imageRef} className={`space-y-4 ${isMobile ? '' : ''}`}>
            <div className={`relative bg-white overflow-hidden shadow-sm border-gray-100 ${isMobile ? 'w-full aspect-[4/5] rounded-none border-y' : 'rounded-2xl aspect-square border'}`}>
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.nombre}
                  className={`w-full h-full ${isMobile ? 'object-cover' : 'object-contain p-4'}`}
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

              {/* Rating overlay bottom-right */}
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={() => scrollToSection(reviewsRef)}
                  className="inline-flex items-center gap-2 bg-white/90 hover:bg-white rounded-lg px-3 py-1 shadow-md border border-gray-100"
                >
                  <Star className="w-4 h-4 text-yellow-400" />
                  <div className="text-sm text-gray-800 font-medium leading-none">
                    {(product as any).rating ? (product as any).rating.toFixed ? (product as any).rating.toFixed(1) : (product as any).rating : '0.0'}
                    <div className="text-xs text-gray-500">({(product as any).reviews ?? 0})</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </div>
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
          <div className={`space-y-3 ${isMobile ? 'px-4' : ''}`}> 
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

              <div className="flex flex-col gap-2">
                <h1 className={`text-lg md:text-xl font-semibold text-gray-900 leading-tight mb-0`}>
                  {titleExpanded ? (
                    <div className="flex items-start gap-2">
                      <div className="whitespace-normal">{product.nombre}</div>
                      {showTitleToggle && (
                        <button
                          onClick={() => setTitleExpanded(false)}
                          className="ml-2 text-xs font-semibold px-2 py-1 rounded border border-[#071d7f] text-[#071d7f] pulse-btn bg-white z-10"
                          aria-expanded={true}
                          aria-label="Collapse product title"
                        >
                          View less
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <div className="flex-1 line-clamp-2 break-words">
                        {product.nombre}
                      </div>
                      {showTitleToggle && (
                        <button
                          onClick={() => setTitleExpanded(true)}
                          className="inline-block align-baseline ml-1 text-xs font-semibold px-2 py-1 rounded border border-[#071d7f] text-[#071d7f] pulse-btn bg-white z-10"
                          aria-expanded={false}
                          aria-label="Expand product title"
                        >
                          View more
                        </button>
                      )}
                    </div>
                  )}
                </h1>
              </div>
            </div>

            {/* Price Section */}
            <div className={`p-2 rounded-md ${isB2BUser ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100' : 'bg-gray-50'}`}>
              <div className="flex items-baseline gap-2 flex-wrap justify-between">
                {/* Price area: promo price (left badge) + original price (right, struck) with discount badge */}
                {(() => {
                  const currencyCode = ((storeData && (storeData?.metadata?.currency || (storeData as any).currency)) || 'USD').toUpperCase();

                  // Determine original and promotional prices (use established fields)
                  const originalPriceRaw = (product as any).originalPrice || product.source_product?.precio_sugerido_venta || product.precio_venta;
                  const promoPriceRaw = (product as any).precio_promocion || (product.precio_venta < (originalPriceRaw || Infinity) ? product.precio_venta : null);

                  const originalPriceNum = typeof originalPriceRaw === 'number' ? originalPriceRaw : Number(originalPriceRaw) || null;
                  const promoPriceNum = promoPriceRaw != null ? (typeof promoPriceRaw === 'number' ? promoPriceRaw : Number(promoPriceRaw)) : null;

                  // Consider it a promo only when original is greater than promo by a sensible amount
                  const hasPromo = promoPriceNum != null && originalPriceNum != null && promoPriceNum < originalPriceNum - 0.005;

                  return (
                    <div className="flex items-center gap-2">
                      {/* Promo / current price */}
                      {hasPromo ? (
                        <span className={`inline-flex items-center gap-1 bg-[#fff5f6] border border-[#f2dede] px-1.5 py-0.5 rounded-sm ${isMobile ? '' : '-ml-1'}`}>
                          <span className="text-[#94111f] font-bold text-base">${promoPriceNum!.toFixed(2)}</span>
                          <span className="text-xs font-medium text-[#94111f]">{currencyCode}</span>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 bg-[#fff5f6] border border-[#f2dede] px-1.5 py-0.5 rounded-sm ${isMobile ? '' : '-ml-1'}`}>
                          <span className="text-[#94111f] font-bold text-base">${displayPrice.toFixed(2)}</span>
                          <span className="text-xs font-medium text-[#94111f]">{currencyCode}</span>
                        </span>
                      )}

                      {/* Original price & discount, placed right next to promo price */}
                      {hasPromo && originalPriceNum != null && promoPriceNum != null && (
                        <>
                          <span className="text-sm text-gray-500 line-through">${originalPriceNum.toFixed(2)}</span>
                          <span className="inline-flex items-center bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">
                            -{Math.round(((originalPriceNum - promoPriceNum) / originalPriceNum) * 100)}%
                          </span>
                        </>
                      )}
                    </div>
                  );
                })()}
                {isB2BUser && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                    B2B
                  </span>
                )}
              </div>

              {isB2BUser && (
                <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-600 font-bold">${pvp.toFixed(2)}</span>
                    <span className="text-xs bg-green-100 px-1 py-0.5 rounded text-green-700 font-bold">PVP</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="text-green-600 font-medium">
                    Margen: {businessSummary?.profitPercentage}%
                  </div>
                </div>
              )}
            </div>

              {/* Variant Selector - Uses database variants */}
              <div className="mt-3">
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Variaciones</h4>
                <VariantSelector
                  productId={product.source_product?.id || product.id}
                  basePrice={isB2BUser ? costB2B : product.precio_venta}
                  isB2B={isB2BUser}
                  onSelectionChange={(selections, totalQty, totalPrice) => {
                    // Update variations state for cart integration
                    setVariations(selections.map(s => ({
                      id: s.variantId,
                      label: s.variantId,
                      quantity: s.quantity,
                    })));
                  }}
                />
                
                {/* Fallback simple selector if no DB variants */}
                {variations.length === 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-700">Cantidad</div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(Math.max(minQuantity, quantity - 1))}
                          disabled={quantity <= minQuantity}
                          className="px-2 py-0.5 border rounded bg-white text-gray-700"
                        >
                          −
                        </button>
                        <div className="w-10 text-center text-sm font-medium">{quantity}</div>
                        <button
                          onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                          disabled={quantity >= maxQuantity}
                          className="px-2 py-0.5 border rounded bg-white text-gray-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Button onClick={handleAddToCart} className="w-full h-10 text-sm font-semibold">
                        {isB2BUser ? 'Agregar al Pedido' : 'Agregar al Carrito'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Tabs (compact, scrollable) */}
              {isMobile && (
                <div role="tablist" aria-label="Product sections mobile" className="mt-3 px-4 flex gap-1 flex-wrap">
                  <div className="w-full rounded-md border border-[#071d7f] bg-white px-2 py-1 flex gap-1 flex-nowrap items-center justify-start">
                    <button
                    id="tab-desc-mobile"
                    role="tab"
                    aria-selected={activeTab === 'desc'}
                    aria-controls="section-desc"
                    tabIndex={activeTab === 'desc' ? 0 : -1}
                    onClick={() => { setActiveTab('desc'); scrollToSection(descRef); }}
                    onKeyDown={handleTabKeyDown}
                    className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'desc' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
                  >
                    Descripción
                  </button>

                  <button
                    id="tab-reviews-mobile"
                    role="tab"
                    aria-selected={activeTab === 'reviews'}
                    aria-controls="section-reviews"
                    tabIndex={activeTab === 'reviews' ? 0 : -1}
                    onClick={() => { setActiveTab('reviews'); scrollToSection(reviewsRef); }}
                    onKeyDown={handleTabKeyDown}
                    className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'reviews' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
                  >
                    Valoraciones
                  </button>

                  <button
                    id="tab-recs-mobile"
                    role="tab"
                    aria-selected={activeTab === 'recs'}
                    aria-controls="section-recs"
                    tabIndex={activeTab === 'recs' ? 0 : -1}
                    onClick={() => { setActiveTab('recs'); scrollToSection(recsRef); }}
                    onKeyDown={handleTabKeyDown}
                    className={`px-2 py-0.5 text-xs font-semibold ${activeTab === 'recs' ? 'bg-[#071d7f] text-white rounded-full shadow-sm' : 'bg-white border border-blue-100 text-[#071d7f] rounded-md'}`}
                  >
                    Recomendados
                  </button>
                  </div>
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
            <div id="section-desc" ref={descRef} className="prose prose-sm max-w-none text-gray-600 scroll-mt-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="whitespace-pre-line">{product.descripcion}</p>
            </div>

            {/* Valoraciones - Using ProductReviews component */}
            <div id="section-reviews" ref={reviewsRef} className="mt-10 scroll-mt-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Valoraciones</h3>
              <ProductReviews 
                productId={product.source_product?.id || product.id}
                productName={product.nombre}
              />
            </div>

            {/* Recomendados */}
            <div id="section-recs" ref={recsRef} className="mt-10 scroll-mt-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Recomendados</h3>
              {/* Aquí iría el componente de recomendados o placeholder */}
              <div className="bg-gray-50 border rounded-lg p-6 text-center text-gray-400">Sin productos recomendados.</div>
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
        <div className="fixed bottom-14 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-40 safe-area-bottom">
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

import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Search, Heart, X, Loader2, Mic, MicOff, Camera, ShoppingBag, Package, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { searchProductsByImage } from "@/services/api/imageSearch";
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useViewMode } from "@/contexts/ViewModeContext";
interface SearchResult {
  id: string;
  nombre: string;
  sku_interno: string;
  imagen_principal: string | null;
  precio_mayorista: number;
}

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event & {
    error: string;
  }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
interface GlobalMobileHeaderProps {
  forceShow?: boolean;
}
const GlobalMobileHeader = ({
  forceShow = false
}: GlobalMobileHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isImageSearching, setIsImageSearching] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const prevCartCountRef = useRef<number>(0);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const {
    data: categories = []
  } = usePublicCategories();
  const {
    totalItems
  } = useCart();
  const {
    cart: cartB2B
  } = useCartB2B();
  const {
    role
  } = useAuth();
  const {
    isClientPreview,
    toggleViewMode,
    canToggle
  } = useViewMode();

  // Determinar si es seller/admin para mostrar header B2B
  const isSellerOrAdmin = role === UserRole.SELLER || role === UserRole.ADMIN;

  // Cuando está en modo preview cliente, usar carrito B2C y estilo de cliente
  const showAsClient = isSellerOrAdmin && isClientPreview;

  // Usar carrito B2B para seller/admin en modo B2B, B2C para clientes o preview
  const cartCount = isSellerOrAdmin && !isClientPreview ? cartB2B.totalItems : totalItems();

  // Bounce animation when cart count increases
  useEffect(() => {
    if (cartCount > prevCartCountRef.current && prevCartCountRef.current !== 0) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 400);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  // Hide on admin, seller, login, and trends routes (unless forceShow)
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSellerRoute = location.pathname.startsWith('/seller');
  const isLoginRoute = location.pathname === '/login';
  const isTrendsRoute = location.pathname === '/tendencias';

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Real-time search
  useEffect(() => {
    const searchProducts = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }
      setIsSearching(true);
      try {
        const {
          data,
          error
        } = await supabase.from("products").select("id, nombre, sku_interno, imagen_principal, precio_mayorista").eq("is_active", true).or(`nombre.ilike.%${searchQuery}%,sku_interno.ilike.%${searchQuery}%`).limit(8);
        if (error) throw error;
        setSearchResults(data || []);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  // No mostrar en admin routes, login, o trends (a menos que forceShow)
  // Para sellers, mostrar en TODAS las rutas (incluyendo públicas) con estilo B2B
  if (!isMobile || isAdminRoute || isLoginRoute || isTrendsRoute) {
    return null;
  }

  // Get root categories (no parent)
  const rootCategories = categories.filter(c => !c.parent_id);

  // Determine selected category from route
  const isCategoriesPage = location.pathname === '/categorias';
  const categorySlug = location.pathname.startsWith('/categoria/') ? location.pathname.split('/categoria/')[1] : null;
  const selectedCategory = categorySlug ? categories.find(c => c.slug === categorySlug)?.id || null : null;
  const handleCategorySelect = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      navigate(`/categoria/${category.slug}`);
    }
  };
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowResults(false);
      navigate(`/productos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  const handleResultClick = (sku: string) => {
    setShowResults(false);
    setSearchQuery("");
    navigate(`/producto/${sku}`);
  };
  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };
  const startVoiceSearch = () => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Búsqueda por voz no soportada en este navegador");
      return;
    }

    // Stop if already listening
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'es-ES'; // Spanish

    recognition.onstart = () => {
      setIsListening(true);
      toast.info("Escuchando...", {
        duration: 2000
      });
    };
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Show interim results in search box
      if (interimTranscript) {
        setSearchQuery(interimTranscript);
      }

      // When we have final transcript, perform search
      if (finalTranscript) {
        setSearchQuery(finalTranscript);
        toast.success(`Buscando: "${finalTranscript}"`);
        navigate(`/productos?q=${encodeURIComponent(finalTranscript.trim())}`);
      }
    };
    recognition.onerror = event => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      if (event.error === 'no-speech') {
        toast.error("No se detectó ninguna voz. Intenta de nuevo.");
      } else if (event.error === 'audio-capture') {
        toast.error("No se pudo acceder al micrófono.");
      } else if (event.error === 'not-allowed') {
        toast.error("Permiso de micrófono denegado.");
      } else {
        toast.error("Error al reconocer voz. Intenta de nuevo.");
      }
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };
  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImageSearching(true);
    toast.info("Cargando modelo de IA... Esto puede tomar unos segundos la primera vez.");
    try {
      const results = await searchProductsByImage(file);
      if (results && results.length > 0) {
        sessionStorage.setItem('imageSearchResults', JSON.stringify(results));
        navigate('/productos?source=image');
        toast.success(`Se encontraron ${results.length} productos similares`);
      } else {
        toast.info("No se encontraron productos similares");
      }
    } catch (error) {
      console.error("Image search error:", error);
      toast.error("Error al buscar por imagen");
    } finally {
      setIsImageSearching(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Links dinámicos según rol y modo de vista
  const showB2BStyle = isSellerOrAdmin && !showAsClient;
  const favoritesLink = showB2BStyle ? "/seller/favoritos" : "/favoritos";
  const cartLink = showB2BStyle ? "/seller/carrito" : "/carrito";
  const accentColor = showB2BStyle ? "bg-blue-600" : "bg-red-500";
  const buttonColor = showB2BStyle ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-900 hover:bg-gray-800";
  return <header className="bg-white sticky top-0 z-40">
      {/* Top search bar */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Logo/Icon - cambia según el modo */}
        {showB2BStyle ? <div className="flex items-center gap-1 flex-shrink-0">
            <Link to="/seller/adquisicion-lotes" className="flex items-center gap-1">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-xs text-gray-900">B2B</span>
            </Link>
            {/* Switch de vista */}
            {canToggle && <button onClick={toggleViewMode} className="ml-1 p-1 rounded-full bg-amber-100 text-amber-600" title="Ver como cliente">
                <Eye className="w-4 h-4" />
              </button>}
          </div> : isSellerOrAdmin && showAsClient ? (/* Modo preview cliente para seller */
      <div className="flex items-center gap-1 flex-shrink-0">
            <button className="relative">
              <Mail className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                5
              </span>
            </button>
            {/* Switch para volver a B2B */}
            {canToggle && <button onClick={toggleViewMode} className="ml-1 p-1 rounded-full bg-amber-100 text-amber-600" title="Volver a vista B2B">
                <EyeOff className="w-4 h-4" />
              </button>}
          </div>) : (/* Cliente normal */
      <button className="relative flex-shrink-0">
            <Mail className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              5
            </span>
          </button>)}

        {/* Search input with dropdown */}
        <div ref={searchRef} className="flex-1 max-w-[60%] relative">
          <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => searchQuery.length >= 2 && setShowResults(true)} className="flex-1 bg-transparent text-sm text-gray-700 px-3 py-2 outline-none min-w-0" />
            {searchQuery && <button type="button" onClick={clearSearch} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>}
            {/* Camera/Image search button */}
            <input ref={imageInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSearch} />
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={isImageSearching} className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50">
              {isImageSearching ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} /> : <Camera className="w-5 h-5" strokeWidth={1.5} />}
            </button>
            {/* Voice search button */}
            {voiceSupported && <button type="button" onClick={startVoiceSearch} className={cn("p-2 transition-colors", isListening ? "text-red-500 animate-pulse" : "text-gray-500 hover:text-gray-700")}>
                {isListening ? <MicOff className="w-5 h-5" strokeWidth={1.5} /> : <Mic className="w-5 h-5" strokeWidth={1.5} />}
              </button>}
            <button type="submit" className={cn(buttonColor, "p-2 rounded-full m-0.5 transition-colors")}>
              {isSearching ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Search className="w-4 h-4 text-white" strokeWidth={2} />}
            </button>
          </form>

          {/* Search results dropdown */}
          {showResults && <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
              {searchResults.length > 0 ? <>
                  {searchResults.map(product => <button key={product.id} onClick={() => handleResultClick(product.sku_interno)} className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {product.imagen_principal ? <img src={product.imagen_principal} alt={product.nombre} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                            Sin img
                          </div>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.nombre}</p>
                        <p className="text-xs text-gray-500">SKU: {product.sku_interno}</p>
                        <p className={cn("text-sm font-bold", isSellerOrAdmin ? "text-blue-600" : "text-green-600")}>
                          ${product.precio_mayorista.toFixed(2)}
                        </p>
                      </div>
                    </button>)}
                  <button onClick={handleSearch} className={cn("w-full p-3 text-center text-sm font-medium transition-colors", isSellerOrAdmin ? "text-blue-600 hover:bg-blue-50" : "text-blue-600 hover:bg-blue-50")}>
                    Ver todos los resultados para "{searchQuery}"
                  </button>
                </> : <div className="p-4 text-center text-gray-500 text-sm">
                  No se encontraron productos para "{searchQuery}"
                </div>}
            </div>}
        </div>

        {/* Favorites heart */}
        <Link to={favoritesLink} className="relative flex-shrink-0">
          <Heart className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          <span className={cn("absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white", accentColor)} />
        </Link>

        {/* Cart */}
        <Link to={cartLink} className="relative flex-shrink-0">
          <ShoppingBag className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          {cartCount > 0 && <span className={cn("absolute -top-1 -right-1 min-w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1", accentColor, cartBounce && "animate-cart-shake")}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>}
        </Link>
      </div>

      {/* Category tabs - horizontal scroll with dynamic background */}
      <div className="overflow-x-auto scrollbar-hide border-b border-gray-200">
        <div className="flex px-2 py-2 gap-1 min-w-max">
          {rootCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategorySelect(cat.id)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-all",
                selectedCategory === cat.id
                  ? showB2BStyle 
                    ? "bg-blue-600 text-white font-medium"
                    : "bg-black text-white font-medium"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>
    </header>;
};
export default GlobalMobileHeader;
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Camera, Search, Heart, X, Loader2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SearchResult {
  id: string;
  nombre: string;
  sku_interno: string;
  imagen_principal: string | null;
  precio_mayorista: number;
}

interface ImageAnalysisResult {
  searchTerms: string[];
  category: string | null;
  description: string;
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
  onerror: ((event: Event & { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const GlobalMobileHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showCameraDialog, setShowCameraDialog] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: categories = [] } = usePublicCategories();

  // Hide on admin, seller, and login routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSellerRoute = location.pathname.startsWith('/seller');
  const isLoginRoute = location.pathname === '/login';

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
        const { data, error } = await supabase
          .from("products")
          .select("id, nombre, sku_interno, imagen_principal, precio_mayorista")
          .eq("is_active", true)
          .or(`nombre.ilike.%${searchQuery}%,sku_interno.ilike.%${searchQuery}%`)
          .limit(8);

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

  if (!isMobile || isAdminRoute || isSellerRoute || isLoginRoute) {
    return null;
  }

  // Get root categories (no parent)
  const rootCategories = categories.filter((c) => !c.parent_id);

  // Determine selected category from route
  const isCategoriesPage = location.pathname === '/categorias';
  const categorySlug = location.pathname.startsWith('/categoria/') 
    ? location.pathname.split('/categoria/')[1] 
    : null;
  
  const selectedCategory = categorySlug 
    ? categories.find(c => c.slug === categorySlug)?.id || null
    : null;

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
      toast.info("Escuchando...", { duration: 2000 });
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

    recognition.onerror = (event) => {
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

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor selecciona una imagen válida");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen es demasiado grande. Máximo 5MB");
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setCapturedImage(base64);
      setShowCameraDialog(true);
      await analyzeImage(base64);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: { imageBase64 }
      });

      if (error) {
        throw error;
      }

      const result = data as ImageAnalysisResult;
      
      if (result.searchTerms && result.searchTerms.length > 0) {
        // Use the first search term for immediate search
        const mainTerm = result.searchTerms[0];
        setSearchQuery(mainTerm);
        setShowCameraDialog(false);
        
        toast.success(`Encontrado: ${result.description || mainTerm}`, {
          description: `Buscando "${mainTerm}"...`
        });

        // Navigate to search results
        navigate(`/productos?q=${encodeURIComponent(mainTerm)}`);
      } else {
        toast.error("No se pudo identificar el producto en la imagen");
      }
    } catch (error) {
      console.error("Image analysis error:", error);
      toast.error("Error al analizar la imagen. Intente de nuevo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const closeCameraDialog = () => {
    setShowCameraDialog(false);
    setCapturedImage(null);
    setIsAnalyzing(false);
  };

  return (
    <>
      <header className="bg-white sticky top-0 z-40">
        {/* Top search bar */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          {/* Notification/Mail icon */}
          <button className="relative flex-shrink-0">
            <Mail className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              5
            </span>
          </button>

          {/* Search input with dropdown */}
          <div ref={searchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="flex items-center bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-500 px-4 py-2 outline-none"
              />
              {searchQuery && (
                <button type="button" onClick={clearSearch} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
              {/* Voice search button */}
              {voiceSupported && (
                <button 
                  type="button" 
                  onClick={startVoiceSearch}
                  className={cn(
                    "p-2 transition-colors",
                    isListening 
                      ? "text-red-500 animate-pulse" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {isListening ? (
                    <MicOff className="w-5 h-5" strokeWidth={1.5} />
                  ) : (
                    <Mic className="w-5 h-5" strokeWidth={1.5} />
                  )}
                </button>
              )}
              <button 
                type="button" 
                onClick={handleCameraClick}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Camera className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <button type="submit" className="bg-gray-900 hover:bg-gray-800 p-2 rounded-full m-0.5 transition-colors">
                {isSearching ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Search className="w-4 h-4 text-white" strokeWidth={2} />
                )}
              </button>
            </form>

            {/* Hidden file input for camera */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />

            {/* Search results dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => handleResultClick(product.sku_interno)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          {product.imagen_principal ? (
                            <img
                              src={product.imagen_principal}
                              alt={product.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              Sin img
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.nombre}</p>
                          <p className="text-xs text-gray-500">SKU: {product.sku_interno}</p>
                          <p className="text-sm font-bold text-green-600">${product.precio_mayorista.toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={handleSearch}
                      className="w-full p-3 text-center text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Ver todos los resultados para "{searchQuery}"
                    </button>
                  </>
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    No se encontraron productos para "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Favorites heart */}
          <Link to="/favoritos" className="relative flex-shrink-0">
            <Heart className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          </Link>
        </div>

        {/* Category tabs - horizontal scroll with black background */}
        <div className="flex items-center gap-4 px-3 py-2.5 overflow-x-auto scrollbar-hide bg-black">
          {/* "All" tab */}
          <button
            onClick={() => navigate("/categorias")}
            className={cn(
              "text-sm font-medium whitespace-nowrap pb-0.5 transition-colors",
              isCategoriesPage && !selectedCategory
                ? "text-white border-b-2 border-white" 
                : "text-gray-400 hover:text-white"
            )}
          >
            All
          </button>

          {rootCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={cn(
                "text-sm font-medium whitespace-nowrap pb-0.5 transition-colors",
                selectedCategory === category.id 
                  ? "text-white border-b-2 border-white" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </header>

      {/* Camera Analysis Dialog */}
      <Dialog open={showCameraDialog} onOpenChange={setShowCameraDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Búsqueda por imagen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {capturedImage && (
              <div className="relative aspect-square w-full max-w-xs mx-auto rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={capturedImage}
                  alt="Imagen capturada"
                  className="w-full h-full object-cover"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-10 h-10 text-white animate-spin" />
                    <p className="text-white text-sm font-medium">Analizando imagen...</p>
                    <p className="text-white/70 text-xs">Identificando productos similares</p>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={closeCameraDialog}
                disabled={isAnalyzing}
                className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCameraClick}
                disabled={isAnalyzing}
                className="flex-1 py-2.5 px-4 rounded-lg bg-gray-900 text-white font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                Otra foto
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalMobileHeader;

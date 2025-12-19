import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Search, Heart, User, Mail, Camera, Loader2, Mic, MicOff, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useCartB2B } from "@/hooks/useCartB2B";

interface HeaderB2BProps {
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  onSearch: (query: string) => void;
}

const HeaderB2B = ({ selectedCategoryId, onCategorySelect, onSearch }: HeaderB2BProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const isMobile = useIsMobile();
  const recognitionRef = useRef<any>(null);
  const { cart } = useCartB2B();
  const cartCount = cart.totalItems;

  const { data: categories = [], isLoading: categoriesLoading } = usePublicCategories();
  const navigate = useNavigate();

  const catBarRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognitionAPI);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    const el = catBarRef.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth + 4);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [categories]);

  const scrollHeader = (dir: number) => {
    const el = catBarRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.5, 240);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const rootCategories = categories.filter((c) => !c.parent_id);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleCategoryClick = (categoryId: string | null) => {
    onCategorySelect(categoryId);
  };

  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* Logo */}
            <Link to="/seller/catalogo" className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-900">B2B</span>
            </Link>

            {/* Search input */}
            <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-500 px-4 py-2 outline-none"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full m-0.5 transition-colors">
                <Search className="w-4 h-4 text-white" strokeWidth={2} />
              </button>
            </form>

            {/* Cart */}
            <Link to="/seller/carrito" className="relative flex-shrink-0">
              <ShoppingBag className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Categories Filter Bar */}
          <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto bg-gray-900 text-white scrollbar-hide">
            <button 
              onClick={() => handleCategoryClick(null)}
              className={cn(
                "whitespace-nowrap text-sm font-medium px-3 py-1 rounded-full transition-colors",
                selectedCategoryId === null 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              )}
            >
              Todos
            </button>
            {rootCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryClick(cat.id)}
                className={cn(
                  "whitespace-nowrap text-sm font-medium px-3 py-1 rounded-full transition-colors",
                  selectedCategoryId === cat.id 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-800 hover:bg-gray-700 text-gray-300"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </header>
        <div className="h-[108px]" />
      </>
    );
  }

  // Desktop Header
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        {/* Top Bar */}
        <div className="bg-blue-600 text-white">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-10 text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  Catálogo Mayorista B2B
                </span>
                <span>Precios exclusivos para revendedores</span>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/seller/cuenta" className="hover:underline">Mi Cuenta</Link>
                <Link to="/seller/pedidos" className="hover:underline">Mis Pedidos</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Header */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/seller/catalogo" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg text-gray-900">SIVER</span>
                <span className="text-xs text-blue-600 font-medium -mt-1">MAYORISTA</span>
              </div>
            </Link>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 mx-8 max-w-xl">
              <div className="relative w-full flex items-center">
                <Input
                  type="text"
                  placeholder="Buscar productos por nombre o SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-12 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  type="submit"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors"
                >
                  <Search className="w-4 h-4 text-white" />
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-6">
              <Link to="/seller/favoritos" className="flex flex-col items-center gap-1 text-gray-700 hover:text-blue-600 transition">
                <Heart className="w-6 h-6" />
                <span className="text-xs">Favoritos</span>
              </Link>
              <Link to="/seller/cuenta" className="flex flex-col items-center gap-1 text-gray-700 hover:text-blue-600 transition">
                <User className="w-6 h-6" />
                <span className="text-xs">Cuenta</span>
              </Link>
              <Link to="/seller/carrito" className="flex flex-col items-center gap-1 text-gray-700 hover:text-blue-600 transition relative">
                <ShoppingBag className="w-6 h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 right-2 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
                <span className="text-xs">Carrito</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Categories Filter Bar */}
        <div className="border-t border-gray-200 bg-gray-50">
          <div className="container mx-auto px-4">
            <div 
              ref={catBarRef} 
              className="flex items-center gap-1 h-12 overflow-x-auto scrollbar-hide"
            >
              <button
                onClick={() => handleCategoryClick(null)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                  selectedCategoryId === null
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                )}
              >
                Todos los productos
              </button>
              {categoriesLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Cargando...</div>
              ) : (
                rootCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={cn(
                      "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                      selectedCategoryId === cat.id
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {cat.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="h-[140px]" />
    </>
  );
};

export default HeaderB2B;

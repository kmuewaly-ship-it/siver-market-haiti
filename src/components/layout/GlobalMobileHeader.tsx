import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Camera, Search, Heart, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  nombre: string;
  sku_interno: string;
  imagen_principal: string | null;
  precio_mayorista: number;
}

const GlobalMobileHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: categories = [] } = usePublicCategories();

  // Hide on admin, seller, and login routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSellerRoute = location.pathname.startsWith('/seller');
  const isLoginRoute = location.pathname === '/login';

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

  return (
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
            <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
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
  );
};

export default GlobalMobileHeader;

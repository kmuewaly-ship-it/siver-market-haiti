import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Mail, Camera, Search, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";

const GlobalMobileHeader = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { data: categories = [] } = usePublicCategories();

  // Hide on admin, seller, and login routes
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isSellerRoute = location.pathname.startsWith('/seller');
  const isLoginRoute = location.pathname === '/login';

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
      navigate(`/productos?q=${encodeURIComponent(searchQuery.trim())}`);
    }
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

        {/* Search input - pill style */}
        <form onSubmit={handleSearch} className="flex-1 flex items-center bg-gray-100 rounded-full border border-gray-200 overflow-hidden">
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-500 px-4 py-2 outline-none"
          />
          <button type="button" className="p-2 text-gray-500 hover:text-gray-700 transition-colors">
            <Camera className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <button type="submit" className="bg-gray-900 hover:bg-gray-800 p-2 rounded-full m-0.5 transition-colors">
            <Search className="w-4 h-4 text-white" strokeWidth={2} />
          </button>
        </form>

        {/* Favorites heart */}
        <Link to="/favoritos" className="relative flex-shrink-0">
          <Heart className="w-6 h-6 text-gray-700" strokeWidth={1.5} />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
        </Link>
      </div>

      {/* Category tabs - horizontal scroll */}
      <div className="flex items-center gap-5 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-100">
        {/* "All" tab */}
        <button
          onClick={() => navigate("/categorias")}
          className={cn(
            "text-sm font-medium whitespace-nowrap pb-1 transition-colors",
            isCategoriesPage && !selectedCategory
              ? "text-gray-900 border-b-2 border-gray-900" 
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          All
        </button>

        {rootCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className={cn(
              "text-sm font-medium whitespace-nowrap pb-1 transition-colors",
              selectedCategory === category.id 
                ? "text-gray-900 border-b-2 border-gray-900" 
                : "text-gray-500 hover:text-gray-700"
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

import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Camera, Search, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Category } from "@/hooks/useCategories";

interface MobileCategoryHeaderProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
}

const MobileCategoryHeader = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: MobileCategoryHeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const tabsRef = useRef<HTMLDivElement>(null);

  // Get root categories (no parent)
  const rootCategories = categories.filter((c) => !c.parent_id);

  // Scroll to selected category tab
  useEffect(() => {
    if (selectedCategory && tabsRef.current) {
      const selectedTab = tabsRef.current.querySelector(`[data-category-id="${selectedCategory}"]`);
      if (selectedTab) {
        selectedTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [selectedCategory]);

  return (
    <header className="bg-background border-b border-border">
      {/* Top search bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* Notification icon */}
        <button className="relative flex-shrink-0">
          <Mail className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            5
          </span>
        </button>

        {/* Search input */}
        <div className="flex-1 flex items-center gap-1 bg-muted/50 rounded-full px-3 py-1.5 border border-border">
          <Input
            type="text"
            placeholder="Buscar productos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 border-0 bg-transparent h-7 text-sm focus-visible:ring-0 px-0"
          />
          <button className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <Camera className="w-5 h-5" />
          </button>
          <Button 
            size="sm" 
            className="h-7 w-7 p-0 rounded-full bg-foreground hover:bg-foreground/90"
          >
            <Search className="w-4 h-4 text-background" />
          </Button>
        </div>

        {/* Favorites */}
        <Link to="/favoritos" className="relative flex-shrink-0">
          <Heart className="w-5 h-5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
        </Link>
      </div>

      {/* Category tabs - horizontal scroll */}
      <div 
        ref={tabsRef}
        className="flex items-center gap-4 px-3 py-2 overflow-x-auto scrollbar-hide"
      >
        {/* "All" tab */}
        <button
          onClick={() => navigate("/categorias")}
          className={cn(
            "text-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors",
            !selectedCategory 
              ? "text-foreground border-foreground" 
              : "text-muted-foreground border-transparent hover:text-foreground"
          )}
        >
          Todo
        </button>

        {rootCategories.slice(0, 8).map((category) => (
          <button
            key={category.id}
            data-category-id={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "text-sm font-medium whitespace-nowrap pb-1 border-b-2 transition-colors",
              selectedCategory === category.id 
                ? "text-foreground border-foreground" 
                : "text-muted-foreground border-transparent hover:text-foreground"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </header>
  );
};

export default MobileCategoryHeader;

import { cn } from "@/lib/utils";
import { Category } from "@/hooks/useCategories";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
}

const CategorySidebar = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategorySidebarProps) => {
  // Get root categories (no parent)
  const rootCategories = categories.filter((c) => !c.parent_id);

  return (
    <aside className="w-32 sm:w-40 flex-shrink-0 bg-background border-r border-border overflow-y-auto">
      {/* "Just for You" header */}
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-1">
          <div className="w-1 h-4 bg-destructive rounded-full" />
          <span className="text-sm font-semibold text-foreground">Para Ti</span>
        </div>
      </div>

      {/* Category list */}
      <nav className="py-1">
        {rootCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "w-full text-left px-3 py-2.5 text-sm transition-colors",
              "hover:bg-muted/50",
              selectedCategory === category.id 
                ? "text-destructive font-medium bg-muted/30 border-l-2 border-destructive" 
                : "text-muted-foreground"
            )}
          >
            {category.name}
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default CategorySidebar;

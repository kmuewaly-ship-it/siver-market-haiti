import { cn } from "@/lib/utils";
import { Category } from "@/hooks/useCategories";

interface CategorySidebarProps {
  categories: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string) => void;
}

// Static subcategory items for sidebar (like in the reference image)
const staticItems = [
  "New In",
  "Trending", 
  "Sale",
  "Clothing",
  "Dresses",
  "Tops",
  "Bottoms",
  "Sweaters & Sweatshirts",
  "Outerwear",
  "Denim",
  "Jumpsuits & Co-ords",
  "Beachwear",
  "Maternity Clothing",
  "Weddings & Events",
  "Underwear & Sleepwear",
  "Sports & Outdoors",
];

const CategorySidebar = ({ 
  categories, 
  selectedCategory, 
  onSelectCategory 
}: CategorySidebarProps) => {
  // If categories passed are subcategories (have parent_id), use them directly
  // If they are root categories, filter them?
  // Actually, let's just use the passed categories if they are not empty, otherwise static.
  
  const displayItems = categories.length > 0
    ? categories
    : staticItems.map((name, i) => ({ id: name.toLowerCase().replace(/\s+/g, '-'), name, slug: name.toLowerCase().replace(/\s+/g, '-') }));

  return (
    <aside className="w-[100px] flex-shrink-0 bg-gray-50 overflow-y-auto pb-20 scrollbar-hide">
      {/* "Just for You" header/item */}
      <button
        onClick={() => onSelectCategory("just-for-you")}
        className={cn(
          "w-full text-center px-2 py-4 text-[12px] leading-tight transition-colors border-l-4",
          selectedCategory === "just-for-you"
            ? "text-black font-bold bg-white border-black"
            : "text-gray-600 hover:text-gray-900 border-transparent"
        )}
      >
        Just for You
      </button>

      {/* Category list */}
      <nav>
        {displayItems.map((item, index) => {
          const itemId = typeof item === 'string' ? `static-${index}` : item.id;
          const itemName = typeof item === 'string' ? item : item.name;
          const isSelected = selectedCategory === itemId;

          return (
            <button
              key={itemId}
              onClick={() => onSelectCategory(itemId)}
              className={cn(
                "w-full text-center px-2 py-4 text-[12px] leading-tight transition-colors border-l-4",
                isSelected
                  ? "text-black font-bold bg-white border-black"
                  : "text-gray-600 hover:text-gray-900 border-transparent"
              )}
            >
              {itemName}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default CategorySidebar;

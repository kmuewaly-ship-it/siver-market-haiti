import CategoryCard from "./CategoryCard";
import { usePublicCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

const CategoryGrid = () => {
  const { data: categories = [], isLoading } = usePublicCategories();

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-screen-xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8 justify-items-center">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="w-28 h-28 md:w-32 md:h-32 rounded-full" />
                <Skeleton className="w-20 h-4 mt-3" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Filter only root categories (no parent) for main display
  const rootCategories = categories.filter(cat => !cat.parent_id);

  return (
    <section className="container mx-auto px-4 py-10">
      <div className="max-w-screen-xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-8 justify-items-center">
          {rootCategories.map((cat) => (
            <div key={cat.id} className="w-full flex flex-col items-center">
              <CategoryCard 
                label={cat.name} 
                image={cat.icon} 
                href={`/categoria/${cat.slug}`} 
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryGrid;

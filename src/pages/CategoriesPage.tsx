import { useState, useEffect } from "react";
import { usePublicCategories, Category } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import CategorySidebar from "@/components/categories/CategorySidebar";
import SubcategoryGrid from "@/components/categories/SubcategoryGrid";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useIsMobile } from "@/hooks/use-mobile";

const CategoriesPage = () => {
  const { data: categories = [], isLoading } = usePublicCategories();
  const [selectedRootCategory, setSelectedRootCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Auto-select "Women" or first root category if none selected
  useEffect(() => {
    if (categories.length > 0 && !selectedRootCategory) {
      // Try to find "Women" or "Mujer" first
      const womenCategory = categories.find(c => c.name.toLowerCase().includes('women') || c.name.toLowerCase().includes('mujer'));
      if (womenCategory) {
        setSelectedRootCategory(womenCategory.id);
      } else {
        const rootCategories = categories.filter((c) => !c.parent_id);
        if (rootCategories.length > 0) {
          setSelectedRootCategory(rootCategories[0].id);
        }
      }
    }
  }, [categories, selectedRootCategory]);

  // Reset subcategory when root changes
  useEffect(() => {
    setSelectedSubCategory("just-for-you");
  }, [selectedRootCategory]);

  // Get subcategories of selected parent
  const getSubcategories = (parentId: string | null): Category[] => {
    if (!parentId) return [];
    return categories.filter((c) => c.parent_id === parentId);
  };

  // Get selected parent category object
  const getParentCategory = (): Category | null => {
    if (!selectedRootCategory) return null;
    return categories.find((c) => c.id === selectedRootCategory) || null;
  };

  const subcategories = getSubcategories(selectedRootCategory);
  const parentCategory = getParentCategory();

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {isMobile ? (
          <>
            {/* Header skeleton */}
            <div className="px-3 py-2.5 flex items-center gap-3">
              <Skeleton className="w-6 h-6 rounded" />
              <Skeleton className="flex-1 h-10 rounded-full" />
              <Skeleton className="w-6 h-6 rounded" />
            </div>
            <div className="px-3 py-2 flex gap-5 border-b border-gray-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-12" />
              ))}
            </div>
            {/* Content skeleton */}
            <div className="flex h-[calc(100vh-100px-56px)]">
              <div className="w-[140px] bg-white border-r border-gray-100 p-2 space-y-2">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
              <div className="flex-1 p-4">
                <Skeleton className="h-6 w-24 mb-4" />
                <div className="grid grid-cols-3 gap-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <Skeleton className="w-[72px] h-[72px] rounded-full" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <Header />
            <main className="container mx-auto px-4 py-8">
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </main>
            <Footer />
          </>
        )}
      </div>
    );
  }

  // Mobile layout with sidebar
  if (isMobile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Main content area with sidebar + subcategories */}
        <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 100px - 56px)" }}>
          {/* Left sidebar with subcategories of selected root */}
          <CategorySidebar
            categories={subcategories}
            selectedCategory={selectedSubCategory}
            onSelectCategory={setSelectedSubCategory}
          />

          {/* Right side with sub-subcategories grid */}
          <SubcategoryGrid
            subcategories={selectedSubCategory && selectedSubCategory !== "just-for-you" 
              ? categories.filter(c => c.parent_id === selectedSubCategory)
              : subcategories}
            parentCategory={parentCategory}
          />
        </div>

        {/* Spacer for bottom nav */}
        <div className="h-14" />
      </div>
    );
  }

  // Desktop layout (keep original Header/Footer)
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Categorías</h1>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {categories.filter(c => !c.parent_id).map((category) => {
            const subs = getSubcategories(category.id);
            
            return (
              <div key={category.id} className="space-y-4">
                <button
                  onClick={() => setSelectedRootCategory(
                    selectedRootCategory === category.id ? null : category.id
                  )}
                  className="w-full text-left p-4 bg-card border border-border rounded-lg hover:border-destructive transition-colors"
                >
                  <h3 className="font-semibold text-foreground">{category.name}</h3>
                  {subs.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {subs.length} subcategorías
                    </p>
                  )}
                </button>

                {/* Show subcategories if selected */}
                {selectedRootCategory === category.id && subs.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    {subs.map((sub) => (
                      <a
                        key={sub.id}
                        href={`/categoria/${sub.slug}`}
                        className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                      >
                        {sub.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoriesPage;

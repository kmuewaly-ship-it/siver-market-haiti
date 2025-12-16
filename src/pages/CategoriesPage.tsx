import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePublicCategories, Category } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import CategorySidebar from "@/components/categories/CategorySidebar";
import SubcategoryGrid from "@/components/categories/SubcategoryGrid";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const CategoriesPage = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = usePublicCategories();
  const isMobile = useIsMobile();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("just-for-you");

  // Filter root categories (those without a parent)
  const rootCategories = categories.filter(c => !c.parent_id);

  // Get subcategories for the selected category
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const subcategories = categories.filter(c => c.parent_id === selectedCategoryId);

  // Get random categories for "Just for You" sections
  const picksForYou = categories.filter(c => c.parent_id).slice(0, 9);
  const youMayAlsoLike = categories.filter(c => c.parent_id).slice(9, 18);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {!isMobile && <Header />}
        <main className="container mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-white">
        
        {/* Mobile Layout Container */}
        <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Sidebar */}
            <aside className="w-[100px] flex-shrink-0 bg-gray-50 overflow-y-auto border-r border-gray-100 pb-24 scrollbar-hide">
                {/* Special Sections */}
                <div 
                    className={cn(
                        "px-2 py-4 text-xs text-center cursor-pointer border-l-4 transition-all duration-200 flex items-center justify-center h-16",
                        selectedCategoryId === 'just-for-you' 
                            ? "bg-white border-black font-bold text-black" 
                            : "border-transparent text-gray-500 hover:bg-gray-100"
                    )}
                    onClick={() => setSelectedCategoryId('just-for-you')}
                >
                    Just for You
                </div>

                {/* Real Categories */}
                {rootCategories.map(cat => (
                    <div 
                        key={cat.id}
                        className={cn(
                            "px-2 py-4 text-xs text-center cursor-pointer border-l-4 transition-all duration-200 flex items-center justify-center h-16 break-words",
                            selectedCategoryId === cat.id 
                                ? "bg-white border-black font-bold text-black" 
                                : "border-transparent text-gray-500 hover:bg-gray-100"
                        )}
                        onClick={() => setSelectedCategoryId(cat.id)}
                    >
                        {cat.name}
                    </div>
                ))}
            </aside>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-4 pb-24 bg-white">
                {selectedCategoryId === 'just-for-you' ? (
                    <div className="space-y-8">
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-sm">Picks for You</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                                {picksForYou.map(sub => (
                                    <div key={sub.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => navigate(`/categoria/${sub.slug}`)}>
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                                            {sub.icon ? (
                                                <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-gray-300">{sub.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-center text-gray-600 leading-tight line-clamp-2 font-medium">{sub.name}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                        
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-gray-900 text-sm">You May Also Like</h3>
                            </div>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                                {youMayAlsoLike.map(sub => (
                                    <div key={sub.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => navigate(`/categoria/${sub.slug}`)}>
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                                            {sub.icon ? (
                                                <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-gray-300">{sub.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-center text-gray-600 leading-tight line-clamp-2 font-medium">{sub.name}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                             <h3 className="font-bold text-gray-900 text-sm">{selectedCategory?.name}</h3>
                             <button onClick={() => navigate(`/categoria/${selectedCategory?.slug}`)} className="text-xs text-gray-500 flex items-center hover:text-black">
                                Ver todo <ChevronRight className="w-3 h-3 ml-1" />
                             </button>
                        </div>
                       
                        {subcategories.length > 0 ? (
                            <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                                {subcategories.map(sub => (
                                    <div key={sub.id} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => navigate(`/categoria/${sub.slug}`)}>
                                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 overflow-hidden shadow-sm group-hover:shadow-md transition-all">
                                            {sub.icon ? (
                                                <img src={sub.icon} alt={sub.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl text-gray-300">{sub.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-center text-gray-600 leading-tight line-clamp-2 font-medium">{sub.name}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                <p className="text-sm">No hay subcategorías</p>
                                <button 
                                    onClick={() => navigate(`/categoria/${selectedCategory?.slug}`)}
                                    className="mt-4 text-xs text-blue-600 font-medium"
                                >
                                    Ver productos en {selectedCategory?.name}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 pb-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <span>Todas las Categorías</span>
          </div>
        </div>

        {/* Grid de Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rootCategories.map((category) => (
            <div
              key={category.id}
              onClick={() => navigate(`/categoria/${category.slug}`)}
              className="group cursor-pointer bg-white rounded-lg overflow-hidden hover:shadow-lg transition duration-300"
            >
              {/* Imagen de fondo */}
              <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                {category.icon ? (
                    <img src={category.icon} alt={category.name} className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition duration-500" />
                ) : (
                    <div className="text-6xl opacity-20 group-hover:scale-110 transition transform duration-300">
                    {category.name.charAt(0)}
                    </div>
                )}
              </div>

              {/* Contenido */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  {category.name}
                </h3>
                <div className="mt-3 flex items-center gap-1 text-blue-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition">
                  Ver más <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CategoriesPage;

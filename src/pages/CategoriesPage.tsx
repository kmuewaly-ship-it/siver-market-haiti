import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  productCount?: number;
}

const CategoriesPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data - En producción, esto vendría de Supabase
    const mockCategories: Category[] = [
      { id: "c1", name: "Mujer", slug: "mujer", productCount: 1245 },
      { id: "c2", name: "Curvy", slug: "curvy", productCount: 856 },
      { id: "c3", name: "Niños", slug: "ninos", productCount: 432 },
      { id: "c4", name: "Hombre", slug: "hombre", productCount: 678 },
      { id: "c5", name: "Sweaters", slug: "sweaters", productCount: 234 },
      { id: "c6", name: "Celulares y Accs", slug: "celulares-y-accs", productCount: 892 },
      { id: "c7", name: "Joyería y accs", slug: "joyeria-y-accs", productCount: 456 },
      { id: "c8", name: "Tops", slug: "tops", productCount: 567 },
      { id: "c9", name: "Hogar y Vida", slug: "hogar-y-vida", productCount: 345 },
      { id: "c10", name: "Belleza y salud", slug: "belleza-y-salud", productCount: 678 },
      { id: "c11", name: "Zapatos", slug: "zapatos", productCount: 789 },
      { id: "c12", name: "Deportes y Aire Libre", slug: "deportes-y-aire-libre", productCount: 423 },
      { id: "c13", name: "Automotriz", slug: "automotriz", productCount: 234 },
      { id: "c14", name: "Mezclilla", slug: "mezclilla", productCount: 345 },
      { id: "c15", name: "Ropa Interior y Pijamas", slug: "ropa-interior-y-pijamas", productCount: 456 },
      { id: "c16", name: "Bebé y maternidad", slug: "bebe-y-maternidad", productCount: 567 },
      { id: "c17", name: "Vestidos", slug: "vestidos", productCount: 678 },
      { id: "c18", name: "Bottoms", slug: "bottoms", productCount: 789 },
      { id: "c19", name: "Abrigos y Trajes", slug: "abrigos-y-trajes", productCount: 234 },
      { id: "c20", name: "Bolsas y Equipaje", slug: "bolsas-y-equipaje", productCount: 345 },
      { id: "c21", name: "Útiles escolares y de oficina", slug: "utiles-escolares-y-oficina", productCount: 456 },
      { id: "c22", name: "Juguetes y juegos", slug: "juguetes-y-juegos", productCount: 567 },
    ];

    // Simular delay de carga
    setTimeout(() => {
      setCategories(mockCategories);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8">Categorías</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <span>Todas las Categorías</span>
          </div>
        </div>

        {/* Título */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Todas las Categorías</h1>
          <p className="text-gray-600">Explora nuestras {categories.length} categorías de productos</p>
        </div>

        {/* Grid de Categorías */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              onClick={() => navigate(`/categoria/${category.slug}`)}
              className="group cursor-pointer bg-white rounded-lg overflow-hidden hover:shadow-lg transition duration-300"
            >
              {/* Imagen de fondo */}
              <div className="relative h-32 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                <div className="text-6xl opacity-20 group-hover:scale-110 transition transform duration-300">
                  {category.name.charAt(0)}
                </div>
              </div>

              {/* Contenido */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {category.productCount?.toLocaleString() || 0} productos
                </p>
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

import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import GlobalHeader from "@/components/layout/GlobalHeader";
import Footer from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Star, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useCategoryBySlug } from "@/hooks/useQueriesCategories";
import { useProductsByCategory } from "@/hooks/useProducts";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";

type AnyProduct = Record<string, any>;

type FilterOptions = {
  sortBy: "newest" | "price_asc" | "price_desc" | "rating";
  priceRange: [number, number];
};

const CategoryProductsPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  const [filters, setFilters] = useState<FilterOptions>({ sortBy: "newest", priceRange: [0, 1000] });

  const { data: category, isLoading: isCategoryLoading } = useCategoryBySlug(slug);
  const categoryId = category?.id ?? null;

  const { data: productsData, isLoading: isProductsLoading } = useProductsByCategory(
    categoryId,
    currentPage - 1,
    ITEMS_PER_PAGE
  );

  const products: AnyProduct[] = productsData?.products || [];
  const total = productsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const isLoading = isCategoryLoading || isProductsLoading;
  const { data: allCategories = [] } = usePublicCategories();

  // Logic for 3-level category navigation
  const rootCategory = useMemo(() => {
    if (!category || !allCategories.length) return null;
    if (!category.parent_id) return category;
    const parent = allCategories.find(c => c.id === category.parent_id);
    if (parent && !parent.parent_id) return parent;
    if (parent && parent.parent_id) return allCategories.find(c => c.id === parent.parent_id);
    return category;
  }, [category, allCategories]);

  const level2Categories = useMemo(() => {
    if (!rootCategory) return [];
    return allCategories.filter(c => c.parent_id === rootCategory.id);
  }, [rootCategory, allCategories]);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubcategory = searchParams.get("subcategory");
  
  const { displayMode, categoriesGrid } = useMemo(() => {
      if (!category) return { displayMode: 'loading', categoriesGrid: [] };
      
      // Robust check for root category using the full list
      const isRoot = !category.parent_id || allCategories.some(c => c.id === category.id && !c.parent_id);
      
      const children = allCategories.filter(c => c.parent_id === category.id);
      
      if (selectedSubcategory) {
          return { 
              displayMode: 'categories', 
              categoriesGrid: allCategories.filter(c => c.parent_id === selectedSubcategory) 
          };
      }
      
      if (isRoot) {
          // Root Category -> Show Level 2s
          return { displayMode: 'categories', categoriesGrid: children };
      }
      
      if (children.length > 0) {
          // Level 2 Category -> Show Level 3s
          return { displayMode: 'categories', categoriesGrid: children };
      }
      
      return { displayMode: 'products', categoriesGrid: [] };
  }, [category, allCategories, selectedSubcategory]);

  const [priceMin, setPriceMin] = useState<number | undefined>(undefined);
  const [priceMax, setPriceMax] = useState<number | undefined>(undefined);
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const filteredProducts = useMemo(() => {
    if (displayMode !== 'products') return []; // Don't filter if not showing products

    let list = [...products];

    // apply subcategory filter if selected (Legacy logic, kept just in case)
    if (selectedSubcategory) {
      list = list.filter((p: any) => (p.categoria_id === selectedSubcategory) || (p.subcategoria_id === selectedSubcategory));
    }

    // apply price range
    if (typeof priceMin !== "undefined") {
      list = list.filter((p: any) => (p.precio_b2c ?? p.precio ?? p.price ?? 0) >= priceMin);
    }
    if (typeof priceMax !== "undefined") {
      list = list.filter((p: any) => (p.precio_b2c ?? p.precio ?? p.price ?? 0) <= priceMax);
    }

    // sorting
    switch (filters.sortBy) {
      case "price_asc":
        return list.sort((a: any, b: any) => (a.precio_b2c ?? a.precio ?? 0) - (b.precio_b2c ?? b.precio ?? 0));
      case "price_desc":
        return list.sort((a: any, b: any) => (b.precio_b2c ?? b.precio ?? 0) - (a.precio_b2c ?? a.precio ?? 0));
      case "rating":
        return list.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0));
      case "newest":
      default:
        return list;
    }
  }, [products, filters.sortBy, selectedSubcategory, priceMin, priceMax, displayMode]);
  const handleViewStore = (sellerId: string) => navigate(`/tienda/${sellerId}`);

  const getSku = (p: AnyProduct) => p.sku_interno ?? p.sku ?? p.id;
  const getName = (p: AnyProduct) => p.nombre ?? p.name ?? "Producto";
  const getPrice = (p: AnyProduct) => p.precio_b2c ?? p.precio ?? p.price ?? 0;
  const getImage = (p: AnyProduct) => p.imagen ?? (p.galeria_imagenes && p.galeria_imagenes[0]) ?? p.image ?? "https://via.placeholder.com/400x500?text=Sin+imagen";
  const getSeller = (p: AnyProduct) => p.vendedor ?? p.seller ?? { id: "", nombre: "Tienda" };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        {!isMobile && <GlobalHeader />}
        <main className={`container mx-auto px-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
          <h1 className="text-3xl font-bold mb-8">Cargando...</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        </main>
        {!isMobile && <Footer />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {!isMobile && <GlobalHeader />}

      <main className={`container mx-auto px-4 ${isMobile ? 'pb-20' : 'pb-8'}`}>
        {/* Breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <button onClick={() => navigate("/")} className="hover:text-blue-600">Inicio</button>
            <ChevronRight className="w-4 h-4" />
            <button onClick={() => navigate("/categorias")} className="hover:text-blue-600">Categorías</button>
            <ChevronRight className="w-4 h-4" />
            <span className="capitalize">{category?.name ?? slug?.replace("-", " ")}</span>
          </div>
        </div>

        {/* Hero + header area */}
        <div className="mb-6 bg-white rounded-lg p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 capitalize">{category?.name ?? slug}</h1>
              <p className="text-gray-600 mt-1">{total} productos disponibles</p>
            </div>

            <div className="flex items-center gap-2">
              <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions["sortBy"] })} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">Más Nuevo</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="rating">Mejor Valorado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filters bar (desktop + mobile sticky) */}
        <div className="mb-4">
          <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Ordenar:</label>
              <select value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as FilterOptions["sortBy"] })} className="px-3 py-2 border rounded">
                <option value="newest">Más Nuevo</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="rating">Mejor Valorado</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Color:</label>
              <select value={(selectedSubcategory as string) ?? ""} onChange={(e) => { /* placeholder: colors not yet available */ }} className="px-3 py-2 border rounded">
                <option value="">Todos</option>
                <option value="red">Rojo</option>
                <option value="blue">Azul</option>
                <option value="black">Negro</option>
              </select>

              <label className="text-sm font-medium">Envío:</label>
              <select className="px-3 py-2 border rounded">
                <option value="all">Todos</option>
                <option value="free">Envío Gratis</option>
                <option value="fast">Envío Rápido</option>
              </select>
            </div>
          </div>
        </div>

        {/* Mobile filters toggle */}
          <div className="mb-4 md:hidden">
            <button onClick={() => setShowFiltersMobile((s) => !s)} className="px-4 py-2 bg-white border rounded w-full text-left">Filtros &nbsp; {showFiltersMobile ? '▲' : '▼'}</button>
            {showFiltersMobile && (
              <div className="mt-2 bg-white p-4 rounded shadow-sm">
                <div className="mb-3">
                  <label className="text-sm font-medium">Precio mínimo</label>
                  <input type="number" value={priceMin ?? ""} onChange={(e) => { setPriceMin(e.target.value ? Number(e.target.value) : undefined); setCurrentPage(1); }} className="w-full mt-1 px-3 py-2 border rounded" placeholder="0" />
                </div>
                <div className="mb-3">
                  <label className="text-sm font-medium">Precio máximo</label>
                  <input type="number" value={priceMax ?? ""} onChange={(e) => { setPriceMax(e.target.value ? Number(e.target.value) : undefined); setCurrentPage(1); }} className="w-full mt-1 px-3 py-2 border rounded" placeholder="9999" />
                </div>
                {/* Subcategories removed from here as they are now in the header */}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => { setPriceMin(undefined); setPriceMax(undefined); setSearchParams({}); setFilters({ ...filters, sortBy: 'newest' }); setShowFiltersMobile(false); }} className="px-3 py-2 bg-gray-100 rounded">Limpiar</button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              {/* Categories List */}
              {level2Categories.length > 0 && (
                <div className="mb-6 border-b pb-4">
                  <h3 className="font-semibold mb-3">Categorías</h3>
                  <div className="flex flex-col gap-1">
                    {level2Categories.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          if (selectedSubcategory === cat.id) {
                            setSearchParams({});
                          } else {
                            setSearchParams({ subcategory: cat.id });
                          }
                        }}
                        className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          selectedSubcategory === cat.id || category?.id === cat.id
                            ? 'bg-blue-50 text-blue-600 font-medium' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="font-semibold mb-3">Filtros</h3>

              <div className="mb-3">
                <label className="text-sm font-medium">Precio mínimo</label>
                <input
                  type="number"
                  value={priceMin ?? ""}
                  onChange={(e) => { setPriceMin(e.target.value ? Number(e.target.value) : undefined); setCurrentPage(1); }}
                  className="w-full mt-1 px-3 py-2 border rounded"
                  placeholder="0"
                />
              </div>

              <div className="mb-3">
                <label className="text-sm font-medium">Precio máximo</label>
                <input
                  type="number"
                  value={priceMax ?? ""}
                  onChange={(e) => { setPriceMax(e.target.value ? Number(e.target.value) : undefined); setCurrentPage(1); }}
                  className="w-full mt-1 px-3 py-2 border rounded"
                  placeholder="9999"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => { setPriceMin(undefined); setPriceMax(undefined); setSearchParams({}); setFilters({ ...filters, sortBy: 'newest' }); }} className="px-3 py-2 bg-gray-100 rounded">Limpiar</button>
              </div>
            </div>
          </aside>

          {/* Products or Categories Grid */}
          <section className="lg:col-span-9">
            {displayMode === 'categories' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoriesGrid.map((cat) => (
                  <div 
                    key={cat.id} 
                    onClick={() => {
                      // If it's a Level 2 (has children), we might want to filter by it (same as sidebar)
                      // If it's a Level 3 (no children), we navigate to it
                      const hasChildren = allCategories.some(c => c.parent_id === cat.id);
                      if (hasChildren) {
                        setSearchParams({ subcategory: cat.id });
                      } else {
                        navigate(`/categoria/${cat.slug}`);
                      }
                    }}
                    className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition cursor-pointer flex flex-col items-center text-center border border-gray-100"
                  >
                    <div className="w-24 h-24 mb-3 rounded-full bg-gray-50 flex items-center justify-center overflow-hidden">
                      {cat.icon ? (
                        <img src={cat.icon} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl text-gray-400 font-bold">{cat.name.charAt(0)}</span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{cat.name}</h3>
                    {cat.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{cat.description}</p>}
                  </div>
                ))}
                {categoriesGrid.length === 0 && (
                  <div className="col-span-full text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 font-medium">No se encontraron subcategorías.</p>
                    <p className="text-sm text-gray-400 mt-1">Intenta seleccionar otra categoría.</p>
                  </div>
                )}
              </div>
            ) : (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((p) => {
                const sku = getSku(p);
                const name = getName(p);
                const price = getPrice(p);
                const image = getImage(p);
                const seller = getSeller(p);
                const rating = p.rating ?? 0;
                const reviews = p.reviews ?? 0;
                const badge = p.badge ?? p.coupon_label;
                const discount = p.discount ?? p.descuento;

                return (
                  <div key={sku} className="bg-white rounded-lg overflow-hidden hover:shadow-xl transition duration-300 flex flex-col">
                    <div className="relative h-56 bg-gray-100 cursor-pointer overflow-hidden group" onClick={() => navigate(`/producto/${sku}`)}>
                      <img src={image} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy" />
                      {discount && <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">-{discount}%</div>}
                      {badge && <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold">{badge}</div>}
                    </div>

                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600 transition" onClick={() => navigate(`/producto/${sku}`)}>{name}</h3>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex text-yellow-400">{Array.from({ length: Math.round(rating) }).map((_, i) => (<Star key={i} className="w-3 h-3 fill-current" />))}</div>
                        <span className="text-xs text-gray-600">({reviews})</span>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-gray-900">${Number(price).toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-xs text-gray-600">Vendido por</p>
                            <button onClick={() => handleViewStore(seller.id ?? seller.id)} className="text-sm font-semibold text-blue-600 hover:underline">{seller.nombre ?? seller.name}</button>
                          </div>
                        </div>
                      </div>

                      {(role === UserRole.ADMIN || role === UserRole.SELLER) ? (
                        <Button className="w-full mt-4 bg-green-600 hover:bg-green-700"><ShoppingBag className="w-4 h-4 mr-2" />Vender (Agregar al Carrito)</Button>
                      ) : (
                        <Button onClick={() => navigate(`/producto/${sku}`)} className="w-full mt-4 bg-blue-600 hover:bg-blue-700"><ShoppingBag className="w-4 h-4 mr-2" />Ver Detalles</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-12">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Anterior</button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`px-4 py-2 rounded-lg ${currentPage === i + 1 ? "bg-blue-600 text-white" : "border border-gray-300 hover:bg-gray-50"}`}>{i + 1}</button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
              </div>
            )}
            </>
            )}
          </section>
        </div>
      </main>

      {!isMobile && <Footer />}
    </div>
  );
};

export default CategoryProductsPage;

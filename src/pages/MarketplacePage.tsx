import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useSellerProducts } from "@/hooks/useSellerProducts";
import { usePublicCategories } from "@/hooks/useCategories";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSmartCart } from "@/hooks/useSmartCart";
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Store, Search, Package, Grid3X3, X } from "lucide-react";

const MarketplacePage = () => {
  const isMobile = useIsMobile();
  const {
    data: products,
    isLoading
  } = useSellerProducts(100);
  const {
    data: categories = []
  } = usePublicCategories();
  const { addToCart, isB2BUser } = useSmartCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Get root categories
  const rootCategories = useMemo(() => categories.filter(c => !c.parent_id), [categories]);

  // Get unique stores from products
  const stores = products ? Array.from(new Map(products.filter(p => p.store).map(p => [p.store!.id, p.store!])).values()) : [];

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(product => {
      const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStore = selectedStore === "all" || product.store?.id === selectedStore;

      // Category filter - check if product category matches selected or is child of selected
      let matchesCategory = selectedCategory === "all";
      if (!matchesCategory && product.source_product?.categoria_id) {
        const productCategoryId = product.source_product.categoria_id;
        // Check direct match
        if (productCategoryId === selectedCategory) {
          matchesCategory = true;
        } else {
          // Check if it's a child category
          const childCategories = categories.filter(c => c.parent_id === selectedCategory);
          matchesCategory = childCategories.some(c => c.id === productCategoryId);
        }
      }
      return matchesSearch && matchesStore && matchesCategory;
    }).sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return a.precio_venta - b.precio_venta;
        case "price-desc":
          return b.precio_venta - a.precio_venta;
        case "name":
          return a.nombre.localeCompare(b.nombre);
        default:
          return 0;
      }
    });
  }, [products, searchQuery, selectedStore, selectedCategory, sortBy, categories]);
  const handleAddToCart = (product: typeof products[0]) => {
    const images = product.images as any;
    const mainImage = Array.isArray(images) && images.length > 0 ? images[0] : typeof images === 'string' ? images : '';
    
    addToCart({
      id: product.id,
      name: product.nombre,
      price: product.precio_venta,
      priceB2B: product.precio_costo, // Use costo as B2B price
      moq: 1, // Default MOQ for seller catalog items
      stock: product.stock,
      image: mainImage,
      sku: product.sku,
      storeId: product.store?.id,
      storeName: product.store?.name,
      storeWhatsapp: product.store?.whatsapp || undefined
    });
  };
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStore("all");
    setSelectedCategory("all");
    setSortBy("newest");
  };
  const hasActiveFilters = searchQuery || selectedStore !== "all" || selectedCategory !== "all";
  return <div className="min-h-screen bg-background flex flex-col">
      {!isMobile && <Header />}
      
      <main className={`flex-1 container mx-auto px-4 py-6 ${isMobile ? 'pb-20' : ''}`}>
        {/* Page Header */}
        <div className="mb-6">
          
          
        </div>

        {/* Category Pills */}
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max pb-2">
            <Badge variant={selectedCategory === "all" ? "default" : "outline"} className="cursor-pointer px-3 py-1.5 text-sm" onClick={() => setSelectedCategory("all")}>
              Todos
            </Badge>
            {rootCategories.map(category => <Badge key={category.id} variant={selectedCategory === category.id ? "default" : "outline"} className="cursor-pointer px-3 py-1.5 text-sm whitespace-nowrap" onClick={() => setSelectedCategory(category.id)}>
                {category.name}
              </Badge>)}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar productos..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
          </div>
          
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-full md:w-[200px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por tienda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las tiendas</SelectItem>
              {stores.map(store => <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Más recientes</SelectItem>
              <SelectItem value="price-asc">Precio: Menor a Mayor</SelectItem>
              <SelectItem value="price-desc">Precio: Mayor a Menor</SelectItem>
              <SelectItem value="name">Nombre A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filters & Results count */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} productos encontrados
            {selectedCategory !== "all" && rootCategories.find(c => c.id === selectedCategory) && <span> en <strong>{rootCategories.find(c => c.id === selectedCategory)?.name}</strong></span>}
            {selectedStore !== "all" && stores.find(s => s.id === selectedStore) && <span> de <strong>{stores.find(s => s.id === selectedStore)?.name}</strong></span>}
          </p>
          {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>}
        </div>

        {/* Products Grid */}
        {isLoading ? <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {Array.from({
          length: 10
        }).map((_, i) => <div key={i} className="bg-card rounded-lg overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>)}
          </div> : filteredProducts.length === 0 ? <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">No hay productos disponibles</p>
            <p className="text-muted-foreground text-sm mb-4">
              {hasActiveFilters ? "Intenta ajustar los filtros de búsqueda" : "Los vendedores aún no han publicado productos"}
            </p>
            {hasActiveFilters && <Button variant="outline" onClick={clearFilters}>
                Limpiar filtros
              </Button>}
          </div> : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
            {filteredProducts.map(product => {
          const images = product.images as any;
          const mainImage = Array.isArray(images) && images.length > 0 ? images[0] : typeof images === 'string' ? images : '';
          return <div key={product.id} className="bg-card rounded-lg overflow-hidden hover:shadow-lg transition group border border-border">
                  {/* Image */}
                  <Link to={`/producto/${product.sku}`} className="block">
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      {mainImage ? <img src={mainImage} alt={product.nombre} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" /> : <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-muted-foreground/30" />
                        </div>}
                      
                      {/* Category Badge */}
                      {product.source_product?.category && <div className="absolute top-2 left-2 px-2 py-1 bg-primary/90 text-primary-foreground text-[10px] rounded">
                          {product.source_product.category.name}
                        </div>}
                      
                      {/* Store Badge */}
                      {product.store && <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] rounded flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          {product.store.name}
                        </div>}
                      
                      {/* Stock Badge */}
                      {product.stock <= 0 && <div className="absolute top-2 right-2 px-2 py-1 bg-destructive text-destructive-foreground text-xs rounded font-medium">
                          Agotado
                        </div>}
                    </div>
                  </Link>

                  {/* Product Info */}
                  <div className="p-3">
                    <Link to={`/producto/${product.sku}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1 hover:text-primary transition">
                        {product.nombre}
                      </h3>
                    </Link>
                    <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-bold text-primary">
                        ${product.precio_venta.toFixed(2)}
                      </span>
                      {product.stock > 0 && <span className="text-xs text-muted-foreground">
                          Stock: {product.stock}
                        </span>}
                    </div>

                    <Button onClick={() => handleAddToCart(product)} disabled={product.stock <= 0} size="sm" className="w-full gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      {product.stock > 0 ? (isB2BUser ? 'Agregar B2B' : 'Agregar') : 'Sin Stock'}
                    </Button>
                  </div>
                </div>;
        })}
          </div>}
      </main>

      {!isMobile && <Footer />}
    </div>;
};
export default MarketplacePage;
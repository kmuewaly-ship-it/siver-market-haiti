import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters } from "@/types/b2b";

// Helper function to group products by image (variants)
const groupProductsByImage = (products: any[]): any[] => {
  const imageGroups = new Map<string, any[]>();
  
  products.forEach(product => {
    // Use imagen_principal as grouping key, or product id if no image
    const groupKey = product.imagen_principal || `no-image-${product.id}`;
    
    if (!imageGroups.has(groupKey)) {
      imageGroups.set(groupKey, []);
    }
    imageGroups.get(groupKey)!.push(product);
  });
  
  // Return one representative product per group with variant info
  const groupedProducts: any[] = [];
  
  imageGroups.forEach((variants, imageKey) => {
    // Sort variants by price to get the lowest as representative
    variants.sort((a, b) => (a.precio_mayorista || 0) - (b.precio_mayorista || 0));
    
    const representative = { ...variants[0] };
    
    // Clean up the name - remove variant suffix like "- 4-5Y"
    const baseName = representative.nombre?.replace(/\s*-\s*[\d\w-]+[YM]$/i, '').trim() || representative.nombre;
    
    // Add variant metadata
    representative._variant_count = variants.length;
    representative._variant_ids = variants.map((v: any) => v.id);
    representative._base_name = baseName;
    
    // Aggregate stock from all variants
    representative._total_stock = variants.reduce((sum: number, v: any) => sum + (v.stock_fisico || 0), 0);
    
    // Get price range
    representative._min_price = Math.min(...variants.map((v: any) => v.precio_mayorista || 0));
    representative._max_price = Math.max(...variants.map((v: any) => v.precio_mayorista || 0));
    
    groupedProducts.push(representative);
  });
  
  return groupedProducts;
};

export const useProductsB2B = (filters: B2BFilters, page = 0, limit = 12) => {
  return useQuery({
    queryKey: ["products-b2b", filters, page, limit],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      // First, fetch ALL products to group them correctly
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true);

      // Filter by category
      if (filters.category) {
        query = query.eq("categoria_id", filters.category);
      }

      // Filter by search query
      if (filters.searchQuery) {
        query = query.or(`nombre.ilike.%${filters.searchQuery}%,sku_interno.ilike.%${filters.searchQuery}%`);
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "price_asc":
          query = query.order("precio_mayorista", { ascending: true });
          break;
        case "price_desc":
          query = query.order("precio_mayorista", { ascending: false });
          break;
        case "moq_asc":
          query = query.order("moq", { ascending: true });
          break;
        case "moq_desc":
          query = query.order("moq", { ascending: false });
          break;
        default:
          query = query.order("created_at", { ascending: false });
      }

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching B2B products:", error);
        throw new Error(error.message);
      }

      // Group products by image (combine variants)
      const groupedData = groupProductsByImage(data || []);
      
      // Apply pagination AFTER grouping
      const paginatedData = groupedData.slice(page * limit, (page + 1) * limit);

      // Map to B2B card format
      const products: ProductB2BCard[] = paginatedData.map((p: any) => {
        const precioMayorista = p.precio_mayorista || p.price || p.precio || 0;
        const precioSugerido = p.precio_sugerido || p.precio_sugerido_venta || p.original_price || Math.round(precioMayorista * 1.3 * 100) / 100;
        const moq = p.moq || 1;
        const stock = p._total_stock || p.stock_fisico || p.stock || 0;
        const imagen = p.imagen_principal || p.image || (Array.isArray(p.images) ? p.images[0] : "") || "/placeholder.svg";
        
        // Use cleaned base name if available
        const displayName = p._base_name || p.nombre || p.name || "Producto";
        
        return {
          id: p.id,
          sku: p.sku_interno || p.sku || "",
          nombre: displayName,
          precio_b2b: precioMayorista,
          precio_sugerido: precioSugerido,
          moq: moq,
          stock_fisico: stock,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          variant_count: p._variant_count || 1,
          variant_ids: p._variant_ids || [p.id],
        };
      });

      // Return grouped count for pagination
      return { products, total: groupedData.length };
    },
  });
};

export const useFeaturedProductsB2B = (limit = 6) => {
  return useQuery({
    queryKey: ["products-b2b-featured", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      // Group products by image
      const groupedData = groupProductsByImage(data || []);
      
      // Take only the requested limit
      const limitedData = groupedData.slice(0, limit);

      const products: ProductB2BCard[] = limitedData.map((p: any) => {
        const precioMayorista = p.precio_mayorista || p.price || p.precio || 0;
        const precioSugerido = p.precio_sugerido || p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || p.image || (Array.isArray(p.images) ? p.images[0] : "") || "/placeholder.svg";
        const displayName = p._base_name || p.nombre || p.name || "Producto";
        
        return {
          id: p.id,
          sku: p.sku_interno || p.sku || "",
          nombre: displayName,
          precio_b2b: precioMayorista,
          precio_sugerido: precioSugerido,
          moq: p.moq || 1,
          stock_fisico: p._total_stock || p.stock_fisico || p.stock || 0,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          variant_count: p._variant_count || 1,
          variant_ids: p._variant_ids || [p.id],
        };
      });

      return products;
    },
  });
};
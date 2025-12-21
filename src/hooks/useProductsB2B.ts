import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters } from "@/types/b2b";

export const useProductsB2B = (filters: B2BFilters, page = 0, limit = 12) => {
  return useQuery({
    queryKey: ["products-b2b", filters, page, limit],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      // Select * to avoid errors if specific B2B columns haven't been added to the DB yet
      let query = supabase
        .from("products")
        .select("*", { count: "exact" });
        // .eq("is_active", true); // Temporarily disabled to ensure products load even if column is missing

      // Filter by category
      if (filters.category) {
        query = query.eq("categoria_id", filters.category);
      }

      // Filter by search query
      if (filters.searchQuery) {
        query = query.or(`nombre.ilike.%${filters.searchQuery}%,sku_interno.ilike.%${filters.searchQuery}%`);
      }

      // Filter by stock status - Temporarily disabled until DB update
      /* 
      if (filters.stockStatus !== "all") {
        query = query.eq("stock_status", filters.stockStatus);
      }
      */

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
          // Fallback to id if created_at doesn't exist, or assume created_at exists
          query = query.order("created_at", { ascending: false });
      }

      // Apply pagination
      query = query.range(page * limit, (page + 1) * limit - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching B2B products:", error);
        throw new Error(error.message);
      }

      // Map to B2B card format
      const products: ProductB2BCard[] = (data || []).map((p: any) => {
        // Robust fallbacks for missing B2B columns (if DB migration hasn't run)
        const precioMayorista = p.precio_mayorista || p.price || p.precio || 0;
        // Use precio_sugerido from DB or calculate default
        const precioSugerido = p.precio_sugerido || p.precio_sugerido_venta || p.original_price || Math.round(precioMayorista * 1.3 * 100) / 100;
        const moq = p.moq || 1;
        const stock = p.stock_fisico || p.stock || 0;
        const imagen = p.imagen_principal || p.image || (Array.isArray(p.images) ? p.images[0] : "") || "";
        
        return {
          id: p.id,
          sku: p.sku_interno || p.sku || "",
          nombre: p.nombre || p.name || "Producto",
          precio_b2b: precioMayorista,
          precio_sugerido: precioSugerido,
          moq: moq,
          stock_fisico: stock,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
        };
      });

      return { products, total: count || 0 };
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
        // .eq("is_active", true)
        // .gt("stock_fisico", 0) // Disable strict stock check until migration
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const products: ProductB2BCard[] = (data || []).map((p: any) => {
        const precioMayorista = p.precio_mayorista || p.price || p.precio || 0;
        const precioSugerido = p.precio_sugerido || p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || p.image || (Array.isArray(p.images) ? p.images[0] : "") || "";
        
        return {
          id: p.id,
          sku: p.sku_interno || p.sku || "",
          nombre: p.nombre || p.name || "Producto",
          precio_b2b: precioMayorista,
          precio_sugerido: precioSugerido,
          moq: p.moq || 1,
          stock_fisico: p.stock_fisico || p.stock || 0,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
        };
      });

      return products;
    },
  });
};

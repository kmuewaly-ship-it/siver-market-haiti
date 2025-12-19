import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters } from "@/types/b2b";

export const useProductsB2B = (filters: B2BFilters, page = 0, limit = 12) => {
  return useQuery({
    queryKey: ["products-b2b", filters, page, limit],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, sku_interno, nombre, precio_mayorista, moq, stock_fisico, imagen_principal, categoria_id, stock_status", { count: "exact" })
        .eq("is_active", true);

      // Filter by category
      if (filters.category) {
        query = query.eq("categoria_id", filters.category);
      }

      // Filter by search query
      if (filters.searchQuery) {
        query = query.or(`nombre.ilike.%${filters.searchQuery}%,sku_interno.ilike.%${filters.searchQuery}%`);
      }

      // Filter by stock status
      if (filters.stockStatus !== "all") {
        query = query.eq("stock_status", filters.stockStatus);
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

      // Apply pagination
      query = query.range(page * limit, (page + 1) * limit - 1);

      const { data, error, count } = await query;

      if (error) throw new Error(error.message);

      // Map to B2B card format
      const products: ProductB2BCard[] = (data || []).map((p) => ({
        id: p.id,
        sku: p.sku_interno,
        nombre: p.nombre,
        precio_b2b: p.precio_mayorista,
        moq: p.moq,
        stock_fisico: p.stock_fisico,
        imagen_principal: p.imagen_principal || "",
        categoria_id: p.categoria_id || "",
      }));

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
        .select("id, sku_interno, nombre, precio_mayorista, moq, stock_fisico, imagen_principal, categoria_id")
        .eq("is_active", true)
        .gt("stock_fisico", 0)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);

      const products: ProductB2BCard[] = (data || []).map((p) => ({
        id: p.id,
        sku: p.sku_interno,
        nombre: p.nombre,
        precio_b2b: p.precio_mayorista,
        moq: p.moq,
        stock_fisico: p.stock_fisico,
        imagen_principal: p.imagen_principal || "",
        categoria_id: p.categoria_id || "",
      }));

      return products;
    },
  });
};

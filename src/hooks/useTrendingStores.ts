import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrendingStoreProduct {
  id: string;
  sku: string;
  nombre: string;
  precio_venta: number;
  imagen: string | null;
}

export interface TrendingStore {
  id: string;
  name: string;
  slug: string | null;
  logo: string | null;
  products: TrendingStoreProduct[];
  // Mock data for now (until followers/reviews tables are created)
  followers: number;
  salesCount: string;
  newProductsCount: number;
  recentComment: {
    author: string;
    text: string;
  } | null;
}

// Mock comments for demo purposes
const mockComments = [
  { author: "M***a", text: "Excelente calidad, muy recomendado! 🔥" },
  { author: "J***s", text: "Llegó súper rápido, todo perfecto ❤️" },
  { author: "A***z", text: "Me encantó, volveré a comprar seguro" },
  { author: "L***a", text: "Los productos son increíbles, muy buena tienda" },
  { author: "C***o", text: "Buena atención al cliente, recomendado 100%" },
];

export const useTrendingStores = (limit = 5) => {
  return useQuery({
    queryKey: ["trending-stores", limit],
    queryFn: async () => {
      // Fetch active stores with their products
      const { data: stores, error: storesError } = await supabase
        .from("stores")
        .select("id, name, slug, logo")
        .eq("is_active", true)
        .limit(limit);

      if (storesError) throw new Error(storesError.message);

      // For each store, fetch their 4 most recent products
      const storesWithProducts: TrendingStore[] = await Promise.all(
        (stores || []).map(async (store, index) => {
          const { data: products } = await supabase
            .from("seller_catalog")
            .select("id, sku, nombre, precio_venta, images")
            .eq("seller_store_id", store.id)
            .eq("is_active", true)
            .order("imported_at", { ascending: false })
            .limit(4);

          const formattedProducts: TrendingStoreProduct[] = (products || []).map(p => ({
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
            precio_venta: p.precio_venta,
            imagen: p.images && typeof p.images === 'object' && Array.isArray(p.images) 
              ? (p.images as string[])[0] 
              : null,
          }));

          // Generate mock data for demo
          const randomFollowers = Math.floor(Math.random() * 50 + 1) * 100;
          const randomSales = `${Math.floor(Math.random() * 100 + 1)}K+`;
          const randomNewProducts = Math.floor(Math.random() * 20);

          return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo: store.logo,
            products: formattedProducts,
            followers: randomFollowers,
            salesCount: randomSales,
            newProductsCount: randomNewProducts,
            recentComment: mockComments[index % mockComments.length],
          };
        })
      );

      // Filter stores that have at least 1 product
      return storesWithProducts.filter(store => store.products.length > 0);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

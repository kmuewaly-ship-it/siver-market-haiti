import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SellerProduct {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  precio_venta: number;
  precio_costo: number;
  stock: number;
  images: any;
  is_active: boolean;
  seller_store_id: string;
  source_product_id: string | null;
  metadata: any;
  store: {
    id: string;
    name: string;
    logo: string | null;
    whatsapp: string | null;
    is_active: boolean;
  } | null;
}

export const useSellerProduct = (sku: string | undefined) => {
  return useQuery({
    queryKey: ["seller-product", sku],
    queryFn: async () => {
      if (!sku) return null;

      const { data, error } = await supabase
        .from("seller_catalog")
        .select(`
          *,
          store:stores!seller_catalog_seller_store_id_fkey(
            id,
            name,
            logo,
            whatsapp,
            is_active
          )
        `)
        .eq("sku", sku)
        .eq("is_active", true)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
        return null;
      }

      return data as SellerProduct;
    },
    enabled: !!sku,
  });
};

export const useSellerProducts = (limit = 20) => {
  return useQuery({
    queryKey: ["seller-products", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_catalog")
        .select(`
          *,
          store:stores!seller_catalog_seller_store_id_fkey(
            id,
            name,
            logo,
            whatsapp,
            is_active
          )
        `)
        .eq("is_active", true)
        .limit(limit)
        .order("imported_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error);
        return [];
      }

      return data as SellerProduct[];
    },
  });
};

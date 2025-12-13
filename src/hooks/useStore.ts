import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Store = Tables<"stores">;

export interface StoreProfile {
  id: string;
  name: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  owner_user_id: string;
  slug: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useStore = (storeId: string | undefined) => {
  return useQuery({
    queryKey: ["store", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", storeId!)
        .single();

      if (error) throw new Error(error.message);
      return data as StoreProfile;
    },
    enabled: !!storeId,
    staleTime: 1000 * 60 * 10,
  });
};

export const useStoreByOwner = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["store", "owner", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_user_id", userId!)
        .single();

      if (error && error.code !== "PGRST116") throw new Error(error.message);
      return data as StoreProfile | null;
    },
    enabled: !!userId,
  });
};

export const useStoreProducts = (storeId: string | undefined, page = 0, limit = 12) => {
  return useQuery({
    queryKey: ["store", storeId, "products", page],
    queryFn: async () => {
      if (!storeId) return { products: [], total: 0 };

      const { data, error, count } = await supabase
        .from("seller_catalog")
        .select("*", { count: "exact" })
        .eq("seller_store_id", storeId)
        .eq("is_active", true)
        .range(page * limit, (page + 1) * limit - 1)
        .order("imported_at", { ascending: false });

      if (error) throw new Error(error.message);
      return { products: data, total: count || 0 };
    },
    enabled: !!storeId,
  });
};

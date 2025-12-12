import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_visible_public: boolean;
  description: string | null;
  icon: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

export const useCategories = (onlyVisible = false) => {
  return useQuery({
    queryKey: ["categories", onlyVisible],
    queryFn: async () => {
      let query = supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (onlyVisible) {
        query = query.eq("is_visible_public", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Category[];
    },
  });
};

export const usePublicCategories = () => {
  return useCategories(true);
};

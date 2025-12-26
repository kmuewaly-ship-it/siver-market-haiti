import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  option_type: string;
  option_value: string;
  price: number | null;
  precio_promocional: number | null;
  stock: number;
  moq: number;
  images: string[];
  is_active: boolean;
  sort_order: number;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export const useProductVariants = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async (): Promise<ProductVariant[]> => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("option_type", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching product variants:", error);
        throw error;
      }

      return (data || []).map((v) => ({
        ...v,
        images: Array.isArray(v.images) ? (v.images as string[]) : [],
        metadata: v.metadata as Record<string, any> || {},
      })) as ProductVariant[];
    },
    enabled: !!productId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

// Get ALL variants including inactive (for admin)
export const useAllProductVariants = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-variants-all", productId],
    queryFn: async (): Promise<ProductVariant[]> => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("option_type", { ascending: true })
        .order("sort_order", { ascending: true });

      if (error) {
        console.error("Error fetching all product variants:", error);
        throw error;
      }

      return (data || []).map((v) => ({
        ...v,
        images: Array.isArray(v.images) ? (v.images as string[]) : [],
        metadata: v.metadata as Record<string, any> || {},
      })) as ProductVariant[];
    },
    enabled: !!productId,
  });
};

// Get variants grouped by option_type
export const useGroupedVariants = (productId: string | undefined) => {
  const { data: variants, ...rest } = useProductVariants(productId);

  const grouped = variants?.reduce((acc, variant) => {
    const type = variant.option_type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(variant);
    return acc;
  }, {} as Record<string, ProductVariant[]>) || {};

  return { grouped, variants, ...rest };
};

// Get variant stock summary
export const useVariantStockSummary = (productId: string | undefined) => {
  const { data: variants } = useProductVariants(productId);
  
  if (!variants || variants.length === 0) {
    return { totalStock: 0, variantCount: 0, lowStockCount: 0, outOfStockCount: 0 };
  }

  return {
    totalStock: variants.reduce((sum, v) => sum + v.stock, 0),
    variantCount: variants.length,
    lowStockCount: variants.filter(v => v.stock > 0 && v.stock < v.moq).length,
    outOfStockCount: variants.filter(v => v.stock === 0).length,
  };
};

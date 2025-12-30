import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  display_name: string;
  attribute_type: 'color' | 'size' | 'technical' | 'select' | 'text';
  render_type: 'swatches' | 'chips' | 'dropdown' | 'buttons';
  category_hint?: string;
  sort_order: number;
  is_active: boolean;
}

export interface AttributeOption {
  id: string;
  attribute_id: string;
  value: string;
  display_value: string;
  color_hex?: string;
  image_url?: string;
  metadata?: Record<string, unknown>;
  sort_order: number;
  is_active: boolean;
}

export interface VariantAttributeValue {
  id: string;
  variant_id: string;
  attribute_id: string;
  attribute_option_id: string;
  attribute?: Attribute;
  option?: AttributeOption;
}

export interface B2BBatch {
  id: string;
  batch_code: string;
  order_id?: string;
  supplier_id?: string;
  purchase_date: string;
  total_quantity: number;
  total_cost: number;
  notes?: string;
  status: 'active' | 'depleted' | 'returned';
  metadata?: Record<string, unknown>;
}

export interface BatchInventory {
  id: string;
  batch_id: string;
  variant_id: string;
  quantity_purchased: number;
  quantity_sold: number;
  quantity_available: number;
  unit_cost: number;
}

// Fetch all active attributes
export const useAttributes = () => {
  return useQuery({
    queryKey: ["eav-attributes"],
    queryFn: async (): Promise<Attribute[]> => {
      const { data, error } = await supabase
        .from("attributes")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as Attribute[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
};

// Fetch options for a specific attribute
export const useAttributeOptions = (attributeId: string | undefined) => {
  return useQuery({
    queryKey: ["attribute-options", attributeId],
    queryFn: async (): Promise<AttributeOption[]> => {
      if (!attributeId) return [];

      const { data, error } = await supabase
        .from("attribute_options")
        .select("*")
        .eq("attribute_id", attributeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as AttributeOption[];
    },
    enabled: !!attributeId,
  });
};

// Fetch all options grouped by attribute
export const useAllAttributeOptions = () => {
  return useQuery({
    queryKey: ["all-attribute-options"],
    queryFn: async (): Promise<Record<string, AttributeOption[]>> => {
      const { data, error } = await supabase
        .from("attribute_options")
        .select("*, attributes!inner(slug)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      const grouped: Record<string, AttributeOption[]> = {};
      (data || []).forEach((option: any) => {
        const attrSlug = option.attributes?.slug || 'other';
        if (!grouped[attrSlug]) grouped[attrSlug] = [];
        grouped[attrSlug].push(option as AttributeOption);
      });

      return grouped;
    },
    staleTime: 1000 * 60 * 10,
  });
};

// Fetch variant attribute values for a specific variant
export const useVariantAttributes = (variantId: string | undefined) => {
  return useQuery({
    queryKey: ["variant-attributes", variantId],
    queryFn: async (): Promise<VariantAttributeValue[]> => {
      if (!variantId) return [];

      const { data, error } = await supabase
        .from("variant_attribute_values")
        .select(`
          *,
          attributes:attribute_id(*),
          attribute_options:attribute_option_id(*)
        `)
        .eq("variant_id", variantId);

      if (error) throw error;
      return (data || []).map((v: any) => ({
        ...v,
        attribute: v.attributes,
        option: v.attribute_options,
      }));
    },
    enabled: !!variantId,
  });
};

// Fetch all variants with their attributes for a product
export const useProductVariantsWithAttributes = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-variants-eav", productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data: variants, error: variantsError } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (variantsError) throw variantsError;

      const variantIds = (variants || []).map(v => v.id);
      if (variantIds.length === 0) return [];

      const { data: attrValues, error: attrError } = await supabase
        .from("variant_attribute_values")
        .select(`
          *,
          attributes:attribute_id(*),
          attribute_options:attribute_option_id(*)
        `)
        .in("variant_id", variantIds);

      if (attrError) throw attrError;

      // Group attributes by variant
      const attrByVariant: Record<string, VariantAttributeValue[]> = {};
      (attrValues || []).forEach((av: any) => {
        if (!attrByVariant[av.variant_id]) attrByVariant[av.variant_id] = [];
        attrByVariant[av.variant_id].push({
          ...av,
          attribute: av.attributes,
          option: av.attribute_options,
        });
      });

      return (variants || []).map(v => ({
        ...v,
        attributeValues: attrByVariant[v.id] || [],
        images: Array.isArray(v.images) ? v.images : [],
      }));
    },
    enabled: !!productId,
  });
};

// Mutations
export const useEAVMutations = () => {
  const queryClient = useQueryClient();

  // Create or get attribute
  const getOrCreateAttribute = useMutation({
    mutationFn: async (attr: Partial<Attribute> & { name: string }) => {
      // First try to find existing
      const { data: existing } = await supabase
        .from("attributes")
        .select("*")
        .eq("slug", attr.name.toLowerCase().replace(/\s+/g, '_'))
        .single();

      if (existing) return existing;

      // Create new
      const { data, error } = await supabase
        .from("attributes")
        .insert({
          name: attr.name.toLowerCase().replace(/\s+/g, '_'),
          slug: attr.name.toLowerCase().replace(/\s+/g, '_'),
          display_name: attr.display_name || attr.name,
          attribute_type: attr.attribute_type || 'select',
          render_type: attr.render_type || 'chips',
          category_hint: attr.category_hint,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["eav-attributes"] }),
  });

  // Create or get attribute option
  const getOrCreateOption = useMutation({
    mutationFn: async ({
      attributeId,
      value,
      displayValue,
      colorHex,
      imageUrl,
    }: {
      attributeId: string;
      value: string;
      displayValue?: string;
      colorHex?: string;
      imageUrl?: string;
    }) => {
      // First try to find existing
      const { data: existing } = await supabase
        .from("attribute_options")
        .select("*")
        .eq("attribute_id", attributeId)
        .eq("value", value.toLowerCase().replace(/\s+/g, '_'))
        .single();

      if (existing) return existing;

      // Create new
      const { data, error } = await supabase
        .from("attribute_options")
        .insert({
          attribute_id: attributeId,
          value: value.toLowerCase().replace(/\s+/g, '_'),
          display_value: displayValue || value,
          color_hex: colorHex,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["all-attribute-options"] }),
  });

  // Link variant to attribute option
  const linkVariantAttribute = useMutation({
    mutationFn: async ({
      variantId,
      attributeId,
      optionId,
    }: {
      variantId: string;
      attributeId: string;
      optionId: string;
    }) => {
      const { data, error } = await supabase
        .from("variant_attribute_values")
        .upsert({
          variant_id: variantId,
          attribute_id: attributeId,
          attribute_option_id: optionId,
        }, {
          onConflict: 'variant_id,attribute_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Create B2B batch
  const createBatch = useMutation({
    mutationFn: async (batch: Partial<B2BBatch>) => {
      const { data, error } = await supabase
        .from("b2b_batches")
        .insert([{
          batch_code: `BATCH-${Date.now()}`, // Will be overwritten by trigger
          total_quantity: batch.total_quantity || 0,
          total_cost: batch.total_cost || 0,
          notes: batch.notes || null,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Add inventory to batch
  const addBatchInventory = useMutation({
    mutationFn: async ({
      batchId,
      variantId,
      quantityPurchased,
      unitCost,
    }: {
      batchId: string;
      variantId: string;
      quantityPurchased: number;
      unitCost: number;
    }) => {
      const { data, error } = await supabase
        .from("batch_inventory")
        .upsert({
          batch_id: batchId,
          variant_id: variantId,
          quantity_purchased: quantityPurchased,
          unit_cost: unitCost,
        }, {
          onConflict: 'batch_id,variant_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
  });

  return {
    getOrCreateAttribute,
    getOrCreateOption,
    linkVariantAttribute,
    createBatch,
    addBatchInventory,
  };
};

// Helper to detect attribute type from column name
export const detectAttributeType = (columnName: string): {
  type: Attribute['attribute_type'];
  render: Attribute['render_type'];
  categoryHint: string;
} => {
  const lower = columnName.toLowerCase();

  if (lower.includes('color') || lower.includes('colour')) {
    return { type: 'color', render: 'swatches', categoryHint: 'fashion' };
  }
  if (lower.includes('size') || lower.includes('talla') || lower.includes('tamaño')) {
    return { type: 'size', render: 'buttons', categoryHint: 'fashion' };
  }
  if (lower.includes('age') || lower.includes('edad')) {
    return { type: 'size', render: 'buttons', categoryHint: 'fashion' };
  }
  if (lower.includes('volt') || lower.includes('watt') || lower.includes('power') || lower.includes('potencia')) {
    return { type: 'technical', render: 'chips', categoryHint: 'electronics' };
  }
  if (lower.includes('capacity') || lower.includes('mah') || lower.includes('capacidad')) {
    return { type: 'technical', render: 'chips', categoryHint: 'electronics' };
  }
  if (lower.includes('material')) {
    return { type: 'select', render: 'dropdown', categoryHint: 'general' };
  }
  if (lower.includes('style') || lower.includes('estilo')) {
    return { type: 'select', render: 'chips', categoryHint: 'fashion' };
  }

  return { type: 'select', render: 'chips', categoryHint: 'general' };
};

// Parse color value to hex
export const parseColorToHex = (colorValue: string): string | undefined => {
  const colorMap: Record<string, string> = {
    'red': '#FF0000', 'rojo': '#FF0000',
    'blue': '#0000FF', 'azul': '#0000FF',
    'green': '#00FF00', 'verde': '#00FF00',
    'yellow': '#FFFF00', 'amarillo': '#FFFF00',
    'black': '#000000', 'negro': '#000000',
    'white': '#FFFFFF', 'blanco': '#FFFFFF',
    'pink': '#FFC0CB', 'rosa': '#FFC0CB',
    'purple': '#800080', 'morado': '#800080',
    'orange': '#FFA500', 'naranja': '#FFA500',
    'brown': '#8B4513', 'marrón': '#8B4513', 'marron': '#8B4513',
    'grey': '#808080', 'gray': '#808080', 'gris': '#808080',
    'navy': '#000080', 'azul marino': '#000080',
    'beige': '#F5F5DC',
    'khaki': '#F0E68C', 'caqui': '#F0E68C',
    'gold': '#FFD700', 'dorado': '#FFD700',
    'silver': '#C0C0C0', 'plateado': '#C0C0C0',
  };

  const lower = colorValue.toLowerCase().trim();
  
  // Check if it's already a hex color
  if (/^#[0-9A-Fa-f]{6}$/.test(colorValue)) {
    return colorValue;
  }

  return colorMap[lower];
};

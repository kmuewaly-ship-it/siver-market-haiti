import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters } from "@/types/b2b";

/**
 * Extract base SKU from a SKU with variant suffix
 * Examples:
 * - "1005006634174277-4-5y" -> "1005006634174277"
 * - "3256807834694104-s224061210-5y" -> "3256807834694104-s224061210"
 * - "TEST-B2B-B2C-001-S" -> "TEST-B2B-B2C-001"
 */
const extractBaseSku = (sku: string): string => {
  if (!sku) return sku;
  
  // Common variant patterns at the end of SKU
  // Matches: -4y, -5y, -6y, -S, -M, -L, -XL, -18-24m, -ten-years, etc.
  const variantPatterns = [
    /-\d+-\d+[mMyY]$/i,      // -18-24m, -4-5y
    /-\d+[mMyY]$/i,          // -4y, -5m
    /-[SMLX]{1,3}$/i,        // -S, -M, -L, -XL, -XXL
    /-[a-z]+-years$/i,       // -ten-years, -eleven-years
    /-[a-z]+$/i,             // generic suffix like -blue, -red (only if short)
  ];
  
  for (const pattern of variantPatterns) {
    if (pattern.test(sku)) {
      return sku.replace(pattern, '');
    }
  }
  
  return sku;
};

/**
 * Extract variant label from SKU or name
 */
const extractVariantLabel = (sku: string, nombre: string): string => {
  // Try to get variant from the end of SKU
  const matches = sku.match(/[-_]([SMLX]{1,3}|[\d]+-[\d]+[mMyY]|[\d]+[mMyY]|[\w-]+years?)$/i);
  if (matches) {
    return matches[1].toUpperCase();
  }
  
  // Try to get from name suffix (after last " - ")
  const nameParts = nombre.split(' - ');
  if (nameParts.length > 1) {
    return nameParts[nameParts.length - 1].trim();
  }
  
  return '';
};

/**
 * Clean product name by removing variant suffix
 */
const cleanProductName = (nombre: string): string => {
  // Remove common variant suffixes from name
  return nombre
    .replace(/\s*[-–]\s*\d+-\d+[mMyY]\s*$/i, '')  // " - 4-5Y"
    .replace(/\s*[-–]\s*\d+[mMyY]\s*$/i, '')       // " - 5Y"
    .replace(/\s*[-–]\s*[SMLX]{1,3}\s*$/i, '')     // " - S", " - XL"
    .replace(/\s*[-–]\s*[\w-]+years?\s*$/i, '')    // " - ten-years"
    .trim();
};

interface ProductVariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
  option_type: string; // 'color', 'size', etc.
}

interface GroupedProduct {
  representative: any;
  variants: ProductVariantInfo[];
  baseSku: string;
  baseName: string;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  productIds: string[]; // All product IDs in this group
}

/**
 * Group products by base SKU to combine variants (AliExpress/Shein style)
 */
const groupProductsBySku = (products: any[]): GroupedProduct[] => {
  const skuGroups = new Map<string, any[]>();
  
  products.forEach(product => {
    const baseSku = extractBaseSku(product.sku_interno || '');
    
    if (!skuGroups.has(baseSku)) {
      skuGroups.set(baseSku, []);
    }
    skuGroups.get(baseSku)!.push(product);
  });
  
  const groupedProducts: GroupedProduct[] = [];
  
  skuGroups.forEach((products, baseSku) => {
    // Sort by price to get the lowest as representative
    products.sort((a, b) => (a.precio_mayorista || 0) - (b.precio_mayorista || 0));
    
    const representative = { ...products[0] };
    const baseName = cleanProductName(representative.nombre || '');
    const productIds = products.map(p => p.id);
    
    // Create variant info array - include product variants from DB if available
    const variantInfos: ProductVariantInfo[] = products.map(p => ({
      id: p.id,
      sku: p.sku_interno,
      label: extractVariantLabel(p.sku_interno || '', p.nombre || ''),
      precio: p.precio_mayorista || 0,
      stock: p.stock_fisico || 0,
      option_type: 'color', // Products grouped by SKU represent different colors
    }));
    
    // Calculate aggregates
    const totalStock = products.reduce((sum, v) => sum + (v.stock_fisico || 0), 0);
    const prices = products.map(v => v.precio_mayorista || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    groupedProducts.push({
      representative,
      variants: variantInfos,
      baseSku,
      baseName,
      totalStock,
      minPrice,
      maxPrice,
      productIds,
    });
  });
  
  return groupedProducts;
};

export const useProductsB2B = (filters: B2BFilters, page = 0, limit = 24) => {
  return useQuery({
    queryKey: ["products-b2b", filters, page, limit],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      // Fetch ALL products to group them correctly
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

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching B2B products:", error);
        throw new Error(error.message);
      }

      // Fetch all product variants to get option_type info
      const productIds = (data || []).map(p => p.id);
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("id, product_id, sku, option_type, option_value, price, stock")
        .in("product_id", productIds)
        .eq("is_active", true);

      // Create a map of product variants by product_id
      const variantsByProduct = new Map<string, typeof variantsData>();
      (variantsData || []).forEach(v => {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push(v);
      });

      // Group products by SKU (combine variants)
      const groupedData = groupProductsBySku(data || []);
      
      // Apply pagination AFTER grouping
      const paginatedData = groupedData.slice(page * limit, (page + 1) * limit);

      // Map to B2B card format with proper variants from product_variants table
      const products: ProductB2BCard[] = paginatedData.map((group) => {
        const p = group.representative;
        const precioMayorista = group.minPrice || p.precio_mayorista || 0;
        const precioSugerido = p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const moq = p.moq || 1;
        const imagen = p.imagen_principal || "/placeholder.svg";
        
        // Collect ALL variants from ALL products in this group
        const allVariants: ProductVariantInfo[] = [];
        
        group.productIds.forEach(productId => {
          const productVariants = variantsByProduct.get(productId) || [];
          productVariants.forEach(pv => {
            allVariants.push({
              id: pv.id,
              sku: pv.sku,
              label: pv.option_value,
              precio: pv.price || precioMayorista,
              stock: pv.stock || 0,
              option_type: pv.option_type || 'size',
            });
          });
        });
        
        // If no variants from product_variants table, use the grouped product variants (as colors)
        const finalVariants = allVariants.length > 0 ? allVariants : group.variants;
        
        return {
          id: p.id,
          sku: group.baseSku,
          nombre: group.baseName || p.nombre,
          precio_b2b: precioMayorista,
          precio_b2b_max: group.maxPrice !== group.minPrice ? group.maxPrice : undefined,
          precio_sugerido: precioSugerido,
          moq: moq,
          stock_fisico: group.totalStock,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          variant_count: finalVariants.length,
          variant_ids: finalVariants.map(v => v.id),
          variants: finalVariants,
          source_product_id: p.id, // For VariantSelector queries
        };
      });

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

      // Group products by SKU
      const groupedData = groupProductsBySku(data || []);
      
      // Take only the requested limit
      const limitedData = groupedData.slice(0, limit);

      const products: ProductB2BCard[] = limitedData.map((group) => {
        const p = group.representative;
        const precioMayorista = group.minPrice || p.precio_mayorista || 0;
        const precioSugerido = p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || "/placeholder.svg";
        
        return {
          id: p.id,
          sku: group.baseSku,
          nombre: group.baseName || p.nombre,
          precio_b2b: precioMayorista,
          precio_b2b_max: group.maxPrice !== group.minPrice ? group.maxPrice : undefined,
          precio_sugerido: precioSugerido,
          moq: p.moq || 1,
          stock_fisico: group.totalStock,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          variant_count: group.variants.length,
          variant_ids: group.variants.map(v => v.id),
          variants: group.variants,
        };
      });

      return products;
    },
  });
};

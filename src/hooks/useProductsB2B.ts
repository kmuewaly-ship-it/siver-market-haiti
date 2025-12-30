import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters, ProductVariantInfo } from "@/types/b2b";

/**
 * Extract base SKU from a SKU with variant suffix
 * Examples:
 * - "1005006634174277-kj1c4420a-4y" -> "1005006634174277"
 * - "3256807834694104-s224061210-5y" -> "3256807834694104"
 */
const extractBaseSku = (sku: string): string => {
  if (!sku) return sku;
  const parts = sku.split('-');
  return parts[0] || sku;
};

/**
 * Extract color code from SKU (middle part)
 * "1005006634174277-kj1c4420a-4y" -> "kj1c4420a"
 */
const extractColorCode = (sku: string): string => {
  if (!sku) return '';
  const parts = sku.split('-');
  if (parts.length >= 2) {
    return parts[1] || '';
  }
  return '';
};

/**
 * Extract color label from product name or SKU
 */
const extractColorLabel = (nombre: string, sku: string): string => {
  // Try to extract color from name (after last " - ")
  const nameParts = nombre.split(' - ');
  if (nameParts.length > 1) {
    const lastPart = nameParts[nameParts.length - 1].trim();
    // Check if it looks like a color (not a size)
    if (!/^\d/.test(lastPart) && !/^[SMLX]{1,3}$/i.test(lastPart)) {
      return lastPart;
    }
  }
  
  // Use color code from SKU as fallback
  const colorCode = extractColorCode(sku);
  if (colorCode) {
    return colorCode.toUpperCase();
  }
  
  return '';
};

/**
 * Clean product name by removing variant suffixes
 */
const cleanProductName = (nombre: string): string => {
  return nombre
    .replace(/\s*[-–]\s*\d+-\d+[mMyY]\s*$/i, '')
    .replace(/\s*[-–]\s*\d+[mMyY]\s*$/i, '')
    .replace(/\s*[-–]\s*[SMLX]{1,3}\s*$/i, '')
    .replace(/\s*[-–]\s*[\w-]+years?\s*$/i, '')
    // Remove color suffixes (common colors in Spanish/English)
    .replace(/\s*[-–]\s*(blanco|negro|rojo|azul|verde|amarillo|rosa|morado|naranja|gris|white|black|red|blue|green|yellow|pink|purple|orange|gray|grey)\s*$/i, '')
    .trim();
};

interface ColorOption {
  productId: string;
  label: string;
  code: string;
  image: string;
  price: number;
  stock: number;
}

interface GroupedProduct {
  representative: any;
  products: any[]; // All products in this group (different colors)
  colorOptions: ColorOption[];
  baseSku: string;
  baseName: string;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  productIds: string[];
}

/**
 * Group products by base SKU to combine color variants
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
  
  skuGroups.forEach((groupProducts, baseSku) => {
    // Sort by price to get the lowest as representative
    groupProducts.sort((a, b) => (a.precio_mayorista || 0) - (b.precio_mayorista || 0));
    
    const representative = { ...groupProducts[0] };
    const baseName = cleanProductName(representative.nombre || '');
    const productIds = groupProducts.map(p => p.id);
    
    // Create color options from each product in the group
    const colorOptions: ColorOption[] = groupProducts.map(p => ({
      productId: p.id,
      label: extractColorLabel(p.nombre || '', p.sku_interno || ''),
      code: extractColorCode(p.sku_interno || ''),
      image: p.imagen_principal || '/placeholder.svg',
      price: p.precio_mayorista || 0,
      stock: p.stock_fisico || 0,
    }));
    
    // Calculate aggregates
    const totalStock = groupProducts.reduce((sum, v) => sum + (v.stock_fisico || 0), 0);
    const prices = groupProducts.map(v => v.precio_mayorista || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    groupedProducts.push({
      representative,
      products: groupProducts,
      colorOptions,
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

      // Group products by base SKU (combine color variants)
      const groupedData = groupProductsBySku(data || []);
      
      // Fetch all product variants for ALL products
      const allProductIds = (data || []).map(p => p.id);
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("id, product_id, sku, option_type, option_value, price, stock")
        .in("product_id", allProductIds)
        .eq("is_active", true);

      // Create a map of variants by product_id
      const variantsByProduct = new Map<string, typeof variantsData>();
      (variantsData || []).forEach(v => {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push(v);
      });

      // Apply pagination AFTER grouping
      const paginatedData = groupedData.slice(page * limit, (page + 1) * limit);

      // Map to B2B card format with proper variants
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
              parent_product_id: productId,
            });
          });
        });
        
        // Determine variant count for display
        const hasMultipleColors = group.colorOptions.length > 1;
        const hasVariants = allVariants.length > 0;
        const totalVariantCount = hasMultipleColors 
          ? group.colorOptions.length + allVariants.length 
          : allVariants.length || group.colorOptions.length;
        
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
          variant_count: totalVariantCount,
          variant_ids: [...group.productIds, ...allVariants.map(v => v.id)],
          variants: allVariants,
          source_product_id: p.id,
          // New fields for color handling
          color_options: group.colorOptions,
          has_color_variants: hasMultipleColors,
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

      // Group products by base SKU
      const groupedData = groupProductsBySku(data || []);
      
      // Fetch variants for all products
      const allProductIds = (data || []).map(p => p.id);
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("id, product_id, sku, option_type, option_value, price, stock")
        .in("product_id", allProductIds)
        .eq("is_active", true);

      const variantsByProduct = new Map<string, typeof variantsData>();
      (variantsData || []).forEach(v => {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push(v);
      });
      
      // Take only the requested limit
      const limitedData = groupedData.slice(0, limit);

      const products: ProductB2BCard[] = limitedData.map((group) => {
        const p = group.representative;
        const precioMayorista = group.minPrice || p.precio_mayorista || 0;
        const precioSugerido = p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || "/placeholder.svg";
        
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
              parent_product_id: productId,
            });
          });
        });

        const hasMultipleColors = group.colorOptions.length > 1;
        const totalVariantCount = hasMultipleColors 
          ? group.colorOptions.length + allVariants.length 
          : allVariants.length || group.colorOptions.length;
        
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
          variant_count: totalVariantCount,
          variant_ids: [...group.productIds, ...allVariants.map(v => v.id)],
          variants: allVariants,
          source_product_id: p.id,
          color_options: group.colorOptions,
          has_color_variants: hasMultipleColors,
        };
      });

      return products;
    },
  });
};

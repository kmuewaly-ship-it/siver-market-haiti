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
 * Extract variant info from SKU suffix
 * Returns type: 'size' | 'color' | 'age' | 'combo'
 */
interface VariantExtraction {
  type: string;
  value: string;
  code: string;
}

/**
 * Extract ALL variant info from SKU suffix
 * Returns array of variants: [{ type: 'age', value: '6T', code: '6t' }, { type: 'color', value: 'Champagne', code: 'champagne' }]
 */
const extractAllVariantsFromSku = (sku: string): VariantExtraction[] => {
  if (!sku) return [];
  
  const parts = sku.split('-');
  if (parts.length <= 1) return [];
  
  const variants: VariantExtraction[] = [];
  const suffixParts = parts.slice(1); // All parts after base SKU
  
  // Known color names (single and compound)
  const singleColors = ['champagne', 'white', 'black', 'red', 'blue', 'green', 
                        'yellow', 'pink', 'purple', 'orange', 'gray', 'grey', 'beige', 'brown', 'navy',
                        'cream', 'gold', 'silver', 'rose', 'coral', 'lavender', 'turquoise', 'teal',
                        'maroon', 'olive', 'peach', 'mint', 'ivory', 'burgundy', 'khaki', 'aqua',
                        'apricot', 'wine', 'sky', 'coffee', 'camel', 'mocha', 'blush'];
  const compoundColors = ['light-blue', 'peach-pink', 'hot-pink', 'sky-blue', 'royal-blue', 
                          'dark-blue', 'dark-green', 'light-green', 'light-pink', 'dark-grey',
                          'off-white', 'rose-gold', 'baby-blue', 'baby-pink'];
  
  let processedParts: string[] = [];
  let i = 0;
  
  while (i < suffixParts.length) {
    const part = suffixParts[i].toLowerCase();
    const nextPart = suffixParts[i + 1]?.toLowerCase();
    
    // Check for hyphenated color (e.g., "light-blue", "peach-pink")
    if (nextPart) {
      const compound = `${part}-${nextPart}`;
      if (compoundColors.includes(compound) || 
          (singleColors.includes(part) && singleColors.includes(nextPart))) {
        processedParts.push(compound);
        i += 2;
        continue;
      }
    }
    
    processedParts.push(part);
    i++;
  }
  
  // All color names for matching
  const allColors = [...singleColors, ...compoundColors];
  
  processedParts.forEach(part => {
    // Check for age patterns (3-4t, 6t, 8y, 10y, 11-12y, 18-24m, etc.)
    const ageMatch = part.match(/^(\d+(?:-\d+)?)\s*([tTyYmM])$/);
    if (ageMatch) {
      const ageValue = ageMatch[1].toUpperCase() + ageMatch[2].toUpperCase();
      variants.push({ type: 'age', value: ageValue, code: part });
      return;
    }
    
    // Check for size patterns (110, 120, 130, 140, 150 - cm sizes)
    const cmSizeMatch = part.match(/^(100|110|120|130|140|150|160|170|180)$/);
    if (cmSizeMatch) {
      variants.push({ type: 'size', value: cmSizeMatch[1] + 'cm', code: part });
      return;
    }
    
    // Check for standard sizes (S, M, L, XL, XXL, 2XL, 3XL)
    const sizeMatch = part.match(/^([2-5]?x?[sml]|xx?l|xxx?l)$/i);
    if (sizeMatch) {
      variants.push({ type: 'size', value: sizeMatch[1].toUpperCase(), code: part });
      return;
    }
    
    // Check for color names
    if (allColors.includes(part)) {
      const colorLabel = part.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      variants.push({ type: 'color', value: colorLabel, code: part });
      return;
    }
    
    // Skip product codes (alphanumeric with letters and numbers, likely internal codes)
    if (/^[a-z]{2,}\d+[a-z]*$/i.test(part)) {
      return; // Skip codes like "kj1c4420a", "dh01021bh"
    }
  });
  
  return variants;
};

/**
 * Legacy function for backward compatibility - returns primary variant
 */
const extractVariantInfo = (sku: string, nombre: string): { type: string; value: string; code: string } => {
  const allVariants = extractAllVariantsFromSku(sku);
  
  if (allVariants.length === 0) {
    return { type: 'unknown', value: '', code: '' };
  }
  
  // Priority: age > size > color
  const priority = ['age', 'size', 'color'];
  for (const type of priority) {
    const variant = allVariants.find(v => v.type === type);
    if (variant) return variant;
  }
  
  return allVariants[0];
};


/**
 * Clean product name by removing variant suffixes
 */
const cleanProductName = (nombre: string): string => {
  return nombre
    .replace(/\s*[-–]\s*\d+[-–]?\d*[mMyY]\s*$/i, '')
    .replace(/\s*[-–]\s*[SMLX]{1,3}\s*$/i, '')
    .replace(/\s*[-–]\s*[\w-]+years?\s*$/i, '')
    .replace(/\s*[-–]\s*(blanco|negro|rojo|azul|verde|amarillo|rosa|morado|naranja|gris|white|black|red|blue|green|yellow|pink|purple|orange|gray|grey|beige|brown|marron|cafe|turquesa|coral|lavanda|lavender)\s*$/i, '')
    .trim();
};

interface VariantOption {
  productId: string;
  label: string;
  code: string;
  image: string;
  price: number;
  stock: number;
  type: string; // 'color' | 'size' | 'age' | 'combo'
}

interface VariantsByType {
  [type: string]: VariantOption[];
}

interface GroupedProduct {
  representative: any;
  products: any[];
  variantOptions: VariantOption[]; // All variants
  variantsByType: VariantsByType; // Variants grouped by type
  variantTypes: string[]; // All detected types
  baseSku: string;
  baseName: string;
  totalStock: number;
  minPrice: number;
  maxPrice: number;
  productIds: string[];
}

/**
 * Group products by base SKU to combine variants
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
    
    // Extract ALL variants from each product using new multi-variant extraction
    const variantsByType: VariantsByType = {};
    const allVariantOptions: VariantOption[] = [];
    
    groupProducts.forEach(p => {
      const allVariants = extractAllVariantsFromSku(p.sku_interno || '');
      
      allVariants.forEach(variantInfo => {
        const variantOption: VariantOption = {
          productId: p.id,
          label: variantInfo.value,
          code: variantInfo.code,
          image: p.imagen_principal || '/placeholder.svg',
          price: p.precio_mayorista || 0,
          stock: p.stock_fisico || 0,
          type: variantInfo.type,
        };
        
        allVariantOptions.push(variantOption);
        
        // Group by type
        if (!variantsByType[variantInfo.type]) {
          variantsByType[variantInfo.type] = [];
        }
        
        // Avoid duplicates by label within each type
        if (!variantsByType[variantInfo.type].find(existing => existing.label === variantInfo.value)) {
          variantsByType[variantInfo.type].push(variantOption);
        }
      });
    });
    
    // Get all detected types (sorted by priority: color, size, age, unknown)
    const typePriority = ['color', 'size', 'age', 'unknown'];
    const variantTypes = Object.keys(variantsByType).sort((a, b) => {
      return typePriority.indexOf(a) - typePriority.indexOf(b);
    });
    
    // Calculate aggregates
    const totalStock = groupProducts.reduce((sum, v) => sum + (v.stock_fisico || 0), 0);
    const prices = groupProducts.map(v => v.precio_mayorista || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    groupedProducts.push({
      representative,
      products: groupProducts,
      variantOptions: allVariantOptions,
      variantsByType,
      variantTypes,
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
        const hasGroupedVariants = group.variantOptions.length > 1;
        const hasVariants = allVariants.length > 0;
        const totalVariantCount = hasGroupedVariants 
          ? group.variantOptions.length + allVariants.length 
          : allVariants.length || group.variantOptions.length;
        
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
          // New unified variant fields
          variant_options: group.variantOptions,
          variant_type: group.variantTypes[0] || 'unknown', // Primary type
          variant_types: group.variantTypes, // All types
          variants_by_type: group.variantsByType, // Grouped by type
          has_grouped_variants: hasGroupedVariants,
          // Backwards compatibility
          color_options: group.variantsByType['color'] || group.variantOptions,
          has_color_variants: hasGroupedVariants,
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

        const hasGroupedVariants = group.variantOptions.length > 1;
        const totalVariantCount = hasGroupedVariants 
          ? group.variantOptions.length + allVariants.length 
          : allVariants.length || group.variantOptions.length;
        
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
          variant_options: group.variantOptions,
          variant_type: group.variantTypes[0] || 'unknown',
          variant_types: group.variantTypes,
          variants_by_type: group.variantsByType,
          has_grouped_variants: hasGroupedVariants,
          color_options: group.variantsByType['color'] || group.variantOptions,
          has_color_variants: hasGroupedVariants,
        };
      });

      return products;
    },
  });
};

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
const extractVariantInfo = (sku: string, nombre: string): { type: string; value: string; code: string } => {
  if (!sku) return { type: 'unknown', value: '', code: '' };
  
  const parts = sku.split('-');
  const suffix = parts.slice(1).join('-');
  
  // Check for age patterns (18-24m, 2-3y, 4y, etc.)
  const ageMatch = suffix.match(/(\d+[-–]?\d*[mMyY]|[\w-]*years?)/i);
  if (ageMatch) {
    const ageValue = ageMatch[1].replace(/[-–]/g, '-');
    return { type: 'age', value: formatAgeLabel(ageValue), code: ageValue };
  }
  
  // Check for standard sizes (S, M, L, XL, XXL)
  const sizeMatch = suffix.match(/^([SMLX]{1,3})$/i);
  if (sizeMatch) {
    return { type: 'size', value: sizeMatch[1].toUpperCase(), code: sizeMatch[1].toLowerCase() };
  }
  
  // Check for color in name
  const nameParts = nombre.split(' - ');
  if (nameParts.length > 1) {
    const lastPart = nameParts[nameParts.length - 1].trim().toLowerCase();
    const colors = ['blanco', 'negro', 'rojo', 'azul', 'verde', 'amarillo', 'rosa', 'morado', 'naranja', 'gris', 
                    'white', 'black', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'orange', 'gray', 'grey',
                    'beige', 'brown', 'marron', 'cafe', 'turquesa', 'turquoise', 'coral', 'lavanda', 'lavender'];
    if (colors.some(c => lastPart.includes(c))) {
      return { type: 'color', value: nameParts[nameParts.length - 1].trim(), code: suffix };
    }
  }
  
  // Default: treat middle part as color code
  if (parts.length >= 2 && parts[1]) {
    return { type: 'color', value: parts[1].toUpperCase(), code: parts[1] };
  }
  
  return { type: 'unknown', value: suffix, code: suffix };
};

/**
 * Format age label for display
 */
const formatAgeLabel = (age: string): string => {
  return age
    .replace(/(\d+)[-–](\d+)([mMyY])/i, '$1-$2$3')
    .replace(/m$/i, 'M')
    .replace(/y$/i, 'Y')
    .replace(/years?$/i, 'Y');
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

interface GroupedProduct {
  representative: any;
  products: any[];
  variantOptions: VariantOption[];
  variantType: string; // Primary variant type detected
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
    
    // Create variant options from each product in the group with type detection
    const variantOptions: VariantOption[] = groupProducts.map(p => {
      const variantInfo = extractVariantInfo(p.sku_interno || '', p.nombre || '');
      return {
        productId: p.id,
        label: variantInfo.value || p.nombre,
        code: variantInfo.code,
        image: p.imagen_principal || '/placeholder.svg',
        price: p.precio_mayorista || 0,
        stock: p.stock_fisico || 0,
        type: variantInfo.type,
      };
    });
    
    // Detect primary variant type (most common)
    const typeCounts: Record<string, number> = {};
    variantOptions.forEach(v => {
      typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
    });
    const variantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    
    // Calculate aggregates
    const totalStock = groupProducts.reduce((sum, v) => sum + (v.stock_fisico || 0), 0);
    const prices = groupProducts.map(v => v.precio_mayorista || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    groupedProducts.push({
      representative,
      products: groupProducts,
      variantOptions,
      variantType,
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
          variant_type: group.variantType,
          has_grouped_variants: hasGroupedVariants,
          // Backwards compatibility
          color_options: group.variantOptions,
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
          variant_type: group.variantType,
          has_grouped_variants: hasGroupedVariants,
          color_options: group.variantOptions,
          has_color_variants: hasGroupedVariants,
        };
      });

      return products;
    },
  });
};

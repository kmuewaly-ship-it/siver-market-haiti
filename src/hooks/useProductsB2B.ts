import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductB2BCard, B2BFilters, ProductVariantInfo, AttributeCombination, ProductVariantEAV } from "@/types/b2b";

/**
 * Extract unique attribute options from variants' attribute_combination
 * Returns: { color: ['champagne', 'blue'], size: ['110', '120'], age: ['4T', '5T'] }
 */
const extractAttributeOptions = (variants: ProductVariantEAV[]): Record<string, string[]> => {
  const options: Record<string, Set<string>> = {};
  
  variants.forEach(variant => {
    const combo = variant.attribute_combination || {};
    Object.entries(combo).forEach(([key, value]) => {
      if (value) {
        if (!options[key]) {
          options[key] = new Set();
        }
        options[key].add(value);
      }
    });
  });
  
  // Convert Sets to sorted arrays
  const result: Record<string, string[]> = {};
  Object.entries(options).forEach(([key, valueSet]) => {
    result[key] = Array.from(valueSet).sort((a, b) => {
      // Sort numerically if possible
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    });
  });
  
  return result;
};

/**
 * Get display name for attribute type
 */
const getAttributeDisplayName = (type: string): string => {
  const names: Record<string, string> = {
    color: 'Color',
    size: 'Talla',
    age: 'Edad',
    material: 'Material',
    style: 'Estilo',
  };
  return names[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
};

export const useProductsB2B = (filters: B2BFilters, page = 0, limit = 24) => {
  return useQuery({
    queryKey: ["products-b2b-eav", filters, page, limit],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    refetchOnMount: true, // Always refetch when component mounts
    queryFn: async () => {
      // Query parent products OR products without is_parent flag (backwards compatibility)
      let query = supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("is_active", true)
        .or("is_parent.eq.true,is_parent.is.null");

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

      const { data: parentProducts, error } = await query;

      if (error) {
        console.error("Error fetching B2B products:", error);
        throw new Error(error.message);
      }

      if (!parentProducts || parentProducts.length === 0) {
        return { products: [], total: 0 };
      }

      // Fetch all variants for parent products with attribute_combination
      const productIds = parentProducts.map(p => p.id);
      
      // Parallel fetch: variants AND B2C market prices
      const [variantsResult, marketPricesResult] = await Promise.all([
        supabase
          .from("product_variants")
          .select("id, product_id, sku, name, option_type, option_value, price, stock, moq, attribute_combination, is_active")
          .in("product_id", productIds)
          .eq("is_active", true),
        supabase
          .from("b2c_max_prices")
          .select("source_product_id, max_b2c_price, num_sellers, min_b2c_price")
          .in("source_product_id", productIds)
      ]);

      if (variantsResult.error) {
        console.error("Error fetching variants:", variantsResult.error);
      }

      // Create B2C market price lookup map
      const marketPriceMap = new Map<string, { max_b2c_price: number; num_sellers: number; min_b2c_price: number }>();
      (marketPricesResult.data || []).forEach(mp => {
        if (mp.source_product_id) {
          marketPriceMap.set(mp.source_product_id, {
            max_b2c_price: mp.max_b2c_price,
            num_sellers: mp.num_sellers,
            min_b2c_price: mp.min_b2c_price
          });
        }
      });

      // Group variants by product_id
      const variantsByProduct = new Map<string, ProductVariantEAV[]>();
      (variantsResult.data || []).forEach(v => {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price || 0,
          stock: v.stock || 0,
          moq: v.moq || 1,
          attribute_combination: (v.attribute_combination as AttributeCombination) || {},
          product_id: v.product_id,
          is_active: v.is_active,
        });
      });

      // Apply pagination
      const paginatedProducts = parentProducts.slice(page * limit, (page + 1) * limit);

      // Map to B2B card format with EAV data AND market reference
      const products: ProductB2BCard[] = paginatedProducts.map((p) => {
        const variants = variantsByProduct.get(p.id) || [];
        
        // Extract attribute options from variants
        const attributeOptions = extractAttributeOptions(variants);
        const attributeTypes = Object.keys(attributeOptions);
        
        // Calculate aggregates
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        const prices = variants.map(v => v.price).filter(price => price > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : p.precio_mayorista || 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;
        
        const precioMayorista = minPrice || p.precio_mayorista || 0;
        const precioSugerido = p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || "/placeholder.svg";
        
        // Convert to ProductVariantInfo format
        const variantInfos: ProductVariantInfo[] = variants.map(v => ({
          id: v.id,
          sku: v.sku,
          label: v.name,
          precio: v.price,
          stock: v.stock,
          option_type: Object.keys(v.attribute_combination)[0] || 'variant',
          parent_product_id: v.product_id,
          attribute_combination: v.attribute_combination,
        }));

        // Get B2C market reference for PVP
        const marketData = marketPriceMap.get(p.id);
        const isMarketSynced = !!marketData?.max_b2c_price;
        
        // Calculate PVP: Priority = Market > Admin > Calculated (30% margin)
        const pvpReference = marketData?.max_b2c_price || p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const pvpSource = marketData?.max_b2c_price ? 'market' : (p.precio_sugerido_venta ? 'admin' : 'calculated');
        
        // Calculate profit metrics
        const profitAmount = pvpReference - precioMayorista;
        const roiPercent = precioMayorista > 0 ? Math.round((profitAmount / precioMayorista) * 100 * 10) / 10 : 0;

        return {
          id: p.id,
          sku: p.sku_interno,
          nombre: p.nombre,
          precio_b2b: precioMayorista,
          precio_b2b_max: maxPrice !== minPrice ? maxPrice : undefined,
          precio_sugerido: pvpReference, // Now using market reference
          moq: p.moq || 1,
          stock_fisico: totalStock > 0 ? totalStock : p.stock_fisico || 0,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          rating: p.rating,
          variant_count: variants.length,
          variant_ids: variants.map(v => v.id),
          variants: variantInfos,
          source_product_id: p.id,
          // EAV-specific fields
          variant_type: attributeTypes[0] || 'unknown',
          variant_types: attributeTypes,
          has_grouped_variants: variants.length > 1,
          // Market reference fields
          pvp_reference: pvpReference,
          pvp_source: pvpSource as 'market' | 'admin' | 'calculated',
          is_market_synced: isMarketSynced,
          num_b2c_sellers: marketData?.num_sellers || 0,
          profit_amount: profitAmount,
          roi_percent: roiPercent,
          // Store raw attribute options for the selector to use
          variants_by_type: Object.fromEntries(
            attributeTypes.map(type => [
              type,
              attributeOptions[type].map((value, idx) => ({
                productId: `${p.id}-${type}-${value}`,
                label: value,
                code: value.toLowerCase().replace(/\s+/g, '-'),
                image: imagen,
                price: minPrice,
                stock: variants.filter(v => v.attribute_combination[type] === value)
                  .reduce((sum, v) => sum + v.stock, 0),
                type,
              }))
            ])
          ),
        };
      });

      return { products, total: parentProducts.length };
    },
  });
};

export const useFeaturedProductsB2B = (limit = 6) => {
  return useQuery({
    queryKey: ["products-b2b-featured-eav", limit],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      // Query only parent products
      const { data: parentProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_parent", true)
        .order("created_at", { ascending: false })
        .limit(limit * 2); // Get more to filter

      if (error) throw new Error(error.message);
      if (!parentProducts || parentProducts.length === 0) return [];

      // Fetch variants
      const productIds = parentProducts.map(p => p.id);
      const { data: variantsData } = await supabase
        .from("product_variants")
        .select("id, product_id, sku, name, option_type, option_value, price, stock, moq, attribute_combination, is_active")
        .in("product_id", productIds)
        .eq("is_active", true);

      // Group variants
      const variantsByProduct = new Map<string, ProductVariantEAV[]>();
      (variantsData || []).forEach(v => {
        if (!variantsByProduct.has(v.product_id)) {
          variantsByProduct.set(v.product_id, []);
        }
        variantsByProduct.get(v.product_id)!.push({
          id: v.id,
          sku: v.sku,
          name: v.name,
          price: v.price || 0,
          stock: v.stock || 0,
          moq: v.moq || 1,
          attribute_combination: (v.attribute_combination as AttributeCombination) || {},
          product_id: v.product_id,
          is_active: v.is_active,
        });
      });

      // Map to ProductB2BCard
      const products: ProductB2BCard[] = parentProducts.slice(0, limit).map((p) => {
        const variants = variantsByProduct.get(p.id) || [];
        const attributeOptions = extractAttributeOptions(variants);
        const attributeTypes = Object.keys(attributeOptions);
        
        const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);
        const prices = variants.map(v => v.price).filter(price => price > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : p.precio_mayorista || 0;
        const maxPrice = prices.length > 0 ? Math.max(...prices) : minPrice;
        
        const precioMayorista = minPrice || p.precio_mayorista || 0;
        const precioSugerido = p.precio_sugerido_venta || Math.round(precioMayorista * 1.3 * 100) / 100;
        const imagen = p.imagen_principal || "/placeholder.svg";

        const variantInfos: ProductVariantInfo[] = variants.map(v => ({
          id: v.id,
          sku: v.sku,
          label: v.name,
          precio: v.price,
          stock: v.stock,
          option_type: Object.keys(v.attribute_combination)[0] || 'variant',
          parent_product_id: v.product_id,
          attribute_combination: v.attribute_combination,
        }));

        return {
          id: p.id,
          sku: p.sku_interno,
          nombre: p.nombre,
          precio_b2b: precioMayorista,
          precio_b2b_max: maxPrice !== minPrice ? maxPrice : undefined,
          precio_sugerido: precioSugerido,
          moq: p.moq || 1,
          stock_fisico: totalStock > 0 ? totalStock : p.stock_fisico || 0,
          imagen_principal: imagen,
          categoria_id: p.categoria_id || "",
          rating: p.rating,
          variant_count: variants.length,
          variant_ids: variants.map(v => v.id),
          variants: variantInfos,
          source_product_id: p.id,
          variant_type: attributeTypes[0] || 'unknown',
          variant_types: attributeTypes,
          has_grouped_variants: variants.length > 1,
          variants_by_type: Object.fromEntries(
            attributeTypes.map(type => [
              type,
              attributeOptions[type].map((value) => ({
                productId: `${p.id}-${type}-${value}`,
                label: value,
                code: value.toLowerCase().replace(/\s+/g, '-'),
                image: imagen,
                price: minPrice,
                stock: variants.filter(v => v.attribute_combination[type] === value)
                  .reduce((sum, v) => sum + v.stock, 0),
                type,
              }))
            ])
          ),
        };
      });

      return products;
    },
  });
};

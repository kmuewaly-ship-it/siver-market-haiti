import { supabase } from "@/integrations/supabase/client";
import { detectAttributeType, parseColorToHex } from "./useEAVAttributes";

export interface RawImportRow {
  [key: string]: string;
}

export interface DetectedAttribute {
  columnName: string;
  attributeName: string;
  type: 'color' | 'size' | 'technical' | 'select' | 'text';
  renderType: 'swatches' | 'chips' | 'dropdown' | 'buttons';
  categoryHint: string;
  uniqueValues: Set<string>;
}

export interface GroupedProduct {
  groupKey: string;
  parentName: string;
  baseSku: string;
  category?: string;
  supplier?: string;
  description?: string;
  variants: VariantRow[];
  detectedAttributes: DetectedAttribute[];
}

export interface VariantRow {
  originalRow: RawImportRow;
  sku: string;
  name: string;
  costBase: number;
  stock: number;
  moq: number;
  imageUrl?: string;
  sourceUrl?: string;
  attributeValues: Record<string, string>; // { color: 'red', size: 'M' }
}

// Standard product columns (not variant attributes)
const STANDARD_COLUMNS = [
  'sku', 'codigo', 'sku_interno', 'sku interno',
  'nombre', 'name', 'title', 'product name', 'nombre producto',
  'descripcion', 'description', 'desc', 'descripcion_corta',
  'costo', 'cost', 'precio', 'price', 'costo_base', 'costo base',
  'moq', 'minimo', 'min', 'cantidad_minima', 'moq_cantidad_minima',
  'stock', 'cantidad', 'qty', 'stock_fisico', 'inventory',
  'imagen', 'image', 'foto', 'url_imagen', 'url imagen', 'picture',
  'categoria', 'category', 'cat',
  'proveedor', 'supplier', 'vendor',
  'url', 'link', 'url_proveedor', 'url_origen', 'source_url',
  'parent_id', 'parent', 'padre', 'parent_sku',
  'brand', 'marca',
];

// Detect if a column is a variant attribute
const isAttributeColumn = (header: string): boolean => {
  const lower = header.toLowerCase().trim();
  return !STANDARD_COLUMNS.some(std => lower.includes(std) || std.includes(lower));
};

// Extract base SKU for grouping (remove variant suffixes)
const extractBaseSku = (sku: string): string => {
  // Common patterns: SKU-RED-M, SKU_001_L, SKU.Blue.XL
  const patterns = [
    /-[A-Z]{1,3}(-[A-Z0-9]+)*$/i,  // SKU-RED-M
    /_[A-Z]{1,3}(_[A-Z0-9]+)*$/i,  // SKU_RED_M
    /\.[A-Z]{1,3}(\.[A-Z0-9]+)*$/i, // SKU.RED.M
    /-\d{3,4}$/,                    // SKU-001
  ];

  let base = sku;
  for (const pattern of patterns) {
    base = base.replace(pattern, '');
  }
  return base || sku;
};

// Extract parent name by removing variant info
const extractParentName = (name: string): string => {
  // Remove common variant patterns from name
  const patterns = [
    /\s*[-–]\s*(small|medium|large|xl|xxl|s|m|l|xs|xxxl)\s*$/i,
    /\s*[-–]\s*(red|blue|green|black|white|pink|yellow|purple|orange|brown|grey|gray)\s*$/i,
    /\s*[-–]\s*\d+\s*(w|watts?|v|volts?|mah?)\s*$/i,
    /\s*\(.*\)\s*$/,  // Remove parenthetical info
    /\s*,\s*[A-Z]{1,3}\s*$/,  // Remove ", XL" suffix
  ];

  let cleanName = name;
  for (const pattern of patterns) {
    cleanName = cleanName.replace(pattern, '');
  }
  return cleanName.trim() || name;
};

// Main grouping function
export const groupProductsByParent = (
  rows: RawImportRow[],
  headers: string[],
  columnMapping: Record<string, string>
): { groups: GroupedProduct[]; detectedAttributeColumns: string[] } => {
  
  // Identify attribute columns
  const attributeColumns = headers.filter(h => {
    // Skip mapped standard columns
    const isMapped = Object.values(columnMapping).includes(h);
    if (isMapped) return false;
    return isAttributeColumn(h);
  });

  // Build detected attributes info
  const detectedAttrs: Record<string, DetectedAttribute> = {};
  attributeColumns.forEach(col => {
    const { type, render, categoryHint } = detectAttributeType(col);
    detectedAttrs[col] = {
      columnName: col,
      attributeName: col.toLowerCase().replace(/\s+/g, '_'),
      type,
      renderType: render,
      categoryHint,
      uniqueValues: new Set<string>(),
    };
  });

  // Group products
  const groups: Record<string, GroupedProduct> = {};

  rows.forEach(row => {
    const sku = row[columnMapping.sku_interno] || '';
    const name = row[columnMapping.nombre] || '';
    const parentId = row['parent_id'] || row['Parent_ID'] || row['parent'] || '';
    
    // Determine group key
    let groupKey: string;
    if (parentId) {
      groupKey = parentId;
    } else {
      // Try to extract base SKU or use clean name
      const baseSku = extractBaseSku(sku);
      const parentName = extractParentName(name);
      groupKey = baseSku || parentName;
    }

    if (!groupKey) groupKey = sku || name;

    // Initialize group if new
    if (!groups[groupKey]) {
      groups[groupKey] = {
        groupKey,
        parentName: extractParentName(name),
        baseSku: extractBaseSku(sku),
        category: row[columnMapping.categoria] || '',
        supplier: row[columnMapping.proveedor] || '',
        description: row[columnMapping.descripcion_corta] || '',
        variants: [],
        detectedAttributes: [],
      };
    }

    // Build attribute values for this row
    const attributeValues: Record<string, string> = {};
    attributeColumns.forEach(col => {
      const val = row[col]?.trim();
      if (val) {
        attributeValues[col] = val;
        detectedAttrs[col].uniqueValues.add(val);
      }
    });

    // Parse row data
    const costStr = row[columnMapping.costo_base] || '0';
    const stockStr = row[columnMapping.stock_fisico] || '0';
    const moqStr = row[columnMapping.moq] || '1';

    const variant: VariantRow = {
      originalRow: row,
      sku,
      name,
      costBase: parseFloat(costStr.replace(/[^0-9.-]/g, '')) || 0,
      stock: parseInt(stockStr.replace(/[^0-9]/g, ''), 10) || 0,
      moq: parseInt(moqStr.replace(/[^0-9]/g, ''), 10) || 1,
      imageUrl: row[columnMapping.url_imagen] || '',
      sourceUrl: row[columnMapping.url_origen] || '',
      attributeValues,
    };

    groups[groupKey].variants.push(variant);
  });

  // Finalize detected attributes for each group
  Object.values(groups).forEach(group => {
    group.detectedAttributes = attributeColumns
      .filter(col => {
        // Only include if this group has values for this attribute
        return group.variants.some(v => v.attributeValues[col]);
      })
      .map(col => detectedAttrs[col]);
  });

  return {
    groups: Object.values(groups),
    detectedAttributeColumns: attributeColumns,
  };
};

// Process and import grouped products with EAV
export const importGroupedProducts = async (
  groups: GroupedProduct[],
  categoryId: string | undefined,
  supplierId: string | undefined,
  priceCalculator: (cost: number) => number,
  onProgress?: (current: number, total: number, message: string) => void
): Promise<{ success: number; failed: number; errors: string[] }> => {
  
  let success = 0;
  let failed = 0;
  const errors: string[] = [];
  const total = groups.length;

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    onProgress?.(i + 1, total, `Importando: ${group.parentName}`);

    try {
      // 1. Create parent product
      const representativeVariant = group.variants[0];
      const totalStock = group.variants.reduce((sum, v) => sum + v.stock, 0);
      const minCost = Math.min(...group.variants.map(v => v.costBase));
      const b2bPrice = priceCalculator(minCost);

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          sku_interno: group.baseSku,
          nombre: group.parentName,
          descripcion_corta: group.description || null,
          categoria_id: categoryId || null,
          proveedor_id: supplierId || null,
          costo_base_excel: minCost,
          precio_mayorista: b2bPrice,
          moq: representativeVariant.moq,
          stock_fisico: totalStock,
          imagen_principal: representativeVariant.imageUrl || null,
          url_origen: representativeVariant.sourceUrl || null,
        })
        .select()
        .single();

      if (productError) {
        throw new Error(`Error creating product: ${productError.message}`);
      }

      // 2. Create/get attributes and options
      const attributeCache: Record<string, string> = {}; // name -> id
      const optionCache: Record<string, Record<string, string>> = {}; // attrId -> { value -> optionId }

      for (const detectedAttr of group.detectedAttributes) {
        // Get or create attribute
        let attrId = attributeCache[detectedAttr.attributeName];
        
        if (!attrId) {
          const { data: existingAttr } = await supabase
            .from('attributes')
            .select('id')
            .eq('slug', detectedAttr.attributeName)
            .single();

          if (existingAttr) {
            attrId = existingAttr.id;
          } else {
            const { data: newAttr, error: attrError } = await supabase
              .from('attributes')
              .insert({
                name: detectedAttr.attributeName,
                slug: detectedAttr.attributeName,
                display_name: detectedAttr.columnName,
                attribute_type: detectedAttr.type,
                render_type: detectedAttr.renderType,
                category_hint: detectedAttr.categoryHint,
              })
              .select()
              .single();

            if (attrError) throw attrError;
            attrId = newAttr.id;
          }
          attributeCache[detectedAttr.attributeName] = attrId;
        }

        optionCache[attrId] = {};

        // Create options for each unique value
        for (const value of detectedAttr.uniqueValues) {
          const valueSlug = value.toLowerCase().replace(/\s+/g, '_');
          
          const { data: existingOpt } = await supabase
            .from('attribute_options')
            .select('id')
            .eq('attribute_id', attrId)
            .eq('value', valueSlug)
            .single();

          if (existingOpt) {
            optionCache[attrId][value] = existingOpt.id;
          } else {
            const colorHex = detectedAttr.type === 'color' ? parseColorToHex(value) : undefined;
            
            const { data: newOpt, error: optError } = await supabase
              .from('attribute_options')
              .insert({
                attribute_id: attrId,
                value: valueSlug,
                display_value: value,
                color_hex: colorHex,
              })
              .select()
              .single();

            if (optError) throw optError;
            optionCache[attrId][value] = newOpt.id;
          }
        }
      }

      // 3. Create variants
      for (const variant of group.variants) {
        const variantPrice = priceCalculator(variant.costBase);
        const priceAdjustment = variantPrice - b2bPrice;

        // Build attribute combination JSON with readable values
        const attributeCombination: Record<string, string> = {};
        for (const [colName, value] of Object.entries(variant.attributeValues)) {
          const attr = group.detectedAttributes.find(a => a.columnName === colName);
          if (attr && value) {
            // Store human-readable key-value pairs (e.g., { color: "Rojo", size: "M" })
            attributeCombination[attr.attributeName] = value;
          }
        }

        // Build variant label from attribute values
        const variantLabel = Object.values(variant.attributeValues).join(' / ') || variant.sku;

        const { data: variantData, error: variantError } = await supabase
          .from('product_variants')
          .insert({
            product_id: product.id,
            sku: variant.sku,
            name: variantLabel,
            option_type: group.detectedAttributes[0]?.attributeName || 'variant',
            option_value: Object.values(variant.attributeValues)[0] || variant.sku,
            price: variantPrice,
            stock: variant.stock,
            moq: variant.moq,
            images: variant.imageUrl ? [variant.imageUrl] : [],
            attribute_combination: attributeCombination,
            cost_price: variant.costBase,
            price_adjustment: priceAdjustment,
          })
          .select()
          .single();

        if (variantError) {
          console.error('Variant error:', variantError);
          continue;
        }

        // 4. Link variant to attribute options
        for (const [colName, value] of Object.entries(variant.attributeValues)) {
          const attr = group.detectedAttributes.find(a => a.columnName === colName);
          if (attr) {
            const attrId = attributeCache[attr.attributeName];
            const optId = optionCache[attrId]?.[value];
            
            if (attrId && optId) {
              await supabase
                .from('variant_attribute_values')
                .insert({
                  variant_id: variantData.id,
                  attribute_id: attrId,
                  attribute_option_id: optId,
                })
                .select();
            }
          }
        }
      }

      success++;
    } catch (err) {
      failed++;
      errors.push(`${group.parentName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return { success, failed, errors };
};

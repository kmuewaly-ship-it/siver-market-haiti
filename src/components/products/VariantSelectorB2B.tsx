import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Package, Palette, Check, Ruler, Zap, Box, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProductVariantsWithAttributes } from "@/hooks/useEAVAttributes";

interface VariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
  option_type?: string;
  color_code?: string;
  parent_product_id?: string;
  image?: string;
}

interface VariantOption {
  productId: string;
  label: string;
  code?: string;
  image?: string;
  price: number;
  stock: number;
  type?: string;
}

interface VariantSelection {
  variantId: string;
  sku: string;
  label: string;
  quantity: number;
  price: number;
  colorLabel?: string;
}

interface VariantSelectorB2BProps {
  productId?: string; // For EAV-based loading
  variants: VariantInfo[];
  variantOptions?: VariantOption[]; // Unified variant options (age, color, size from grouped products)
  variantType?: string; // Primary type: 'color' | 'size' | 'age'
  colorOptions?: VariantOption[]; // Backwards compatibility
  basePrice: number;
  onSelectionChange?: (selections: VariantSelection[], totalQty: number, totalPrice: number) => void;
}

// Attribute type to render configuration
const ATTRIBUTE_RENDER_CONFIG: Record<string, {
  icon: typeof Palette;
  renderType: 'swatches' | 'chips' | 'buttons' | 'dropdown' | 'age';
  categoryHint: string;
  displayName: string;
}> = {
  color: { icon: Palette, renderType: 'swatches', categoryHint: 'fashion', displayName: 'Color' },
  size: { icon: Ruler, renderType: 'buttons', categoryHint: 'fashion', displayName: 'Talla' },
  talla: { icon: Ruler, renderType: 'buttons', categoryHint: 'fashion', displayName: 'Talla' },
  age: { icon: Ruler, renderType: 'age', categoryHint: 'kids', displayName: 'Edad' },
  age_group: { icon: Ruler, renderType: 'age', categoryHint: 'kids', displayName: 'Edad' },
  voltage: { icon: Zap, renderType: 'chips', categoryHint: 'electronics', displayName: 'Voltaje' },
  wattage: { icon: Zap, renderType: 'chips', categoryHint: 'electronics', displayName: 'Potencia' },
  capacity: { icon: Zap, renderType: 'chips', categoryHint: 'electronics', displayName: 'Capacidad' },
  material: { icon: Box, renderType: 'dropdown', categoryHint: 'general', displayName: 'Material' },
  style: { icon: Layers, renderType: 'chips', categoryHint: 'fashion', displayName: 'Estilo' },
  unknown: { icon: Package, renderType: 'buttons', categoryHint: 'general', displayName: 'Variante' },
};

/**
 * Adaptive Variant Selector for B2B products
 * Renders different controls based on attribute type:
 * - Fashion (color): Visual swatches with color circles
 * - Fashion (size): Size buttons
 * - Electronics: Technical chips (Watts, Voltage, mAh)
 */
const VariantSelectorB2B = ({
  productId,
  variants,
  variantOptions = [],
  variantType = 'unknown',
  colorOptions = [], // Backwards compatibility
  basePrice,
  onSelectionChange,
}: VariantSelectorB2BProps) => {
  // Merge variantOptions and colorOptions (prioritize variantOptions)
  const effectiveGroupedOptions = variantOptions.length > 0 ? variantOptions : colorOptions;
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  // Load EAV attributes if productId is provided
  const { data: eavVariants } = useProductVariantsWithAttributes(productId);

  // Keep ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Use EAV variants if available, otherwise use provided variants
  const effectiveVariants = useMemo(() => {
    if (eavVariants && eavVariants.length > 0) {
      return eavVariants.map(v => ({
        id: v.id,
        sku: v.sku,
        label: v.name || v.option_value,
        precio: v.price || basePrice,
        stock: v.stock,
        option_type: v.option_type,
        attributeValues: v.attributeValues,
      }));
    }
    return variants;
  }, [eavVariants, variants, basePrice]);

  // Auto-select first option if options exist
  useEffect(() => {
    if (effectiveGroupedOptions.length > 0 && !selectedColorId) {
      setSelectedColorId(effectiveGroupedOptions[0].productId);
    }
  }, [effectiveGroupedOptions, selectedColorId]);

  // Group variants by option_type
  const grouped = useMemo(() => {
    return effectiveVariants.reduce((acc, variant: any) => {
      // If variant has EAV attributeValues, group by each attribute
      if (variant.attributeValues && variant.attributeValues.length > 0) {
        variant.attributeValues.forEach((av: any) => {
          const attrType = av.attribute?.slug || av.attribute?.name || 'other';
          if (!acc[attrType]) {
            acc[attrType] = [];
          }
          // Avoid duplicates
          if (!acc[attrType].find((v: any) => v.id === variant.id)) {
            acc[attrType].push({
              ...variant,
              option_type: attrType,
              label: av.option?.display_value || variant.label,
              color_code: av.option?.color_hex,
            });
          }
        });
      } else {
        const type = variant.option_type || 'size';
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(variant);
      }
      return acc;
    }, {} as Record<string, any[]>);
  }, [effectiveVariants]);

  // Filter variants by selected grouped option
  const filteredVariants = useMemo(() => {
    if (effectiveGroupedOptions.length === 0 || !selectedColorId) {
      return effectiveVariants;
    }
    return effectiveVariants.filter((v: any) => v.parent_product_id === selectedColorId);
  }, [effectiveVariants, effectiveGroupedOptions, selectedColorId]);

  // Group filtered variants
  const filteredGrouped = useMemo(() => {
    return filteredVariants.reduce((acc, variant: any) => {
      const type = variant.option_type || 'size';
      // Skip if we already show this type in grouped options
      if (variantType === type && effectiveGroupedOptions.length > 0) return acc;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(variant);
      return acc;
    }, {} as Record<string, any[]>);
  }, [filteredVariants, effectiveGroupedOptions, variantType]);

  const optionTypes = Object.keys(filteredGrouped);
  const hasGroupedOptions = effectiveGroupedOptions.length > 1;
  const groupedConfig = ATTRIBUTE_RENDER_CONFIG[variantType] || ATTRIBUTE_RENDER_CONFIG.unknown;
  const hasOtherOptions = optionTypes.length > 0;

  // Calculate totals
  const totalQty = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = useMemo(() => {
    return Object.entries(selections).reduce((sum, [variantId, qty]) => {
      if (qty <= 0) return sum;
      const variant = effectiveVariants.find((v: any) => v.id === variantId);
      const color = colorOptions.find(c => c.productId === variantId);
      const price = (variant as any)?.precio || color?.price || basePrice;
      return sum + price * qty;
    }, 0);
  }, [selections, effectiveVariants, colorOptions, basePrice]);

  // Notify parent of changes
  useEffect(() => {
    if (onSelectionChangeRef.current) {
      const selectionsList: VariantSelection[] = Object.entries(selections)
        .filter(([_, qty]) => qty > 0)
        .map(([variantId, quantity]) => {
          const variant = effectiveVariants.find((v: any) => v.id === variantId);
          const color = colorOptions.find(c => c.productId === variantId);
          return {
            variantId,
            sku: (variant as any)?.sku || '',
            label: (variant as any)?.label || color?.label || '',
            quantity,
            price: (variant as any)?.precio || color?.price || basePrice,
            colorLabel: color?.label,
          };
        });
      onSelectionChangeRef.current(selectionsList, totalQty, totalPrice);
    }
  }, [selections, totalQty, totalPrice, effectiveVariants, colorOptions, basePrice]);

  const updateQuantity = (variantId: string, delta: number, maxStock: number) => {
    setSelections((prev) => {
      const current = prev[variantId] || 0;
      let newQty = current + delta;
      newQty = Math.max(0, Math.min(maxStock, newQty));
      return { ...prev, [variantId]: newQty };
    });
  };

  // Sort variants naturally
  const sortVariants = (variantList: any[]) => {
    return [...variantList].sort((a, b) => {
      const numA = parseInt(a.label?.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.label?.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return (a.label || '').localeCompare(b.label || '');
    });
  };

  // Get render config for option type
  const getRenderConfig = (type: string) => {
    const lower = type.toLowerCase();
    return ATTRIBUTE_RENDER_CONFIG[lower] || ATTRIBUTE_RENDER_CONFIG.unknown;
  };

  // Render color swatches (visual circles/images)
  const renderColorSwatches = (variants: any[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isSelected = selectedColorId === variant.id;
          const outOfStock = variant.stock === 0;
          const colorHex = variant.color_code;
          
          return (
            <button
              key={variant.id}
              onClick={() => !outOfStock && setSelectedColorId(variant.id)}
              disabled={outOfStock}
              className={cn(
                "relative w-10 h-10 rounded-full border-2 transition-all",
                "flex items-center justify-center overflow-hidden",
                isSelected 
                  ? "border-primary ring-2 ring-primary/30" 
                  : "border-border hover:border-primary/50",
                outOfStock && "opacity-40 cursor-not-allowed"
              )}
              title={variant.label}
            >
              {colorHex ? (
                <div 
                  className="w-full h-full rounded-full"
                  style={{ backgroundColor: colorHex }}
                />
              ) : variant.image ? (
                <img 
                  src={variant.image} 
                  alt={variant.label}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-[10px] font-bold">
                  {variant.label?.charAt(0)?.toUpperCase()}
                </span>
              )}
              {isSelected && (
                <Check className="absolute w-4 h-4 text-white drop-shadow-md" />
              )}
              {outOfStock && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-destructive">X</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Render technical chips (for electronics: voltage, watts, etc.)
  const renderTechnicalChips = (variants: any[], type: string) => {
    const config = getRenderConfig(type);
    const Icon = config.icon;
    
    return (
      <div className="space-y-2">
        {sortVariants(variants).map((variant) => {
          const qty = selections[variant.id] || 0;
          const price = variant.precio || basePrice;
          const outOfStock = variant.stock === 0;

          return (
            <div
              key={variant.id}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded-md transition-colors",
                qty > 0 ? "bg-primary/10 border border-primary/30" : "bg-background border border-border/50",
                outOfStock && "opacity-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-xs">
                    <Icon className="w-3 h-3 mr-1" />
                    {variant.label}
                  </Badge>
                  {outOfStock && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Agotado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-semibold text-primary">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {variant.stock} disp.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(variant.id, -1, variant.stock)}
                  disabled={qty === 0 || outOfStock}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-10 text-center text-sm font-semibold">
                  {qty}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(variant.id, 1, variant.stock)}
                  disabled={outOfStock || qty >= variant.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render size buttons (compact buttons for sizes)
  const renderSizeButtons = (variants: any[]) => {
    return (
      <div className="space-y-2">
        {sortVariants(variants).map((variant) => {
          const qty = selections[variant.id] || 0;
          const price = variant.precio || basePrice;
          const outOfStock = variant.stock === 0;

          return (
            <div
              key={variant.id}
              className={cn(
                "flex items-center justify-between gap-2 p-2 rounded-md transition-colors",
                qty > 0 ? "bg-primary/10 border border-primary/30" : "bg-background border border-transparent",
                outOfStock && "opacity-50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-foreground min-w-[40px] px-2 py-1 bg-muted rounded">
                    {variant.label || variant.sku?.split('-').pop() || `#${variants.indexOf(variant) + 1}`}
                  </span>
                  {outOfStock && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Agotado
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-primary">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {variant.stock} disp.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(variant.id, -1, variant.stock)}
                  disabled={qty === 0 || outOfStock}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-10 text-center text-sm font-semibold">
                  {qty}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(variant.id, 1, variant.stock)}
                  disabled={outOfStock || qty >= variant.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render variants based on attribute type
  const renderVariantsByType = (type: string, variants: any[]) => {
    const config = getRenderConfig(type);
    
    switch (config.renderType) {
      case 'swatches':
        return renderColorSwatches(variants);
      case 'chips':
        return renderTechnicalChips(variants, type);
      case 'buttons':
      default:
        return renderSizeButtons(variants);
    }
  };

  if (!effectiveVariants || effectiveVariants.length === 0) {
    // If only grouped options exist (no product_variants)
    if (effectiveGroupedOptions.length > 0) {
      const GroupedIcon = groupedConfig.icon;
      return (
        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <GroupedIcon className="w-4 h-4 text-primary" />
              {groupedConfig.displayName}
              <Badge variant="secondary" className="text-[10px]">
                {effectiveGroupedOptions.length} opciones
              </Badge>
            </h4>
            {variantType === 'color' 
              ? renderColorSwatches(effectiveGroupedOptions.map(c => ({
                  id: c.productId,
                  label: c.label,
                  color_code: c.code,
                  image: c.image,
                  stock: c.stock,
                  precio: c.price,
                })))
              : renderSizeButtons(effectiveGroupedOptions.map(c => ({
                  id: c.productId,
                  label: c.label,
                  stock: c.stock,
                  precio: c.price,
                  sku: c.productId,
                })))
            }
          </div>

          {/* Summary */}
          {totalQty > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="font-medium">{totalQty} unidades</span>
                </div>
                <div className="text-lg font-bold text-primary">
                  ${totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Primary Grouped Options Selector (Age, Color, Size from grouped products) */}
      {hasGroupedOptions && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <groupedConfig.icon className="w-4 h-4 text-primary" />
            {groupedConfig.displayName}
            <Badge variant="secondary" className="text-[10px]">
              {effectiveGroupedOptions.length} opciones
            </Badge>
          </h4>
          
          {variantType === 'color' ? (
            <div className="flex flex-wrap gap-2">
              {effectiveGroupedOptions.map((option) => {
                const isSelected = selectedColorId === option.productId;
                const outOfStock = option.stock === 0;
                
                return (
                  <button
                    key={option.productId}
                    onClick={() => !outOfStock && setSelectedColorId(option.productId)}
                    disabled={outOfStock}
                    className={cn(
                      "relative w-10 h-10 rounded-full border-2 transition-all",
                      "flex items-center justify-center overflow-hidden",
                      isSelected 
                        ? "border-primary ring-2 ring-primary/30" 
                        : "border-border hover:border-primary/50",
                      outOfStock && "opacity-40 cursor-not-allowed"
                    )}
                    title={option.label}
                  >
                    {option.code ? (
                      <div 
                        className="w-full h-full rounded-full"
                        style={{ backgroundColor: option.code }}
                      />
                    ) : option.image ? (
                      <img 
                        src={option.image} 
                        alt={option.label}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <span className="text-[10px] font-bold">
                        {option.label?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="absolute w-4 h-4 text-white drop-shadow-md" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Age, Size, or other grouped options - render as buttons with quantity */
            <div className="flex flex-wrap gap-2">
              {effectiveGroupedOptions.map((option) => {
                const isSelected = selectedColorId === option.productId;
                const outOfStock = option.stock === 0;
                
                return (
                  <button
                    key={option.productId}
                    onClick={() => !outOfStock && setSelectedColorId(option.productId)}
                    disabled={outOfStock}
                    className={cn(
                      "px-3 py-2 rounded-md border-2 transition-all text-sm font-medium",
                      isSelected 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border bg-background hover:border-primary/50",
                      outOfStock && "opacity-40 cursor-not-allowed line-through"
                    )}
                    title={`${option.label} - ${option.stock} disponibles`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          )}
          
          {selectedColorId && (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium">{effectiveGroupedOptions.find(c => c.productId === selectedColorId)?.label}</span>
              {' · '}{effectiveGroupedOptions.find(c => c.productId === selectedColorId)?.stock || 0} disponibles
              {' · '}${(effectiveGroupedOptions.find(c => c.productId === selectedColorId)?.price || basePrice).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* Other Option Types from product_variants (Size, Material, Voltage, etc.) */}
      {optionTypes.map((type) => {
        const typeVariants = filteredGrouped[type];
        if (!typeVariants || typeVariants.length === 0) return null;
        
        const config = getRenderConfig(type);
        const Icon = config.icon;
        
        return (
          <div key={type} className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Icon className="w-4 h-4 text-primary" />
              {config.displayName}
              <Badge variant="secondary" className="text-[10px]">
                {typeVariants.length} opciones
              </Badge>
              {config.categoryHint === 'electronics' && (
                <Badge variant="outline" className="text-[9px] ml-auto">
                  Técnico
                </Badge>
              )}
            </h4>
            
            {renderVariantsByType(type, typeVariants)}
          </div>
        );
      })}

      {/* Summary */}
      {totalQty > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">{totalQty} unidades</span>
              <span className="text-muted-foreground">
                ({Object.values(selections).filter(q => q > 0).length} variantes)
              </span>
            </div>
            <div className="text-lg font-bold text-primary">
              ${totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelectorB2B;

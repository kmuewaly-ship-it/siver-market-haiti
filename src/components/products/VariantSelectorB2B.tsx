import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Package, Palette, Check, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
  option_type?: string; // 'color', 'size', etc.
  color_code?: string; // For color variants
  parent_product_id?: string; // Which product this variant belongs to
  image?: string; // Image for color variants
}

interface ColorOption {
  productId: string;
  label: string;
  code?: string;
  image?: string;
  price: number;
  stock: number;
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
  variants: VariantInfo[];
  colorOptions?: ColorOption[];
  basePrice: number;
  onSelectionChange?: (selections: VariantSelection[], totalQty: number, totalPrice: number) => void;
}

/**
 * Professional Variant Selector for B2B products
 * Handles multiple option types (color, size, material, etc.)
 * Style inspired by AliExpress/Shein wholesale interface
 */
const VariantSelectorB2B = ({
  variants,
  colorOptions = [],
  basePrice,
  onSelectionChange,
}: VariantSelectorB2BProps) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  // Keep ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Auto-select first color if colors exist
  useEffect(() => {
    if (colorOptions.length > 0 && !selectedColorId) {
      setSelectedColorId(colorOptions[0].productId);
    }
  }, [colorOptions, selectedColorId]);

  // Group variants by option_type
  const grouped = useMemo(() => {
    return variants.reduce((acc, variant) => {
      const type = variant.option_type || 'size';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(variant);
      return acc;
    }, {} as Record<string, VariantInfo[]>);
  }, [variants]);

  // Filter variants by selected color (if colors exist)
  const filteredVariants = useMemo(() => {
    if (colorOptions.length === 0 || !selectedColorId) {
      return variants;
    }
    return variants.filter(v => v.parent_product_id === selectedColorId);
  }, [variants, colorOptions, selectedColorId]);

  // Group filtered variants by option_type
  const filteredGrouped = useMemo(() => {
    return filteredVariants.reduce((acc, variant) => {
      const type = variant.option_type || 'size';
      // Skip color type if we have separate color options
      if (type === 'color' && colorOptions.length > 0) return acc;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(variant);
      return acc;
    }, {} as Record<string, VariantInfo[]>);
  }, [filteredVariants, colorOptions]);

  const optionTypes = Object.keys(filteredGrouped);
  const hasColorOptions = colorOptions.length > 1;
  const hasOtherOptions = optionTypes.length > 0;

  // Calculate totals
  const totalQty = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = useMemo(() => {
    return Object.entries(selections).reduce((sum, [variantId, qty]) => {
      if (qty <= 0) return sum;
      const variant = variants.find(v => v.id === variantId);
      const color = colorOptions.find(c => c.productId === variantId);
      const price = variant?.precio || color?.price || basePrice;
      return sum + price * qty;
    }, 0);
  }, [selections, variants, colorOptions, basePrice]);

  // Notify parent of changes
  useEffect(() => {
    if (onSelectionChangeRef.current) {
      const selectionsList: VariantSelection[] = Object.entries(selections)
        .filter(([_, qty]) => qty > 0)
        .map(([variantId, quantity]) => {
          const variant = variants.find(v => v.id === variantId);
          const color = colorOptions.find(c => c.productId === variantId);
          return {
            variantId,
            sku: variant?.sku || '',
            label: variant?.label || color?.label || '',
            quantity,
            price: variant?.precio || color?.price || basePrice,
            colorLabel: color?.label,
          };
        });
      onSelectionChangeRef.current(selectionsList, totalQty, totalPrice);
    }
  }, [selections, totalQty, totalPrice, variants, colorOptions, basePrice]);

  const updateQuantity = (variantId: string, delta: number, maxStock: number) => {
    setSelections((prev) => {
      const current = prev[variantId] || 0;
      let newQty = current + delta;
      newQty = Math.max(0, Math.min(maxStock, newQty));
      return { ...prev, [variantId]: newQty };
    });
  };

  // Sort variants by label (natural sort for sizes)
  const sortVariants = (variantList: VariantInfo[]) => {
    return [...variantList].sort((a, b) => {
      const numA = parseInt(a.label.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.label.replace(/\D/g, '')) || 0;
      if (numA !== numB) return numA - numB;
      return a.label.localeCompare(b.label);
    });
  };

  // Get display name for option type
  const getOptionTypeName = (type: string): string => {
    const names: Record<string, string> = {
      'color': 'Color',
      'size': 'Talla',
      'talla': 'Talla',
      'material': 'Material',
      'style': 'Estilo',
    };
    return names[type.toLowerCase()] || type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Get icon for option type
  const getOptionIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t === 'color') return <Palette className="w-4 h-4 text-primary" />;
    if (t === 'size' || t === 'talla') return <Ruler className="w-4 h-4 text-primary" />;
    return <Package className="w-4 h-4 text-primary" />;
  };

  if (!variants || variants.length === 0) {
    // If only color options exist (no size variants)
    if (colorOptions.length > 0) {
      return (
        <div className="space-y-4">
          {/* Color Options Only */}
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Color
              <Badge variant="secondary" className="text-[10px]">
                {colorOptions.length} opciones
              </Badge>
            </h4>
            
            <div className="space-y-2">
              {colorOptions.map((color) => {
                const qty = selections[color.productId] || 0;
                const outOfStock = color.stock === 0;

                return (
                  <div
                    key={color.productId}
                    className={cn(
                      "flex items-center justify-between gap-2 p-2 rounded-md transition-colors",
                      qty > 0 ? "bg-primary/10 border border-primary/30" : "bg-background border border-transparent",
                      outOfStock && "opacity-50"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-foreground">
                          {color.label}
                        </span>
                        {outOfStock && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Agotado
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-primary">
                          ${color.price.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {color.stock} disp.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(color.productId, -1, color.stock)}
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
                        onClick={() => updateQuantity(color.productId, 1, color.stock)}
                        disabled={outOfStock || qty >= color.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
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
      {/* Color Selector (if multiple colors) */}
      {hasColorOptions && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            Color
            <Badge variant="secondary" className="text-[10px]">
              {colorOptions.length} colores
            </Badge>
          </h4>
          
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => {
              const isSelected = selectedColorId === color.productId;
              const outOfStock = color.stock === 0;
              
              return (
                <button
                  key={color.productId}
                  onClick={() => !outOfStock && setSelectedColorId(color.productId)}
                  disabled={outOfStock}
                  className={cn(
                    "relative px-3 py-2 rounded-md text-sm font-medium transition-all",
                    "border-2 min-w-[60px]",
                    isSelected 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border bg-background hover:border-primary/50",
                    outOfStock && "opacity-50 cursor-not-allowed line-through"
                  )}
                >
                  {color.label}
                  {isSelected && (
                    <Check className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white rounded-full p-0.5" />
                  )}
                </button>
              );
            })}
          </div>
          
          {selectedColorId && (
            <div className="mt-2 text-xs text-muted-foreground">
              {colorOptions.find(c => c.productId === selectedColorId)?.stock || 0} disponibles en este color
            </div>
          )}
        </div>
      )}

      {/* Other Option Types (Size, Material, etc.) */}
      {optionTypes.map((type) => {
        const typeVariants = sortVariants(filteredGrouped[type]);
        if (typeVariants.length === 0) return null;
        
        return (
          <div key={type} className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              {getOptionIcon(type)}
              {getOptionTypeName(type)}
              <Badge variant="secondary" className="text-[10px]">
                {typeVariants.length} opciones
              </Badge>
            </h4>
            
            <div className="space-y-2">
              {typeVariants.map((variant) => {
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
                        <span className="font-bold text-sm text-foreground min-w-[40px]">
                          {variant.label || variant.sku.split('-').pop() || `Opción ${typeVariants.indexOf(variant) + 1}`}
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

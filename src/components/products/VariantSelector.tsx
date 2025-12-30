import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useGroupedVariants, ProductVariant, AttributeCombination } from "@/hooks/useProductVariants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Package, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantSelection {
  variantId: string;
  quantity: number;
}

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  baseImage?: string;
  isB2B?: boolean;
  onSelectionChange?: (selections: VariantSelection[], totalQty: number, totalPrice: number) => void;
  onVariantImageChange?: (imageUrl: string | null) => void;
}

// Attribute display configuration
const ATTRIBUTE_CONFIG: Record<string, { displayName: string; order: number }> = {
  color: { displayName: 'Color', order: 1 },
  size: { displayName: 'Talla', order: 2 },
  talla: { displayName: 'Talla', order: 2 },
  age: { displayName: 'Edad', order: 3 },
  edad: { displayName: 'Edad', order: 3 },
  model: { displayName: 'Modelo', order: 4 },
  modelo: { displayName: 'Modelo', order: 4 },
  voltage: { displayName: 'Voltaje', order: 5 },
  watts: { displayName: 'Watts', order: 6 },
  material: { displayName: 'Material', order: 7 },
};

// Color hex mapping
const COLOR_HEX_MAP: Record<string, string> = {
  rojo: '#EF4444', red: '#EF4444',
  azul: '#3B82F6', blue: '#3B82F6',
  verde: '#22C55E', green: '#22C55E',
  negro: '#1F2937', black: '#1F2937',
  blanco: '#F9FAFB', white: '#F9FAFB',
  amarillo: '#EAB308', yellow: '#EAB308',
  naranja: '#F97316', orange: '#F97316',
  rosa: '#EC4899', pink: '#EC4899',
  morado: '#A855F7', purple: '#A855F7',
  gris: '#6B7280', gray: '#6B7280', grey: '#6B7280',
  cafe: '#92400E', marron: '#92400E', brown: '#92400E',
  beige: '#D4B896',
  coral: '#FF7F50',
  turquesa: '#40E0D0', turquoise: '#40E0D0',
};

const getColorHex = (colorName: string): string | null => {
  const normalized = colorName.toLowerCase().trim();
  return COLOR_HEX_MAP[normalized] || null;
};

const VariantSelector = ({
  productId,
  basePrice,
  baseImage,
  isB2B = false,
  onSelectionChange,
  onVariantImageChange,
}: VariantSelectorProps) => {
  const { grouped, variants, isLoading } = useGroupedVariants(productId);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onVariantImageChangeRef = useRef(onVariantImageChange);
  
  // Keep ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onVariantImageChangeRef.current = onVariantImageChange;
  }, [onSelectionChange, onVariantImageChange]);

  // Extract attribute options from EAV data
  const attributeOptions = useMemo(() => {
    if (!variants || variants.length === 0) return {};
    
    const options: Record<string, Set<string>> = {};
    
    variants.forEach(v => {
      const combo = v.attribute_combination;
      if (combo && typeof combo === 'object') {
        Object.entries(combo).forEach(([key, value]) => {
          if (value) {
            if (!options[key]) options[key] = new Set();
            options[key].add(value);
          }
        });
      }
      // Fallback to option_type/option_value
      if (v.option_type && v.option_value) {
        const key = v.option_type.toLowerCase();
        if (!options[key]) options[key] = new Set();
        options[key].add(v.option_value);
      }
    });
    
    return Object.fromEntries(
      Object.entries(options).map(([key, set]) => [key, Array.from(set)])
    );
  }, [variants]);

  // Check if we have EAV attributes
  const hasEAVAttributes = Object.keys(attributeOptions).length > 0;

  // Sort attribute types by configured order
  const orderedAttributeTypes = useMemo(() => {
    return Object.keys(attributeOptions).sort((a, b) => {
      const orderA = ATTRIBUTE_CONFIG[a.toLowerCase()]?.order ?? 99;
      const orderB = ATTRIBUTE_CONFIG[b.toLowerCase()]?.order ?? 99;
      return orderA - orderB;
    });
  }, [attributeOptions]);

  // Get available options for an attribute (considering dependencies)
  const getAvailableOptions = useCallback((attrType: string): string[] => {
    const allOptions = attributeOptions[attrType] || [];
    if (!variants) return allOptions;
    
    // Filter based on current selections
    const availableSet = new Set<string>();
    
    variants.forEach(v => {
      const combo = v.attribute_combination;
      if (!combo) return;
      
      // Check if this variant matches all current selections (except the one we're filtering)
      let matches = true;
      for (const [key, value] of Object.entries(selectedAttributes)) {
        if (key !== attrType && combo[key] !== value) {
          matches = false;
          break;
        }
      }
      
      if (matches && combo[attrType]) {
        availableSet.add(combo[attrType]);
      }
    });
    
    return allOptions.filter(opt => availableSet.has(opt));
  }, [attributeOptions, variants, selectedAttributes]);

  // Find matching variant for current selections
  const matchingVariant = useMemo(() => {
    if (!variants || Object.keys(selectedAttributes).length === 0) return null;
    
    return variants.find(v => {
      const combo = v.attribute_combination;
      if (!combo) return false;
      
      for (const [key, value] of Object.entries(selectedAttributes)) {
        if (combo[key] !== value) return false;
      }
      return true;
    });
  }, [variants, selectedAttributes]);

  // Update image when matching variant changes
  useEffect(() => {
    if (onVariantImageChangeRef.current && matchingVariant) {
      const variantImage = matchingVariant.images?.[0] || null;
      onVariantImageChangeRef.current(variantImage || baseImage || null);
    }
  }, [matchingVariant, baseImage]);

  // Calculate totals
  const totalQty = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = variants?.reduce((sum, v) => {
    const qty = selections[v.id] || 0;
    const price = v.price ?? basePrice;
    return sum + price * qty;
  }, 0) || 0;

  // Notify parent of changes
  useEffect(() => {
    if (onSelectionChangeRef.current && variants) {
      const selectionsList = Object.entries(selections)
        .filter(([_, qty]) => qty > 0)
        .map(([variantId, quantity]) => ({ variantId, quantity }));
      onSelectionChangeRef.current(selectionsList, totalQty, totalPrice);
    }
  }, [selections, totalQty, totalPrice, variants]);

  const updateQuantity = (variantId: string, delta: number, variant: ProductVariant) => {
    setSelections((prev) => {
      const current = prev[variantId] || 0;
      let newQty = current + delta;
      newQty = Math.max(0, Math.min(variant.stock, newQty));
      return { ...prev, [variantId]: newQty };
    });
  };

  const handleAttributeSelect = (attrType: string, value: string) => {
    setSelectedAttributes(prev => {
      const newAttrs = { ...prev, [attrType]: value };
      
      // Clear downstream selections when a parent attribute changes
      const typeIndex = orderedAttributeTypes.indexOf(attrType);
      orderedAttributeTypes.forEach((type, idx) => {
        if (idx > typeIndex) {
          delete newAttrs[type];
        }
      });
      
      return newAttrs;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-muted/50 rounded-lg animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!variants || variants.length === 0) {
    return null;
  }

  const optionTypes = Object.keys(grouped);

  // Render EAV-based hierarchical selector if we have attribute_combination
  if (hasEAVAttributes && orderedAttributeTypes.length > 0) {
    return (
      <div className="space-y-4">
        {/* Attribute Selectors */}
        {orderedAttributeTypes.map((attrType, idx) => {
          const availableOptions = getAvailableOptions(attrType);
          const selectedValue = selectedAttributes[attrType];
          const displayName = ATTRIBUTE_CONFIG[attrType.toLowerCase()]?.displayName || attrType;
          const isColor = attrType.toLowerCase() === 'color';
          
          // Only show if previous attributes are selected (except first)
          const prevAttr = orderedAttributeTypes[idx - 1];
          if (idx > 0 && prevAttr && !selectedAttributes[prevAttr]) {
            return null;
          }

          return (
            <div key={attrType} className="p-3 bg-muted/30 rounded-lg border border-border/50">
              <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                {displayName}
              </h4>
              <div className={cn(
                "flex flex-wrap gap-2",
                isColor && "gap-1.5"
              )}>
                {availableOptions.map(option => {
                  const isSelected = selectedValue === option;
                  const colorHex = isColor ? getColorHex(option) : null;
                  
                  // Get stock for this option
                  const optionStock = variants?.reduce((sum, v) => {
                    const combo = v.attribute_combination;
                    if (combo?.[attrType] === option) {
                      // Check if matches other selections
                      let matches = true;
                      for (const [key, val] of Object.entries(selectedAttributes)) {
                        if (key !== attrType && combo[key] !== val) {
                          matches = false;
                          break;
                        }
                      }
                      if (matches) return sum + v.stock;
                    }
                    return sum;
                  }, 0) || 0;
                  
                  const isOutOfStock = optionStock === 0;

                  if (isColor && colorHex) {
                    return (
                      <button
                        key={option}
                        onClick={() => !isOutOfStock && handleAttributeSelect(attrType, option)}
                        disabled={isOutOfStock}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all relative",
                          isSelected ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border hover:border-primary/50",
                          isOutOfStock && "opacity-40 cursor-not-allowed"
                        )}
                        style={{ backgroundColor: colorHex }}
                        title={`${option}${isOutOfStock ? ' (Agotado)' : ''}`}
                      >
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-0.5 bg-destructive rotate-45 rounded" />
                          </div>
                        )}
                      </button>
                    );
                  }

                  return (
                    <Button
                      key={option}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => !isOutOfStock && handleAttributeSelect(attrType, option)}
                      disabled={isOutOfStock}
                      className={cn(
                        "h-8 px-3 text-xs",
                        isOutOfStock && "opacity-50 line-through"
                      )}
                    >
                      {option}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Show matching variant with quantity control */}
        {matchingVariant && (
          <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              {/* Variant image thumbnail */}
              {matchingVariant.images?.[0] && (
                <img 
                  src={matchingVariant.images[0]} 
                  alt={matchingVariant.name}
                  className="w-12 h-12 object-cover rounded-lg border border-border"
                />
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {Object.values(selectedAttributes).join(' / ')}
                  </span>
                  {matchingVariant.stock === 0 && (
                    <Badge variant="secondary" className="text-xs">Agotado</Badge>
                  )}
                  {isB2B && matchingVariant.moq > 1 && (
                    <Badge variant="outline" className="text-xs">Min:{matchingVariant.moq}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-bold text-primary">
                    ${(matchingVariant.price ?? basePrice).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    · {matchingVariant.stock} disp.
                  </span>
                </div>
              </div>

              {/* Quantity controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(matchingVariant.id, -1, matchingVariant)}
                  disabled={(selections[matchingVariant.id] || 0) === 0 || matchingVariant.stock === 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-10 text-center text-sm font-semibold">
                  {selections[matchingVariant.id] || 0}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => updateQuantity(matchingVariant.id, 1, matchingVariant)}
                  disabled={matchingVariant.stock === 0 || (selections[matchingVariant.id] || 0) >= matchingVariant.stock}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

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

  // Fallback: Original grouped by option_type display
  return (
    <div className="space-y-3">
      {optionTypes.map((type) => (
        <div key={type} className="p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 capitalize">
            {type === "size" ? "Talla" : type === "color" ? "Color" : type === "age" ? "Edad" : type}
          </h4>
          <div className="space-y-1.5 sm:space-y-2">
            {grouped[type].map((variant) => {
              const qty = selections[variant.id] || 0;
              const price = variant.price ?? basePrice;
              const hasPromo = variant.precio_promocional && variant.precio_promocional < price;
              const displayPrice = hasPromo ? variant.precio_promocional : price;
              const outOfStock = variant.stock === 0;

              return (
                <div
                  key={variant.id}
                  className={cn(
                    "flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-md transition-colors",
                    qty > 0 ? "bg-primary/10 border border-primary/20" : "bg-background",
                    outOfStock && "opacity-50"
                  )}
                >
                  {/* Variant image if available */}
                  {variant.images?.[0] && (
                    <img 
                      src={variant.images[0]} 
                      alt={variant.option_value}
                      className="w-10 h-10 object-cover rounded border border-border flex-shrink-0"
                    />
                  )}
                  
                  {/* Left: Variant info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="font-medium text-xs sm:text-sm text-foreground truncate max-w-[80px] sm:max-w-none">
                        {variant.option_value}
                      </span>
                      {outOfStock && (
                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1 py-0">
                          Agotado
                        </Badge>
                      )}
                      {isB2B && variant.moq > 1 && (
                        <Badge variant="outline" className="text-[10px] sm:text-xs px-1 py-0">
                          Min:{variant.moq}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                      <span className="text-xs sm:text-sm font-bold text-primary">
                        ${displayPrice?.toFixed(2)}
                      </span>
                      {hasPromo && (
                        <span className="text-[10px] sm:text-xs text-muted-foreground line-through">
                          ${price.toFixed(2)}
                        </span>
                      )}
                      <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">
                        · {variant.stock} disp.
                      </span>
                    </div>
                  </div>

                  {/* Right: Quantity controls */}
                  <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => updateQuantity(variant.id, -1, variant)}
                      disabled={qty === 0 || outOfStock}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <div className="w-7 sm:w-10 text-center text-xs sm:text-sm font-semibold">
                      {qty}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => updateQuantity(variant.id, 1, variant)}
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
      ))}

      {/* Summary */}
      {totalQty > 0 && (
        <div className="p-2 sm:p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span className="font-medium">{totalQty} uds</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-primary">
              ${totalPrice.toFixed(2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;

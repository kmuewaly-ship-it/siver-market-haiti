import { useState, useEffect, useCallback, useRef } from "react";
import { useGroupedVariants, ProductVariant } from "@/hooks/useProductVariants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantSelection {
  variantId: string;
  quantity: number;
}

interface VariantSelectorProps {
  productId: string;
  basePrice: number;
  isB2B?: boolean;
  onSelectionChange?: (selections: VariantSelection[], totalQty: number, totalPrice: number) => void;
}

const VariantSelector = ({
  productId,
  basePrice,
  isB2B = false,
  onSelectionChange,
}: VariantSelectorProps) => {
  const { grouped, variants, isLoading } = useGroupedVariants(productId);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  // Keep ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Calculate totals
  const totalQty = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = variants?.reduce((sum, v) => {
    const qty = selections[v.id] || 0;
    const price = v.price ?? basePrice;
    return sum + price * qty;
  }, 0) || 0;

  // Notify parent of changes - using ref to avoid dependency loop
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
      const minQty = isB2B ? variant.moq : 0;
      let newQty = current + delta;

      // For B2B: if going from 0, jump to MOQ
      if (isB2B && current === 0 && delta > 0) {
        newQty = variant.moq;
      }
      // For B2B: if going below MOQ, go to 0
      if (isB2B && newQty < variant.moq && newQty > 0) {
        newQty = 0;
      }
      // Normal: ensure >= 0 and <= stock
      newQty = Math.max(0, Math.min(variant.stock, newQty));

      return { ...prev, [variantId]: newQty };
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

  return (
    <div className="space-y-3">
      {optionTypes.map((type) => (
        <div key={type} className="p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/50">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-3 capitalize">
            {type === "size" ? "Talla" : type === "color" ? "Color" : type}
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
                  {/* Left: Variant info - optimized for mobile */}
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

                  {/* Right: Quantity controls - compact on mobile */}
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

      {/* Summary - compact on mobile */}
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

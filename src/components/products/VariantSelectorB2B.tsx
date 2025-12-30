import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface VariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
}

interface VariantSelection {
  variantId: string;
  sku: string;
  label: string;
  quantity: number;
  price: number;
}

interface VariantSelectorB2BProps {
  variants: VariantInfo[];
  basePrice: number;
  onSelectionChange?: (selections: VariantSelection[], totalQty: number, totalPrice: number) => void;
}

/**
 * Variant Selector for B2B products grouped by SKU
 * Shows all size/variant options with quantity controls for each
 * Style inspired by AliExpress/Shein wholesale interface
 */
const VariantSelectorB2B = ({
  variants,
  basePrice,
  onSelectionChange,
}: VariantSelectorB2BProps) => {
  const [selections, setSelections] = useState<Record<string, number>>({});
  const onSelectionChangeRef = useRef(onSelectionChange);
  
  // Keep ref updated
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Calculate totals
  const totalQty = Object.values(selections).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = variants.reduce((sum, v) => {
    const qty = selections[v.id] || 0;
    const price = v.precio || basePrice;
    return sum + price * qty;
  }, 0);

  // Notify parent of changes
  useEffect(() => {
    if (onSelectionChangeRef.current) {
      const selectionsList: VariantSelection[] = Object.entries(selections)
        .filter(([_, qty]) => qty > 0)
        .map(([variantId, quantity]) => {
          const variant = variants.find(v => v.id === variantId);
          return {
            variantId,
            sku: variant?.sku || '',
            label: variant?.label || '',
            quantity,
            price: variant?.precio || basePrice,
          };
        });
      onSelectionChangeRef.current(selectionsList, totalQty, totalPrice);
    }
  }, [selections, totalQty, totalPrice, variants, basePrice]);

  const updateQuantity = (variantId: string, delta: number, variant: VariantInfo) => {
    setSelections((prev) => {
      const current = prev[variantId] || 0;
      let newQty = current + delta;

      // Ensure quantity is within valid range (0 to stock)
      newQty = Math.max(0, Math.min(variant.stock, newQty));

      return { ...prev, [variantId]: newQty };
    });
  };

  if (!variants || variants.length === 0) {
    return null;
  }

  // Sort variants by label (natural sort for sizes)
  const sortedVariants = [...variants].sort((a, b) => {
    // Try to extract numeric part for natural sorting
    const numA = parseInt(a.label.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.label.replace(/\D/g, '')) || 0;
    if (numA !== numB) return numA - numB;
    return a.label.localeCompare(b.label);
  });

  return (
    <div className="space-y-3">
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Seleccionar Tallas
          <Badge variant="secondary" className="text-[10px]">
            {variants.length} opciones
          </Badge>
        </h4>
        
        <div className="space-y-2">
          {sortedVariants.map((variant) => {
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
                {/* Left: Variant info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground min-w-[40px]">
                      {variant.label}
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

                {/* Right: Quantity controls */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQuantity(variant.id, -1, variant)}
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

      {/* Summary */}
      {totalQty > 0 && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium">{totalQty} unidades</span>
              <span className="text-muted-foreground">
                ({Object.values(selections).filter(q => q > 0).length} tallas)
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

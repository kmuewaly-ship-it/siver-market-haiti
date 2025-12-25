import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useSmartCart } from "@/hooks/useSmartCart";
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, TrendingUp, DollarSign, Package } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  sku: string;
  storeId?: string;
  storeName?: string;
  storeWhatsapp?: string;
  // B2B fields
  priceB2B?: number;
  pvp?: number;
  moq?: number;
  stock?: number;
}

interface SelectedVariation {
  id: string;
  label: string;
  quantity: number;
}

interface ProductBottomSheetProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  selectedVariations?: SelectedVariation[];
}

export const ProductBottomSheet = ({ product, isOpen, onClose, selectedVariations }: ProductBottomSheetProps) => {
  const { user } = useAuth();
  const { addToCart } = useSmartCart();
  const b2cCart = useCart();
  const b2bCart = useCartB2B();
  const [quantity, setQuantity] = useState(1);

  const isSeller = user?.role === UserRole.SELLER;

  // Reset quantity when product changes or opens
  useEffect(() => {
    if (product) {
      setQuantity(isSeller ? (product.moq || 1) : 1);
    }
  }, [product, isSeller, isOpen]);

  if (!product) return null;

  // B2B Logic
  const moq = product.moq || 1;
  const priceB2B = product.priceB2B || product.price;
  const pvp = product.pvp || product.originalPrice || product.price;
  const stock = product.stock || 100; // Fallback stock

  // Calculations
  const currentPrice = isSeller ? priceB2B : product.price;
  const totalInvestment = currentPrice * quantity;
  const totalRevenue = pvp * quantity;
  const totalProfit = totalRevenue - totalInvestment;
  const profitMargin = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const minQty = isSeller ? moq : 1;
    
    if (newQuantity >= minQty && newQuantity <= stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = (selected?: SelectedVariation[]) => {
    // If we have selected variations, add each as separate cart lines
    if (selected && selected.length > 0) {
      const nonZero = selected.filter((v) => v.quantity && v.quantity > 0);
      if (nonZero.length === 0) {
        onClose();
        return;
      }

      const isSeller = user?.role === UserRole.SELLER;

      if (isSeller) {
        nonZero.forEach((v) => {
          const item = {
            productId: `${product.id}:${v.id}`,
            sku: `${product.sku}-${v.id}`,
            nombre: `${product.name} - ${v.label}`,
            precio_b2b: priceB2B,
            moq: moq,
            stock_fisico: v.quantity,
            cantidad: v.quantity,
            subtotal: priceB2B * v.quantity,
            imagen_principal: product.image,
          } as any;

          const validation = b2bCart.validateItem ? b2bCart.validateItem(item) : { valid: true };
          if (validation.valid) {
            b2bCart.addItem(item);
          } else {
            toast.error(validation.error || 'Error al agregar al carrito B2B');
          }
        });
        toast.success(`Agregado al carrito B2B: ${nonZero.length} variaciones`);
      } else {
        nonZero.forEach((v) => {
          const id = `${product.id}:${v.id}`;
          b2cCart.addItem({
            id,
            name: `${product.name} - ${v.label}`,
            price: product.price,
            image: product.image,
            sku: `${product.sku}-${v.id}`,
            storeId: product.storeId,
            storeName: product.storeName,
            storeWhatsapp: product.storeWhatsapp,
          });
          b2cCart.updateQuantity(id, v.quantity);
        });
        toast.success(`Añadido al carrito (${nonZero.reduce((s, x) => s + x.quantity, 0)} unidades)`);
      }

      onClose();
      return;
    }

    // Fallback: single product add
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      priceB2B: priceB2B,
      pvp: pvp,
      moq: moq,
      stock: stock,
      image: product.image,
      sku: product.sku,
      storeId: product.storeId,
      storeName: product.storeName,
      storeWhatsapp: product.storeWhatsapp,
    });
    onClose();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="mx-auto w-full max-w-sm flex flex-col max-h-[85vh]">
          <DrawerHeader className="flex-shrink-0 pb-2">
            <div className="flex gap-3 items-start text-left">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <DrawerTitle className="text-sm sm:text-base font-bold line-clamp-2">{product.name}</DrawerTitle>
                <DrawerDescription className="mt-0.5 text-xs">
                </DrawerDescription>
                <div className="mt-1 font-bold text-base sm:text-lg text-primary">
                  ${currentPrice.toFixed(2)}
                  {isSeller && <span className="text-[10px] sm:text-xs font-normal text-muted-foreground ml-1">costo</span>}
                </div>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-2 overflow-y-auto flex-1">
            {/* Quantity Selector - more compact on mobile */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <span className="text-xs sm:text-sm font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center border border-gray-200 rounded-md">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-none"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= (isSeller ? moq : 1)}
                >
                  <Minus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <div className="w-12 sm:w-16 text-center text-sm sm:text-base font-medium">
                  {quantity}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-none"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= stock}
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>

            {/* B2B Business Panel - compact for mobile */}
            {isSeller && (
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 border border-slate-100 space-y-2 sm:space-y-3">
                <h4 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 sm:mb-2">Panel de Negocio</h4>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-slate-600">Inversión:</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">${totalInvestment.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-slate-600">Venta (PVP):</span>
                  <span className="text-xs sm:text-sm font-medium text-slate-700">${totalRevenue.toFixed(2)}</span>
                </div>
                
                <Separator className="my-1 sm:my-2" />
                
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-bold text-green-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Ganancia:
                  </span>
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-bold text-green-700">+${totalProfit.toFixed(2)}</div>
                    <div className="text-[9px] sm:text-[10px] text-green-600 font-medium">{profitMargin.toFixed(0)}% margen</div>
                  </div>
                </div>
              </div>
            )}

            {/* B2C Info */}
            {!isSeller && (
              <div className="mb-4 text-xs sm:text-sm text-gray-500">
                Envío calculado en el checkout.
              </div>
            )}
          </div>

          <DrawerFooter className="pb-6 sm:pb-8 pt-2 flex-shrink-0">
            <Button onClick={() => handleAddToCart(selectedVariations)} className="w-full h-10 sm:h-12 text-sm sm:text-base font-bold">
              {isSeller ? (
                <>
                  <Package className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Comprar B2B
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> Añadir al Carrito
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="h-9 sm:h-10 text-sm">Cancelar</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

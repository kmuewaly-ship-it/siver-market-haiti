import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserRole } from "@/types/auth";
import { useSmartCart } from "@/hooks/useSmartCart";
import { useCart } from "@/hooks/useCart";
import { useCartB2B } from "@/hooks/useCartB2B";
import VariantSelector from './VariantSelector';
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, TrendingUp, DollarSign, Package, X } from "lucide-react";
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
  description?: string;
  // B2B fields
  priceB2B?: number;
  pvp?: number;
  moq?: number;
  stock?: number;
  source_product_id?: string;
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
  const [selections, setSelections] = useState<any[]>([]);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);

  const isSeller = user?.role === UserRole.SELLER;

  // Reset quantity when product changes or opens
  useEffect(() => {
    if (product) {
      setQuantity(1); // Always start from 1, MOQ is validated on sum of variants
      setSelections([]);
    }
  }, [product, isSeller, isOpen]);

  // B2B Logic
  const moq = product?.moq || 1;
  const priceB2B = product?.priceB2B || product?.price || 0;
  const pvp = product?.pvp || product?.originalPrice || product?.price || 0;
  const stock = product?.stock || 100; // Fallback stock

  // Calculations
  const currentPrice = isSeller ? priceB2B : product?.price || 0;
  const totalInvestment = currentPrice * quantity;
  const totalRevenue = pvp * quantity;
  const totalProfit = totalRevenue - totalInvestment;
  const profitMargin = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const minQty = 1; // Allow starting from 1, MOQ validation is done on total sum
    
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
        {product ? (
        <div className="mx-auto w-full max-w-sm flex flex-col max-h-[85vh]">
          <DrawerHeader className="flex-shrink-0 pb-2 flex items-center justify-between">
            <div className="flex gap-3 items-start text-left flex-1">
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
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ backgroundColor: '#94111f', color: 'white' }}
              aria-label="Close product sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </DrawerHeader>

          <div className="px-4 pb-2 overflow-y-auto flex-1">
            {/* Variant Selector from Database */}
            <div className="mb-4 sm:mb-6">
              <VariantSelector 
                productId={product?.source_product_id || product?.id || ''}
                basePrice={product?.price || 0}
                isB2B={isSeller}
                onSelectionChange={(list) => setSelections(list)}
              />
            </div>

            {/* Buy Button - always visible */}
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
              <Badge className="bg-white text-foreground hover:bg-white border-2 w-auto px-3 py-2 h-10 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium" style={{ borderColor: '#071d7f' }}>
                <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                <span>{quantity} uds</span>
                <div className="text-base sm:text-lg font-bold" style={{ color: '#29892a' }}>
                  ${(currentPrice * quantity).toFixed(2)}
                </div>
              </Badge>
              <Button 
                onClick={() => handleAddToCart(selections.length > 0 ? selections : selectedVariations)} 
                className="w-auto px-3 py-2 h-10 text-sm font-semibold flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" 
                disabled={(() => {
                  if (stock === 0) return true;
                  if (isSeller && selections.length === 0) {
                    return quantity < moq;
                  }
                  return false;
                })()}
              >
                <ShoppingCart className="w-4 h-4" style={{ color: '#29892a' }} />
                {isSeller ? 'Comprar B2B' : 'Comprar'}
              </Button>
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

            {/* Description Button */}
            {product.description && (
              <Button
                variant="outline"
                onClick={() => setIsDescriptionOpen(true)}
                className="w-full mt-4 border-2 text-sm font-semibold"
                style={{ borderColor: '#94111f', color: '#94111f' }}
              >
                Ver Descripción
              </Button>
            )}
          </div>
        </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            Cargando producto...
          </div>
        )}
      </DrawerContent>

      {/* Description Drawer */}
      <Drawer open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="mx-auto w-full max-w-sm flex flex-col max-h-[80vh]">
            <DrawerHeader className="flex-shrink-0">
              <DrawerTitle className="text-lg font-bold">Descripción del Producto</DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div 
                className="border-2 rounded-lg p-4 bg-white"
                style={{ borderColor: '#94111f' }}
              >
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {product?.description}
                </p>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </Drawer>
  );
};

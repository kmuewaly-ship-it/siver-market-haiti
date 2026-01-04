import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserRole } from "@/types/auth";
import { addItemB2C, addItemB2B } from "@/services/cartService";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

interface ProductVariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
  option_type?: string;
  parent_product_id?: string;
}

interface ColorOption {
  productId: string;
  label: string;
  code?: string;
  image?: string;
  price: number;
  stock: number;
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
  priceB2B?: number;
  pvp?: number;
  moq?: number;
  stock?: number;
  source_product_id?: string;
  sellerCatalogId?: string;
  // Variant support for B2B grouped products
  variants?: ProductVariantInfo[];
  variantIds?: string[];
  // Unified variant options (all types: color, size, age, etc.)
  variantOptions?: VariantOption[];
  variantType?: string;
  // Color options support (backwards compatibility)
  colorOptions?: ColorOption[];
  hasColorVariants?: boolean;
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
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<any[]>([]);
  const [isDescriptionOpen, setIsDescriptionOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [variantImage, setVariantImage] = useState<string | null>(null);

  const isSeller = user?.role === UserRole.SELLER;
  
  // Current display image (variant-specific or product default)
  const displayImage = variantImage || product?.image || '';

  useEffect(() => {
    if (product) {
      setQuantity(product?.variants && product.variants.length > 0 ? 0 : 1);
      setSelections([]);
      setVariantImage(null);
      console.log('[ProductBottomSheet] Product opened:', {
        name: product.name,
        hasVariants: !!product.variants,
        variantCount: product.variants?.length || 0,
        variants: product.variants
      });
    }
  }, [product, isSeller, isOpen]);

  // B2B Logic
  const moq = product?.moq || 1;
  const priceB2B = product?.priceB2B || product?.price || 0;
  const pvp = product?.pvp || product?.originalPrice || product?.price || 0;
  const stock = product?.stock || 100;

  // Calculations
  const currentPrice = isSeller ? priceB2B : product?.price || 0;
  const totalInvestment = currentPrice * quantity;
  const totalRevenue = pvp * quantity;
  const totalProfit = totalRevenue - totalInvestment;
  const profitMargin = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const minQty = isSeller ? moq : 1;
    const maxQty = stock;
    
    console.log(`[Quantity] delta=${delta}, current=${quantity}, new=${newQuantity}, min=${minQty}, max=${maxQty}, allowed=${newQuantity >= minQty && newQuantity <= maxQty}`);
    
    if (newQuantity >= minQty && newQuantity <= maxQty) {
      setQuantity(newQuantity);
      console.log(`[Quantity] Updated to ${newQuantity}`);
    } else {
      console.log(`[Quantity] NOT allowed - out of range`);
    }
  };

  // Product content component (shared between mobile and desktop)
  const ProductContent = () => (
    <>
      {isMobile ? (
        <DrawerHeader className="flex-shrink-0 pb-2 flex items-center justify-between">
          <div className="flex gap-3 items-start text-left flex-1">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={displayImage} alt={product!.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-sm sm:text-base font-bold line-clamp-2">{product!.name}</DrawerTitle>
              <DrawerDescription className="mt-0.5 text-xs"></DrawerDescription>
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
      ) : (
        <SheetHeader className="flex-shrink-0 pb-2 flex items-center justify-between pr-6">
          <div className="flex gap-3 items-start text-left flex-1">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={displayImage} alt={product!.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-bold line-clamp-2">{product!.name}</SheetTitle>
              <SheetDescription className="mt-0.5 text-sm"></SheetDescription>
              <div className="mt-2 font-bold text-xl text-primary">
                ${currentPrice.toFixed(2)}
                {isSeller && <span className="text-sm font-normal text-muted-foreground ml-2">costo</span>}
              </div>
            </div>
          </div>
          <SheetClose asChild>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ backgroundColor: '#94111f', color: 'white' }}
              aria-label="Close product sheet"
            >
              <X className="w-6 h-6" />
            </button>
          </SheetClose>
        </SheetHeader>
      )}

      <div className={isMobile ? "px-4 pb-24 overflow-y-auto flex-1" : "px-6 pb-24 overflow-y-auto flex-1"}>
        {/* Variant Selector - unified component same as product page */}
        <div className="mb-4 sm:mb-6">
          <VariantSelector 
            productId={product?.source_product_id || product?.id || ''}
            basePrice={isSeller ? (product?.priceB2B || product?.price || 0) : (product?.price || 0)}
            baseImage={product?.image}
            isB2B={isSeller}
            onVariantImageChange={(img) => setVariantImage(img)}
            onSelectionChange={(list, totalQty) => {
              setSelections(list.map(s => ({ variantId: s.variantId, quantity: s.quantity })));
              setQuantity(totalQty > 0 ? totalQty : (isSeller ? moq : 1));
            }}
          />
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
        {product!.description && (
          <Button
            variant="outline"
            onClick={() => setIsDescriptionOpen(true)}
            className="w-full mt-4 mb-6 border-2 text-sm font-semibold"
            style={{ borderColor: '#94111f', color: '#94111f' }}
          >
            Ver Descripción
          </Button>
        )}
      </div>
    </>
  );

  const handleAddToCart = async (selected?: SelectedVariation[]) => {
    // Validate product exists
    if (!product) {
      console.error('Product is null in handleAddToCart');
      toast.error('Producto no disponible');
      return;
    }

    // Validate user is logged in
    if (!user?.id) {
      console.log('User not authenticated, redirecting to login');
      toast.error('Debes iniciar sesión para comprar');
      setTimeout(() => navigate('/login'), 500);
      return;
    }

    setIsAdding(true);

    try {
      // Check if we have grouped B2B variant selections
      const hasGroupedVariants = product?.variants && product.variants.length > 0 && selections.length > 0;
      
      if (hasGroupedVariants) {
        // B2B grouped variants - use selections from VariantSelectorB2B
        const nonZeroSelections = selections.filter((s: any) => s.quantity > 0);
        if (nonZeroSelections.length === 0) {
          onClose();
          return;
        }

        for (const sel of nonZeroSelections) {
          const variant = product.variants?.find((v: any) => v.id === sel.variantId);
          if (variant) {
            await addItemB2B({
              userId: user.id,
              sku: variant.sku,
              name: `${product.name} - ${variant.label}`,
              priceB2B: variant.precio || priceB2B,
              quantity: sel.quantity,
              image: product.image,
            });
          }
        }
        toast.success(`Agregado al carrito B2B: ${nonZeroSelections.length} variaciones`);
      } else if (selected && selected.length > 0) {
        // With variations from regular VariantSelector
        const nonZero = selected.filter((v) => v.quantity && v.quantity > 0);
        if (nonZero.length === 0) {
          onClose();
          return;
        }

        if (isSeller) {
          // B2B with variations
          for (const v of nonZero) {
            await addItemB2B({
              userId: user.id,
              sku: `${product.sku}-${v.id}`,
              name: `${product.name} - ${v.label}`,
              priceB2B: priceB2B,
              quantity: v.quantity,
              image: product.image,
            });
          }
          toast.success(`Agregado al carrito B2B: ${nonZero.length} variaciones`);
        } else {
          // B2C with variations
          for (const v of nonZero) {
            await addItemB2C({
              userId: user.id,
              sku: `${product.sku}-${v.id}`,
              name: `${product.name} - ${v.label}`,
              price: product.price,
              quantity: v.quantity,
              image: product.image,
              storeId: product.storeId,
              storeName: product.storeName,
              storeWhatsapp: product.storeWhatsapp,
              sellerCatalogId: product.sellerCatalogId,
            });
          }
          toast.success(`Añadido al carrito (${nonZero.reduce((s, x) => s + x.quantity, 0)} unidades)`);
        }
      } else {
        // Single product without variations
        if (isSeller) {
          // B2B
          await addItemB2B({
            userId: user.id,
            sku: product.sku,
            name: product.name,
            priceB2B: product.priceB2B || product.price || 0,
            quantity: quantity,
            image: product.image,
          });
          toast.success(`Agregado al carrito B2B: ${quantity} unidades`);
        } else {
          // B2C
          console.log('[B2C Add] Starting B2C add to cart with product:', {
            sku: product.sku,
            name: product.name,
            price: product.price,
            quantity,
            storeId: product.storeId,
            storeName: product.storeName,
            storeWhatsapp: product.storeWhatsapp,
          });
          
          await addItemB2C({
            userId: user.id,
            sku: product.sku,
            name: product.name,
            price: product.price || 0,
            quantity: quantity,
            image: product.image,
            storeId: product.storeId || '',
            storeName: product.storeName || 'Marketplace',
            storeWhatsapp: product.storeWhatsapp || '',            sellerCatalogId: product.sellerCatalogId,          });
          console.log('[B2C Add] Successfully added to cart');
          toast.success(`Añadido al carrito (${quantity} unidades)`);
        }
      }

      onClose();
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error al agregar al carrito. Por favor intenta de nuevo.');
    } finally {
      setIsAdding(false);
    }
  };

  // Mobile: Drawer from bottom | Desktop: Sheet from right
  if (isMobile) {
    return (
      <>
        <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DrawerContent className="max-h-[95vh] flex flex-col p-0">
            {product ? (
              <div className="mx-auto w-full max-w-sm flex flex-col max-h-[95vh] gap-0">
                {/* Header */}
                <DrawerHeader className="flex-shrink-0 pb-2 flex items-center justify-between">
                  <div className="flex gap-3 items-start text-left flex-1">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DrawerTitle className="text-sm font-bold line-clamp-2">{product.name}</DrawerTitle>
                      <div className="mt-1 font-bold text-base text-primary">
                        ${currentPrice.toFixed(2)}
                        {isSeller && <span className="text-[10px] font-normal text-muted-foreground ml-1">costo</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                    style={{ backgroundColor: '#94111f', color: 'white' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </DrawerHeader>

                {/* Content */}
                <div className="px-4 pb-24 overflow-y-auto flex-1">
                  <div className="mb-4">
                    {/* Unified VariantSelector - same as product page */}
                    <VariantSelector 
                      productId={product?.source_product_id || product?.id || ''}
                      basePrice={isSeller ? (product?.priceB2B || product?.price || 0) : (product?.price || 0)}
                      baseImage={product?.image}
                      isB2B={isSeller}
                      onSelectionChange={(list, totalQty) => {
                        setSelections(list.map(s => ({ variantId: s.variantId, quantity: s.quantity, label: '' })));
                        setQuantity(totalQty > 0 ? totalQty : (isSeller ? moq : 1));
                      }}
                    />
                  </div>

                  {isSeller && (
                    <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-100 space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase">Panel de Negocio</h4>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Inversión:</span>
                        <span className="text-xs font-bold">${totalInvestment.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-600">Venta (PVP):</span>
                        <span className="text-xs">${totalRevenue.toFixed(2)}</span>
                      </div>
                      <Separator className="my-1" />
                      <div className="flex justify-between">
                        <span className="text-xs font-bold text-green-700 flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" /> Ganancia:
                        </span>
                        <div className="text-right">
                          <div className="text-xs font-bold text-green-700">+${totalProfit.toFixed(2)}</div>
                          <div className="text-[9px] text-green-600">{profitMargin.toFixed(0)}% margen</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!isSeller && (
                    <div className="mb-4 text-xs text-gray-500">
                      Envío calculado en el checkout.
                    </div>
                  )}

                  {product.description && (
                    <Button
                      variant="outline"
                      onClick={() => setIsDescriptionOpen(true)}
                      className="w-full mt-4 border-2 text-sm"
                      style={{ borderColor: '#94111f', color: '#94111f' }}
                    >
                      Ver Descripción
                    </Button>
                  )}
                </div>

                {/* Footer - Fixed Position */}
                <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 border-t bg-white max-w-sm mx-auto">
                  {/* Show simplified footer when using B2B variant selector with multiple variants */}
                  {product?.variants && product.variants.length > 1 ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">
                          {selections.length > 0 ? `${selections.filter((s: any) => s.quantity > 0).length} tallas` : 'Selecciona tallas'}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {quantity > 0 ? `${quantity} uds` : '0 uds'}
                        </span>
                      </div>
                      
                      <Badge className="bg-white text-foreground border-2 px-3 py-1.5 text-sm font-bold" style={{ borderColor: '#071d7f' }}>
                        <div style={{ color: '#29892a' }}>
                          ${selections.reduce((sum: number, s: any) => {
                            const variant = product.variants?.find((v: any) => v.id === s.variantId);
                            return sum + ((variant?.precio || priceB2B) * s.quantity);
                          }, 0).toFixed(2)}
                        </div>
                      </Badge>

                      <Button 
                        onClick={() => handleAddToCart()} 
                        className="flex-1 max-w-[140px] h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                        disabled={quantity === 0 || isAdding}
                      >
                        <ShoppingCart className="w-3 h-3 mr-1" />
                        {isAdding ? 'Agregando...' : 'Comprar'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= (isSeller ? moq : 1)}
                          className="p-2 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= stock}
                          className="p-2 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Badge className="bg-white text-foreground border-2 px-2 py-1 text-xs font-medium" style={{ borderColor: '#071d7f' }}>
                        <div style={{ color: '#29892a' }}>
                          ${(currentPrice * quantity).toFixed(2)}
                        </div>
                      </Badge>

                      <Button 
                        onClick={() => handleAddToCart(selections.length > 0 ? selections : selectedVariations)} 
                        className="flex-1 h-10 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                        disabled={stock === 0 || isAdding || (isSeller && quantity < moq)}
                      >
                        <ShoppingCart className="w-3 h-3" />
                        {isAdding ? 'Agregando...' : 'Comprar'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">Cargando...</div>
            )}
          </DrawerContent>
        </Drawer>

        {/* Description Drawer */}
        <Drawer open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
          <DrawerContent className="max-h-[85vh]">
            <div className="mx-auto w-full max-w-sm flex flex-col max-h-[80vh]">
              <DrawerHeader className="flex-shrink-0">
                <DrawerTitle className="text-lg font-bold">Descripción</DrawerTitle>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <div className="border-2 rounded-lg p-4 bg-white" style={{ borderColor: '#94111f' }}>
                  <p className="text-sm text-gray-700 whitespace-pre-line">
                    {product?.description}
                  </p>
                </div>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Sheet from right
  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col p-0 overflow-hidden">
          {product ? (
            <div className="flex flex-col h-screen gap-0">
              {/* Header */}
              <SheetHeader className="flex-shrink-0 px-6 py-4 pb-2 flex items-center justify-between border-b">
                <div className="flex gap-3 items-start text-left flex-1">
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg font-bold line-clamp-2">{product.name}</SheetTitle>
                    <div className="mt-2 font-bold text-xl text-primary">
                      ${currentPrice.toFixed(2)}
                      {isSeller && <span className="text-sm font-normal text-muted-foreground ml-2">costo</span>}
                    </div>
                  </div>
                </div>
                <SheetClose asChild>
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                    style={{ backgroundColor: '#94111f', color: 'white' }}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </SheetClose>
              </SheetHeader>

                {/* Content */}
              <div className="px-6 pb-24 overflow-y-auto flex-1">
                <div className="mb-6">
                  {/* Always use the unified VariantSelector (same as product page) */}
                  <VariantSelector 
                    productId={product?.source_product_id || product?.id || ''}
                    basePrice={isSeller ? (product?.priceB2B || product?.price || 0) : (product?.price || 0)}
                    baseImage={product?.image}
                    isB2B={isSeller}
                    onSelectionChange={(list, totalQty, totalPrice) => {
                      setSelections(list.map(s => ({ variantId: s.variantId, quantity: s.quantity, label: '' })));
                      setQuantity(totalQty > 0 ? totalQty : (isSeller ? moq : 1));
                    }}
                  />
                </div>

                {isSeller && (
                  <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-100 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase">Panel de Negocio</h4>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Inversión:</span>
                      <span className="text-sm font-bold">${totalInvestment.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-600">Venta (PVP):</span>
                      <span className="text-sm">${totalRevenue.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm font-bold text-green-700 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> Ganancia:
                      </span>
                      <div className="text-right">
                        <div className="text-sm font-bold text-green-700">+${totalProfit.toFixed(2)}</div>
                        <div className="text-xs text-green-600">{profitMargin.toFixed(0)}% margen</div>
                      </div>
                    </div>
                  </div>
                )}

                {!isSeller && (
                  <div className="mb-4 text-sm text-gray-500">
                    Envío calculado en el checkout.
                  </div>
                )}

                {product.description && (
                  <Button
                    variant="outline"
                    onClick={() => setIsDescriptionOpen(true)}
                    className="w-full mt-4 border-2 text-sm"
                    style={{ borderColor: '#94111f', color: '#94111f' }}
                  >
                    Ver Descripción
                  </Button>
                )}
              </div>

              {/* Footer - Fixed to bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t bg-white">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= (isSeller ? moq : 1)}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= stock}
                      className="p-2 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <Badge className="bg-white text-foreground border-2 px-3 py-2 text-xs font-medium" style={{ borderColor: '#071d7f' }}>
                    <div style={{ color: '#29892a' }}>
                      ${(currentPrice * quantity).toFixed(2)}
                    </div>
                  </Badge>

                  <Button 
                    onClick={() => handleAddToCart(selections.length > 0 ? selections : selectedVariations)} 
                    className="flex-1 h-10 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white" 
                    disabled={stock === 0 || isAdding || (isSeller && quantity < moq)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isAdding ? 'Agregando...' : 'Comprar'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Cargando producto...
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Description Sheet */}
      <Sheet open={isDescriptionOpen} onOpenChange={setIsDescriptionOpen}>
        <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col p-0">
          <SheetHeader className="flex-shrink-0 px-6 py-4 border-b">
            <SheetTitle className="text-lg font-bold">Descripción del Producto</SheetTitle>
            <SheetClose />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="border-2 rounded-lg p-4 bg-white" style={{ borderColor: '#94111f' }}>
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {product?.description}
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

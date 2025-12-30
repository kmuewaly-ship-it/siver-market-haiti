import React, { useEffect, useState, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import VariantSelector from './VariantSelector';
import useVariantDrawerStore from '@/stores/useVariantDrawerStore';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth';
import { addItemB2C, addItemB2B } from '@/services/cartService';
import { useToast } from '@/hooks/use-toast';
import { X, TrendingUp } from 'lucide-react';

const VariantDrawer: React.FC = () => {
  const isMobile = useIsMobile();
  const { isOpen, product, close, onComplete } = useVariantDrawerStore();
  const [selections, setSelections] = useState<any[]>([]);
  const [totalQty, setTotalQty] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const { user, role } = useAuth();
  const { toast } = useToast();

  const isB2BUser = role === UserRole.SELLER || role === UserRole.ADMIN;

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSelections([]);
      setTotalQty(0);
      setTotalPrice(0);
    }
  }, [isOpen]);

  // Business calculator for B2B users
  const businessSummary = useMemo(() => {
    if (!isB2BUser || !product || totalQty === 0) return null;
    const costB2B = product.costB2B || 0;
    const pvp = product.pvp || product.price || 0;
    const investment = costB2B * totalQty;
    const estimatedRevenue = pvp * totalQty;
    const estimatedProfit = estimatedRevenue - investment;
    const profitPercentage = costB2B > 0 ? ((pvp - costB2B) / costB2B * 100).toFixed(1) : '0.0';
    const profitPerUnit = pvp - costB2B;
    return { investment, estimatedRevenue, estimatedProfit, profitPercentage, profitPerUnit };
  }, [isB2BUser, product, totalQty]);

  const handleConfirm = async () => {
    if (!product) return;

    // Validate MOQ for B2B
    if (isB2BUser && totalQty < (product.moq || 1)) {
      toast({ title: 'Cantidad mínima', description: `El pedido debe ser al menos ${product.moq || 1} unidades.`, variant: 'destructive' });
      return;
    }

    if (!user?.id) {
      toast({ title: 'Error', description: 'Debes estar autenticado para agregar items', variant: 'destructive' });
      return;
    }

    // If there are selected variants, add each selection
    if (selections.length > 0 && totalQty > 0) {
      for (const sel of selections) {
        const qty = sel.quantity || 0;
        if (qty <= 0) continue;

        if (isB2BUser) {
          // Add to B2B cart via service
          await addItemB2B({
            userId: user.id,
            productId: product.source_product_id || product.id,
            sku: product.sku || product.id,
            name: product.nombre,
            priceB2B: product.costB2B ?? product.price ?? 0,
            quantity: qty,
            image: product.images?.[0] || undefined,
          });
        } else {
          // Add to B2C cart via service
          await addItemB2C({
            userId: user.id,
            sku: product.sku || product.id,
            name: product.nombre,
            price: product.price || 0,
            quantity: qty,
            image: product.images?.[0] || undefined,
          });
        }
      }
      toast({ title: isB2BUser ? 'Agregado al pedido B2B' : 'Agregado al carrito', description: `${product.nombre} (${totalQty} uds)` });
    } else if (totalQty > 0) {
      // No variant selections, fallback to single add
      if (isB2BUser) {
        await addItemB2B({
          userId: user.id,
          productId: product.source_product_id || product.id,
          sku: product.sku || product.id,
          name: product.nombre,
          priceB2B: product.costB2B ?? product.price ?? 0,
          quantity: totalQty,
          image: product.images?.[0] || undefined,
        });
        toast({ title: 'Agregado al pedido B2B', description: `${product.nombre} (${totalQty} uds)` });
      } else {
        await addItemB2C({
          userId: user.id,
          sku: product.sku || product.id,
          name: product.nombre,
          price: product.price || 0,
          quantity: totalQty,
          image: product.images?.[0] || undefined,
        });
        toast({ title: 'Agregado al carrito' });
      }
    }

    close();
    if (onComplete) onComplete();
  };

  if (!isOpen || !product) return null;

  const displayPrice = isB2BUser ? (product.costB2B || 0) : (product.price || 0);
  const pvpPrice = product.pvp || product.price || 0;

  // Render NOTHING on mobile - only desktop
  if (isMobile) return null;

  // Desktop Drawer (332px x 945px, slide-in from right)
  return (
      <div className="fixed inset-0 z-50 flex justify-end" style={{ pointerEvents: 'auto' }}>
        {/* Overlay */}
        <div 
          className="absolute inset-0 bg-black/50 transition-opacity duration-300"
          onClick={() => close()} 
          style={{ animation: 'fadeIn 0.3s ease-out' }}
        />
        
        {/* Drawer Panel - exact dimensions 332x945 */}
        <aside
          className="relative bg-white shadow-2xl border-l flex flex-col"
          style={{ 
            width: '332px', 
            height: '945px',
            maxHeight: '100vh',
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-bold text-gray-900">Seleccionar variantes</h3>
            <button onClick={() => close()} className="p-1 hover:bg-gray-100 rounded-full transition">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Product Info */}
            <div className="flex gap-3 pb-3 border-b">
              {product.images?.[0] && (
                <img src={product.images[0]} alt={product.nombre} className="w-16 h-16 object-cover rounded-lg" />
              )}
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{product.nombre}</h4>
                {isB2BUser ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-lg font-bold text-blue-600">${displayPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-500 line-through">${pvpPrice.toFixed(2)}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">B2B</span>
                  </div>
                ) : (
                  <div className="mt-1 text-lg font-bold text-gray-900">${displayPrice.toFixed(2)}</div>
                )}
              </div>
            </div>

            {/* Variant Selector */}
            <VariantSelector 
              productId={product.source_product_id || product.id} 
              basePrice={displayPrice} 
              isB2B={isB2BUser} 
              onSelectionChange={(list, qty, price) => {
                setSelections(list);
                setTotalQty(qty);
                setTotalPrice(price);
              }} 
            />

            {/* B2B Investment Calculator */}
            {isB2BUser && businessSummary && totalQty > 0 && (
              <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h5 className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Calculadora de Negocio
                </h5>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Inversión:</span>
                    <span className="font-bold text-gray-900">${businessSummary.investment.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Venta estimada (PVP):</span>
                    <span className="font-bold text-green-600">${businessSummary.estimatedRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-blue-200">
                    <span className="text-gray-700 font-medium">Ganancia neta:</span>
                    <span className="font-bold text-green-700 text-sm">+${businessSummary.estimatedProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Margen:</span>
                    <span className="font-semibold text-blue-700">{businessSummary.profitPercentage}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - sticky */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-xl font-bold text-gray-900">${totalPrice.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">{totalQty} unidades</div>
                {isB2BUser && product.moq && product.moq > 1 && (
                  <div className="text-xs text-blue-600">MOQ: {product.moq}</div>
                )}
              </div>
            </div>
            <Button 
              onClick={handleConfirm} 
              className="w-full h-11 text-base font-semibold"
              disabled={totalQty === 0 || (isB2BUser && totalQty < (product.moq || 1))}
            >
              {isB2BUser ? 'Agregar al Pedido B2B' : 'Agregar al Carrito'}
            </Button>
          </div>
        </aside>

        <style>{`
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    );
};

export default VariantDrawer;

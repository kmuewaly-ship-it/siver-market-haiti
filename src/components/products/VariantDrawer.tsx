import React, { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import VariantSelector from './VariantSelector';
import useVariantDrawerStore from '@/stores/useVariantDrawerStore';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useB2CCartSupabase } from '@/hooks/useB2CCartSupabase';
import { useB2BCartSupabase } from '@/hooks/useB2BCartSupabase';
import { useToast } from '@/hooks/use-toast';

const VariantDrawer: React.FC = () => {
  const isMobile = useIsMobile();
  const { isOpen, product, close, onComplete } = useVariantDrawerStore();
  const [selections, setSelections] = useState<any[]>([]);
  const [totalQty, setTotalQty] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const { user, role } = useAuth();
  const localCart = useCart();
  const b2cCart = useB2CCartSupabase();
  const b2bCart = useB2BCartSupabase();
  const toast = useToast();

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

  const handleConfirm = async () => {
    if (!product) return;

    // If there are selected variants, add each selection
    if (selections.length > 0) {
      for (const sel of selections) {
        const qty = sel.quantity || 0;
        if (qty <= 0) continue;

        if (role === 'seller') {
          // Add to B2B supabase cart
          await b2bCart.addItem({
            productId: product.source_product_id || product.id,
            sku: product.sku || product.id,
            nombre: product.nombre,
            unitPrice: product.costB2B ?? product.price ?? 0,
            quantity: Math.max(qty, product.moq || 1),
            moq: product.moq || 1,
            stockDisponible: product.stock || 0,
          });
          toast.toast({ title: 'Producto agregado al pedido mayorista' });
        } else if (user && user.id) {
          // Authenticated client -> B2C supabase
          await b2cCart.addItem({
            sellerCatalogId: undefined,
            sku: product.sku || product.id,
            name: product.nombre,
            price: product.price || 0,
            image: product.images?.[0] || undefined,
            storeId: undefined,
            storeName: undefined,
            storeWhatsapp: undefined,
          });
        } else {
          // Guest -> local cart (zustand)
          localCart.addItem({
            id: product.id,
            name: product.nombre,
            price: product.price || 0,
            image: product.images?.[0] || '',
            sku: product.sku || product.id,
          });
          toast.toast({ title: 'Producto agregado' });
        }
      }
    } else {
      // No variant selections, fallback to single add
      if (role === 'seller') {
        await b2bCart.addItem({
          productId: product.source_product_id || product.id,
          sku: product.sku || product.id,
          nombre: product.nombre,
          unitPrice: product.costB2B ?? product.price ?? 0,
          quantity: Math.max(1, product.moq || 1),
          moq: product.moq || 1,
          stockDisponible: product.stock || 0,
        });
        toast.toast({ title: 'Producto agregado al pedido mayorista' });
      } else if (user && user.id) {
        await b2cCart.addItem({
          sku: product.sku || product.id,
          name: product.nombre,
          price: product.price || 0,
          image: product.images?.[0] || undefined,
        });
      } else {
        localCart.addItem({
          id: product.id,
          name: product.nombre,
          price: product.price || 0,
          image: product.images?.[0] || '',
          sku: product.sku || product.id,
        });
        toast.toast({ title: 'Producto agregado' });
      }
    }

    close();
    if (onComplete) onComplete();
  };

  if (!isOpen || !product) return null;

  // Desktop Drawer styles (exact dimensions)
  if (!isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex" aria-hidden>
        <div className="absolute inset-0 bg-black/40" onClick={() => close()} />
        <aside
          className="relative bg-white shadow-xl border-l"
          style={{ width: 332, height: 945, right: 0 }}
        >
          <div className="p-4 h-full overflow-auto">
            <h3 className="text-lg font-bold mb-2">Seleccionar variantes</h3>
            <div className="mb-3 text-sm text-gray-600">{product.nombre}</div>
            <VariantSelector productId={product.source_product_id || product.id} basePrice={product.price || 0} isB2B={role === 'seller'} onSelectionChange={(list, qty, price) => {
              setSelections(list);
              setTotalQty(qty);
              setTotalPrice(price);
            }} />

            <div className="mt-4 sticky bottom-0 bg-white pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="font-bold">${totalPrice.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">{totalQty} uds</div>
                  <Button onClick={handleConfirm} className="ml-3">Confirmar</Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  // Mobile bottom sheet
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => close()} />
      <div className="w-full bg-white rounded-t-xl p-4 max-h-[70vh] overflow-auto">
        <h3 className="text-lg font-bold mb-2">Seleccionar variantes</h3>
        <div className="mb-3 text-sm text-gray-600">{product.nombre}</div>
        <VariantSelector productId={product.source_product_id || product.id} basePrice={product.price || 0} isB2B={role === 'seller'} onSelectionChange={(list, qty, price) => {
          setSelections(list);
          setTotalQty(qty);
          setTotalPrice(price);
        }} />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-gray-500">Total</div>
              <div className="font-bold">${totalPrice.toFixed(2)}</div>
            </div>
            <Button onClick={handleConfirm}>Confirmar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VariantDrawer;

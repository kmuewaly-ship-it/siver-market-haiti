import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCartSync } from '@/hooks/useCartSync';

export interface B2BCartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  precioB2B: number;
  precioVenta?: number; // PVP for profit analysis
  cantidad: number;
  subtotal: number;
  image: string | null;
}

export const useB2BCartItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<B2BCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasInitialLoadedRef = useRef(false);
  const subscriptionRef = useRef<any>(null);

  const loadCartItems = useCallback(async (showLoading = false) => {
    if (!user?.id) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

    try {
      setError(null);

      console.log('Loading B2B cart items for user:', user.id);

      // Query directly from b2b_cart_items with JOIN to b2b_carts
      const { data: cartItems, error: itemsError } = await supabase
        .from('b2b_cart_items')
        .select('*, cart_id!inner(id, buyer_user_id, status), products:product_id(precio_sugerido_venta)')
        .eq('cart_id.buyer_user_id', user.id)
        .eq('cart_id.status', 'open')
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Error fetching B2B cart items:', itemsError);
        throw itemsError;
      }

      console.log('B2B Cart items loaded:', cartItems?.length || 0, 'items');

      const formattedItems: B2BCartItem[] = (cartItems || []).map(item => {
        // Extract precio_sugerido_venta from joined product
        let precioVenta = 0;
        if (item.products && typeof item.products === 'object') {
          precioVenta = (item.products as any).precio_sugerido_venta || 0;
        }

        return {
          id: item.id,
          productId: item.product_id,
          sku: item.sku,
          name: item.nombre,
          precioB2B: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          precioVenta: precioVenta,
          cantidad: item.quantity,
          subtotal: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          image: null, // B2B table doesn't have image field, can be added later
        };
      });

      setItems(formattedItems);
    } catch (err) {
      console.error('Error loading B2B cart items:', err);
      setError(err instanceof Error ? err.message : 'Error loading B2B cart');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load items on mount and when user changes
  useEffect(() => {
    if (user?.id && !hasInitialLoadedRef.current) {
      hasInitialLoadedRef.current = true;
      loadCartItems(true); // Show loading on initial load
    }
  }, [user?.id, loadCartItems]);

  // Subscribe to cross-tab cart changes
  const { broadcastCartUpdate } = useCartSync(() => {
    console.log('B2B cart update detected from another tab, reloading...');
    loadCartItems(false);
  });

  // Subscribe to real-time changes using Supabase
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for b2b_cart_items');

    // Subscribe to changes in b2b_cart_items
    const itemsSubscription = supabase
      .channel(`b2b_cart_items:user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2b_cart_items',
        },
        (payload) => {
          console.log('Real-time cart item update received:', payload);
          // Reload cart items on any change
          loadCartItems(false);
          // Broadcast to other tabs
          broadcastCartUpdate('b2b');
        }
      )
      .subscribe();

    // Also subscribe to changes in b2b_carts (for status changes like completed)
    const cartsSubscription = supabase
      .channel(`b2b_carts:user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2b_carts',
        },
        (payload) => {
          console.log('Real-time cart status update received:', payload);
          // Reload cart items when cart status changes
          loadCartItems(false);
          // Broadcast to other tabs
          broadcastCartUpdate('b2b');
        }
      )
      .subscribe();

    subscriptionRef.current = itemsSubscription;

    return () => {
      if (itemsSubscription) {
        supabase.removeChannel(itemsSubscription);
      }
      if (cartsSubscription) {
        supabase.removeChannel(cartsSubscription);
      }
    };
  }, [user?.id, loadCartItems, broadcastCartUpdate]);

  return { items, isLoading, error, refetch: loadCartItems };
};

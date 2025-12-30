import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCartSync } from '@/hooks/useCartSync';

export interface B2CCartItem {
  id: string;
  sellerCatalogId: string | null;
  sku: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  image: string | null;
  storeId: string | null;
  storeName: string | null;
  storeWhatsapp: string | null;
}

export const useB2CCartItems = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<B2CCartItem[]>([]);
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

      console.log('Loading cart items for user:', user.id);

      // Query directly from b2c_cart_items with JOIN to b2c_carts
      const { data: cartItems, error: itemsError } = await supabase
        .from('b2c_cart_items')
        .select('*, cart_id!inner(id, user_id, status)')
        .eq('cart_id.user_id', user.id)
        .eq('cart_id.status', 'open')
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Error fetching cart items:', itemsError);
        throw itemsError;
      }

      console.log('Cart items loaded:', cartItems?.length || 0, 'items');

      const formattedItems: B2CCartItem[] = (cartItems || []).map(item => ({
        id: item.id,
        sellerCatalogId: item.seller_catalog_id,
        sku: item.sku,
        name: item.nombre,
        price: item.unit_price,
        quantity: item.quantity,
        totalPrice: item.total_price,
        image: item.image,
        storeId: item.store_id,
        storeName: item.store_name,
        storeWhatsapp: item.store_whatsapp,
      }));

      setItems(formattedItems);
    } catch (err) {
      console.error('Error loading cart items:', err);
      setError(err instanceof Error ? err.message : 'Error loading cart');
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
    console.log('Cart update detected from another tab, reloading...');
    loadCartItems(false);
  });

  // Subscribe to real-time changes using Supabase
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscription for b2c_cart_items');

    // Subscribe to changes in b2c_cart_items
    const itemsSubscription = supabase
      .channel(`b2c_cart_items:user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2c_cart_items',
        },
        (payload) => {
          console.log('Real-time cart item update received:', payload);
          // Reload cart items on any change
          loadCartItems(false);
          // Broadcast to other tabs
          broadcastCartUpdate('b2c');
        }
      )
      .subscribe();

    // Also subscribe to changes in b2c_carts (for status changes like completed)
    const cartsSubscription = supabase
      .channel(`b2c_carts:user_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'b2c_carts',
        },
        (payload) => {
          console.log('Real-time cart status update received:', payload);
          // Reload cart items when cart status changes
          loadCartItems(false);
          // Broadcast to other tabs
          broadcastCartUpdate('b2c');
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

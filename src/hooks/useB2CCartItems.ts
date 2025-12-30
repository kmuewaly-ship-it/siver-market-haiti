import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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

  // Refresh items every 3 seconds silently (no loading indicator)
  useEffect(() => {
    const interval = setInterval(() => {
      loadCartItems(false); // Don't show loading on auto-refresh
    }, 3000);

    return () => clearInterval(interval);
  }, [loadCartItems]);

  return { items, isLoading, error, refetch: loadCartItems };
};

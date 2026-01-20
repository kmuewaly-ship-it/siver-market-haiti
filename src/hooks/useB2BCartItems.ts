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
  moq?: number; // Minimum order quantity from product
  // Variant fields
  variantId?: string | null;
  color?: string | null;
  size?: string | null;
  variantAttributes?: Record<string, any> | null;
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

      // Get cart first
      const { data: carts, error: cartsError } = await supabase
        .from('b2b_carts')
        .select('id')
        .eq('buyer_user_id', user.id)
        .eq('status', 'open');

      if (cartsError) {
        console.error('Error fetching B2B carts:', cartsError);
        throw cartsError;
      }

      const cartIds = (carts || []).map(c => c.id);
      console.log('Found carts:', cartIds);

      if (cartIds.length === 0) {
        // No carts found, return empty items
        setItems([]);
        return;
      }

      // Query cart items for these carts
      const { data: cartItems, error: itemsError } = await supabase
        .from('b2b_cart_items')
        .select('*')
        .in('cart_id', cartIds)
        .order('created_at', { ascending: false });

      if (itemsError) {
        console.error('Error fetching B2B cart items:', itemsError);
        throw itemsError;
      }

      console.log('B2B Cart items loaded:', cartItems?.length || 0, 'items');
      console.log('🔍 Datos brutos de la DB (incluyendo variantes):', cartItems);

      const formattedItems: B2BCartItem[] = (cartItems || []).map(item => {
        return {
          id: item.id,
          productId: item.product_id,
          sku: item.sku,
          name: item.nombre,
          precioB2B: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) : item.unit_price,
          precioVenta: 0, // Will be loaded from product if needed
          cantidad: item.quantity,
          subtotal: typeof item.total_price === 'string' ? parseFloat(item.total_price) : item.total_price,
          image: (item as any).image || null,
          moq: 1,
          // Variant fields - CRITICAL FOR UI DISPLAY
          variantId: item.variant_id || null,
          color: item.color || (item.variant_attributes as any)?.color || null,
          size: item.size || (item.variant_attributes as any)?.size || (item.variant_attributes as any)?.talla || null,
          variantAttributes: item.variant_attributes as Record<string, any> | null,
        };
      });

      console.log('✅ Variantes después del map:', formattedItems.map(item => ({ 
        name: item.name,
        color: item.color,
        size: item.size,
        variantId: item.variantId
      })));

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

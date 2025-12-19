import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

export interface B2CCart {
  id: string | null;
  items: B2CCartItem[];
  totalItems: number;
  totalQuantity: number;
  totalPrice: number;
  status: 'open' | 'completed' | 'cancelled';
}

const initialCart: B2CCart = {
  id: null,
  items: [],
  totalItems: 0,
  totalQuantity: 0,
  totalPrice: 0,
  status: 'open',
};

export const useB2CCartSupabase = () => {
  const { user } = useAuth();
  const [cart, setCart] = useState<B2CCart>(initialCart);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch or create cart for user
  const fetchOrCreateCart = useCallback(async () => {
    if (!user?.id) {
      setCart(initialCart);
      setIsLoading(false);
      return;
    }

    try {
      // Try to get existing open cart
      const { data: existingCart, error: fetchError } = await supabase
        .from('b2c_carts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingCart) {
        // Fetch cart items
        const { data: items, error: itemsError } = await supabase
          .from('b2c_cart_items')
          .select('*')
          .eq('cart_id', existingCart.id);

        if (itemsError) throw itemsError;

        const mappedItems: B2CCartItem[] = (items || []).map((item) => ({
          id: item.id,
          sellerCatalogId: item.seller_catalog_id,
          sku: item.sku,
          name: item.nombre,
          price: Number(item.unit_price),
          quantity: item.quantity,
          totalPrice: Number(item.total_price),
          image: item.image,
          storeId: item.store_id,
          storeName: item.store_name,
          storeWhatsapp: item.store_whatsapp,
        }));

        setCart({
          id: existingCart.id,
          items: mappedItems,
          totalItems: mappedItems.length,
          totalQuantity: mappedItems.reduce((sum, item) => sum + item.quantity, 0),
          totalPrice: mappedItems.reduce((sum, item) => sum + item.totalPrice, 0),
          status: existingCart.status as 'open' | 'completed' | 'cancelled',
        });
      } else {
        // Create new cart
        const { data: newCart, error: createError } = await supabase
          .from('b2c_carts')
          .insert({ user_id: user.id, status: 'open' })
          .select()
          .single();

        if (createError) throw createError;

        setCart({
          ...initialCart,
          id: newCart.id,
        });
      }
    } catch (error) {
      console.error('Error fetching/creating B2C cart:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchOrCreateCart();
  }, [fetchOrCreateCart]);

  // Add item to cart
  const addItem = useCallback(async (item: {
    sellerCatalogId?: string;
    sku: string;
    name: string;
    price: number;
    image?: string;
    storeId?: string;
    storeName?: string;
    storeWhatsapp?: string;
  }) => {
    if (!cart.id) {
      toast.error('Carrito no disponible');
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cart.items.find(i => i.sku === item.sku);

      if (existingItem) {
        const newQuantity = existingItem.quantity + 1;

        const { error } = await supabase
          .from('b2c_cart_items')
          .update({
            quantity: newQuantity,
            total_price: newQuantity * item.price,
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('b2c_cart_items')
          .insert({
            cart_id: cart.id,
            seller_catalog_id: item.sellerCatalogId || null,
            sku: item.sku,
            nombre: item.name,
            unit_price: item.price,
            quantity: 1,
            total_price: item.price,
            image: item.image || null,
            store_id: item.storeId || null,
            store_name: item.storeName || null,
            store_whatsapp: item.storeWhatsapp || null,
          });

        if (error) throw error;
      }

      await fetchOrCreateCart();
      toast.success('Añadido al carrito');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Error al agregar producto');
    }
  }, [cart.id, cart.items, fetchOrCreateCart]);

  // Update item quantity
  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(itemId);
      return;
    }

    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;

    try {
      const { error } = await supabase
        .from('b2c_cart_items')
        .update({
          quantity,
          total_price: quantity * item.price,
        })
        .eq('id', itemId);

      if (error) throw error;

      await fetchOrCreateCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast.error('Error al actualizar cantidad');
    }
  }, [cart.items, fetchOrCreateCart]);

  // Remove item from cart
  const removeItem = useCallback(async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('b2c_cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await fetchOrCreateCart();
      toast.success('Producto eliminado');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error al eliminar producto');
    }
  }, [fetchOrCreateCart]);

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!cart.id) return;

    try {
      const { error } = await supabase
        .from('b2c_cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) throw error;

      await fetchOrCreateCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error al vaciar carrito');
    }
  }, [cart.id, fetchOrCreateCart]);

  // Get items grouped by store
  const getItemsByStore = useCallback(() => {
    const itemsByStore = new Map<string, B2CCartItem[]>();
    cart.items.forEach(item => {
      const storeKey = item.storeId || 'unknown';
      const existing = itemsByStore.get(storeKey) || [];
      itemsByStore.set(storeKey, [...existing, item]);
    });
    return itemsByStore;
  }, [cart.items]);

  // Complete cart (mark as completed after checkout)
  const completeCart = useCallback(async () => {
    if (!cart.id) return;

    try {
      const { error } = await supabase
        .from('b2c_carts')
        .update({ status: 'completed' })
        .eq('id', cart.id);

      if (error) throw error;

      setCart(initialCart);
    } catch (error) {
      console.error('Error completing cart:', error);
    }
  }, [cart.id]);

  return {
    cart,
    items: cart.items,
    isLoading,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    completeCart,
    getItemsByStore,
    totalItems: () => cart.totalItems,
    totalPrice: () => cart.totalPrice,
    refetch: fetchOrCreateCart,
  };
};

import { useEffect, useCallback } from 'react';

/**
 * Hook to synchronize cart state across browser tabs/windows
 * Uses storage events to detect cart changes in other tabs
 * 
 * Usage:
 * const refetch = useCartSync(() => {
 *   // This callback will be called when another tab updates the cart
 *   loadCartItems(); // or call refetch from useB2CCartItems/useB2BCartItems
 * });
 */
export const useCartSync = (onCartUpdate: () => void) => {
  useEffect(() => {
    // Listen for storage events from other tabs
    const handleStorageChange = (event: StorageEvent) => {
      // Check if it's a cart-related storage change
      if (
        event.key === 'cart_update' ||
        event.key === 'b2c_cart_sync' ||
        event.key === 'b2b_cart_sync'
      ) {
        console.log('Cart update detected from another tab');
        // Call the callback to refetch cart items
        onCartUpdate();
      }
    };

    // Add event listener
    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [onCartUpdate]);

  // Return a function to broadcast cart updates to other tabs
  const broadcastCartUpdate = useCallback((source: 'b2c' | 'b2b') => {
    const key = source === 'b2c' ? 'b2c_cart_sync' : 'b2b_cart_sync';
    const timestamp = new Date().toISOString();
    
    try {
      localStorage.setItem(key, JSON.stringify({
        timestamp,
        source,
        nonce: Math.random(),
      }));
      
      // Clear after a short delay to allow other tabs to detect the change
      setTimeout(() => {
        localStorage.removeItem(key);
      }, 100);
    } catch (error) {
      console.warn('Failed to broadcast cart update:', error);
    }
  }, []);

  return { broadcastCartUpdate };
};

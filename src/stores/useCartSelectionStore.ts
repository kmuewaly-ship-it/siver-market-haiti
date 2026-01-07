/**
 * Cart Selection Store
 * Manages which items are selected for checkout in B2C and B2B carts
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartSelectionState {
  // B2C selected item IDs
  b2cSelectedIds: Set<string>;
  // B2B selected item IDs
  b2bSelectedIds: Set<string>;
  
  // B2C actions
  toggleB2CItem: (itemId: string) => void;
  selectAllB2C: (itemIds: string[]) => void;
  deselectAllB2C: () => void;
  isB2CItemSelected: (itemId: string) => boolean;
  getB2CSelectedCount: () => number;
  
  // B2B actions
  toggleB2BItem: (itemId: string) => void;
  selectAllB2B: (itemIds: string[]) => void;
  deselectAllB2B: () => void;
  isB2BItemSelected: (itemId: string) => boolean;
  getB2BSelectedCount: () => number;
  
  // Clear after checkout
  clearB2CSelection: () => void;
  clearB2BSelection: () => void;
}

export const useCartSelectionStore = create<CartSelectionState>()(
  persist(
    (set, get) => ({
      b2cSelectedIds: new Set<string>(),
      b2bSelectedIds: new Set<string>(),
      
      // B2C actions
      toggleB2CItem: (itemId: string) => {
        set((state) => {
          const newSet = new Set(state.b2cSelectedIds);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return { b2cSelectedIds: newSet };
        });
      },
      
      selectAllB2C: (itemIds: string[]) => {
        set({ b2cSelectedIds: new Set(itemIds) });
      },
      
      deselectAllB2C: () => {
        set({ b2cSelectedIds: new Set() });
      },
      
      isB2CItemSelected: (itemId: string) => {
        return get().b2cSelectedIds.has(itemId);
      },
      
      getB2CSelectedCount: () => {
        return get().b2cSelectedIds.size;
      },
      
      // B2B actions
      toggleB2BItem: (itemId: string) => {
        set((state) => {
          const newSet = new Set(state.b2bSelectedIds);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
          } else {
            newSet.add(itemId);
          }
          return { b2bSelectedIds: newSet };
        });
      },
      
      selectAllB2B: (itemIds: string[]) => {
        set({ b2bSelectedIds: new Set(itemIds) });
      },
      
      deselectAllB2B: () => {
        set({ b2bSelectedIds: new Set() });
      },
      
      isB2BItemSelected: (itemId: string) => {
        return get().b2bSelectedIds.has(itemId);
      },
      
      getB2BSelectedCount: () => {
        return get().b2bSelectedIds.size;
      },
      
      // Clear selections
      clearB2CSelection: () => {
        set({ b2cSelectedIds: new Set() });
      },
      
      clearB2BSelection: () => {
        set({ b2bSelectedIds: new Set() });
      },
    }),
    {
      name: 'cart-selection-storage',
      // Custom serialization for Set objects
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          return {
            state: {
              ...parsed.state,
              b2cSelectedIds: new Set(parsed.state.b2cSelectedIds || []),
              b2bSelectedIds: new Set(parsed.state.b2bSelectedIds || []),
            },
          };
        },
        setItem: (name, value) => {
          const toStore = {
            state: {
              ...value.state,
              b2cSelectedIds: Array.from(value.state.b2cSelectedIds || []),
              b2bSelectedIds: Array.from(value.state.b2bSelectedIds || []),
            },
          };
          localStorage.setItem(name, JSON.stringify(toStore));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

import React, { createContext, useContext } from 'react';
import { useB2CCartSupabase, B2CCart, B2CCartItem } from '@/hooks/useB2CCartSupabase';

interface B2CCartContextType {
  cart: B2CCart;
  items: B2CCartItem[];
  addItem: (item: {
    sku: string;
    name: string;
    price: number;
    image?: string | null;
    storeId?: string | null;
    storeName?: string | null;
    storeWhatsapp?: string | null;
  }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  isLoading: boolean;
}

const B2CCartContext = createContext<B2CCartContextType | undefined>(undefined);

export const B2CCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartHook = useB2CCartSupabase();

  return (
    <B2CCartContext.Provider value={cartHook}>
      {children}
    </B2CCartContext.Provider>
  );
};

export const useB2CCart = () => {
  const context = useContext(B2CCartContext);
  if (!context) {
    throw new Error('useB2CCart must be used within B2CCartProvider');
  }
  return context;
};

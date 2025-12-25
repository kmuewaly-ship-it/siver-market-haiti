import create from 'zustand';

export interface VariantDrawerProduct {
  id: string;
  sku?: string;
  nombre: string;
  images?: string[];
  price?: number;
  costB2B?: number;
  moq?: number;
  stock?: number;
  source_product_id?: string;
}

type State = {
  isOpen: boolean;
  product?: VariantDrawerProduct | null;
  onComplete?: (() => void) | null;
  open: (product: VariantDrawerProduct, onComplete?: () => void) => void;
  close: () => void;
};

export const useVariantDrawerStore = create<State>((set) => ({
  isOpen: false,
  product: null,
  onComplete: null,
  open: (product, onComplete) => set({ isOpen: true, product, onComplete: onComplete || null }),
  close: () => set({ isOpen: false, product: null, onComplete: null }),
}));

export default useVariantDrawerStore;

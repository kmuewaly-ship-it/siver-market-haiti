/**
 * Tipos para el módulo B2B (Mayorista)
 */

export interface ProductVariantInfo {
  id: string;
  sku: string;
  label: string;
  precio: number;
  stock: number;
}

export interface ProductB2BCard {
  id: string;
  sku: string;
  nombre: string;
  precio_b2b: number;
  precio_b2b_max?: number; // Max price for price range display
  precio_sugerido: number; // PVP sugerido
  moq: number;
  stock_fisico: number;
  imagen_principal: string;
  categoria_id: string;
  source_product_id?: string; // Reference to products table for variants
  variant_count?: number; // Number of variants
  variant_ids?: string[]; // IDs of all variants
  variants?: ProductVariantInfo[]; // Detailed variant info for selector
}

export interface CartItemB2B {
  productId: string;
  sku: string;
  nombre: string;
  precio_b2b: number;
  moq: number;
  stock_fisico: number;
  cantidad: number; // Cantidad solicitada
  subtotal: number; // precio_b2b * cantidad
  imagen_principal?: string; // URL de la imagen del producto
  variantLabel?: string; // Label of the variant (e.g., "S", "M", "4-5Y")
  color?: string; // Color if applicable
  size?: string; // Size if applicable
}

export interface CartB2B {
  items: CartItemB2B[];
  totalItems: number;
  totalQuantity: number;
  subtotal: number;
}

export interface OrderB2B {
  id?: string;
  seller_id: string;
  items: CartItemB2B[];
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'stripe' | 'moncash' | 'transfer';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  created_at?: string;
}

export interface B2BFilters {
  searchQuery: string;
  category: string | null;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'moq_asc' | 'moq_desc';
}

/**
 * Servicio de API para gestionar datos de productos
 * Implementa la separación estricta entre B2B y B2C
 * 
 * REGLA CRÍTICA:
 * - El backend DEBE filtrar precio_b2b y moq para clientes finales
 * - Esta función es solo para referencia del frontend
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Obtiene productos con precios B2B (solo Admin y Seller)
 * 
 * @param userRole - Rol del usuario autenticado
 * @returns Lista de productos con precios mayoristas
 */
export const getProductsB2B = async (userRole: string | null) => {
  if (userRole !== 'admin' && userRole !== 'seller') {
    throw new Error('Unauthorized: Solo Admin y Seller pueden acceder a precios B2B');
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching B2B products:', error);
    throw error;
  }
};

/**
 * Obtiene productos con precios B2C (solo Cliente Final)
 * 
 * NOTA: El backend debe asegurar que NUNCA incluya precio_b2b ni moq
 * 
 * @param filters - Filtros opcionales (categoría, vendedor, etc.)
 * @returns Lista de productos con precios minoristas
 */
export const getProductsB2C = async (filters?: {
  category?: string;
  search?: string;
}) => {
  try {
    let query = supabase
      .from('products')
      .select('id, nombre, descripcion_corta, descripcion_larga, precio_b2c, stock, galeria_imagenes, categoria_id, created_at, updated_at');

    if (filters?.category) {
      query = query.eq('categoria_id', filters.category);
    }

    if (filters?.search) {
      // Search in nombre, descripcion_corta, and descripcion_larga
      query = query.or(`nombre.ilike.%${filters.search}%,descripcion_corta.ilike.%${filters.search}%,descripcion_larga.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching B2C products:', error);
    throw error;
  }
};

/**
 * Obtiene un producto B2C específico (Cliente Final)
 * 
 * @param productId - ID del producto
 * @returns Producto con información minorista
 */
export const getProductB2C = async (productId: string) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, nombre, descripcion_larga, precio_b2c, stock, galeria_imagenes, categoria_id, created_at')
      .eq('id', productId)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
};

/**
 * Busca productos en el marketplace (Cliente Final)
 * 
 * @param searchTerm - Término de búsqueda
 * @param category - Categoría opcional
 * @returns Lista de productos que coinciden
 */
export const searchProducts = async (
  searchTerm: string,
  category?: string
) => {
  try {
    let query = supabase
      .from('products')
      .select('id, nombre, descripcion_corta, descripcion_larga, precio_b2c, stock, galeria_imagenes, categoria_id, created_at')
      .or(`nombre.ilike.%${searchTerm}%,descripcion_corta.ilike.%${searchTerm}%,descripcion_larga.ilike.%${searchTerm}%`);

    if (category) {
      query = query.eq('categoria_id', category);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error searching products:', error);
    throw error;
  }
};


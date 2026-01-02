import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserRole } from '@/types/auth';

export interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount: number;
  max_uses: number | null;
  used_count: number;
  max_uses_per_user: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: string;
  store_id: string | null;
  applies_to: 'all' | 'specific_products' | 'specific_categories';
  applicable_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountCodeParams {
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_purchase_amount?: number;
  max_uses?: number | null;
  max_uses_per_user?: number;
  valid_from?: string;
  valid_until?: string | null;
  store_id?: string | null;
  applies_to?: 'all' | 'specific_products' | 'specific_categories';
  applicable_ids?: string[];
}

export const useDiscountCodes = (storeId?: string | null) => {
  const { user, role } = useAuth();
  const isAdmin = role === UserRole.ADMIN;
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDiscountCodes = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('discount_codes')
        .select('*')
        .order('created_at', { ascending: false });

      // Si es admin y no se especifica tienda, obtener todos
      // Si es seller, filtrar por su tienda
      if (!isAdmin && storeId) {
        query = query.eq('store_id', storeId);
      } else if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setDiscountCodes(data as DiscountCode[] || []);
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      toast.error('Error al cargar códigos de descuento');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, storeId]);

  useEffect(() => {
    fetchDiscountCodes();
  }, [fetchDiscountCodes]);

  const createDiscountCode = async (params: CreateDiscountCodeParams) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('discount_codes')
        .insert({
          ...params,
          created_by: user.id,
          code: params.code.toUpperCase(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este código ya existe');
        } else {
          throw error;
        }
        return null;
      }

      toast.success('Código de descuento creado');
      await fetchDiscountCodes();
      return data as DiscountCode;
    } catch (error) {
      console.error('Error creating discount code:', error);
      toast.error('Error al crear código de descuento');
      return null;
    }
  };

  const updateDiscountCode = async (id: string, updates: Partial<CreateDiscountCodeParams>) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({
          ...updates,
          code: updates.code?.toUpperCase(),
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Código actualizado');
      await fetchDiscountCodes();
      return true;
    } catch (error) {
      console.error('Error updating discount code:', error);
      toast.error('Error al actualizar código');
      return false;
    }
  };

  const toggleDiscountCode = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'Código activado' : 'Código desactivado');
      await fetchDiscountCodes();
      return true;
    } catch (error) {
      console.error('Error toggling discount code:', error);
      toast.error('Error al cambiar estado');
      return false;
    }
  };

  const deleteDiscountCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from('discount_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Código eliminado');
      await fetchDiscountCodes();
      return true;
    } catch (error) {
      console.error('Error deleting discount code:', error);
      toast.error('Error al eliminar código');
      return false;
    }
  };

  return {
    discountCodes,
    isLoading,
    createDiscountCode,
    updateDiscountCode,
    toggleDiscountCode,
    deleteDiscountCode,
    refetch: fetchDiscountCodes,
  };
};

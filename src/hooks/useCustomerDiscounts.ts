import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { UserRole } from '@/types/auth';

export interface CustomerDiscount {
  id: string;
  customer_user_id: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  reason: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_by: string;
  store_id: string | null;
  created_at: string;
  updated_at: string;
  customer_profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export interface CreateCustomerDiscountParams {
  customer_user_id: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  reason?: string;
  valid_from?: string;
  valid_until?: string | null;
  store_id?: string | null;
}

export const useCustomerDiscounts = (storeId?: string | null) => {
  const { user, role } = useAuth();
  const isAdmin = role === UserRole.ADMIN;
  const [customerDiscounts, setCustomerDiscounts] = useState<CustomerDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomerDiscounts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('customer_discounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!isAdmin && storeId) {
        query = query.eq('store_id', storeId);
      } else if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get customer info from profiles
      const customerIds = [...new Set((data || []).map(d => d.customer_user_id))];
      
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', customerIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedData = (data || []).map(d => ({
          ...d,
          customer_email: profileMap.get(d.customer_user_id)?.email || '',
          customer_name: profileMap.get(d.customer_user_id)?.full_name || '',
        }));

        setCustomerDiscounts(enrichedData as CustomerDiscount[]);
      } else {
        setCustomerDiscounts([]);
      }
    } catch (error) {
      console.error('Error fetching customer discounts:', error);
      toast.error('Error al cargar descuentos');
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin, storeId]);

  useEffect(() => {
    fetchCustomerDiscounts();
  }, [fetchCustomerDiscounts]);

  const createCustomerDiscount = async (params: CreateCustomerDiscountParams) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('customer_discounts')
        .insert({
          ...params,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Descuento creado para el cliente');
      await fetchCustomerDiscounts();
      return data as CustomerDiscount;
    } catch (error) {
      console.error('Error creating customer discount:', error);
      toast.error('Error al crear descuento');
      return null;
    }
  };

  const updateCustomerDiscount = async (id: string, updates: Partial<CreateCustomerDiscountParams>) => {
    try {
      const { error } = await supabase
        .from('customer_discounts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Descuento actualizado');
      await fetchCustomerDiscounts();
      return true;
    } catch (error) {
      console.error('Error updating customer discount:', error);
      toast.error('Error al actualizar descuento');
      return false;
    }
  };

  const toggleCustomerDiscount = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('customer_discounts')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'Descuento activado' : 'Descuento desactivado');
      await fetchCustomerDiscounts();
      return true;
    } catch (error) {
      console.error('Error toggling customer discount:', error);
      toast.error('Error al cambiar estado');
      return false;
    }
  };

  const deleteCustomerDiscount = async (id: string) => {
    try {
      const { error } = await supabase
        .from('customer_discounts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Descuento eliminado');
      await fetchCustomerDiscounts();
      return true;
    } catch (error) {
      console.error('Error deleting customer discount:', error);
      toast.error('Error al eliminar descuento');
      return false;
    }
  };

  return {
    customerDiscounts,
    isLoading,
    createCustomerDiscount,
    updateCustomerDiscount,
    toggleCustomerDiscount,
    deleteCustomerDiscount,
    refetch: fetchCustomerDiscounts,
  };
};

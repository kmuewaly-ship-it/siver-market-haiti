import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ShippingOrigin {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useShippingOrigins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all shipping origins (for admin)
  const { data: origins, isLoading } = useQuery({
    queryKey: ['shipping-origins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_origins')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ShippingOrigin[];
    },
  });

  // Fetch only active origins (for selectors)
  const { data: activeOrigins, isLoading: loadingActive } = useQuery({
    queryKey: ['shipping-origins', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_origins')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as ShippingOrigin[];
    },
  });

  // Create origin
  const createOrigin = useMutation({
    mutationFn: async (origin: { name: string; code: string; description?: string | null; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('shipping_origins')
        .insert([origin])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-origins'] });
      toast({ title: 'País de origen creado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al crear país de origen', description: error.message, variant: 'destructive' });
    },
  });

  // Update origin
  const updateOrigin = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; code?: string; description?: string | null; is_active?: boolean }) => {
      const { error } = await supabase
        .from('shipping_origins')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-origins'] });
      toast({ title: 'País de origen actualizado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al actualizar país de origen', description: error.message, variant: 'destructive' });
    },
  });

  // Delete origin
  const deleteOrigin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('shipping_origins')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipping-origins'] });
      toast({ title: 'País de origen eliminado exitosamente' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error al eliminar país de origen', description: error.message, variant: 'destructive' });
    },
  });

  return {
    origins,
    activeOrigins,
    isLoading,
    loadingActive,
    createOrigin,
    updateOrigin,
    deleteOrigin,
  };
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface MarketplaceSectionSetting {
  id: string;
  section_key: string;
  title: string;
  description: string | null;
  is_enabled: boolean;
  sort_order: number;
  item_limit: number;
  display_mode: string;
  custom_config: Json;
  target_audience: string;
  created_at: string;
  updated_at: string;
}

export const useMarketplaceSectionSettings = () => {
  return useQuery({
    queryKey: ['marketplace-section-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_section_settings')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as MarketplaceSectionSetting[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
};

export const useSectionSetting = (sectionKey: string) => {
  return useQuery({
    queryKey: ['marketplace-section-settings', sectionKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_section_settings')
        .select('*')
        .eq('section_key', sectionKey)
        .single();

      if (error) {
        console.error(`Error fetching section setting for ${sectionKey}:`, error);
        return null;
      }
      return data as MarketplaceSectionSetting;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateSectionSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<Omit<MarketplaceSectionSetting, 'id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { data, error } = await supabase
        .from('marketplace_section_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-section-settings'] });
    },
  });
};

export const useReorderSections = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sections: { id: string; sort_order: number }[]) => {
      const promises = sections.map(({ id, sort_order }) =>
        supabase
          .from('marketplace_section_settings')
          .update({ sort_order })
          .eq('id', id)
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error('Error reordering sections');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketplace-section-settings'] });
    },
  });
};

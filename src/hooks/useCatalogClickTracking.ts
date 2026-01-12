import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClickStats {
  totalClicks: number;
  pdfClicks: number;
  whatsappClicks: number;
  directClicks: number;
  mobileClicks: number;
  desktopClicks: number;
  conversionRate: number;
  topProducts: Array<{
    product_id: string;
    product_name: string;
    clicks: number;
    conversions: number;
  }>;
  clicksByDay: Array<{
    date: string;
    clicks: number;
  }>;
}

export interface ProductClickDetail {
  id: string;
  product_id: string;
  product_name: string;
  variant_id: string | null;
  source_type: string;
  clicked_at: string;
  converted_to_cart: boolean;
  device_type: string;
}

export const useCatalogClickTracking = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Track a click (called from frontend when user clicks a tracked link)
  const trackClick = useCallback(async (params: {
    sellerId: string;
    productId?: string;
    variantId?: string;
    sourceType: 'pdf_catalog' | 'whatsapp_status' | 'direct_link';
    sourceCampaign?: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke('track-catalog-click', {
        body: {
          seller_id: params.sellerId,
          product_id: params.productId,
          variant_id: params.variantId,
          source_type: params.sourceType,
          source_campaign: params.sourceCampaign,
        },
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error tracking click:', error);
      return false;
    }
  }, []);

  // Get tracking pixel URL for embedding in images/PDFs
  const getTrackingPixelUrl = useCallback((params: {
    sellerId: string;
    productId?: string;
    variantId?: string;
    sourceType: 'pdf_catalog' | 'whatsapp_status' | 'direct_link';
    sourceCampaign?: string;
  }) => {
    const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-catalog-click`;
    const queryParams = new URLSearchParams({
      sid: params.sellerId,
      src: params.sourceType,
    });
    
    if (params.productId) queryParams.set('pid', params.productId);
    if (params.variantId) queryParams.set('vid', params.variantId);
    if (params.sourceCampaign) queryParams.set('camp', params.sourceCampaign);

    return `${baseUrl}?${queryParams.toString()}`;
  }, []);

  // Fetch click statistics for seller dashboard
  const fetchClickStats = useCallback(async (
    storeId: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<ClickStats | null> => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('catalog_click_tracking')
        .select('*')
        .eq('seller_id', storeId);

      if (dateFrom) {
        query = query.gte('clicked_at', dateFrom.toISOString());
      }
      if (dateTo) {
        query = query.lte('clicked_at', dateTo.toISOString());
      }

      const { data: clicks, error } = await query;

      if (error) throw error;

      if (!clicks || clicks.length === 0) {
        return {
          totalClicks: 0,
          pdfClicks: 0,
          whatsappClicks: 0,
          directClicks: 0,
          mobileClicks: 0,
          desktopClicks: 0,
          conversionRate: 0,
          topProducts: [],
          clicksByDay: [],
        };
      }

      // Calculate stats
      const totalClicks = clicks.length;
      const pdfClicks = clicks.filter(c => c.source_type === 'pdf_catalog').length;
      const whatsappClicks = clicks.filter(c => c.source_type === 'whatsapp_status').length;
      const directClicks = clicks.filter(c => c.source_type === 'direct_link').length;
      const mobileClicks = clicks.filter(c => c.device_type === 'mobile').length;
      const desktopClicks = clicks.filter(c => c.device_type === 'desktop').length;
      const conversions = clicks.filter(c => c.converted_to_cart).length;
      const conversionRate = totalClicks > 0 ? (conversions / totalClicks) * 100 : 0;

      // Top products by clicks
      const productClickCounts = new Map<string, { clicks: number; conversions: number }>();
      clicks.forEach(click => {
        if (click.product_id) {
          const current = productClickCounts.get(click.product_id) || { clicks: 0, conversions: 0 };
          current.clicks++;
          if (click.converted_to_cart) current.conversions++;
          productClickCounts.set(click.product_id, current);
        }
      });

      // Get product names
      const productIds = Array.from(productClickCounts.keys());
      const { data: products } = await supabase
        .from('seller_catalog')
        .select('source_product_id, nombre')
        .in('source_product_id', productIds)
        .eq('seller_store_id', storeId);

      const productNameMap = new Map<string, string>();
      products?.forEach(p => {
        if (p.source_product_id) {
          productNameMap.set(p.source_product_id, p.nombre);
        }
      });

      const topProducts = Array.from(productClickCounts.entries())
        .map(([product_id, stats]) => ({
          product_id,
          product_name: productNameMap.get(product_id) || 'Producto desconocido',
          clicks: stats.clicks,
          conversions: stats.conversions,
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);

      // Clicks by day
      const clicksByDayMap = new Map<string, number>();
      clicks.forEach(click => {
        const date = click.clicked_at?.split('T')[0] || '';
        if (date) {
          clicksByDayMap.set(date, (clicksByDayMap.get(date) || 0) + 1);
        }
      });

      const clicksByDay = Array.from(clicksByDayMap.entries())
        .map(([date, count]) => ({ date, clicks: count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalClicks,
        pdfClicks,
        whatsappClicks,
        directClicks,
        mobileClicks,
        desktopClicks,
        conversionRate,
        topProducts,
        clicksByDay,
      };
    } catch (error) {
      console.error('Error fetching click stats:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark a click as converted (when user adds to cart)
  const markConversion = useCallback(async (
    sellerId: string,
    productId: string,
    variantId?: string
  ) => {
    try {
      // Find the most recent non-converted click for this product
      const { data: recentClick, error: fetchError } = await supabase
        .from('catalog_click_tracking')
        .select('id')
        .eq('seller_id', sellerId)
        .eq('product_id', productId)
        .eq('converted_to_cart', false)
        .order('clicked_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (recentClick) {
        const { error: updateError } = await supabase
          .from('catalog_click_tracking')
          .update({ 
            converted_to_cart: true,
            converted_at: new Date().toISOString(),
          })
          .eq('id', recentClick.id);

        if (updateError) throw updateError;
      }

      return true;
    } catch (error) {
      console.error('Error marking conversion:', error);
      return false;
    }
  }, []);

  return {
    trackClick,
    getTrackingPixelUrl,
    fetchClickStats,
    markConversion,
    isLoading,
  };
};

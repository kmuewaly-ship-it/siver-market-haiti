import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WishlistProductStat {
  product_id: string | null;
  seller_catalog_id: string | null;
  name: string;
  image: string;
  count: number;
  type: 'B2B' | 'B2C';
}

export const useAdminWishlistStats = () => {
  // Get B2B wishlist stats (products from main catalog)
  const { data: b2bStats = [], isLoading: isLoadingB2B } = useQuery({
    queryKey: ['admin-wishlist-stats', 'B2B'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          product_id,
          products:product_id (
            id,
            nombre,
            imagen_principal
          )
        `)
        .eq('type', 'B2B')
        .not('product_id', 'is', null);

      if (error) {
        console.error('Error fetching B2B wishlist stats:', error);
        return [];
      }

      // Group by product_id and count
      const productCounts = new Map<string, { product: any; count: number }>();
      
      (data || []).forEach((item: any) => {
        if (item.product_id && item.products) {
          const existing = productCounts.get(item.product_id);
          if (existing) {
            existing.count++;
          } else {
            productCounts.set(item.product_id, { product: item.products, count: 1 });
          }
        }
      });

      // Convert to array and sort by count
      return Array.from(productCounts.entries())
        .map(([productId, { product, count }]): WishlistProductStat => ({
          product_id: productId,
          seller_catalog_id: null,
          name: product.nombre || 'Producto',
          image: product.imagen_principal || '/placeholder.svg',
          count,
          type: 'B2B',
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Get B2C wishlist stats (products from seller catalog)
  const { data: b2cStats = [], isLoading: isLoadingB2C } = useQuery({
    queryKey: ['admin-wishlist-stats', 'B2C'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          seller_catalog_id,
          seller_catalog:seller_catalog_id (
            id,
            nombre,
            imagen_principal
          )
        `)
        .eq('type', 'B2C')
        .not('seller_catalog_id', 'is', null);

      if (error) {
        console.error('Error fetching B2C wishlist stats:', error);
        return [];
      }

      // Group by seller_catalog_id and count
      const productCounts = new Map<string, { product: any; count: number }>();
      
      (data || []).forEach((item: any) => {
        if (item.seller_catalog_id && item.seller_catalog) {
          const existing = productCounts.get(item.seller_catalog_id);
          if (existing) {
            existing.count++;
          } else {
            productCounts.set(item.seller_catalog_id, { product: item.seller_catalog, count: 1 });
          }
        }
      });

      // Convert to array and sort by count
      return Array.from(productCounts.entries())
        .map(([catalogId, { product, count }]): WishlistProductStat => ({
          product_id: null,
          seller_catalog_id: catalogId,
          name: product.nombre || 'Producto',
          image: product.imagen_principal || '/placeholder.svg',
          count,
          type: 'B2C',
        }))
        .sort((a, b) => b.count - a.count);
    },
  });

  // Get total counts
  const { data: totals, isLoading: isLoadingTotals } = useQuery({
    queryKey: ['admin-wishlist-totals'],
    queryFn: async () => {
      const [b2bResult, b2cResult] = await Promise.all([
        supabase.from('user_favorites').select('id', { count: 'exact', head: true }).eq('type', 'B2B'),
        supabase.from('user_favorites').select('id', { count: 'exact', head: true }).eq('type', 'B2C'),
      ]);

      return {
        b2b: b2bResult.count || 0,
        b2c: b2cResult.count || 0,
        total: (b2bResult.count || 0) + (b2cResult.count || 0),
      };
    },
  });

  return {
    b2bStats,
    b2cStats,
    totals: totals || { b2b: 0, b2c: 0, total: 0 },
    isLoading: isLoadingB2B || isLoadingB2C || isLoadingTotals,
  };
};

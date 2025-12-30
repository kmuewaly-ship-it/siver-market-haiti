import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PreviewDetail {
  parentSku: string;
  variantCount: number;
  sampleName: string;
  colorsFound: string[];
  sizesFound: string[];
  agesFound: string[];
  totalStock: number;
}

interface PreviewResult {
  success: boolean;
  totalProducts: number;
  uniqueParentSkus: number;
  details: PreviewDetail[];
}

interface MigrationDetail {
  parentSku: string;
  variantCount: number;
  colorsFound: string[];
  sizesFound: string[];
  agesFound: string[];
}

interface MigrationResult {
  success: boolean;
  parentProductsCreated: number;
  variantsCreated: number;
  attributeOptionsCreated: number;
  errors: string[];
  details: MigrationDetail[];
}

export function useNormalizeProducts() {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const { toast } = useToast();

  const fetchPreview = async (): Promise<PreviewResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('normalize-products', {
        body: { action: 'preview' },
      });

      if (error) {
        console.error('Error fetching preview:', error);
        toast({
          title: 'Error',
          description: 'No se pudo obtener la vista previa de productos',
          variant: 'destructive',
        });
        return null;
      }

      setPreviewData(data as PreviewResult);
      return data as PreviewResult;
    } catch (err) {
      console.error('Error in fetchPreview:', err);
      toast({
        title: 'Error',
        description: 'Error de conexión al servidor',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeMigration = async (dryRun = false): Promise<MigrationResult | null> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('normalize-products', {
        body: { action: 'migrate', dryRun },
      });

      if (error) {
        console.error('Error executing migration:', error);
        toast({
          title: 'Error',
          description: 'No se pudo ejecutar la migración',
          variant: 'destructive',
        });
        return null;
      }

      const result = data as MigrationResult;
      setMigrationResult(result);

      if (result.success && !dryRun) {
        toast({
          title: 'Migración Completada',
          description: `${result.parentProductsCreated} productos padre, ${result.variantsCreated} variantes creadas`,
        });
      }

      return result;
    } catch (err) {
      console.error('Error in executeMigration:', err);
      toast({
        title: 'Error',
        description: 'Error de conexión al servidor',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setPreviewData(null);
    setMigrationResult(null);
  };

  return {
    isLoading,
    previewData,
    migrationResult,
    fetchPreview,
    executeMigration,
    reset,
  };
}

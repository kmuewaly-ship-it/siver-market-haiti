import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AssetItem {
  id?: string;
  skuInterno: string;
  originalUrl: string;
  rowIndex: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  publicUrl?: string;
  error?: string;
}

export interface AssetProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalAssets: number;
  processedAssets: number;
  failedAssets: number;
}

export interface AssetProcessingState {
  isProcessing: boolean;
  job: AssetProcessingJob | null;
  items: AssetItem[];
  progress: number;
  currentItemIndex: number;
}

export function useAssetProcessing() {
  const [state, setState] = useState<AssetProcessingState>({
    isProcessing: false,
    job: null,
    items: [],
    progress: 0,
    currentItemIndex: 0
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create a new processing job
  const createJob = useCallback(async (items: Array<{ skuInterno: string; originalUrl: string; rowIndex: number }>) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, items: items.map(item => ({ ...item, status: 'pending' as const })) }));
      
      const { data, error } = await supabase.functions.invoke('process-product-images', {
        body: { action: 'create_job', items }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      setState(prev => ({
        ...prev,
        job: {
          id: data.jobId,
          status: 'processing',
          totalAssets: items.length,
          processedAssets: 0,
          failedAssets: 0
        },
        items: data.items?.map((item: any, idx: number) => ({
          ...items[idx],
          id: item.id,
          status: item.status
        })) || prev.items
      }));
      
      return data.jobId;
    } catch (error) {
      console.error('Error creating job:', error);
      setState(prev => ({ ...prev, isProcessing: false }));
      throw error;
    }
  }, []);

  // Process a single item
  const processItem = useCallback(async (itemId: string): Promise<{ success: boolean; publicUrl?: string; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('process-product-images', {
        body: { action: 'process_item', itemId }
      });
      
      if (error) throw error;
      
      const result = data.items?.[0];
      return {
        success: result?.status === 'completed',
        publicUrl: result?.publicUrl,
        error: result?.error
      };
    } catch (error) {
      console.error('Error processing item:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }, []);

  // Process all items sequentially with progress updates
  const processAllItems = useCallback(async (
    onItemComplete?: (item: AssetItem, index: number) => void
  ): Promise<{ completed: number; failed: number; urlMap: Record<string, string> }> => {
    abortControllerRef.current = new AbortController();
    
    const urlMap: Record<string, string> = {};
    let completed = 0;
    let failed = 0;
    
    const currentItems = [...state.items];
    
    // Debug: Log items
    console.log('Processing items:', currentItems);
    
    for (let i = 0; i < currentItems.length; i++) {
      if (abortControllerRef.current?.signal.aborted) {
        break;
      }
      
      const item = currentItems[i];
      
      // Debug: Log item
      console.log(`Processing item ${i}:`, item);
      
      if (!item.id) {
        console.error(`Item ${i} has no ID, skipping. Item:`, item);
        failed++;
        continue;
      }
      
      // Update current item to processing
      setState(prev => ({
        ...prev,
        currentItemIndex: i,
        progress: Math.round((i / currentItems.length) * 100),
        items: prev.items.map((it, idx) => 
          idx === i ? { ...it, status: 'processing' as const } : it
        )
      }));
      
      const result = await processItem(item.id);
      
      console.log(`Result for item ${i}:`, result);
      
      if (result.success && result.publicUrl) {
        completed++;
        urlMap[item.skuInterno] = result.publicUrl;
        urlMap[item.originalUrl] = result.publicUrl; // Also map by original URL
        
        setState(prev => ({
          ...prev,
          items: prev.items.map((it, idx) => 
            idx === i ? { ...it, status: 'completed' as const, publicUrl: result.publicUrl } : it
          ),
          job: prev.job ? { ...prev.job, processedAssets: completed, failedAssets: failed } : null
        }));
      } else {
        failed++;
        
        setState(prev => ({
          ...prev,
          items: prev.items.map((it, idx) => 
            idx === i ? { ...it, status: 'failed' as const, error: result.error } : it
          ),
          job: prev.job ? { ...prev.job, processedAssets: completed, failedAssets: failed } : null
        }));
      }
      
      onItemComplete?.(
        { ...item, status: result.success ? 'completed' : 'failed', publicUrl: result.publicUrl, error: result.error },
        i
      );
    }
    
    // Final state update
    setState(prev => ({
      ...prev,
      isProcessing: false,
      progress: 100,
      job: prev.job ? { 
        ...prev.job, 
        status: failed === prev.items.length ? 'failed' : 'completed',
        processedAssets: completed,
        failedAssets: failed
      } : null
    }));
    
    console.log('Processing complete:', { completed, failed });
    return { completed, failed, urlMap };
  }, [state.items, processItem]);

  // Retry a failed item
  const retryItem = useCallback(async (itemId: string) => {
    try {
      // Reset item status
      await supabase.functions.invoke('process-product-images', {
        body: { action: 'retry_item', itemId }
      });
      
      // Update local state
      setState(prev => ({
        ...prev,
        items: prev.items.map(it => 
          it.id === itemId ? { ...it, status: 'pending' as const, error: undefined } : it
        )
      }));
      
      // Process the item
      const result = await processItem(itemId);
      
      setState(prev => ({
        ...prev,
        items: prev.items.map(it => 
          it.id === itemId ? { 
            ...it, 
            status: result.success ? 'completed' as const : 'failed' as const,
            publicUrl: result.publicUrl,
            error: result.error
          } : it
        )
      }));
      
      return result;
    } catch (error) {
      console.error('Error retrying item:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }, [processItem]);

  // Abort processing
  const abortProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({ ...prev, isProcessing: false }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      isProcessing: false,
      job: null,
      items: [],
      progress: 0,
      currentItemIndex: 0
    });
  }, []);

  // Get job status
  const refreshJobStatus = useCallback(async () => {
    if (!state.job?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('process-product-images', {
        body: { action: 'get_job_status', jobId: state.job.id }
      });
      
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      
      setState(prev => ({
        ...prev,
        job: data.job,
        items: data.items?.map((item: any) => ({
          id: item.id,
          skuInterno: item.skuInterno,
          originalUrl: prev.items.find(i => i.id === item.id)?.originalUrl || '',
          rowIndex: prev.items.find(i => i.id === item.id)?.rowIndex || 0,
          status: item.status,
          publicUrl: item.publicUrl,
          error: item.error
        })) || prev.items
      }));
    } catch (error) {
      console.error('Error refreshing job status:', error);
    }
  }, [state.job?.id]);

  return {
    state,
    createJob,
    processAllItems,
    retryItem,
    abortProcessing,
    reset,
    refreshJobStatus,
    // Computed values
    isComplete: state.job?.status === 'completed' || state.job?.status === 'failed',
    hasFailures: state.items.some(i => i.status === 'failed'),
    allCompleted: state.items.length > 0 && state.items.every(i => i.status === 'completed'),
    pendingItems: state.items.filter(i => i.status === 'pending' || i.status === 'failed'),
    completedItems: state.items.filter(i => i.status === 'completed')
  };
}

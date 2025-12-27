import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TrackingStatus = 'pending' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'exception';

export interface TrackingEvent {
  id: string;
  order_id: string;
  status: TrackingStatus;
  location: string;
  timestamp: string;
  description: string;
  created_at: string;
}

export interface PackageTracking {
  id: string;
  order_id: string;
  carrier: string;
  tracking_number: string;
  current_status: TrackingStatus;
  current_location: string;
  estimated_delivery: string | null;
  events: TrackingEvent[];
  is_delivered: boolean;
  created_at: string;
  updated_at: string;
}

export const usePackageTracking = (orderId: string) => {
  const [tracking, setTracking] = useState<PackageTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTracking = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: queryError } = await supabase
          .from('package_tracking')
          .select(`
            *,
            tracking_events(*)
          `)
          .eq('order_id', orderId)
          .single();

        if (queryError) {
          if (queryError.code === 'PGRST116') {
            // No tracking found - this is ok
            setTracking(null);
          } else {
            throw queryError;
          }
        } else if (data) {
          setTracking(data as PackageTracking);
        }
      } catch (err) {
        console.error('Error fetching tracking:', err);
        setError('No se pudo cargar el rastreo');
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId) {
      fetchTracking();
    }
  }, [orderId]);

  const updateTrackingStatus = async (
    trackingId: string,
    status: TrackingStatus,
    location: string,
    description: string
  ) => {
    try {
      // Add event
      const { error: eventError } = await supabase
        .from('tracking_events')
        .insert([{
          package_tracking_id: trackingId,
          status,
          location,
          description,
        }]);

      if (eventError) throw eventError;

      // Update tracking status
      const { error: updateError } = await supabase
        .from('package_tracking')
        .update({
          current_status: status,
          current_location: location,
          updated_at: new Date().toISOString(),
          is_delivered: status === 'delivered',
        })
        .eq('id', trackingId);

      if (updateError) throw updateError;

      // Refetch
      const { data } = await supabase
        .from('package_tracking')
        .select('*, tracking_events(*)')
        .eq('id', trackingId)
        .single();

      if (data) {
        setTracking(data as PackageTracking);
      }
    } catch (err) {
      console.error('Error updating tracking:', err);
      setError('Error al actualizar rastreo');
      throw err;
    }
  };

  const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string => {
    const urls: Record<string, string> = {
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'DPD': `https://tracking.dpd.de/parceltracking?locale=en_EN&query=${trackingNumber}`,
      'GLS': `https://gls-group.eu/276-EN/parcel/tracking/${trackingNumber}`,
    };

    return urls[carrier] || '';
  };

  return {
    tracking,
    isLoading,
    error,
    updateTrackingStatus,
    getCarrierTrackingUrl,
  };
};

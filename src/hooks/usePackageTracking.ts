import { useState } from 'react';

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

// Mock hook - Supabase tables need to be created first
export const usePackageTracking = (orderId: string) => {
  const [tracking] = useState<PackageTracking | null>(null);
  const [isLoading] = useState(false);

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
    error: null,
    getCarrierTrackingUrl,
  };
};

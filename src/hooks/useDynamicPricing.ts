import { useState, useCallback, useMemo } from 'react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { calculateDistanceKm } from '@/hooks/useGeolocation';

// Warehouse location (Port-au-Prince)
const WAREHOUSE_LOCATION = { lat: 18.5944, lng: -72.3074 };

// Pricing configuration
const SHIPPING_CONFIG = {
  baseRate: 2.00, // Base shipping fee in USD
  perKmRate: 0.15, // Per kilometer rate
  freeShippingThreshold: 50, // Free shipping over this amount
  maxShippingFee: 15, // Cap shipping at this amount
};

export interface PricingBreakdown {
  subtotal: number;
  shippingFee: number;
  shippingDistance?: number;
  commissionAmount: number;
  commissionPercentage: number;
  taxAmount: number;
  taxPercentage: number;
  platformFee: number;
  total: number;
  sellerNet: number;
  isFreeShipping: boolean;
}

export interface DynamicPricingInput {
  subtotal: number;
  pickupPointLocation?: { lat: number; lng: number } | null;
  sellerId?: string;
  sellerOverride?: {
    commission_percentage?: number | null;
    commission_fixed?: number | null;
    tax_tca_percentage?: number | null;
  } | null;
  isDelivery?: boolean; // true = home delivery, false = pickup point
}

export const useDynamicPricing = () => {
  const { config, isLoading: settingsLoading } = usePlatformSettings();
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate shipping based on distance
  const calculateShipping = useCallback(
    (
      pickupLocation: { lat: number; lng: number } | null | undefined,
      subtotal: number,
      isDelivery: boolean
    ): { fee: number; distance: number | null; isFree: boolean } => {
      // Pickup points have no shipping fee
      if (!isDelivery || !pickupLocation) {
        return { fee: 0, distance: null, isFree: true };
      }

      // Calculate distance from warehouse
      const distance = calculateDistanceKm(
        WAREHOUSE_LOCATION.lat,
        WAREHOUSE_LOCATION.lng,
        pickupLocation.lat,
        pickupLocation.lng
      );

      // Free shipping over threshold
      if (subtotal >= SHIPPING_CONFIG.freeShippingThreshold) {
        return { fee: 0, distance, isFree: true };
      }

      // Calculate fee
      const calculatedFee = SHIPPING_CONFIG.baseRate + (distance * SHIPPING_CONFIG.perKmRate);
      const fee = Math.min(calculatedFee, SHIPPING_CONFIG.maxShippingFee);

      return { fee: Math.round(fee * 100) / 100, distance, isFree: false };
    },
    []
  );

  // Main pricing calculation
  const calculatePricing = useCallback(
    (input: DynamicPricingInput): PricingBreakdown => {
      const {
        subtotal,
        pickupPointLocation,
        sellerOverride,
        isDelivery = false,
      } = input;

      // Get commission rates (use override if available)
      const commissionPercentage = sellerOverride?.commission_percentage ?? config.commission_percentage;
      const commissionFixed = sellerOverride?.commission_fixed ?? config.commission_fixed;
      const taxPercentage = sellerOverride?.tax_tca_percentage ?? config.tax_tca_percentage;

      // Calculate shipping
      const shippingResult = calculateShipping(pickupPointLocation, subtotal, isDelivery);

      // Calculate commission
      const commissionPercent = (subtotal * commissionPercentage) / 100;
      const commissionAmount = commissionPercent + commissionFixed;

      // Calculate tax (TCA)
      const taxAmount = (subtotal * taxPercentage) / 100;

      // Platform fee (commission + tax)
      const platformFee = commissionAmount + taxAmount;

      // Total customer pays
      const total = subtotal + shippingResult.fee;

      // What seller receives after fees
      const sellerNet = subtotal - platformFee;

      return {
        subtotal,
        shippingFee: shippingResult.fee,
        shippingDistance: shippingResult.distance ?? undefined,
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        commissionPercentage,
        taxAmount: Math.round(taxAmount * 100) / 100,
        taxPercentage,
        platformFee: Math.round(platformFee * 100) / 100,
        total: Math.round(total * 100) / 100,
        sellerNet: Math.round(sellerNet * 100) / 100,
        isFreeShipping: shippingResult.isFree,
      };
    },
    [config, calculateShipping]
  );

  // Calculate estimate for display (async wrapper)
  const calculateEstimate = useCallback(
    async (input: DynamicPricingInput): Promise<PricingBreakdown> => {
      setIsCalculating(true);
      try {
        // Simulate API delay if needed
        return calculatePricing(input);
      } finally {
        setIsCalculating(false);
      }
    },
    [calculatePricing]
  );

  // Helper to format pricing for display
  const formatPricing = useCallback((pricing: PricingBreakdown) => {
    return {
      subtotal: `$${pricing.subtotal.toFixed(2)}`,
      shipping: pricing.isFreeShipping ? 'Gratis' : `$${pricing.shippingFee.toFixed(2)}`,
      commission: `$${pricing.commissionAmount.toFixed(2)} (${pricing.commissionPercentage}%)`,
      tax: `$${pricing.taxAmount.toFixed(2)} (${pricing.taxPercentage}% TCA)`,
      total: `$${pricing.total.toFixed(2)}`,
      sellerNet: `$${pricing.sellerNet.toFixed(2)}`,
      distance: pricing.shippingDistance ? `${pricing.shippingDistance.toFixed(1)} km` : null,
    };
  }, []);

  return {
    calculatePricing,
    calculateEstimate,
    formatPricing,
    isCalculating,
    isLoading: settingsLoading,
    config,
    shippingConfig: SHIPPING_CONFIG,
  };
};

// Hook for checkout page with memoized pricing
export const useCheckoutPricing = (
  subtotal: number,
  pickupLocation?: { lat: number; lng: number } | null,
  isDelivery: boolean = false
) => {
  const { calculatePricing, isLoading, config } = useDynamicPricing();

  const pricing = useMemo(() => {
    if (isLoading) return null;
    return calculatePricing({
      subtotal,
      pickupPointLocation: pickupLocation,
      isDelivery,
    });
  }, [subtotal, pickupLocation, isDelivery, calculatePricing, isLoading]);

  return { pricing, isLoading, config };
};

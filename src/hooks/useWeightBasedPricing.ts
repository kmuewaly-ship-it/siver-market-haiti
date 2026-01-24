import { useMemo, useCallback } from 'react';

/**
 * Divisor for volumetric weight calculation
 * Standard: 5000 (cm³ to kg ratio for air freight)
 */
const VOLUMETRIC_DIVISOR = 5000;

export interface ProductWeight {
  id: string;
  weight_kg: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  is_oversize: boolean;
}

export interface WeightCalculationResult {
  realWeight: number;
  roundedWeight: number;
  volumetricWeight: number | null;
  chargeableWeight: number;
  isVolumetricApplied: boolean;
  weightSource: 'real' | 'volumetric';
}

export interface CartWeightSummary {
  totalRealWeight: number;
  totalRoundedWeight: number;
  totalVolumetricWeight: number;
  totalChargeableWeight: number;
  hasOversizeItems: boolean;
  itemsWithoutWeight: string[];
}

/**
 * Round weight up to nearest kg
 * Example: 0.3 kg → 1 kg, 1.2 kg → 2 kg, 2.0 kg → 2 kg
 */
export const roundWeightUp = (weight: number): number => {
  if (weight <= 0) return 0;
  return Math.ceil(weight);
};

/**
 * Calculate volumetric weight from dimensions
 * Formula: (L × W × H) / 5000
 */
export const calculateVolumetricWeight = (
  length_cm: number | null | undefined,
  width_cm: number | null | undefined,
  height_cm: number | null | undefined
): number | null => {
  if (!length_cm || !width_cm || !height_cm) return null;
  if (length_cm <= 0 || width_cm <= 0 || height_cm <= 0) return null;
  
  const volumetricWeight = (length_cm * width_cm * height_cm) / VOLUMETRIC_DIVISOR;
  return Math.round(volumetricWeight * 1000) / 1000; // Round to 3 decimals
};

/**
 * Determine chargeable weight for a single product
 * 
 * Rules:
 * 1. Default: Use real weight (rounded up per unit or summed in cart)
 * 2. Oversize Exception: Compare real vs volumetric, charge the higher
 */
export const calculateChargeableWeight = (product: ProductWeight): WeightCalculationResult => {
  const realWeight = product.weight_kg || 0;
  const volumetricWeight = calculateVolumetricWeight(
    product.length_cm,
    product.width_cm,
    product.height_cm
  );
  
  // For non-oversize products, ONLY use real weight
  if (!product.is_oversize) {
    return {
      realWeight,
      roundedWeight: roundWeightUp(realWeight),
      volumetricWeight: null, // Not calculated for standard
      chargeableWeight: realWeight, // Raw weight (rounding applied at cart level)
      isVolumetricApplied: false,
      weightSource: 'real',
    };
  }
  
  // For oversize products, compare real vs volumetric
  const isVolumetricHigher = volumetricWeight !== null && volumetricWeight > realWeight;
  const chargeableWeight = isVolumetricHigher ? volumetricWeight : realWeight;
  
  return {
    realWeight,
    roundedWeight: roundWeightUp(realWeight),
    volumetricWeight,
    chargeableWeight,
    isVolumetricApplied: isVolumetricHigher,
    weightSource: isVolumetricHigher ? 'volumetric' : 'real',
  };
};

/**
 * Hook for weight-based pricing calculations
 */
export function useWeightBasedPricing() {
  /**
   * Calculate weight for a single product
   */
  const getProductWeight = useCallback((product: ProductWeight): WeightCalculationResult => {
    return calculateChargeableWeight(product);
  }, []);

  /**
   * Calculate consolidated weight for a cart
   * 
   * Key Rule: Sum all real weights first, then apply rounding to the GRAND TOTAL
   * This avoids penalizing customers with multiple small items
   */
  const calculateCartWeight = useCallback((
    items: Array<ProductWeight & { quantity: number }>
  ): CartWeightSummary => {
    let totalRealWeight = 0;
    let totalVolumetricWeight = 0;
    let hasOversizeItems = false;
    const itemsWithoutWeight: string[] = [];
    
    for (const item of items) {
      const qty = item.quantity || 1;
      
      // Check for missing weight
      if (item.weight_kg === null || item.weight_kg === undefined) {
        itemsWithoutWeight.push(item.id);
      }
      
      const weightInfo = calculateChargeableWeight(item);
      
      // Sum raw weights (no individual rounding)
      totalRealWeight += weightInfo.realWeight * qty;
      
      // Track volumetric for oversize items
      if (item.is_oversize && weightInfo.volumetricWeight) {
        totalVolumetricWeight += weightInfo.chargeableWeight * qty;
        hasOversizeItems = true;
      } else {
        totalVolumetricWeight += weightInfo.realWeight * qty;
      }
    }
    
    // Apply rounding to grand total (Peso Real Redondeado)
    const totalRoundedWeight = roundWeightUp(totalRealWeight);
    
    // For mixed carts with oversize items, use max of real vs volumetric
    const totalChargeableWeight = hasOversizeItems
      ? Math.max(totalRoundedWeight, roundWeightUp(totalVolumetricWeight))
      : totalRoundedWeight;
    
    return {
      totalRealWeight: Math.round(totalRealWeight * 1000) / 1000,
      totalRoundedWeight,
      totalVolumetricWeight: Math.round(totalVolumetricWeight * 1000) / 1000,
      totalChargeableWeight,
      hasOversizeItems,
      itemsWithoutWeight,
    };
  }, []);

  /**
   * Calculate shipping cost based on weight
   */
  const calculateWeightBasedShipping = useCallback((
    chargeableWeight: number,
    costPerKg: number,
    minCost: number = 0
  ): number => {
    const cost = chargeableWeight * costPerKg;
    return Math.max(cost, minCost);
  }, []);

  /**
   * Validate if a product can be shown in B2B catalog
   * Products without weight should be hidden/flagged
   */
  const canShowInB2BCatalog = useCallback((product: ProductWeight): boolean => {
    return product.weight_kg !== null && product.weight_kg > 0;
  }, []);

  /**
   * Get weight validation status for a product
   */
  const getWeightStatus = useCallback((product: ProductWeight): {
    status: 'valid' | 'missing' | 'warning';
    message: string;
  } => {
    if (product.weight_kg === null || product.weight_kg === undefined) {
      return {
        status: 'missing',
        message: 'Pendiente de peso',
      };
    }
    
    if (product.weight_kg <= 0) {
      return {
        status: 'warning',
        message: 'Peso inválido (debe ser > 0)',
      };
    }
    
    if (product.is_oversize && (!product.length_cm || !product.width_cm || !product.height_cm)) {
      return {
        status: 'warning',
        message: 'Producto oversize sin dimensiones completas',
      };
    }
    
    return {
      status: 'valid',
      message: 'Peso configurado correctamente',
    };
  }, []);

  return {
    getProductWeight,
    calculateCartWeight,
    calculateWeightBasedShipping,
    canShowInB2BCatalog,
    getWeightStatus,
    roundWeightUp,
    calculateVolumetricWeight,
  };
}

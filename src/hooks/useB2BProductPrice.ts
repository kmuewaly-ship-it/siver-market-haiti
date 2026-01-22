import { useMemo } from 'react';
import { useB2BPriceCalculator } from './useB2BPriceCalculator';

export interface B2BPriceInfo {
  factoryCost: number;
  calculatedPrice: number; // Final B2B price with margin + logistics
  marginPercent: number;
  marginValue: number;
  logisticsCost: number;
  categoryFees: number;
  estimatedDays: { min: number; max: number };
  routeName: string;
  suggestedPVP: number;
  profitAmount: number;
  roiPercent: number;
}

interface ProductInput {
  factoryCost: number;
  categoryId?: string;
  weight?: number;
}

/**
 * Hook to get the calculated B2B price for a single product
 * This ensures price consistency across the platform by always using the pricing engine
 */
export function useB2BProductPrice(
  product: ProductInput | null | undefined,
  destinationCountryCode?: string
): B2BPriceInfo | null {
  const priceCalculator = useB2BPriceCalculator(destinationCountryCode);
  
  return useMemo(() => {
    if (!product || !product.factoryCost || product.factoryCost <= 0) {
      return null;
    }
    
    const calculated = priceCalculator.calculateProductPrice({
      id: 'temp',
      factoryCost: product.factoryCost,
      categoryId: product.categoryId,
      weight: product.weight || 0.5,
    });
    
    return {
      factoryCost: calculated.factoryCost,
      calculatedPrice: calculated.finalB2BPrice,
      marginPercent: calculated.marginPercent,
      marginValue: calculated.marginValue,
      logisticsCost: calculated.logisticsCost,
      categoryFees: calculated.categoryFees,
      estimatedDays: calculated.logistics?.estimatedDays || { min: 10, max: 20 },
      routeName: calculated.logistics?.routeName || 'Ruta estándar',
      suggestedPVP: calculated.suggestedPVP,
      profitAmount: calculated.profitAmount,
      roiPercent: calculated.roiPercent,
    };
  }, [product?.factoryCost, product?.categoryId, product?.weight, priceCalculator]);
}

/**
 * Hook to get the calculated B2B price for a variant
 * Takes the variant's specific price if available, otherwise uses the product's base price
 */
export function useB2BVariantPrice(
  variantPrice: number | null | undefined,
  fallbackFactoryCost: number,
  categoryId?: string,
  weight?: number,
  destinationCountryCode?: string
): B2BPriceInfo | null {
  const priceCalculator = useB2BPriceCalculator(destinationCountryCode);
  
  const factoryCost = variantPrice || fallbackFactoryCost;
  
  return useMemo(() => {
    if (!factoryCost || factoryCost <= 0) {
      return null;
    }
    
    const calculated = priceCalculator.calculateProductPrice({
      id: 'variant-temp',
      factoryCost,
      categoryId,
      weight: weight || 0.5,
    });
    
    return {
      factoryCost: calculated.factoryCost,
      calculatedPrice: calculated.finalB2BPrice,
      marginPercent: calculated.marginPercent,
      marginValue: calculated.marginValue,
      logisticsCost: calculated.logisticsCost,
      categoryFees: calculated.categoryFees,
      estimatedDays: calculated.logistics?.estimatedDays || { min: 10, max: 20 },
      routeName: calculated.logistics?.routeName || 'Ruta estándar',
      suggestedPVP: calculated.suggestedPVP,
      profitAmount: calculated.profitAmount,
      roiPercent: calculated.roiPercent,
    };
  }, [factoryCost, categoryId, weight, priceCalculator]);
}

/**
 * Pure function to calculate B2B price - useful for inline calculations in components
 */
export function calculateB2BDisplayPrice(
  priceInfo: B2BPriceInfo | null,
  fallbackPrice: number
): number {
  return priceInfo?.calculatedPrice ?? fallbackPrice;
}

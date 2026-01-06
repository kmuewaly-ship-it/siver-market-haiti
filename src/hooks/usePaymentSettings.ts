import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentSettings {
  bankName: string;
  bankAccount: string;
  bankBeneficiary: string;
  bankSwift: string;
  moncashNumber: string;
  moncashName: string;
}

const DEFAULT_SETTINGS: PaymentSettings = {
  bankName: 'Banco Nacional de Haití',
  bankAccount: '001-234567-89',
  bankBeneficiary: 'Siver Market 509 SRL',
  bankSwift: 'BNHAHTHX',
  moncashNumber: '+509 3XXX XXXX',
  moncashName: 'Siver Market 509',
};

export const usePaymentSettings = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['payment_settings'],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.warn('Error loading payment settings from database, using defaults:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data) {
        return DEFAULT_SETTINGS;
      }

      return {
        bankName: data.bank_name || DEFAULT_SETTINGS.bankName,
        bankAccount: data.bank_account || DEFAULT_SETTINGS.bankAccount,
        bankBeneficiary: data.bank_beneficiary || DEFAULT_SETTINGS.bankBeneficiary,
        bankSwift: data.bank_swift || DEFAULT_SETTINGS.bankSwift,
        moncashNumber: data.moncash_number || DEFAULT_SETTINGS.moncashNumber,
        moncashName: data.moncash_name || DEFAULT_SETTINGS.moncashName,
      };
    },
  });

  const settings = data || DEFAULT_SETTINGS;

  return {
    settings,
    isLoading,
    error,
  };
};

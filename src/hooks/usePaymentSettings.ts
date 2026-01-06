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
    queryKey: ['platform_payment_settings'],
    staleTime: 1000 * 60 * 5, // 5 minutes cache
    queryFn: async () => {
      // Get payment settings from platform_settings table
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['bank_name', 'bank_account', 'bank_beneficiary', 'bank_swift', 'moncash_number', 'moncash_name']);

      if (error) {
        console.warn('Error loading payment settings from database, using defaults:', error);
        return DEFAULT_SETTINGS;
      }

      if (!data || data.length === 0) {
        return DEFAULT_SETTINGS;
      }

      // Convert array of settings to object
      const settingsMap = data.reduce((acc, item) => {
        acc[item.key] = String(item.value);
        return acc;
      }, {} as Record<string, string>);

      return {
        bankName: settingsMap['bank_name'] || DEFAULT_SETTINGS.bankName,
        bankAccount: settingsMap['bank_account'] || DEFAULT_SETTINGS.bankAccount,
        bankBeneficiary: settingsMap['bank_beneficiary'] || DEFAULT_SETTINGS.bankBeneficiary,
        bankSwift: settingsMap['bank_swift'] || DEFAULT_SETTINGS.bankSwift,
        moncashNumber: settingsMap['moncash_number'] || DEFAULT_SETTINGS.moncashNumber,
        moncashName: settingsMap['moncash_name'] || DEFAULT_SETTINGS.moncashName,
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

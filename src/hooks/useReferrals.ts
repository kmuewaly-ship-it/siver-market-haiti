import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  first_purchase_completed: boolean;
  first_purchase_at: string | null;
  bonus_amount: number;
  bonus_approved: boolean;
  created_at: string;
}

export interface ReferralCode {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
}

export interface ReferralSettings {
  id: string;
  bonus_per_referral: number;
  referrals_for_credit_increase: number;
  credit_increase_amount: number;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: referralCode, isLoading: loadingCode } = useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as ReferralCode | null;
    },
    enabled: !!user?.id,
  });

  const { data: myReferrals, isLoading: loadingReferrals } = useQuery({
    queryKey: ['my-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id (
            id,
            profiles:profiles (full_name, email)
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: settings } = useQuery({
    queryKey: ['referral-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .single();
      
      if (error) throw error;
      return data as ReferralSettings;
    },
  });

  const referralLink = referralCode 
    ? `${window.location.origin}/seller/registro?ref=${referralCode.code}` 
    : null;

  const totalReferrals = myReferrals?.length ?? 0;
  const completedReferrals = myReferrals?.filter(r => r.first_purchase_completed).length ?? 0;
  const pendingBonuses = myReferrals?.filter(r => r.first_purchase_completed && !r.bonus_approved).length ?? 0;
  const totalEarned = myReferrals?.filter(r => r.bonus_approved).reduce((sum, r) => sum + Number(r.bonus_amount), 0) ?? 0;

  return {
    referralCode,
    referralLink,
    myReferrals,
    settings,
    isLoading: loadingCode || loadingReferrals,
    totalReferrals,
    completedReferrals,
    pendingBonuses,
    totalEarned,
  };
};

// Hook for applying referral code during registration
export const useApplyReferral = () => {
  const applyCode = useMutation({
    mutationFn: async ({ 
      code, 
      referredUserId 
    }: { 
      code: string; 
      referredUserId: string;
    }) => {
      // Find the referrer by code
      const { data: referralCode, error: codeError } = await supabase
        .from('referral_codes')
        .select('user_id')
        .eq('code', code)
        .single();
      
      if (codeError || !referralCode) {
        throw new Error('Código de referido inválido');
      }
      
      // Get settings for bonus amount
      const { data: settings } = await supabase
        .from('referral_settings')
        .select('bonus_per_referral')
        .single();
      
      // Create referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referralCode.user_id,
          referred_id: referredUserId,
          referral_code: code,
          bonus_amount: settings?.bonus_per_referral ?? 20,
        });
      
      if (referralError) throw referralError;
    },
  });

  return { applyCode };
};

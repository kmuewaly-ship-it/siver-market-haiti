import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ApprovalRequestType = 'kyc_verification' | 'referral_bonus' | 'credit_limit_increase' | 'credit_activation';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ApprovalRequest {
  id: string;
  request_type: ApprovalRequestType;
  requester_id: string;
  status: ApprovalStatus;
  metadata: Record<string, unknown>;
  amount: number | null;
  admin_comments: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useAdminApprovals = () => {
  const queryClient = useQueryClient();

  const { data: pendingRequests, isLoading } = useQuery({
    queryKey: ['admin-approvals-pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_approval_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const userIds = data?.map(r => r.requester_id) ?? [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
      
      return data?.map(r => ({
        ...r,
        profiles: profileMap.get(r.requester_id) || null,
      })) as ApprovalRequest[];
      
      if (error) throw error;
      return data as ApprovalRequest[];
    },
  });

  const { data: allRequests } = useQuery({
    queryKey: ['admin-approvals-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_approval_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const userIds = data?.map(r => r.requester_id) ?? [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? []);
      
      return data?.map(r => ({
        ...r,
        profiles: profileMap.get(r.requester_id) || null,
      })) as ApprovalRequest[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-approval-stats'],
    queryFn: async () => {
      const { data: pending, error: pendingError } = await supabase
        .from('admin_approval_requests')
        .select('request_type')
        .eq('status', 'pending');
      
      if (pendingError) throw pendingError;

      const { data: kycPending } = await supabase
        .from('kyc_verifications')
        .select('id')
        .eq('status', 'pending_verification');

      const { data: totalDebt } = await supabase
        .from('seller_credits')
        .select('balance_debt');

      return {
        totalPending: (pending?.length ?? 0) + (kycPending?.length ?? 0),
        kycPending: kycPending?.length ?? 0,
        bonusPending: pending?.filter(p => p.request_type === 'referral_bonus').length ?? 0,
        creditPending: pending?.filter(p => p.request_type === 'credit_limit_increase' || p.request_type === 'credit_activation').length ?? 0,
        totalDebt: totalDebt?.reduce((sum, c) => sum + Number(c.balance_debt), 0) ?? 0,
      };
    },
  });

  const approveRequest = useMutation({
    mutationFn: async ({ 
      requestId, 
      comments 
    }: { 
      requestId: string; 
      comments?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get request details first
      const { data: request, error: fetchError } = await supabase
        .from('admin_approval_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError) throw fetchError;

      // Process based on request type
      if (request.request_type === 'referral_bonus') {
        // Apply bonus to referrer's debt
        const { data: credit } = await supabase
          .from('seller_credits')
          .select('balance_debt')
          .eq('user_id', request.requester_id)
          .single();

        if (credit) {
          const newDebt = Math.max(0, Number(credit.balance_debt) - Number(request.amount));
          
          await supabase
            .from('seller_credits')
            .update({ balance_debt: newDebt })
            .eq('user_id', request.requester_id);
          
          await supabase
            .from('credit_movements')
            .insert({
              user_id: request.requester_id,
              movement_type: 'referral_bonus',
              amount: -Number(request.amount),
              balance_before: credit.balance_debt,
              balance_after: newDebt,
              reference_id: requestId,
              description: 'Bono por referido aprobado',
            });
        }
        
        // Mark referral bonus as approved
        const metadata = request.metadata as Record<string, string>;
        if (metadata?.referral_id) {
          await supabase
            .from('referrals')
            .update({ bonus_approved: true })
            .eq('id', metadata.referral_id);
        }
      }

      if (request.request_type === 'credit_limit_increase') {
        const metadata = request.metadata as Record<string, number>;
        await supabase
          .from('seller_credits')
          .update({ credit_limit: metadata?.new_limit ?? 0 })
          .eq('user_id', request.requester_id);
      }

      // Update request status
      const { error } = await supabase
        .from('admin_approval_requests')
        .update({
          status: 'approved',
          admin_comments: comments,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-credits'] });
      toast.success('Solicitud aprobada');
    },
    onError: (error) => {
      toast.error('Error: ' + error.message);
    }
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ 
      requestId, 
      comments 
    }: { 
      requestId: string; 
      comments: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('admin_approval_requests')
        .update({
          status: 'rejected',
          admin_comments: comments,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approvals-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-approval-stats'] });
      toast.success('Solicitud rechazada');
    },
  });

  return {
    pendingRequests,
    allRequests,
    stats,
    isLoading,
    approveRequest,
    rejectRequest,
  };
};

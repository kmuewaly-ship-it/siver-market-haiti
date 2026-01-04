-- Create secure function for processing withdrawal completion
-- This moves critical financial logic from client-side to server-side

CREATE OR REPLACE FUNCTION public.process_withdrawal_completion(
  p_withdrawal_id UUID,
  p_action TEXT,
  p_admin_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal withdrawal_requests;
  v_wallet seller_wallets;
  v_user_id UUID;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify action is valid
  IF p_action NOT IN ('approved', 'rejected', 'completed') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
  
  -- Get withdrawal details with lock
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;
  
  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal request not found';
  END IF;
  
  -- Update withdrawal status
  UPDATE withdrawal_requests
  SET 
    status = p_action,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    processed_by = CASE WHEN p_action IN ('completed', 'rejected') THEN v_user_id ELSE processed_by END,
    processed_at = CASE WHEN p_action IN ('completed', 'rejected') THEN now() ELSE processed_at END,
    updated_at = now()
  WHERE id = p_withdrawal_id;
  
  -- If completed, update wallet balance atomically
  IF p_action = 'completed' THEN
    UPDATE seller_wallets
    SET 
      available_balance = available_balance - v_withdrawal.net_amount,
      total_withdrawn = total_withdrawn + v_withdrawal.net_amount,
      updated_at = now()
    WHERE id = v_withdrawal.wallet_id;
    
    -- Verify the update was successful
    GET DIAGNOSTICS v_user_id = ROW_COUNT;
    IF v_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
      RAISE EXCEPTION 'Failed to update wallet balance';
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'withdrawal_id', p_withdrawal_id,
    'action', p_action,
    'processed_at', now()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.process_withdrawal_completion(UUID, TEXT, TEXT) TO authenticated;
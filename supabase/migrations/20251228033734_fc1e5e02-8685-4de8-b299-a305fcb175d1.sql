-- Tabla para notificaciones persistentes
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('wallet_update', 'commission_change', 'withdrawal_status', 'order_delivery', 'general', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_email_sent BOOLEAN NOT NULL DEFAULT false,
  is_whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- System can insert notifications (via trigger or admin)
CREATE POLICY "Admins can manage all notifications" 
ON public.notifications 
FOR ALL 
USING (is_admin(auth.uid()));

-- Allow service role to insert
CREATE POLICY "Service can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Index for efficient querying
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- Add lat/lng columns to pickup_points for map integration
ALTER TABLE public.pickup_points 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create a function to send notifications when wallet changes
CREATE OR REPLACE FUNCTION public.fn_notify_wallet_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_seller_name TEXT;
BEGIN
  -- Get user_id from sellers table
  SELECT user_id INTO v_user_id FROM sellers WHERE id = NEW.seller_id;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if available_balance increased (funds released)
  IF NEW.available_balance > OLD.available_balance THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'wallet_update',
      'Fondos Liberados',
      format('Se han liberado $%s a tu saldo disponible', (NEW.available_balance - OLD.available_balance)::TEXT),
      jsonb_build_object(
        'amount', NEW.available_balance - OLD.available_balance,
        'new_balance', NEW.available_balance
      )
    );
  END IF;

  -- Check if pending balance changed
  IF NEW.pending_balance != OLD.pending_balance THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      v_user_id,
      'wallet_update',
      'Saldo Pendiente Actualizado',
      format('Tu saldo pendiente ahora es $%s', NEW.pending_balance::TEXT),
      jsonb_build_object('pending_balance', NEW.pending_balance)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for wallet notifications
DROP TRIGGER IF EXISTS trg_wallet_notification ON seller_wallets;
CREATE TRIGGER trg_wallet_notification
  AFTER UPDATE ON seller_wallets
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_wallet_change();

-- Function to notify withdrawal status changes
CREATE OR REPLACE FUNCTION public.fn_notify_withdrawal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_title TEXT;
  v_message TEXT;
BEGIN
  -- Get user_id from sellers table
  SELECT user_id INTO v_user_id FROM sellers WHERE id = NEW.seller_id;
  
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Set message based on status
  CASE NEW.status
    WHEN 'approved' THEN
      v_title := 'Retiro Aprobado';
      v_message := format('Tu solicitud de retiro por $%s ha sido aprobada', NEW.amount::TEXT);
    WHEN 'processing' THEN
      v_title := 'Retiro en Proceso';
      v_message := format('Tu retiro por $%s está siendo procesado', NEW.amount::TEXT);
    WHEN 'completed' THEN
      v_title := 'Retiro Completado';
      v_message := format('Se han transferido $%s a tu cuenta', NEW.net_amount::TEXT);
    WHEN 'rejected' THEN
      v_title := 'Retiro Rechazado';
      v_message := COALESCE(NEW.admin_notes, 'Tu solicitud de retiro fue rechazada');
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_user_id,
    'withdrawal_status',
    v_title,
    v_message,
    jsonb_build_object(
      'withdrawal_id', NEW.id,
      'status', NEW.status,
      'amount', NEW.amount,
      'net_amount', NEW.net_amount
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for withdrawal notifications
DROP TRIGGER IF EXISTS trg_withdrawal_notification ON withdrawal_requests;
CREATE TRIGGER trg_withdrawal_notification
  AFTER UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION fn_notify_withdrawal_status();

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
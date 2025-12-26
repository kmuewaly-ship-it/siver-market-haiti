-- =============================================
-- MIGRATION: Update database schema for new features
-- Date: 2025-12-26
-- =============================================

-- 1. Add new fields to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS return_policy TEXT,
ADD COLUMN IF NOT EXISTS shipping_policy TEXT,
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS account_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS account_holder VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_accepting_orders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_stock BOOLEAN DEFAULT true;

-- 2. Add delivered status to orders_b2b (update status check if needed)
-- Note: metadata already exists as JSONB, no changes needed

-- 3. Add new fields to sellers table  
ALTER TABLE public.sellers
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_badge_active BOOLEAN DEFAULT false;

-- 4. Create order_refunds table
CREATE TABLE IF NOT EXISTS public.order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders_b2b(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'requested',
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on order_refunds
ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_refunds
CREATE POLICY "Users can view their own refunds"
ON public.order_refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders_b2b o 
    WHERE o.id = order_refunds.order_id 
    AND o.seller_id = auth.uid()
  )
);

CREATE POLICY "Users can create refunds for their orders"
ON public.order_refunds FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders_b2b o 
    WHERE o.id = order_refunds.order_id 
    AND o.seller_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all refunds"
ON public.order_refunds FOR ALL
USING (is_admin(auth.uid()));

-- 5. Create user_notification_preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  order_notifications BOOLEAN DEFAULT true,
  promotional_emails BOOLEAN DEFAULT false,
  whatsapp_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on user_notification_preferences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_notification_preferences
CREATE POLICY "Users can view their own preferences"
ON public.user_notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
ON public.user_notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON public.user_notification_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all preferences"
ON public.user_notification_preferences FOR ALL
USING (is_admin(auth.uid()));

-- 6. Create indexes for optimization
CREATE INDEX IF NOT EXISTS idx_orders_b2b_seller_status ON public.orders_b2b(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_created ON public.orders_b2b(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items_b2b(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_order ON public.order_refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_stores_owner ON public.stores(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_verified ON public.sellers(is_verified);
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_user ON public.user_notification_preferences(user_id);

-- 7. Add trigger for updated_at on new tables
CREATE TRIGGER update_order_refunds_updated_at
BEFORE UPDATE ON public.order_refunds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
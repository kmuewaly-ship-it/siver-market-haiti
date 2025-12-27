-- =============================================
-- ECOSYSTEM B2B2C COMPLETO - STAVE
-- =============================================

-- 1. Extender enum de roles para incluir staff_pickup
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'staff_pickup' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'staff_pickup';
  END IF;
END$$;

-- 2. CONFIGURACIÓN DE PLATAFORMA (Comisiones e Impuestos)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('commission_percentage', 10, 'Porcentaje de comisión por venta'),
  ('commission_fixed', 0.50, 'Tarifa fija por transacción (USD)'),
  ('tax_tca_percentage', 5, 'Porcentaje de impuesto TCA'),
  ('escrow_release_hours', 48, 'Horas para liberar fondos después de entrega')
ON CONFLICT (key) DO NOTHING;

-- 3. OVERRIDES DE COMISIONES POR SELLER
CREATE TABLE IF NOT EXISTS public.seller_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  commission_percentage NUMERIC,
  commission_fixed NUMERIC,
  tax_tca_percentage NUMERIC,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id)
);

-- 4. WALLET DE SELLERS (Saldo Pendiente vs Disponible)
CREATE TABLE IF NOT EXISTS public.seller_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE UNIQUE,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  commission_debt NUMERIC NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_withdrawn NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TRANSACCIONES DE WALLET (Historial completo)
CREATE TYPE public.wallet_transaction_type AS ENUM (
  'sale_escrow',
  'escrow_release',
  'commission_charge',
  'tax_charge',
  'withdrawal_request',
  'withdrawal_completed',
  'refund',
  'debt_compensation',
  'manual_adjustment'
);

CREATE TYPE public.wallet_transaction_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'cancelled',
  'failed'
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.seller_wallets(id) ON DELETE CASCADE,
  type wallet_transaction_type NOT NULL,
  status wallet_transaction_status NOT NULL DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  fee_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  release_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. PUNTOS DE RECOGIDA (PICKUP POINTS)
CREATE TABLE IF NOT EXISTS public.pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'Haiti',
  phone TEXT,
  manager_user_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  operating_hours JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. STAFF DE PUNTOS DE RECOGIDA
CREATE TABLE IF NOT EXISTS public.pickup_point_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, pickup_point_id)
);

-- 8. CONFIRMACIONES DE ENTREGA (QR Scanning)
CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL CHECK (order_type IN ('b2b', 'b2c')),
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  delivery_code TEXT UNIQUE NOT NULL,
  qr_code_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'picked_up', 'expired', 'cancelled')),
  confirmed_by UUID REFERENCES public.profiles(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  escrow_release_at TIMESTAMP WITH TIME ZONE,
  funds_released BOOLEAN DEFAULT false,
  funds_released_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. SOLICITUDES DE RETIRO
CREATE TYPE public.withdrawal_status AS ENUM (
  'pending',
  'approved',
  'processing',
  'completed',
  'rejected',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.seller_wallets(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.sellers(id),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  fee_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'moncash', 'stripe')),
  bank_details JSONB,
  status withdrawal_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES public.profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. REGISTRO DE DEUDAS DE COMISIONES (MonCash)
CREATE TABLE IF NOT EXISTS public.commission_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES public.seller_wallets(id),
  order_id UUID,
  order_type TEXT CHECK (order_type IN ('b2b', 'b2c')),
  payment_method TEXT NOT NULL,
  sale_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  total_debt NUMERIC NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_from_wallet BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_commission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickup_point_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_debts ENABLE ROW LEVEL SECURITY;

-- Platform Settings (Solo Admin)
CREATE POLICY "Admins can manage platform settings"
ON public.platform_settings FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Anyone can view platform settings"
ON public.platform_settings FOR SELECT
USING (true);

-- Seller Commission Overrides (Admin solo)
CREATE POLICY "Admins can manage commission overrides"
ON public.seller_commission_overrides FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can view their own overrides"
ON public.seller_commission_overrides FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sellers s
  WHERE s.id = seller_commission_overrides.seller_id
  AND s.user_id = auth.uid()
));

-- Seller Wallets
CREATE POLICY "Admins can manage all wallets"
ON public.seller_wallets FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can view own wallet"
ON public.seller_wallets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sellers s
  WHERE s.id = seller_wallets.seller_id
  AND s.user_id = auth.uid()
));

-- Wallet Transactions
CREATE POLICY "Admins can manage all transactions"
ON public.wallet_transactions FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.seller_wallets w
  JOIN public.sellers s ON s.id = w.seller_id
  WHERE w.id = wallet_transactions.wallet_id
  AND s.user_id = auth.uid()
));

-- Pickup Points
CREATE POLICY "Admins can manage pickup points"
ON public.pickup_points FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Public can view active pickup points"
ON public.pickup_points FOR SELECT
USING (is_active = true);

-- Pickup Point Staff
CREATE POLICY "Admins can manage staff"
ON public.pickup_point_staff FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view own assignment"
ON public.pickup_point_staff FOR SELECT
USING (user_id = auth.uid());

-- Order Deliveries
CREATE POLICY "Admins can manage deliveries"
ON public.order_deliveries FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can manage deliveries at their point"
ON public.order_deliveries FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.pickup_point_staff pps
  WHERE pps.pickup_point_id = order_deliveries.pickup_point_id
  AND pps.user_id = auth.uid()
  AND pps.is_active = true
));

CREATE POLICY "Anyone can view delivery by code"
ON public.order_deliveries FOR SELECT
USING (true);

-- Withdrawal Requests
CREATE POLICY "Admins can manage withdrawals"
ON public.withdrawal_requests FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can create and view own withdrawals"
ON public.withdrawal_requests FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.sellers s
  WHERE s.id = withdrawal_requests.seller_id
  AND s.user_id = auth.uid()
));

-- Commission Debts
CREATE POLICY "Admins can manage debts"
ON public.commission_debts FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Sellers can view own debts"
ON public.commission_debts FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.sellers s
  WHERE s.id = commission_debts.seller_id
  AND s.user_id = auth.uid()
));

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_wallet_seller ON public.seller_wallets(seller_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_release ON public.wallet_transactions(release_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_order_deliveries_code ON public.order_deliveries(delivery_code);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_status ON public.order_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_release ON public.order_deliveries(escrow_release_at) WHERE funds_released = false;
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_commission_debts_unpaid ON public.commission_debts(seller_id) WHERE is_paid = false;
CREATE INDEX IF NOT EXISTS idx_pickup_staff_user ON public.pickup_point_staff(user_id);

-- =============================================
-- TRIGGERS
-- =============================================

CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_commission_overrides_updated_at
BEFORE UPDATE ON public.seller_commission_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_wallets_updated_at
BEFORE UPDATE ON public.seller_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wallet_transactions_updated_at
BEFORE UPDATE ON public.wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pickup_points_updated_at
BEFORE UPDATE ON public.pickup_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_deliveries_updated_at
BEFORE UPDATE ON public.order_deliveries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNCIÓN: Crear wallet automáticamente para seller
-- =============================================

CREATE OR REPLACE FUNCTION public.fn_create_seller_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_wallets (seller_id)
  VALUES (NEW.id)
  ON CONFLICT (seller_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_create_seller_wallet
AFTER INSERT ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.fn_create_seller_wallet();

-- =============================================
-- FUNCIÓN: Generar código de entrega único
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_delivery_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := 'DEL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM public.order_deliveries WHERE delivery_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
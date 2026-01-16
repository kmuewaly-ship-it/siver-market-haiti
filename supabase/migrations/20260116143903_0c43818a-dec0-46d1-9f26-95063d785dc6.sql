
-- =====================================================
-- ÓRDENES DE COMPRA MAESTRAS Y B2B
-- =====================================================

-- Master Purchase Orders
CREATE TABLE IF NOT EXISTS public.master_purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'open',
  cycle_start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cycle_end_at TIMESTAMP WITH TIME ZONE,
  auto_close_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  close_reason TEXT,
  total_orders INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  orders_at_close INTEGER DEFAULT 0,
  china_tracking_number TEXT,
  china_tracking_entered_at TIMESTAMP WITH TIME ZONE,
  shipped_from_china_at TIMESTAMP WITH TIME ZONE,
  arrived_usa_at TIMESTAMP WITH TIME ZONE,
  shipped_to_haiti_at TIMESTAMP WITH TIME ZONE,
  arrived_hub_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders B2B
CREATE TABLE IF NOT EXISTS public.orders_b2b (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  seller_id UUID REFERENCES public.sellers(id),
  buyer_id UUID,
  master_po_id UUID REFERENCES public.master_purchase_orders(id),
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  payment_verified_by UUID,
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  internal_notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Items B2B
CREATE TABLE IF NOT EXISTS public.order_items_b2b (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders_b2b(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  descuento_percent NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- ÓRDENES B2C
-- =====================================================

-- Orders B2C
CREATE TABLE IF NOT EXISTS public.orders_b2c (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  store_id UUID REFERENCES public.stores(id),
  seller_id UUID REFERENCES public.sellers(id),
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_reference TEXT,
  subtotal NUMERIC DEFAULT 0,
  shipping_cost NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'HTG',
  shipping_address JSONB,
  delivery_method TEXT DEFAULT 'delivery',
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  notes TEXT,
  customer_notes TEXT,
  estimated_delivery_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order Items B2C
CREATE TABLE IF NOT EXISTS public.order_items_b2c (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders_b2c(id) ON DELETE CASCADE,
  seller_catalog_id UUID REFERENCES public.seller_catalog(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  descuento_percent NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PAGOS Y COMISIONES
-- =====================================================

-- B2B Payments
CREATE TABLE IF NOT EXISTS public.b2b_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id),
  payment_number TEXT NOT NULL UNIQUE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  method public.payment_method NOT NULL,
  reference TEXT NOT NULL,
  status public.payment_status DEFAULT 'pending',
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seller Wallets
CREATE TABLE IF NOT EXISTS public.seller_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL UNIQUE REFERENCES public.sellers(id),
  balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'HTG',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES public.seller_wallets(id),
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Commission Debts
CREATE TABLE IF NOT EXISTS public.commission_debts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id),
  wallet_id UUID REFERENCES public.seller_wallets(id),
  order_id UUID,
  order_type TEXT,
  sale_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  total_debt NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_from_wallet BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Commission Overrides
CREATE TABLE IF NOT EXISTS public.commission_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES public.sellers(id),
  category_id UUID REFERENCES public.categories(id),
  commission_rate NUMERIC NOT NULL,
  reason TEXT,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- NOTIFICACIONES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  is_email_sent BOOLEAN DEFAULT false,
  is_whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- APROBACIONES ADMINISTRATIVAS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_approval_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  request_type public.approval_request_type NOT NULL,
  status public.approval_status DEFAULT 'pending',
  amount NUMERIC,
  metadata JSONB,
  admin_comments TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Admin Banners
CREATE TABLE IF NOT EXISTS public.admin_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  target_audience TEXT DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

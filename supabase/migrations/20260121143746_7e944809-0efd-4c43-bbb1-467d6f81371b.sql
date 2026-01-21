-- =============================================
-- MARKETS MODULE - Complete Database Schema
-- =============================================

-- 1. MARKETS TABLE - Core markets configuration
CREATE TABLE public.markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  destination_country_id UUID NOT NULL REFERENCES public.destination_countries(id) ON DELETE RESTRICT,
  shipping_route_id UUID REFERENCES public.shipping_routes(id) ON DELETE SET NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT false,
  timezone TEXT DEFAULT 'America/Port-au-Prince',
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MARKET PAYMENT METHODS - Payment methods specific to each market
CREATE TABLE public.market_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method_type TEXT NOT NULL, -- e.g., 'moncash', 'natcash', 'bank_transfer', 'cash'
  currency TEXT NOT NULL DEFAULT 'USD',
  account_number TEXT,
  account_holder TEXT,
  bank_name TEXT,
  instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. PRODUCT MARKETS - Many-to-many relationship between products and markets
CREATE TABLE public.product_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  price_override DECIMAL(12, 2), -- Optional market-specific price override
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, market_id)
);

-- 4. CATEGORY MARKETS - Many-to-many relationship between categories and markets
CREATE TABLE public.category_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id, market_id)
);

-- 5. SELLER MARKETS - Associates sellers/investors with specific markets (for RLS)
CREATE TABLE public.seller_markets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(seller_id, market_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_markets_destination_country ON public.markets(destination_country_id);
CREATE INDEX idx_markets_shipping_route ON public.markets(shipping_route_id);
CREATE INDEX idx_markets_active ON public.markets(is_active);
CREATE INDEX idx_market_payment_methods_market ON public.market_payment_methods(market_id);
CREATE INDEX idx_product_markets_product ON public.product_markets(product_id);
CREATE INDEX idx_product_markets_market ON public.product_markets(market_id);
CREATE INDEX idx_category_markets_category ON public.category_markets(category_id);
CREATE INDEX idx_category_markets_market ON public.category_markets(market_id);
CREATE INDEX idx_seller_markets_seller ON public.seller_markets(seller_id);
CREATE INDEX idx_seller_markets_market ON public.seller_markets(market_id);

-- =============================================
-- ENABLE RLS
-- =============================================
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_markets ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES - Markets (Admin can manage, public can read active)
-- =============================================
CREATE POLICY "Markets are viewable by everyone"
  ON public.markets FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert markets"
  ON public.markets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can update markets"
  ON public.markets FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Only admins can delete markets"
  ON public.markets FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- RLS POLICIES - Market Payment Methods
-- =============================================
CREATE POLICY "Payment methods viewable by everyone"
  ON public.market_payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage payment methods"
  ON public.market_payment_methods FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- RLS POLICIES - Product Markets (Sellers see their market's products)
-- =============================================
CREATE POLICY "Product markets are viewable by everyone"
  ON public.product_markets FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage product markets"
  ON public.product_markets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- RLS POLICIES - Category Markets
-- =============================================
CREATE POLICY "Category markets are viewable by everyone"
  ON public.category_markets FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage category markets"
  ON public.category_markets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- RLS POLICIES - Seller Markets (Sellers can only see their own)
-- =============================================
CREATE POLICY "Sellers can view their market assignments"
  ON public.seller_markets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sellers WHERE id = seller_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage seller markets"
  ON public.seller_markets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- =============================================
-- UPDATE TRIGGERS
-- =============================================
CREATE TRIGGER update_markets_updated_at
  BEFORE UPDATE ON public.markets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_market_payment_methods_updated_at
  BEFORE UPDATE ON public.market_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- VIEW: Markets with complete info for dashboard
-- =============================================
CREATE OR REPLACE VIEW public.markets_dashboard AS
SELECT 
  m.*,
  dc.name as destination_country_name,
  dc.code as destination_country_code,
  sr.id as route_id,
  th.name as transit_hub_name,
  th.code as transit_hub_code,
  (SELECT COUNT(*) FROM public.product_markets pm WHERE pm.market_id = m.id AND pm.is_active) as product_count,
  (SELECT COUNT(*) FROM public.market_payment_methods mpm WHERE mpm.market_id = m.id AND mpm.is_active) as payment_method_count,
  (SELECT COUNT(*) FROM public.seller_markets sm WHERE sm.market_id = m.id) as seller_count
FROM public.markets m
LEFT JOIN public.destination_countries dc ON m.destination_country_id = dc.id
LEFT JOIN public.shipping_routes sr ON m.shipping_route_id = sr.id
LEFT JOIN public.transit_hubs th ON sr.transit_hub_id = th.id;
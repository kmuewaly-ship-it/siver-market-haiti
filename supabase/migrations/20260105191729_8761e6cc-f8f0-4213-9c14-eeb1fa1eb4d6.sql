-- =============================================
-- SIVER MATCH: B2B2C Ecosystem Module
-- Connects Investors with Gestors via Siver Market
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE public.siver_match_role AS ENUM ('investor', 'gestor');
CREATE TYPE public.stock_lot_status AS ENUM ('draft', 'published', 'assigned', 'in_transit', 'in_hub', 'active', 'depleted', 'cancelled');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'accepted', 'rejected', 'active', 'completed', 'cancelled');
CREATE TYPE public.match_sale_status AS ENUM ('pending_payment', 'payment_confirmed', 'ready_pickup', 'picked_up', 'delivered', 'cancelled');

-- 2. SIVER MATCH PROFILES (Investor/Gestor)
CREATE TABLE public.siver_match_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role siver_match_role NOT NULL,
    
    -- Location (especially for Gestors)
    department_id UUID REFERENCES public.departments(id),
    commune_id UUID REFERENCES public.communes(id),
    
    -- Profile info
    display_name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    phone TEXT,
    
    -- Stats (denormalized for performance)
    total_sales_count INTEGER DEFAULT 0,
    total_sales_amount NUMERIC(12,2) DEFAULT 0,
    average_rating NUMERIC(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    
    -- Capacity control for Gestors
    max_pending_orders INTEGER DEFAULT 20,
    current_pending_orders INTEGER DEFAULT 0,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    verified_at TIMESTAMPTZ,
    
    -- Badges (JSON array of badge IDs)
    badges JSONB DEFAULT '[]'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_role UNIQUE (user_id, role)
);

-- 3. STOCK LOTS (Published by Investors)
CREATE TABLE public.siver_match_stock_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.siver_match_profiles(id) ON DELETE CASCADE,
    
    -- Product reference
    product_id UUID REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    
    -- Product details (snapshot for history)
    product_name TEXT NOT NULL,
    product_image TEXT,
    sku TEXT,
    color TEXT,
    size TEXT,
    
    -- Quantities
    total_quantity INTEGER NOT NULL,
    available_quantity INTEGER NOT NULL,
    sold_quantity INTEGER DEFAULT 0,
    
    -- Pricing
    cost_per_unit NUMERIC(10,2) NOT NULL, -- What investor paid
    suggested_price NUMERIC(10,2) NOT NULL, -- Suggested retail price
    min_price NUMERIC(10,2), -- Minimum allowed price
    gestor_commission_per_unit NUMERIC(10,2) NOT NULL, -- Fixed commission per unit for gestor
    
    -- Tracking
    china_tracking_number TEXT,
    internal_tracking_id TEXT,
    
    -- Status
    status stock_lot_status DEFAULT 'draft',
    
    -- Logistics stage
    logistics_stage TEXT DEFAULT 'pending', -- pending, in_china, in_transit, in_hub
    arrived_at_hub_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ASSIGNMENTS (Investor-Gestor Matches)
CREATE TABLE public.siver_match_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_lot_id UUID NOT NULL REFERENCES public.siver_match_stock_lots(id) ON DELETE CASCADE,
    gestor_id UUID NOT NULL REFERENCES public.siver_match_profiles(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.siver_match_profiles(id),
    
    -- Assignment details
    quantity_assigned INTEGER NOT NULL,
    quantity_sold INTEGER DEFAULT 0,
    quantity_available INTEGER NOT NULL,
    
    -- Who initiated
    initiated_by siver_match_role NOT NULL,
    
    -- Status
    status assignment_status DEFAULT 'pending',
    
    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Notes
    gestor_notes TEXT,
    investor_notes TEXT,
    
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_lot_gestor UNIQUE (stock_lot_id, gestor_id)
);

-- 5. SALES (Individual sales by Gestors)
CREATE TABLE public.siver_match_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number TEXT UNIQUE NOT NULL,
    
    assignment_id UUID NOT NULL REFERENCES public.siver_match_assignments(id),
    stock_lot_id UUID NOT NULL REFERENCES public.siver_match_stock_lots(id),
    gestor_id UUID NOT NULL REFERENCES public.siver_match_profiles(id),
    investor_id UUID NOT NULL REFERENCES public.siver_match_profiles(id),
    
    -- Customer (can be anonymous)
    customer_user_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    
    -- Delivery address
    department_id UUID REFERENCES public.departments(id),
    commune_id UUID REFERENCES public.communes(id),
    delivery_address TEXT,
    
    -- Items sold
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    
    -- Financial split (calculated at sale creation)
    investor_amount NUMERIC(12,2) NOT NULL, -- Capital + profit
    gestor_commission NUMERIC(12,2) NOT NULL, -- Commission
    siver_fee NUMERIC(12,2) NOT NULL, -- Platform fee
    
    -- Payment
    payment_method TEXT,
    payment_reference TEXT,
    payment_status TEXT DEFAULT 'pending', -- pending, pending_validation, confirmed
    payment_confirmed_at TIMESTAMPTZ,
    
    -- Pickup QR
    pickup_qr_code TEXT,
    pickup_qr_generated_at TIMESTAMPTZ,
    pickup_code TEXT, -- 6-digit code
    
    -- Status
    status match_sale_status DEFAULT 'pending_payment',
    
    -- Delivery
    picked_up_at TIMESTAMPTZ,
    picked_up_by UUID REFERENCES auth.users(id),
    delivered_at TIMESTAMPTZ,
    delivery_confirmed_by UUID,
    delivery_photo_url TEXT,
    
    -- Tracking
    hybrid_tracking_id TEXT,
    
    -- Wallet transactions (references after split)
    investor_wallet_tx_id UUID,
    gestor_wallet_tx_id UUID,
    siver_wallet_tx_id UUID,
    
    metadata JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. REVIEWS (Mutual reviews between Investor and Gestor)
CREATE TABLE public.siver_match_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.siver_match_sales(id) ON DELETE CASCADE,
    
    -- Who is reviewing whom
    reviewer_profile_id UUID NOT NULL REFERENCES public.siver_match_profiles(id),
    reviewed_profile_id UUID NOT NULL REFERENCES public.siver_match_profiles(id),
    
    reviewer_role siver_match_role NOT NULL,
    
    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- Status
    is_public BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_review_per_sale UNIQUE (sale_id, reviewer_profile_id)
);

-- 7. BADGES (Gamification)
CREATE TABLE public.siver_match_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Emoji or icon class
    
    -- Requirements
    role siver_match_role, -- NULL = both roles
    min_sales INTEGER,
    min_rating NUMERIC(3,2),
    min_reviews INTEGER,
    
    -- Display
    color TEXT DEFAULT '#FFD700',
    sort_order INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default badges
INSERT INTO public.siver_match_badges (code, name, description, icon, role, min_sales, min_rating, min_reviews, color) VALUES
('gestor_estrella', 'Gestor Estrella', 'Calificación promedio de 4.5 o más', '⭐', 'gestor', NULL, 4.5, 10, '#FFD700'),
('top_seller', 'Top Vendedor', '100+ ventas completadas', '🏆', 'gestor', 100, NULL, NULL, '#C0C0C0'),
('trusted_investor', 'Inversor Confiable', '50+ lotes publicados y 4+ rating', '💎', 'investor', 50, 4.0, 20, '#00CED1'),
('quick_responder', 'Respuesta Rápida', 'Acepta asignaciones en menos de 1 hora', '⚡', 'gestor', NULL, NULL, NULL, '#FFA500'),
('first_sale', 'Primera Venta', 'Completó su primera venta', '🎉', 'gestor', 1, NULL, NULL, '#32CD32'),
('first_lot', 'Primer Lote', 'Publicó su primer lote de productos', '📦', 'investor', 1, NULL, NULL, '#4169E1');

-- 8. WALLET SPLITS LOG
CREATE TABLE public.siver_match_wallet_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.siver_match_sales(id),
    
    -- Amounts
    total_received NUMERIC(12,2) NOT NULL,
    investor_amount NUMERIC(12,2) NOT NULL,
    gestor_amount NUMERIC(12,2) NOT NULL,
    siver_amount NUMERIC(12,2) NOT NULL,
    
    -- Status
    is_processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    
    -- Transaction references
    investor_tx_ref TEXT,
    gestor_tx_ref TEXT,
    siver_tx_ref TEXT,
    
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. ENABLE RLS
ALTER TABLE public.siver_match_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_stock_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siver_match_wallet_splits ENABLE ROW LEVEL SECURITY;

-- 10. RLS POLICIES

-- Profiles: Public read, own write
CREATE POLICY "Public profiles are viewable by everyone" 
ON public.siver_match_profiles FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can insert own profile" 
ON public.siver_match_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.siver_match_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Stock Lots: Public read published, investor owns
CREATE POLICY "Published lots are viewable" 
ON public.siver_match_stock_lots FOR SELECT 
USING (status IN ('published', 'assigned', 'in_hub', 'active') OR 
       investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Investors can manage own lots" 
ON public.siver_match_stock_lots FOR ALL 
USING (investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()));

-- Assignments: Participants can see
CREATE POLICY "Assignment participants can view" 
ON public.siver_match_assignments FOR SELECT 
USING (
    gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Participants can manage assignments" 
ON public.siver_match_assignments FOR ALL 
USING (
    gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
);

-- Sales: Participants and customers can view
CREATE POLICY "Sale participants can view" 
ON public.siver_match_sales FOR SELECT 
USING (
    customer_user_id = auth.uid() OR
    gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Gestors can create sales" 
ON public.siver_match_sales FOR INSERT 
WITH CHECK (gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Participants can update sales" 
ON public.siver_match_sales FOR UPDATE 
USING (
    gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()) OR
    investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
);

-- Reviews: Public read, own write
CREATE POLICY "Reviews are public" 
ON public.siver_match_reviews FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Users can create own reviews" 
ON public.siver_match_reviews FOR INSERT 
WITH CHECK (reviewer_profile_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid()));

-- Badges: Public read
CREATE POLICY "Badges are public" 
ON public.siver_match_badges FOR SELECT USING (is_active = TRUE);

-- Wallet splits: Participants only
CREATE POLICY "Wallet splits visible to participants" 
ON public.siver_match_wallet_splits FOR SELECT 
USING (
    sale_id IN (
        SELECT id FROM public.siver_match_sales 
        WHERE gestor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
           OR investor_id IN (SELECT id FROM public.siver_match_profiles WHERE user_id = auth.uid())
    )
);

-- 11. FUNCTIONS

-- Generate sale number
CREATE OR REPLACE FUNCTION public.generate_match_sale_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date TEXT;
    v_seq INTEGER;
    v_number TEXT;
BEGIN
    v_date := TO_CHAR(NOW(), 'YYMMDD');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(sale_number FROM 'SM' || v_date || '(\d+)') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM public.siver_match_sales
    WHERE sale_number LIKE 'SM' || v_date || '%';
    
    v_number := 'SM' || v_date || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_number;
END;
$$;

-- Generate pickup code
CREATE OR REPLACE FUNCTION public.generate_pickup_code()
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT LPAD((FLOOR(RANDOM() * 1000000))::TEXT, 6, '0');
$$;

-- Process wallet split on delivery confirmation
CREATE OR REPLACE FUNCTION public.process_siver_match_wallet_split(p_sale_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale RECORD;
    v_investor_wallet_id UUID;
    v_gestor_wallet_id UUID;
BEGIN
    -- Get sale details
    SELECT * INTO v_sale FROM public.siver_match_sales WHERE id = p_sale_id;
    
    IF v_sale IS NULL THEN
        RAISE EXCEPTION 'Sale not found';
    END IF;
    
    IF v_sale.status != 'delivered' THEN
        RAISE EXCEPTION 'Sale not yet delivered';
    END IF;
    
    -- Check if already processed
    IF EXISTS (SELECT 1 FROM public.siver_match_wallet_splits WHERE sale_id = p_sale_id AND is_processed = TRUE) THEN
        RETURN TRUE;
    END IF;
    
    -- Get or create wallets
    SELECT sw.id INTO v_investor_wallet_id
    FROM public.seller_wallets sw
    JOIN public.siver_match_profiles smp ON smp.user_id = sw.seller_id
    WHERE smp.id = v_sale.investor_id;
    
    SELECT sw.id INTO v_gestor_wallet_id
    FROM public.seller_wallets sw
    JOIN public.siver_match_profiles smp ON smp.user_id = sw.seller_id
    WHERE smp.id = v_sale.gestor_id;
    
    -- Record the split
    INSERT INTO public.siver_match_wallet_splits (
        sale_id,
        total_received,
        investor_amount,
        gestor_amount,
        siver_amount,
        is_processed,
        processed_at
    ) VALUES (
        p_sale_id,
        v_sale.total_amount,
        v_sale.investor_amount,
        v_sale.gestor_commission,
        v_sale.siver_fee,
        TRUE,
        NOW()
    );
    
    RETURN TRUE;
END;
$$;

-- Update profile stats
CREATE OR REPLACE FUNCTION public.update_siver_match_profile_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update gestor stats
    UPDATE public.siver_match_profiles
    SET 
        total_sales_count = (
            SELECT COUNT(*) FROM public.siver_match_sales 
            WHERE gestor_id = NEW.gestor_id AND status = 'delivered'
        ),
        total_sales_amount = (
            SELECT COALESCE(SUM(total_amount), 0) FROM public.siver_match_sales 
            WHERE gestor_id = NEW.gestor_id AND status = 'delivered'
        ),
        updated_at = NOW()
    WHERE id = NEW.gestor_id;
    
    -- Update investor stats
    UPDATE public.siver_match_profiles
    SET 
        total_sales_count = (
            SELECT COUNT(*) FROM public.siver_match_sales 
            WHERE investor_id = NEW.investor_id AND status = 'delivered'
        ),
        total_sales_amount = (
            SELECT COALESCE(SUM(total_amount), 0) FROM public.siver_match_sales 
            WHERE investor_id = NEW.investor_id AND status = 'delivered'
        ),
        updated_at = NOW()
    WHERE id = NEW.investor_id;
    
    RETURN NEW;
END;
$$;

-- Trigger for profile stats update
CREATE TRIGGER update_profile_stats_on_sale
AFTER UPDATE OF status ON public.siver_match_sales
FOR EACH ROW
WHEN (NEW.status = 'delivered')
EXECUTE FUNCTION public.update_siver_match_profile_stats();

-- Update rating after review
CREATE OR REPLACE FUNCTION public.update_siver_match_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.siver_match_profiles
    SET 
        average_rating = (
            SELECT COALESCE(AVG(rating), 0) FROM public.siver_match_reviews 
            WHERE reviewed_profile_id = NEW.reviewed_profile_id
        ),
        total_reviews = (
            SELECT COUNT(*) FROM public.siver_match_reviews 
            WHERE reviewed_profile_id = NEW.reviewed_profile_id
        ),
        updated_at = NOW()
    WHERE id = NEW.reviewed_profile_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_rating_on_review
AFTER INSERT ON public.siver_match_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_siver_match_rating();

-- 12. INDEXES
CREATE INDEX idx_match_profiles_user ON public.siver_match_profiles(user_id);
CREATE INDEX idx_match_profiles_role ON public.siver_match_profiles(role);
CREATE INDEX idx_match_profiles_location ON public.siver_match_profiles(department_id, commune_id);
CREATE INDEX idx_match_profiles_rating ON public.siver_match_profiles(average_rating DESC);

CREATE INDEX idx_stock_lots_investor ON public.siver_match_stock_lots(investor_id);
CREATE INDEX idx_stock_lots_status ON public.siver_match_stock_lots(status);
CREATE INDEX idx_stock_lots_product ON public.siver_match_stock_lots(product_id);

CREATE INDEX idx_assignments_gestor ON public.siver_match_assignments(gestor_id);
CREATE INDEX idx_assignments_investor ON public.siver_match_assignments(investor_id);
CREATE INDEX idx_assignments_status ON public.siver_match_assignments(status);

CREATE INDEX idx_sales_gestor ON public.siver_match_sales(gestor_id);
CREATE INDEX idx_sales_investor ON public.siver_match_sales(investor_id);
CREATE INDEX idx_sales_status ON public.siver_match_sales(status);
CREATE INDEX idx_sales_customer ON public.siver_match_sales(customer_user_id);

CREATE INDEX idx_reviews_reviewed ON public.siver_match_reviews(reviewed_profile_id);
CREATE INDEX idx_reviews_sale ON public.siver_match_reviews(sale_id);
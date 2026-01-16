
-- =====================================================
-- TABLAS DE TIENDAS Y VENDEDORES
-- =====================================================

-- Stores
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  commune_id UUID REFERENCES public.communes(id),
  social_links JSONB,
  business_hours JSONB,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  rating_average NUMERIC DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sellers
CREATE TABLE IF NOT EXISTS public.sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  store_id UUID REFERENCES public.stores(id),
  business_name TEXT,
  tax_id TEXT,
  bank_account JSONB,
  commission_rate NUMERIC DEFAULT 10,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- KYC Verifications
CREATE TABLE IF NOT EXISTS public.kyc_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  status public.verification_status DEFAULT 'pending',
  id_front_url TEXT,
  id_back_url TEXT,
  fiscal_document_url TEXT,
  admin_comments TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  country TEXT DEFAULT 'China',
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PRODUCTOS Y VARIANTES
-- =====================================================

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku_interno TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  category_id UUID REFERENCES public.categories(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  precio_costo NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  precio_sugerido NUMERIC DEFAULT 0,
  margen_minimo NUMERIC DEFAULT 20,
  stock_total INTEGER DEFAULT 0,
  stock_reservado INTEGER DEFAULT 0,
  peso_kg NUMERIC DEFAULT 0,
  dimensiones JSONB,
  imagenes TEXT[],
  video_url TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  min_order_quantity INTEGER DEFAULT 1,
  max_order_quantity INTEGER,
  lead_time_days INTEGER DEFAULT 14,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  variant_name TEXT,
  attribute_combination JSONB,
  precio_override NUMERIC,
  stock INTEGER DEFAULT 0,
  stock_reservado INTEGER DEFAULT 0,
  imagen_url TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Variant Attribute Values
CREATE TABLE IF NOT EXISTS public.variant_attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  attribute_option_id UUID REFERENCES public.attribute_options(id),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(variant_id, attribute_id)
);

-- Seller Catalog
CREATE TABLE IF NOT EXISTS public.seller_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id),
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  sku_vendedor TEXT,
  nombre_personalizado TEXT,
  descripcion_personalizada TEXT,
  precio_venta NUMERIC NOT NULL,
  precio_comparacion NUMERIC,
  stock INTEGER DEFAULT 0,
  stock_reservado INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  imagenes_personalizadas TEXT[],
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seller Favorites
CREATE TABLE IF NOT EXISTS public.seller_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(seller_id, product_id, variant_id)
);

-- User Favorites
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  seller_catalog_id UUID REFERENCES public.seller_catalog(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Product Reviews
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_catalog_id UUID REFERENCES public.seller_catalog(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- CARRITOS B2B Y B2C
-- =====================================================

-- B2B Carts
CREATE TABLE IF NOT EXISTS public.b2b_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_user_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- B2B Cart Items
CREATE TABLE IF NOT EXISTS public.b2b_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES public.b2b_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  color TEXT,
  size TEXT,
  image TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- B2C Carts
CREATE TABLE IF NOT EXISTS public.b2c_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'active',
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- B2C Cart Items
CREATE TABLE IF NOT EXISTS public.b2c_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id UUID NOT NULL REFERENCES public.b2c_carts(id) ON DELETE CASCADE,
  seller_catalog_id UUID REFERENCES public.seller_catalog(id),
  store_id UUID REFERENCES public.stores(id),
  store_name TEXT,
  store_whatsapp TEXT,
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  image TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

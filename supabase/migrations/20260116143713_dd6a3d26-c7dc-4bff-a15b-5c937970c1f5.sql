
-- =====================================================
-- CREAR ENUMS SI NO EXISTEN (usando DO block)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_request_type') THEN
    CREATE TYPE public.approval_request_type AS ENUM ('credit_request','refund_request','seller_application','kyc_verification','withdrawal_request');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'approval_status') THEN
    CREATE TYPE public.approval_status AS ENUM ('pending','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('cash','transfer','credit_card','moncash','natcash','lapoula','credit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('pending','verified','rejected','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE public.verification_status AS ENUM ('pending','submitted','approved','rejected');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin','seller','buyer','gestor','investor');
  END IF;
END $$;

-- =====================================================
-- TABLAS PRINCIPALES (sin dependencias)
-- =====================================================

-- Departamentos
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Comunas
CREATE TABLE IF NOT EXISTS public.communes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  delivery_fee NUMERIC DEFAULT 0,
  rate_per_lb NUMERIC DEFAULT 0,
  operational_fee NUMERIC DEFAULT 0,
  extra_department_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Categorías
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_visible_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Atributos
CREATE TABLE IF NOT EXISTS public.attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  attribute_type TEXT DEFAULT 'text',
  render_type TEXT DEFAULT 'dropdown',
  category_hint TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Opciones de atributos
CREATE TABLE IF NOT EXISTS public.attribute_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  display_value TEXT NOT NULL,
  color_hex TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Templates de atributos
CREATE TABLE IF NOT EXISTS public.category_attribute_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_display_name TEXT NOT NULL,
  attribute_type TEXT DEFAULT 'text',
  render_type TEXT DEFAULT 'dropdown',
  suggested_values TEXT[],
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Platform settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shipping rates por categoría
CREATE TABLE IF NOT EXISTS public.category_shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL UNIQUE REFERENCES public.categories(id) ON DELETE CASCADE,
  fixed_fee NUMERIC DEFAULT 0,
  percentage_fee NUMERIC DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Shipping rates globales
CREATE TABLE IF NOT EXISTS public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  base_rate NUMERIC DEFAULT 0,
  per_kg_rate NUMERIC DEFAULT 0,
  per_item_rate NUMERIC DEFAULT 0,
  min_order_amount NUMERIC DEFAULT 0,
  max_order_amount NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Consolidation settings
CREATE TABLE IF NOT EXISTS public.consolidation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidation_mode TEXT DEFAULT 'time',
  time_interval_hours INTEGER DEFAULT 24,
  order_quantity_threshold INTEGER DEFAULT 50,
  notify_threshold_percent NUMERIC DEFAULT 80,
  notify_on_close BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_auto_close_at TIMESTAMP WITH TIME ZONE,
  next_scheduled_close_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Marketplace sections
CREATE TABLE IF NOT EXISTS public.marketplace_section_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  item_limit INTEGER DEFAULT 10,
  display_mode TEXT DEFAULT 'carousel',
  target_audience TEXT DEFAULT 'all',
  custom_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Dynamic expenses
CREATE TABLE IF NOT EXISTS public.dynamic_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre_gasto TEXT NOT NULL,
  tipo TEXT NOT NULL,
  operacion TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Pickup points
CREATE TABLE IF NOT EXISTS public.pickup_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  commune_id UUID REFERENCES public.communes(id),
  latitude NUMERIC,
  longitude NUMERIC,
  phone TEXT,
  opening_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  capacity INTEGER DEFAULT 100,
  current_load INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  credit_balance NUMERIC DEFAULT 0,
  preferred_language TEXT DEFAULT 'es',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.user_role NOT NULL DEFAULT 'buyer',
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, role)
);

-- Addresses
CREATE TABLE IF NOT EXISTS public.addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT DEFAULT 'Casa',
  full_name TEXT NOT NULL,
  phone TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Haiti',
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  preferred_pickup_point_id UUID REFERENCES public.pickup_points(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

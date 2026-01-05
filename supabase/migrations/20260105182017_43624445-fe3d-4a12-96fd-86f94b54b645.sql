-- Departments table (2-letter codes)
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(2) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Communes/Municipalities table (2-letter codes per department)
CREATE TABLE public.communes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  code VARCHAR(2) NOT NULL,
  name TEXT NOT NULL,
  rate_per_lb NUMERIC(10,4) NOT NULL DEFAULT 0,
  extra_department_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  operational_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(department_id, code)
);

-- Global shipping rates (China-USA)
CREATE TABLE public.shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value NUMERIC(10,4) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default China-USA rate
INSERT INTO public.shipping_rates (key, value, description) VALUES
  ('china_usa_rate_per_kg', 5.00, 'Tarifa por kilogramo China-USA'),
  ('default_insurance_percent', 2.00, 'Porcentaje de seguro por defecto');

-- Category shipping rates (fixed + percentage)
CREATE TABLE public.category_shipping_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  fixed_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  percentage_fee NUMERIC(5,2) NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id)
);

-- Pickup points for tracking (extends existing pickup_points)
ALTER TABLE public.pickup_points ADD COLUMN IF NOT EXISTS point_code VARCHAR(4);

-- Shipment tracking with hybrid ID
CREATE TABLE public.shipment_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hybrid_tracking_id TEXT NOT NULL UNIQUE,
  china_tracking_number TEXT NOT NULL,
  order_id UUID,
  order_type TEXT DEFAULT 'b2c',
  department_id UUID REFERENCES public.departments(id),
  commune_id UUID REFERENCES public.communes(id),
  pickup_point_id UUID REFERENCES public.pickup_points(id),
  unit_count INTEGER NOT NULL DEFAULT 1,
  customer_name TEXT,
  customer_phone TEXT,
  weight_grams NUMERIC(10,2),
  reference_price NUMERIC(10,2),
  shipping_cost_china_usa NUMERIC(10,2),
  shipping_cost_usa_haiti NUMERIC(10,2),
  category_fees NUMERIC(10,2),
  total_shipping_cost NUMERIC(10,2),
  status TEXT DEFAULT 'pending',
  label_printed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_shipping_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for departments (public read)
CREATE POLICY "Anyone can view departments" ON public.departments FOR SELECT USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for communes (public read)
CREATE POLICY "Anyone can view communes" ON public.communes FOR SELECT USING (true);
CREATE POLICY "Admins can manage communes" ON public.communes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for shipping_rates (public read)
CREATE POLICY "Anyone can view shipping rates" ON public.shipping_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage shipping rates" ON public.shipping_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for category_shipping_rates (public read)
CREATE POLICY "Anyone can view category shipping rates" ON public.category_shipping_rates FOR SELECT USING (true);
CREATE POLICY "Admins can manage category shipping rates" ON public.category_shipping_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for shipment_tracking
CREATE POLICY "Admins can view all shipments" ON public.shipment_tracking FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage shipments" ON public.shipment_tracking FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to generate hybrid tracking ID
CREATE OR REPLACE FUNCTION public.generate_hybrid_tracking_id(
  p_dept_code VARCHAR(2),
  p_commune_code VARCHAR(2),
  p_point_code VARCHAR(4),
  p_unit_count INTEGER,
  p_china_tracking TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN UPPER(p_dept_code) || '-' || UPPER(p_commune_code) || '-' || UPPER(COALESCE(p_point_code, 'XX')) || '-' || LPAD(p_unit_count::TEXT, 2, '0') || '-' || p_china_tracking;
END;
$$;

-- Insert sample departments for Haiti
INSERT INTO public.departments (code, name) VALUES
  ('OU', 'Ouest'),
  ('NO', 'Nord'),
  ('SU', 'Sud'),
  ('AR', 'Artibonite'),
  ('CE', 'Centre'),
  ('NE', 'Nord-Est'),
  ('NW', 'Nord-Ouest'),
  ('SE', 'Sud-Est'),
  ('GR', 'Grand''Anse'),
  ('NI', 'Nippes');

-- Insert sample communes for Ouest department
INSERT INTO public.communes (department_id, code, name, rate_per_lb, extra_department_fee, delivery_fee, operational_fee)
SELECT d.id, c.code, c.name, c.rate, c.extra, c.delivery, c.operational
FROM public.departments d
CROSS JOIN (VALUES
  ('PV', 'Port-au-Prince', 2.50, 0, 5.00, 2.00),
  ('PT', 'Pétion-Ville', 2.75, 0, 6.00, 2.00),
  ('DL', 'Delmas', 2.50, 0, 5.50, 2.00),
  ('CX', 'Croix-des-Bouquets', 3.00, 2.00, 7.00, 2.50),
  ('KF', 'Carrefour', 2.75, 0, 5.50, 2.00)
) AS c(code, name, rate, extra, delivery, operational)
WHERE d.code = 'OU';
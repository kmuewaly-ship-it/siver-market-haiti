-- Create function to auto-create store when seller role is assigned
CREATE OR REPLACE FUNCTION public.handle_seller_store_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_store_exists BOOLEAN;
  v_store_name TEXT;
  v_store_slug TEXT;
BEGIN
  IF NEW.role != 'seller' THEN
    RETURN NEW;
  END IF;
  
  SELECT EXISTS(SELECT 1 FROM public.stores WHERE owner_user_id = NEW.user_id) INTO v_store_exists;
  
  IF v_store_exists THEN
    RETURN NEW;
  END IF;
  
  SELECT * FROM public.profiles WHERE id = NEW.user_id INTO v_profile;
  
  v_store_name := COALESCE(v_profile.full_name, 'Mi Tienda') || '''s Store';
  v_store_slug := LOWER(REGEXP_REPLACE(v_store_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTR(NEW.user_id::text, 1, 8);
  
  INSERT INTO public.stores (owner_user_id, name, slug, description, is_active, is_verified)
  VALUES (NEW.user_id, v_store_name, v_store_slug, 'Bienvenido a mi tienda en Siver Market', true, false);
  
  INSERT INTO public.sellers (id, user_id, business_name, status)
  VALUES (gen_random_uuid(), NEW.user_id, v_store_name, 'pending')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_seller_role_assigned ON public.user_roles;
CREATE TRIGGER on_seller_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_seller_store_creation();

-- Countries and Transit Routes tables
CREATE TABLE IF NOT EXISTS public.destination_countries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transit_hubs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shipping_routes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  destination_country_id UUID NOT NULL REFERENCES public.destination_countries(id) ON DELETE CASCADE,
  transit_hub_id UUID REFERENCES public.transit_hubs(id) ON DELETE SET NULL,
  is_direct BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(destination_country_id)
);

CREATE TABLE IF NOT EXISTS public.route_logistics_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_route_id UUID NOT NULL REFERENCES public.shipping_routes(id) ON DELETE CASCADE,
  segment TEXT NOT NULL CHECK (segment IN ('china_to_transit', 'transit_to_destination', 'china_to_destination')),
  cost_per_kg DECIMAL(10,4) NOT NULL DEFAULT 0,
  cost_per_cbm DECIMAL(10,4) NOT NULL DEFAULT 0,
  min_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
  estimated_days_min INTEGER NOT NULL DEFAULT 7,
  estimated_days_max INTEGER NOT NULL DEFAULT 21,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shipping_route_id, segment)
);

-- Enable RLS
ALTER TABLE public.destination_countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transit_hubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_logistics_costs ENABLE ROW LEVEL SECURITY;

-- Read policies (public)
CREATE POLICY "Public read destination_countries" ON public.destination_countries FOR SELECT USING (true);
CREATE POLICY "Public read transit_hubs" ON public.transit_hubs FOR SELECT USING (true);
CREATE POLICY "Public read shipping_routes" ON public.shipping_routes FOR SELECT USING (true);
CREATE POLICY "Public read route_logistics_costs" ON public.route_logistics_costs FOR SELECT USING (true);

-- Write policies (admin role check)
CREATE POLICY "Admin write destination_countries" ON public.destination_countries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write transit_hubs" ON public.transit_hubs FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write shipping_routes" ON public.shipping_routes FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin write route_logistics_costs" ON public.route_logistics_costs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default data
INSERT INTO public.transit_hubs (name, code, description) VALUES 
  ('Panamá', 'PA', 'Hub de tránsito en Panamá'),
  ('República Dominicana', 'DO', 'Hub de tránsito en República Dominicana'),
  ('Miami, USA', 'US-FL', 'Hub de tránsito en Miami, Florida')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.destination_countries (name, code, currency) VALUES 
  ('Haití', 'HT', 'HTG'),
  ('República Dominicana', 'DO', 'DOP'),
  ('Jamaica', 'JM', 'JMD')
ON CONFLICT (code) DO NOTHING;
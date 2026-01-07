-- Create table for marketplace section settings
CREATE TABLE public.marketplace_section_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  item_limit INTEGER NOT NULL DEFAULT 10,
  display_mode TEXT DEFAULT 'carousel',
  custom_config JSONB DEFAULT '{}',
  target_audience TEXT DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketplace_section_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for public read (sections are public config)
CREATE POLICY "Marketplace sections are publicly readable"
ON public.marketplace_section_settings
FOR SELECT
USING (true);

-- Create policy for admin write (only admins can modify)
CREATE POLICY "Admins can manage marketplace sections"
ON public.marketplace_section_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_marketplace_section_settings_updated_at
BEFORE UPDATE ON public.marketplace_section_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sections
INSERT INTO public.marketplace_section_settings (section_key, title, description, sort_order, item_limit, target_audience) VALUES
('featured_products', 'Productos Destacados', 'Productos destacados del catálogo', 1, 12, 'all'),
('best_sellers', 'Más Vendidos', 'Los productos más vendidos', 2, 12, 'all'),
('new_arrivals', 'Recién Llegados', 'Productos recién añadidos', 3, 12, 'all'),
('deals', 'Ofertas', 'Productos con descuento', 4, 12, 'all'),
('top_stores', 'Tiendas Destacadas', 'Las mejores tiendas del marketplace', 5, 8, 'b2c'),
('recommended_products', 'Recomendados', 'Productos recomendados basados en tu navegación', 6, 8, 'all'),
('banners', 'Banners', 'Banners promocionales', 0, 5, 'all');
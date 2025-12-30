-- ============================================
-- EAV (Entity-Attribute-Value) Schema for Dynamic Product Attributes
-- ============================================

-- 1. Master Attributes Table (Color, Size, Voltage, Material, etc.)
CREATE TABLE IF NOT EXISTS public.attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  attribute_type TEXT NOT NULL DEFAULT 'select', -- 'select', 'color', 'size', 'technical', 'text'
  render_type TEXT NOT NULL DEFAULT 'chips', -- 'swatches', 'chips', 'dropdown', 'buttons'
  category_hint TEXT, -- 'fashion', 'electronics', 'home', etc.
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Attribute Options Table (Red, Blue, XL, 220V, 100W, etc.)
CREATE TABLE IF NOT EXISTS public.attribute_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  display_value TEXT NOT NULL,
  color_hex TEXT, -- For color swatches (e.g., #FF0000)
  image_url TEXT, -- For visual swatches
  metadata JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(attribute_id, value)
);

-- 3. Product Attribute Values (Links products to their attribute options)
CREATE TABLE IF NOT EXISTS public.product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  attribute_option_id UUID NOT NULL REFERENCES public.attribute_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, attribute_id, attribute_option_id)
);

-- 4. B2B Batches/Lots for inventory tracking
CREATE TABLE IF NOT EXISTS public.b2b_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders_b2b(id),
  supplier_id UUID REFERENCES public.suppliers(id),
  purchase_date TIMESTAMPTZ DEFAULT now(),
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT DEFAULT 'active', -- 'active', 'depleted', 'returned'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Add new columns to product_variants for EAV and batch tracking
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.b2b_batches(id),
ADD COLUMN IF NOT EXISTS attribute_combination JSONB DEFAULT '{}', -- Stores {attribute_id: option_id, ...}
ADD COLUMN IF NOT EXISTS stock_b2c INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_adjustment NUMERIC DEFAULT 0;

-- 6. Variant Attribute Values (Links variants to specific attribute options)
CREATE TABLE IF NOT EXISTS public.variant_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  attribute_option_id UUID NOT NULL REFERENCES public.attribute_options(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(variant_id, attribute_id)
);

-- 7. Batch Inventory Tracking (Links variants to their batch origin)
CREATE TABLE IF NOT EXISTS public.batch_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.b2b_batches(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity_purchased INTEGER NOT NULL DEFAULT 0,
  quantity_sold INTEGER DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (quantity_purchased - quantity_sold) STORED,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(batch_id, variant_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attribute_options_attribute ON public.attribute_options(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_product ON public.product_attribute_values(product_id);
CREATE INDEX IF NOT EXISTS idx_product_attribute_values_attribute ON public.product_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_variant_attribute_values_variant ON public.variant_attribute_values(variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_attribute_values_attribute ON public.variant_attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_batch_inventory_batch ON public.batch_inventory(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_inventory_variant ON public.batch_inventory(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_batch ON public.product_variants(batch_id);

-- Insert common attributes
INSERT INTO public.attributes (name, slug, display_name, attribute_type, render_type, category_hint, sort_order) VALUES
  ('color', 'color', 'Color', 'color', 'swatches', 'fashion', 1),
  ('size', 'size', 'Talla', 'size', 'buttons', 'fashion', 2),
  ('voltage', 'voltage', 'Voltaje', 'technical', 'chips', 'electronics', 3),
  ('wattage', 'wattage', 'Potencia (W)', 'technical', 'chips', 'electronics', 4),
  ('capacity', 'capacity', 'Capacidad (mAh)', 'technical', 'chips', 'electronics', 5),
  ('material', 'material', 'Material', 'select', 'dropdown', 'general', 6),
  ('style', 'style', 'Estilo', 'select', 'chips', 'fashion', 7),
  ('age_group', 'age_group', 'Grupo de Edad', 'size', 'buttons', 'fashion', 8),
  ('length', 'length', 'Longitud', 'select', 'chips', 'fashion', 9),
  ('pattern', 'pattern', 'Patrón', 'select', 'chips', 'fashion', 10)
ON CONFLICT (slug) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attributes (public read, admin write)
CREATE POLICY "Public can view attributes" ON public.attributes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage attributes" ON public.attributes FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for attribute_options (public read, admin write)
CREATE POLICY "Public can view attribute options" ON public.attribute_options FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage attribute options" ON public.attribute_options FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for product_attribute_values (public read, admin write)
CREATE POLICY "Public can view product attributes" ON public.product_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins can manage product attributes" ON public.product_attribute_values FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for variant_attribute_values (public read, admin write)
CREATE POLICY "Public can view variant attributes" ON public.variant_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admins can manage variant attributes" ON public.variant_attribute_values FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for b2b_batches
CREATE POLICY "Admins can manage batches" ON public.b2b_batches FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Sellers can view their batches" ON public.b2b_batches FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM orders_b2b o WHERE o.id = b2b_batches.order_id AND o.seller_id = auth.uid()
  ));

-- RLS Policies for batch_inventory
CREATE POLICY "Admins can manage batch inventory" ON public.batch_inventory FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Sellers can view their batch inventory" ON public.batch_inventory FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM b2b_batches b 
    JOIN orders_b2b o ON o.id = b.order_id 
    WHERE b.id = batch_inventory.batch_id AND o.seller_id = auth.uid()
  ));

-- Function to generate batch code
CREATE OR REPLACE FUNCTION public.generate_batch_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.batch_code := 'BATCH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER tr_generate_batch_code
  BEFORE INSERT ON public.b2b_batches
  FOR EACH ROW
  WHEN (NEW.batch_code IS NULL)
  EXECUTE FUNCTION public.generate_batch_code();
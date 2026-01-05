-- Stock tracking for in-transit inventory from China
CREATE TABLE public.stock_in_transit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  china_tracking_number TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  expected_arrival_date DATE,
  shipped_date DATE,
  status TEXT DEFAULT 'in_transit',
  batch_id UUID REFERENCES public.b2b_batches(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer order allocations (links orders to stock sources)
CREATE TABLE public.order_stock_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'b2c',
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  sku TEXT NOT NULL,
  quantity_ordered INTEGER NOT NULL,
  quantity_from_haiti INTEGER DEFAULT 0,
  quantity_from_transit INTEGER DEFAULT 0,
  quantity_pending_purchase INTEGER DEFAULT 0,
  transit_stock_id UUID REFERENCES public.stock_in_transit(id),
  allocation_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Stock rotation tracking (last sale date per product)
CREATE TABLE public.stock_rotation_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  last_sale_date TIMESTAMP WITH TIME ZONE,
  stock_quantity INTEGER DEFAULT 0,
  suggested_discount NUMERIC(5,2) DEFAULT 0,
  alert_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(product_id, variant_id)
);

-- Purchase consolidation snapshots
CREATE TABLE public.purchase_consolidations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidation_number TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'draft',
  total_items INTEGER DEFAULT 0,
  total_quantity INTEGER DEFAULT 0,
  estimated_cost NUMERIC(12,2) DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id),
  notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  ordered_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Consolidation line items
CREATE TABLE public.purchase_consolidation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  consolidation_id UUID NOT NULL REFERENCES public.purchase_consolidations(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  color TEXT,
  size TEXT,
  quantity_confirmed INTEGER DEFAULT 0,
  quantity_pending INTEGER DEFAULT 0,
  quantity_cart INTEGER DEFAULT 0,
  quantity_in_stock INTEGER DEFAULT 0,
  quantity_in_transit INTEGER DEFAULT 0,
  quantity_to_order INTEGER DEFAULT 0,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_in_transit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stock_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_rotation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_consolidations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_consolidation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage stock_in_transit" ON public.stock_in_transit FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can view stock_in_transit" ON public.stock_in_transit FOR SELECT USING (true);

CREATE POLICY "Admins can manage allocations" ON public.order_stock_allocations FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage rotation tracking" ON public.stock_rotation_tracking FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Anyone can view rotation tracking" ON public.stock_rotation_tracking FOR SELECT USING (true);

CREATE POLICY "Admins can manage consolidations" ON public.purchase_consolidations FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage consolidation items" ON public.purchase_consolidation_items FOR ALL 
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- View for stock balance calculation
CREATE OR REPLACE VIEW public.stock_balance_view AS
SELECT 
  p.id as product_id,
  p.nombre as product_name,
  p.sku_interno as sku,
  pv.id as variant_id,
  pv.option_value as variant_name,
  COALESCE(pv.stock, 0) as stock_haiti,
  COALESCE((SELECT SUM(sit.quantity) FROM stock_in_transit sit 
    WHERE sit.variant_id = pv.id AND sit.status = 'in_transit'), 0) as stock_in_transit,
  COALESCE((SELECT SUM(osa.quantity_ordered) FROM order_stock_allocations osa 
    WHERE osa.variant_id = pv.id AND osa.allocation_status != 'fulfilled'), 0) as orders_pending,
  COALESCE(pv.stock, 0) + 
    COALESCE((SELECT SUM(sit.quantity) FROM stock_in_transit sit 
      WHERE sit.variant_id = pv.id AND sit.status = 'in_transit'), 0) -
    COALESCE((SELECT SUM(osa.quantity_ordered) FROM order_stock_allocations osa 
      WHERE osa.variant_id = pv.id AND osa.allocation_status != 'fulfilled'), 0) as available_balance
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE p.is_active = true AND pv.is_active = true;

-- View for rotation alerts (products with no sales in 30+ days)
CREATE OR REPLACE VIEW public.stock_rotation_alerts AS
SELECT 
  srt.id,
  p.id as product_id,
  p.nombre as product_name,
  p.sku_interno as sku,
  pv.id as variant_id,
  pv.option_value as variant_name,
  srt.last_sale_date,
  EXTRACT(DAY FROM (now() - srt.last_sale_date))::INTEGER as days_without_sale,
  srt.stock_quantity,
  srt.suggested_discount,
  srt.alert_sent_at
FROM stock_rotation_tracking srt
JOIN products p ON p.id = srt.product_id
LEFT JOIN product_variants pv ON pv.id = srt.variant_id
WHERE srt.stock_quantity > 0 
  AND (srt.last_sale_date IS NULL OR EXTRACT(DAY FROM (now() - srt.last_sale_date)) > 30);

-- Function to generate consolidation number
CREATE OR REPLACE FUNCTION public.generate_consolidation_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count FROM purchase_consolidations;
  v_number := 'CON-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;
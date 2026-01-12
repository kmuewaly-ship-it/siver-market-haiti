-- Create tracking table first
CREATE TABLE IF NOT EXISTS public.catalog_click_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES public.stores(id),
  product_id UUID REFERENCES public.products(id),
  variant_id UUID,
  source_type TEXT DEFAULT 'pdf',
  source_campaign TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  device_type TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  converted_to_cart BOOLEAN DEFAULT false,
  converted_at TIMESTAMPTZ
);

ALTER TABLE public.catalog_click_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public inserts" ON public.catalog_click_tracking FOR INSERT WITH CHECK (true);
CREATE POLICY "Sellers view own" ON public.catalog_click_tracking FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = seller_id AND s.owner_user_id = auth.uid()));

CREATE OR REPLACE VIEW public.product_eta_view AS
SELECT p.id as product_id, p.sku_interno, p.nombre, p.stock_fisico,
  CASE WHEN COALESCE(p.stock_fisico, 0) > 0 THEN 'inmediato' ELSE '14-21 días' END as eta_display,
  CASE WHEN COALESCE(p.stock_fisico, 0) > 0 THEN 0 ELSE 21 END as eta_days_min
FROM public.products p WHERE p.is_active = true;

CREATE OR REPLACE VIEW public.seller_catalog_marketing AS
SELECT sc.id, sc.seller_store_id, sc.source_product_id, sc.sku, sc.nombre, sc.precio_venta, sc.stock, sc.images, st.name as store_name, st.slug as store_slug,
  CASE WHEN p.id IS NOT NULL AND p.is_active = true THEN true ELSE false END as b2b_available
FROM public.seller_catalog sc INNER JOIN public.stores st ON st.id = sc.seller_store_id LEFT JOIN public.products p ON p.id = sc.source_product_id WHERE sc.is_active = true;

CREATE OR REPLACE FUNCTION public.track_catalog_click(p_seller_id UUID, p_product_id UUID, p_variant_id UUID DEFAULT NULL, p_source_type TEXT DEFAULT 'pdf') RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN INSERT INTO public.catalog_click_tracking (seller_id, product_id, variant_id, source_type) VALUES (p_seller_id, p_product_id, p_variant_id, COALESCE(p_source_type, 'pdf')) RETURNING id INTO v_id; RETURN v_id;
END; $$ LANGUAGE plpgsql SET search_path = public;

GRANT SELECT ON public.product_eta_view TO authenticated;
GRANT SELECT ON public.seller_catalog_marketing TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_catalog_click TO anon, authenticated;
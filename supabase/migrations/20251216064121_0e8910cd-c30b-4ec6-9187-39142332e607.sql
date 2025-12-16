-- Create product_views table to track product views for trending calculation
CREATE TABLE public.product_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT DEFAULT 'direct'
);

-- Create index for efficient trending queries
CREATE INDEX idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX idx_product_views_viewed_at ON public.product_views(viewed_at DESC);

-- Enable RLS
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (anonymous tracking)
CREATE POLICY "Anyone can insert product views"
ON public.product_views
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all
CREATE POLICY "Admins can view product views"
ON public.product_views
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to get trending products
CREATE OR REPLACE FUNCTION public.get_trending_products(
  days_back INTEGER DEFAULT 7,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  view_count BIGINT,
  product_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pv.product_id,
    COUNT(pv.id) as view_count,
    jsonb_build_object(
      'id', p.id,
      'nombre', p.nombre,
      'precio_mayorista', p.precio_mayorista,
      'precio_sugerido_venta', p.precio_sugerido_venta,
      'imagen_principal', p.imagen_principal,
      'categoria_id', p.categoria_id,
      'sku_interno', p.sku_interno,
      'stock_status', p.stock_status
    ) as product_data
  FROM product_views pv
  JOIN products p ON p.id = pv.product_id
  WHERE pv.viewed_at >= NOW() - (days_back || ' days')::INTERVAL
    AND p.is_active = true
  GROUP BY pv.product_id, p.id, p.nombre, p.precio_mayorista, p.precio_sugerido_venta, 
           p.imagen_principal, p.categoria_id, p.sku_interno, p.stock_status
  ORDER BY view_count DESC
  LIMIT limit_count;
END;
$$;
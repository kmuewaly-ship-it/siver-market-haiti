-- =============================================
-- VISTA DE REFERENCIA CRUZADA B2C -> B2B
-- Precio Máximo del Mercado B2C por Producto
-- =============================================

-- 1. Vista materializada-like para MAX precio B2C por SKU/producto
CREATE OR REPLACE VIEW public.b2c_max_prices AS
SELECT 
  sc.source_product_id,
  sc.sku,
  MAX(sc.precio_venta) as max_b2c_price,
  COUNT(DISTINCT sc.seller_store_id) as num_sellers,
  MIN(sc.precio_venta) as min_b2c_price,
  AVG(sc.precio_venta) as avg_b2c_price
FROM public.seller_catalog sc
WHERE sc.is_active = true
  AND sc.precio_venta > 0
GROUP BY sc.source_product_id, sc.sku;

-- 2. Función para obtener el PVP de referencia de un producto
-- Prioriza: MAX precio B2C > precio_sugerido_venta del producto > fallback 30%
CREATE OR REPLACE FUNCTION public.get_reference_pvp(
  p_product_id UUID,
  p_product_sku TEXT DEFAULT NULL,
  p_fallback_price NUMERIC DEFAULT NULL
)
RETURNS TABLE(
  pvp_reference NUMERIC,
  pvp_source TEXT,
  num_b2c_sellers INTEGER,
  min_market_price NUMERIC,
  max_market_price NUMERIC,
  is_synced_with_market BOOLEAN
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_b2c_data RECORD;
  v_product_suggested NUMERIC;
  v_wholesale_price NUMERIC;
BEGIN
  -- Get B2C market data by product_id or SKU
  SELECT 
    bmp.max_b2c_price,
    bmp.min_b2c_price,
    bmp.num_sellers::INTEGER
  INTO v_b2c_data
  FROM b2c_max_prices bmp
  WHERE bmp.source_product_id = p_product_id
     OR (p_product_sku IS NOT NULL AND bmp.sku = p_product_sku)
  ORDER BY bmp.max_b2c_price DESC NULLS LAST
  LIMIT 1;
  
  -- Get product's suggested price and wholesale price
  SELECT p.precio_sugerido_venta, p.precio_mayorista
  INTO v_product_suggested, v_wholesale_price
  FROM products p
  WHERE p.id = p_product_id;
  
  -- Determine PVP source and value
  IF v_b2c_data.max_b2c_price IS NOT NULL AND v_b2c_data.max_b2c_price > 0 THEN
    -- Market price available
    RETURN QUERY SELECT 
      v_b2c_data.max_b2c_price,
      'market'::TEXT,
      v_b2c_data.num_sellers,
      v_b2c_data.min_b2c_price,
      v_b2c_data.max_b2c_price,
      true;
  ELSIF v_product_suggested IS NOT NULL AND v_product_suggested > 0 THEN
    -- Use admin-defined suggested price
    RETURN QUERY SELECT 
      v_product_suggested,
      'admin'::TEXT,
      0::INTEGER,
      v_product_suggested,
      v_product_suggested,
      false;
  ELSIF p_fallback_price IS NOT NULL AND p_fallback_price > 0 THEN
    -- Use provided fallback
    RETURN QUERY SELECT 
      ROUND(p_fallback_price * 1.3, 2),
      'calculated'::TEXT,
      0::INTEGER,
      ROUND(p_fallback_price * 1.3, 2),
      ROUND(p_fallback_price * 1.3, 2),
      false;
  ELSIF v_wholesale_price IS NOT NULL AND v_wholesale_price > 0 THEN
    -- Calculate 30% margin from wholesale
    RETURN QUERY SELECT 
      ROUND(v_wholesale_price * 1.3, 2),
      'calculated'::TEXT,
      0::INTEGER,
      ROUND(v_wholesale_price * 1.3, 2),
      ROUND(v_wholesale_price * 1.3, 2),
      false;
  ELSE
    -- No reference available
    RETURN QUERY SELECT 
      0::NUMERIC,
      'none'::TEXT,
      0::INTEGER,
      0::NUMERIC,
      0::NUMERIC,
      false;
  END IF;
END;
$$;

-- 3. Vista enriquecida de productos B2B con datos de mercado
CREATE OR REPLACE VIEW public.products_b2b_enriched AS
SELECT 
  p.id,
  p.sku_interno,
  p.nombre,
  p.precio_mayorista,
  p.precio_sugerido_venta,
  p.stock_fisico,
  p.moq,
  p.imagen_principal,
  p.categoria_id,
  p.is_active,
  p.created_at,
  -- Market reference data
  COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, ROUND(p.precio_mayorista * 1.3, 2)) as pvp_reference,
  CASE 
    WHEN bmp.max_b2c_price IS NOT NULL THEN 'market'
    WHEN p.precio_sugerido_venta IS NOT NULL THEN 'admin'
    ELSE 'calculated'
  END as pvp_source,
  COALESCE(bmp.num_sellers, 0) as num_b2c_sellers,
  bmp.min_b2c_price,
  bmp.max_b2c_price,
  -- Profit calculations
  COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, ROUND(p.precio_mayorista * 1.3, 2)) - p.precio_mayorista as profit_amount,
  CASE 
    WHEN p.precio_mayorista > 0 THEN 
      ROUND(((COALESCE(bmp.max_b2c_price, p.precio_sugerido_venta, ROUND(p.precio_mayorista * 1.3, 2)) - p.precio_mayorista) / p.precio_mayorista) * 100, 1)
    ELSE 0
  END as roi_percent,
  -- Market sync indicator
  (bmp.max_b2c_price IS NOT NULL) as is_market_synced
FROM public.products p
LEFT JOIN public.b2c_max_prices bmp ON bmp.source_product_id = p.id
WHERE p.is_active = true;

-- 4. Función para calcular ganancia proyectada del carrito
CREATE OR REPLACE FUNCTION public.calculate_cart_projected_profit(
  p_cart_items JSONB
)
RETURNS TABLE(
  total_investment NUMERIC,
  total_pvp_value NUMERIC,
  total_profit NUMERIC,
  avg_roi_percent NUMERIC,
  items_with_market_price INTEGER,
  items_total INTEGER
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_total_investment NUMERIC := 0;
  v_total_pvp NUMERIC := 0;
  v_total_profit NUMERIC := 0;
  v_items_synced INTEGER := 0;
  v_items_count INTEGER := 0;
  v_item RECORD;
  v_pvp_data RECORD;
BEGIN
  -- Iterate through cart items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_cart_items) AS x(
    product_id UUID,
    sku TEXT,
    cantidad INTEGER,
    precio_b2b NUMERIC
  )
  LOOP
    v_items_count := v_items_count + 1;
    
    -- Get PVP reference for this product
    SELECT * INTO v_pvp_data FROM get_reference_pvp(v_item.product_id, v_item.sku, v_item.precio_b2b);
    
    -- Calculate totals
    v_total_investment := v_total_investment + (v_item.precio_b2b * v_item.cantidad);
    v_total_pvp := v_total_pvp + (COALESCE(v_pvp_data.pvp_reference, v_item.precio_b2b * 1.3) * v_item.cantidad);
    
    IF v_pvp_data.is_synced_with_market THEN
      v_items_synced := v_items_synced + 1;
    END IF;
  END LOOP;
  
  v_total_profit := v_total_pvp - v_total_investment;
  
  RETURN QUERY SELECT 
    v_total_investment,
    v_total_pvp,
    v_total_profit,
    CASE WHEN v_total_investment > 0 THEN ROUND((v_total_profit / v_total_investment) * 100, 1) ELSE 0 END,
    v_items_synced,
    v_items_count;
END;
$$;

-- 5. Índices para mejorar performance de las consultas
CREATE INDEX IF NOT EXISTS idx_seller_catalog_source_product ON public.seller_catalog(source_product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_seller_catalog_sku_price ON public.seller_catalog(sku, precio_venta) WHERE is_active = true;
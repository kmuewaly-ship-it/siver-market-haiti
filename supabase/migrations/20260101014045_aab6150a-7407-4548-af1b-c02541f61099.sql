-- =============================================
-- FIX SECURITY DEFINER VIEWS
-- Convert views to SECURITY INVOKER (default) to respect RLS of querying user
-- =============================================

-- 1. Recreate stores_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public
WITH (security_invoker = true) AS
SELECT 
  id,
  owner_user_id,
  name,
  slug,
  description,
  logo,
  banner,
  whatsapp,
  city,
  country,
  is_active,
  is_accepting_orders,
  allow_comments,
  show_stock,
  instagram,
  facebook,
  tiktok,
  return_policy,
  shipping_policy,
  created_at,
  updated_at
FROM public.stores
WHERE is_active = true;

GRANT SELECT ON public.stores_public TO anon, authenticated;

-- 2. Recreate seller_catalog_public with SECURITY INVOKER  
DROP VIEW IF EXISTS public.seller_catalog_public;
CREATE VIEW public.seller_catalog_public
WITH (security_invoker = true) AS
SELECT 
  sc.id,
  sc.seller_store_id,
  sc.sku,
  sc.nombre,
  sc.descripcion,
  sc.precio_venta,
  sc.stock,
  sc.images,
  sc.is_active,
  sc.imported_at,
  sc.updated_at
FROM public.seller_catalog sc
WHERE sc.is_active = true;

GRANT SELECT ON public.seller_catalog_public TO anon, authenticated;

-- FASE 1: LIMPIEZA COMPLETA DE DATOS DE PRUEBA (ORDEN CORREGIDO)

-- 1.0 Limpiar product_migration_log primero (tiene FK a product_variants)
DELETE FROM public.product_migration_log;

-- 1.1 Limpiar items de carritos B2C
DELETE FROM public.b2c_cart_items;

-- 1.2 Limpiar carritos B2C
DELETE FROM public.b2c_carts;

-- 1.3 Limpiar items de carritos B2B
DELETE FROM public.b2b_cart_items;

-- 1.4 Limpiar carritos B2B
DELETE FROM public.b2b_carts;

-- 1.5 Limpiar stock reservations
DELETE FROM public.stock_reservations;

-- 1.6 Limpiar order items B2B
DELETE FROM public.order_items_b2b;

-- 1.7 Limpiar orders B2B
DELETE FROM public.orders_b2b;

-- 1.8 Limpiar pending quotes
DELETE FROM public.pending_quotes;

-- 1.9 Limpiar inventory movements
DELETE FROM public.inventory_movements;

-- 1.10 Limpiar batch inventory (tiene FK a product_variants)
DELETE FROM public.batch_inventory;

-- 1.11 Limpiar product variants
DELETE FROM public.product_variants;

-- 1.12 Limpiar seller catalog
DELETE FROM public.seller_catalog;

-- 1.13 Limpiar product views
DELETE FROM public.product_views;

-- 1.14 Limpiar product reviews
DELETE FROM public.product_reviews;

-- 1.15 Limpiar b2b batches
DELETE FROM public.b2b_batches;

-- 1.16 Desactivar todos los productos de prueba
UPDATE public.products SET is_active = false;

-- 1.17 Consolidar tiendas - mantener solo una "Siver Oficial"
DELETE FROM public.stores 
WHERE name = 'Siver Oficial' 
AND id NOT IN (
  SELECT id FROM public.stores 
  WHERE name = 'Siver Oficial' 
  ORDER BY created_at ASC 
  LIMIT 1
);

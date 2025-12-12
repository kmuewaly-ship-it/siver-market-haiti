-- =====================================================
-- MIGRACIÓN B2B: Tablas de Pedidos y Order Items
-- =====================================================

-- 1) Crear tabla orders_b2b (pedidos mayoristas)
CREATE TABLE IF NOT EXISTS public.orders_b2b (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, placed, paid, shipped, completed, cancelled
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT, -- stripe, moncash, transfer
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para orders_b2b
CREATE INDEX IF NOT EXISTS idx_orders_b2b_seller ON public.orders_b2b(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_status ON public.orders_b2b(status);
CREATE INDEX IF NOT EXISTS idx_orders_b2b_created ON public.orders_b2b(created_at DESC);

-- 2) Crear tabla order_items_b2b (items de pedidos)
CREATE TABLE IF NOT EXISTS public.order_items_b2b (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders_b2b(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC(10,2) NOT NULL,
  descuento_percent NUMERIC(5,2) DEFAULT 0.00,
  subtotal NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para order_items_b2b
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items_b2b(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items_b2b(product_id);

-- 3) Trigger para actualizar updated_at en orders_b2b
CREATE TRIGGER update_orders_b2b_updated_at
  BEFORE UPDATE ON public.orders_b2b
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES para orders_b2b
-- =====================================================
ALTER TABLE public.orders_b2b ENABLE ROW LEVEL SECURITY;

-- Sellers pueden ver sus propias órdenes
CREATE POLICY "Sellers can view own orders" 
  ON public.orders_b2b 
  FOR SELECT 
  USING (seller_id = auth.uid());

-- Sellers pueden crear sus propias órdenes
CREATE POLICY "Sellers can create own orders" 
  ON public.orders_b2b 
  FOR INSERT 
  WITH CHECK (seller_id = auth.uid());

-- Sellers pueden actualizar sus propias órdenes en draft
CREATE POLICY "Sellers can update draft orders" 
  ON public.orders_b2b 
  FOR UPDATE 
  USING (seller_id = auth.uid() AND status = 'draft');

-- Admins tienen acceso total a orders
CREATE POLICY "Admins full access to orders" 
  ON public.orders_b2b 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- RLS POLICIES para order_items_b2b
-- =====================================================
ALTER TABLE public.order_items_b2b ENABLE ROW LEVEL SECURITY;

-- Items visibles si el usuario puede ver la orden padre
CREATE POLICY "Items visible with parent order" 
  ON public.order_items_b2b 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.orders_b2b o 
      WHERE o.id = order_id 
      AND (o.seller_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Items insertables si el usuario puede modificar la orden padre
CREATE POLICY "Items insertable with parent order" 
  ON public.order_items_b2b 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders_b2b o 
      WHERE o.id = order_id 
      AND (o.seller_id = auth.uid() OR public.is_admin(auth.uid()))
      AND o.status = 'draft'
    )
  );

-- Admins pueden gestionar todos los items
CREATE POLICY "Admins manage all items" 
  ON public.order_items_b2b 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

-- =====================================================
-- Índices adicionales para products (si no existen)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku_interno);
CREATE INDEX IF NOT EXISTS idx_products_categoria ON public.products(categoria_id);
CREATE INDEX IF NOT EXISTS idx_products_precio ON public.products(precio_mayorista);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- =====================================================
-- Índices adicionales para categories (si no existen)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_visible ON public.categories(is_visible_public);
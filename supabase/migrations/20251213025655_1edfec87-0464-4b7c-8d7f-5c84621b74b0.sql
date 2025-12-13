-- =====================================================
-- MIGRACIÓN B2B: Carrito, Órdenes y Catálogo de Vendedor
-- Fecha: 2024-12-13
-- =====================================================

-- 1. TABLA STORES (Tiendas de vendedores)
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo TEXT,
  banner TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para stores
CREATE INDEX IF NOT EXISTS idx_stores_owner ON public.stores(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);

-- RLS para stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active stores"
ON public.stores FOR SELECT
USING (is_active = true);

CREATE POLICY "Owners can manage their stores"
ON public.stores FOR ALL
USING (owner_user_id = auth.uid());

CREATE POLICY "Admins can manage all stores"
ON public.stores FOR ALL
USING (is_admin(auth.uid()));

-- 2. TABLA B2B_CARTS (Carritos B2B)
CREATE TABLE IF NOT EXISTS public.b2b_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para b2b_carts
CREATE INDEX IF NOT EXISTS idx_b2b_carts_buyer ON public.b2b_carts(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_carts_status ON public.b2b_carts(status);

-- RLS para b2b_carts
ALTER TABLE public.b2b_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own carts"
ON public.b2b_carts FOR SELECT
USING (buyer_user_id = auth.uid());

CREATE POLICY "Users can create own carts"
ON public.b2b_carts FOR INSERT
WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Users can update own open carts"
ON public.b2b_carts FOR UPDATE
USING (buyer_user_id = auth.uid() AND status = 'open');

CREATE POLICY "Admins can manage all carts"
ON public.b2b_carts FOR ALL
USING (is_admin(auth.uid()));

-- 3. TABLA B2B_CART_ITEMS (Items del carrito B2B)
CREATE TABLE IF NOT EXISTS public.b2b_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.b2b_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  color TEXT,
  size TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para b2b_cart_items
CREATE INDEX IF NOT EXISTS idx_b2b_cart_items_cart ON public.b2b_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_b2b_cart_items_product ON public.b2b_cart_items(product_id);

-- RLS para b2b_cart_items
ALTER TABLE public.b2b_cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cart items visible with parent cart"
ON public.b2b_cart_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.b2b_carts c 
  WHERE c.id = b2b_cart_items.cart_id 
  AND (c.buyer_user_id = auth.uid() OR is_admin(auth.uid()))
));

CREATE POLICY "Cart items insertable with open cart"
ON public.b2b_cart_items FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.b2b_carts c 
  WHERE c.id = b2b_cart_items.cart_id 
  AND c.buyer_user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Cart items updatable with open cart"
ON public.b2b_cart_items FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.b2b_carts c 
  WHERE c.id = b2b_cart_items.cart_id 
  AND c.buyer_user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Cart items deletable with open cart"
ON public.b2b_cart_items FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.b2b_carts c 
  WHERE c.id = b2b_cart_items.cart_id 
  AND c.buyer_user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Admins can manage all cart items"
ON public.b2b_cart_items FOR ALL
USING (is_admin(auth.uid()));

-- 4. TABLA SELLER_CATALOG (Catálogo importado del vendedor)
CREATE TABLE IF NOT EXISTS public.seller_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  source_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  source_order_id UUID REFERENCES public.orders_b2b(id) ON DELETE SET NULL,
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_venta NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_costo NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  images JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  imported_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para seller_catalog
CREATE INDEX IF NOT EXISTS idx_seller_catalog_store ON public.seller_catalog(seller_store_id);
CREATE INDEX IF NOT EXISTS idx_seller_catalog_source ON public.seller_catalog(source_product_id);
CREATE INDEX IF NOT EXISTS idx_seller_catalog_sku ON public.seller_catalog(sku);

-- RLS para seller_catalog
ALTER TABLE public.seller_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active catalog items"
ON public.seller_catalog FOR SELECT
USING (is_active = true);

CREATE POLICY "Store owners can manage their catalog"
ON public.seller_catalog FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.stores s 
  WHERE s.id = seller_catalog.seller_store_id 
  AND s.owner_user_id = auth.uid()
));

CREATE POLICY "Admins can manage all catalog items"
ON public.seller_catalog FOR ALL
USING (is_admin(auth.uid()));

-- 5. TABLA INVENTORY_MOVEMENTS (Movimientos de inventario)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  seller_catalog_id UUID REFERENCES public.seller_catalog(id) ON DELETE SET NULL,
  change_amount INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reason TEXT NOT NULL,
  reference_type TEXT, -- 'b2b_order', 'b2c_order', 'adjustment', 'import'
  reference_id UUID,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_catalog ON public.inventory_movements(seller_catalog_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created ON public.inventory_movements(created_at);

-- RLS para inventory_movements
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all movements"
ON public.inventory_movements FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert movements"
ON public.inventory_movements FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Store owners can view their movements"
ON public.inventory_movements FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.seller_catalog sc
  JOIN public.stores s ON s.id = sc.seller_store_id
  WHERE sc.id = inventory_movements.seller_catalog_id
  AND s.owner_user_id = auth.uid()
));

-- 6. FUNCIÓN: Manejar pago B2B completado
-- Esta función se ejecuta cuando un pedido B2B es marcado como pagado
CREATE OR REPLACE FUNCTION public.fn_handle_b2b_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_buyer_id UUID;
  v_store_id UUID;
  v_item RECORD;
  v_catalog_id UUID;
  v_previous_stock INTEGER;
  v_product_images JSONB;
BEGIN
  -- Solo procesar cuando el status cambia a 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    
    -- Obtener el buyer_id del pedido
    v_buyer_id := NEW.seller_id; -- En orders_b2b, seller_id es el comprador mayorista
    
    -- Buscar o crear la tienda del comprador
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE owner_user_id = v_buyer_id
    LIMIT 1;
    
    IF v_store_id IS NULL THEN
      -- Crear tienda placeholder para el comprador
      INSERT INTO public.stores (owner_user_id, name, slug, description)
      VALUES (
        v_buyer_id,
        'Mi Tienda',
        'tienda-' || REPLACE(v_buyer_id::TEXT, '-', ''),
        'Tienda creada automáticamente'
      )
      RETURNING id INTO v_store_id;
    END IF;
    
    -- Procesar cada item del pedido
    FOR v_item IN 
      SELECT oi.*, p.imagen_principal, p.galeria_imagenes, p.descripcion_corta
      FROM public.order_items_b2b oi
      LEFT JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = NEW.id
    LOOP
      -- Preparar imágenes
      v_product_images := COALESCE(
        to_jsonb(ARRAY[v_item.imagen_principal] || COALESCE(v_item.galeria_imagenes, ARRAY[]::TEXT[])),
        '[]'::JSONB
      );
      
      -- Buscar si ya existe en el catálogo del seller
      SELECT id, stock INTO v_catalog_id, v_previous_stock
      FROM public.seller_catalog
      WHERE seller_store_id = v_store_id 
        AND source_product_id = v_item.product_id
      LIMIT 1;
      
      IF v_catalog_id IS NOT NULL THEN
        -- Actualizar stock existente
        UPDATE public.seller_catalog
        SET 
          stock = stock + v_item.cantidad,
          updated_at = now()
        WHERE id = v_catalog_id;
        
        -- Registrar movimiento
        INSERT INTO public.inventory_movements (
          seller_catalog_id,
          change_amount,
          previous_stock,
          new_stock,
          reason,
          reference_type,
          reference_id
        ) VALUES (
          v_catalog_id,
          v_item.cantidad,
          v_previous_stock,
          v_previous_stock + v_item.cantidad,
          'Importación por compra B2B',
          'b2b_order',
          NEW.id
        );
      ELSE
        -- Crear nueva entrada en el catálogo
        INSERT INTO public.seller_catalog (
          seller_store_id,
          source_product_id,
          source_order_id,
          sku,
          nombre,
          descripcion,
          precio_venta,
          precio_costo,
          stock,
          images
        ) VALUES (
          v_store_id,
          v_item.product_id,
          NEW.id,
          v_item.sku,
          v_item.nombre,
          v_item.descripcion_corta,
          v_item.precio_unitario * 1.3, -- Margen sugerido del 30%
          v_item.precio_unitario,
          v_item.cantidad,
          v_product_images
        )
        RETURNING id INTO v_catalog_id;
        
        -- Registrar movimiento inicial
        INSERT INTO public.inventory_movements (
          seller_catalog_id,
          change_amount,
          previous_stock,
          new_stock,
          reason,
          reference_type,
          reference_id
        ) VALUES (
          v_catalog_id,
          v_item.cantidad,
          0,
          v_item.cantidad,
          'Importación inicial por compra B2B',
          'b2b_order',
          NEW.id
        );
      END IF;
      
      -- Reducir stock del producto maestro
      UPDATE public.products
      SET stock_fisico = stock_fisico - v_item.cantidad
      WHERE id = v_item.product_id;
      
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- 7. TRIGGER: Ejecutar función post-pago
DROP TRIGGER IF EXISTS trg_b2b_payment_completed ON public.orders_b2b;
CREATE TRIGGER trg_b2b_payment_completed
  AFTER UPDATE ON public.orders_b2b
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_handle_b2b_payment();

-- 8. Trigger para updated_at en nuevas tablas
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_b2b_carts_updated_at
  BEFORE UPDATE ON public.b2b_carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_catalog_updated_at
  BEFORE UPDATE ON public.seller_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

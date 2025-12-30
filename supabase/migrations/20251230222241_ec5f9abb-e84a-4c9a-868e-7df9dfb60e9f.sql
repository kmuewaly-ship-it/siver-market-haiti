-- 1. Agregar columnas de soporte para migración
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_parent BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_product_id UUID REFERENCES products(id);

-- 2. Crear tabla de log de migración para tracking y rollback
CREATE TABLE IF NOT EXISTS product_migration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_product_id UUID REFERENCES products(id),
  new_variant_id UUID REFERENCES product_variants(id),
  parent_sku TEXT NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'completed'
);

-- 3. Habilitar RLS en la tabla de log
ALTER TABLE product_migration_log ENABLE ROW LEVEL SECURITY;

-- 4. Solo admins pueden ver/gestionar logs de migración
CREATE POLICY "Admins can manage migration logs"
ON product_migration_log
FOR ALL
USING (is_admin(auth.uid()));

-- 5. Crear índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_products_is_parent ON products(is_parent) WHERE is_parent = true;
CREATE INDEX IF NOT EXISTS idx_products_parent_id ON products(parent_product_id) WHERE parent_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_migration_log_parent_sku ON product_migration_log(parent_sku);
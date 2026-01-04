-- Table for category attribute templates (predefined attributes per category)
CREATE TABLE category_attribute_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  attribute_name TEXT NOT NULL,
  attribute_display_name TEXT NOT NULL,
  attribute_type TEXT DEFAULT 'text',
  render_type TEXT DEFAULT 'select',
  suggested_values TEXT[],
  is_required BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(category_id, attribute_name)
);

-- Enable RLS
ALTER TABLE category_attribute_templates ENABLE ROW LEVEL SECURITY;

-- Policy for reading (everyone can read)
CREATE POLICY "Anyone can read category templates"
  ON category_attribute_templates FOR SELECT
  USING (true);

-- Policy for managing (admins only - but for now allow authenticated users)
CREATE POLICY "Authenticated users can manage templates"
  ON category_attribute_templates FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Insert predefined templates for clothing categories
INSERT INTO category_attribute_templates (category_id, attribute_name, attribute_display_name, attribute_type, render_type, suggested_values, is_required, sort_order)
SELECT 
  c.id,
  'color',
  'Color',
  'color',
  'swatches',
  ARRAY['Rojo', 'Azul', 'Negro', 'Blanco', 'Rosa', 'Verde', 'Amarillo', 'Beige', 'Gris', 'Morado', 'Naranja', 'Café'],
  true,
  1
FROM categories c
WHERE c.slug IN ('mujer', 'hombre', 'ninos', 'curvy', 'vestidos', 'tops', 'bottoms', 'sweaters', 'ropa');

-- Add size template for clothing categories
INSERT INTO category_attribute_templates (category_id, attribute_name, attribute_display_name, attribute_type, render_type, suggested_values, is_required, sort_order)
SELECT 
  c.id,
  'talla',
  'Talla',
  'size',
  'chips',
  ARRAY['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'],
  true,
  2
FROM categories c
WHERE c.slug IN ('mujer', 'hombre', 'ninos', 'curvy', 'vestidos', 'tops', 'bottoms', 'sweaters', 'ropa');

-- Add voltage template for electronics/home categories
INSERT INTO category_attribute_templates (category_id, attribute_name, attribute_display_name, attribute_type, render_type, suggested_values, is_required, sort_order)
SELECT 
  c.id,
  'voltaje',
  'Voltaje',
  'technical',
  'chips',
  ARRAY['110V', '220V', '12V', '24V', '5V', 'Universal'],
  false,
  1
FROM categories c
WHERE c.slug IN ('hogar-y-vida', 'celulares-y-accs', 'electronica');

-- Add material template for jewelry
INSERT INTO category_attribute_templates (category_id, attribute_name, attribute_display_name, attribute_type, render_type, suggested_values, is_required, sort_order)
SELECT 
  c.id,
  'material',
  'Material',
  'select',
  'chips',
  ARRAY['Oro', 'Plata', 'Acero', 'Titanio', 'Oro Rosa', 'Perla', 'Cristal'],
  true,
  1
FROM categories c
WHERE c.slug IN ('joyeria', 'accesorios');

-- Add shoe size template
INSERT INTO category_attribute_templates (category_id, attribute_name, attribute_display_name, attribute_type, render_type, suggested_values, is_required, sort_order)
SELECT 
  c.id,
  'talla',
  'Talla',
  'size',
  'chips',
  ARRAY['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45'],
  true,
  1
FROM categories c
WHERE c.slug = 'zapatos';
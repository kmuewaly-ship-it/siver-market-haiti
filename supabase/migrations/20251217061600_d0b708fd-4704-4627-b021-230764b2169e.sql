-- Tabla para configuración global de precios (margen de ganancia)
CREATE TABLE public.price_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insertar margen de ganancia por defecto (30%)
INSERT INTO public.price_settings (key, value, description) 
VALUES ('profit_margin', 30, 'Porcentaje de margen de ganancia global');

-- Tabla para gastos dinámicos
CREATE TABLE public.dynamic_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_gasto text NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  tipo text NOT NULL CHECK (tipo IN ('fijo', 'porcentual')),
  operacion text NOT NULL CHECK (operacion IN ('suma', 'resta')),
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Agregar campo costo_base_excel a products si no existe
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS costo_base_excel numeric DEFAULT 0;

-- Enable RLS
ALTER TABLE public.price_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dynamic_expenses ENABLE ROW LEVEL SECURITY;

-- RLS para price_settings: SOLO admins pueden ver y gestionar
CREATE POLICY "Admins can manage price settings"
ON public.price_settings FOR ALL
USING (is_admin(auth.uid()));

-- RLS para dynamic_expenses: SOLO admins pueden ver y gestionar
CREATE POLICY "Admins can manage dynamic expenses"
ON public.dynamic_expenses FOR ALL
USING (is_admin(auth.uid()));

-- Actualizar RLS de products para ocultar costo_base_excel a sellers
-- Los sellers solo verán precio_mayorista (precio_b2b) a través de vistas controladas

-- Trigger para updated_at
CREATE TRIGGER update_price_settings_updated_at
BEFORE UPDATE ON public.price_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dynamic_expenses_updated_at
BEFORE UPDATE ON public.dynamic_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
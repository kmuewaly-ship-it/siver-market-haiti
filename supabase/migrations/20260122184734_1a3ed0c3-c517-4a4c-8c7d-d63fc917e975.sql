-- Tabla para configurar rangos de márgenes B2B
-- El margen se aplica según el rango del costo base (antes de logística)
CREATE TABLE public.b2b_margin_ranges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    min_cost numeric NOT NULL DEFAULT 0,
    max_cost numeric, -- NULL significa sin límite superior
    margin_percent numeric NOT NULL DEFAULT 30,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Comentarios para documentación
COMMENT ON TABLE public.b2b_margin_ranges IS 'Rangos de márgenes de beneficio para precios B2B basados en el costo base del producto';
COMMENT ON COLUMN public.b2b_margin_ranges.min_cost IS 'Costo mínimo del rango (inclusive)';
COMMENT ON COLUMN public.b2b_margin_ranges.max_cost IS 'Costo máximo del rango (exclusive). NULL = sin límite';
COMMENT ON COLUMN public.b2b_margin_ranges.margin_percent IS 'Porcentaje de margen a aplicar para este rango';

-- Insertar rangos por defecto según los requisitos
INSERT INTO public.b2b_margin_ranges (min_cost, max_cost, margin_percent, description, sort_order) VALUES
(0, 10, 50, 'Productos de bajo costo ($0-$10)', 1),
(10, 50, 30, 'Productos de costo medio ($10-$50)', 2),
(50, NULL, 20, 'Productos de alto costo (>$50)', 3);

-- Habilitar RLS
ALTER TABLE public.b2b_margin_ranges ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (necesaria para cálculos)
CREATE POLICY "B2B margin ranges are viewable by authenticated users"
ON public.b2b_margin_ranges
FOR SELECT
TO authenticated
USING (true);

-- Política para modificación solo por admins (será verificado en la aplicación)
CREATE POLICY "B2B margin ranges can be modified by authenticated users"
ON public.b2b_margin_ranges
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Índice para búsqueda eficiente por rango
CREATE INDEX idx_b2b_margin_ranges_costs ON public.b2b_margin_ranges (min_cost, max_cost) WHERE is_active = true;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_b2b_margin_ranges_updated_at
    BEFORE UPDATE ON public.b2b_margin_ranges
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
-- Create shipping_origins table for source countries (purchase origins)
CREATE TABLE IF NOT EXISTS public.shipping_origins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipping_origins ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read origins
CREATE POLICY "Anyone can view active shipping origins"
ON public.shipping_origins
FOR SELECT
USING (is_active = true);

-- Allow admins to manage origins
CREATE POLICY "Admins can manage shipping origins"
ON public.shipping_origins
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add origin_country_id to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS origin_country_id UUID REFERENCES public.shipping_origins(id);

-- Insert default 'China' origin
INSERT INTO public.shipping_origins (name, code, description, is_active)
VALUES ('China', 'CN', 'País de origen por defecto para productos mayoristas', true)
ON CONFLICT (code) DO NOTHING;

-- Set default origin for existing products (China)
UPDATE public.products
SET origin_country_id = (SELECT id FROM public.shipping_origins WHERE code = 'CN' LIMIT 1)
WHERE origin_country_id IS NULL;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_shipping_origins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_shipping_origins_timestamp
BEFORE UPDATE ON public.shipping_origins
FOR EACH ROW
EXECUTE FUNCTION public.update_shipping_origins_updated_at();
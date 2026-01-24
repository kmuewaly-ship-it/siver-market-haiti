-- Add logistics fields to products table for weight-based shipping
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(10,3) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS length_cm DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS width_cm DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_oversize BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS shipping_mode VARCHAR(20) DEFAULT 'standard' CHECK (shipping_mode IN ('standard', 'express', 'both'));

-- Add index for products missing weight (for admin alerts)
CREATE INDEX IF NOT EXISTS idx_products_missing_weight 
ON public.products (weight_kg) 
WHERE weight_kg IS NULL;

-- Add index for oversize products  
CREATE INDEX IF NOT EXISTS idx_products_oversize 
ON public.products (is_oversize) 
WHERE is_oversize = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN public.products.weight_kg IS 'Real weight in kilograms - used for standard shipping calculation';
COMMENT ON COLUMN public.products.is_oversize IS 'If true, volumetric weight is compared with real weight and the higher is used';
COMMENT ON COLUMN public.products.shipping_mode IS 'Available shipping modes: standard, express, or both';
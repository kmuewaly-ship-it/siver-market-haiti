-- Add integration_mode column to payment_methods table
-- Values: 'manual' (default) or 'automatic' (requires API integration)
ALTER TABLE public.payment_methods 
ADD COLUMN IF NOT EXISTS integration_mode TEXT DEFAULT 'manual' 
CHECK (integration_mode IN ('manual', 'automatic'));

-- Add comment to explain the column
COMMENT ON COLUMN public.payment_methods.integration_mode IS 
'Payment integration mode: manual (admin confirms payment) or automatic (API-based verification like MonCash/NatCash API)';

-- The metadata column can store API credentials when integration_mode = 'automatic'
-- Example metadata for automatic MonCash: {"api_key": "...", "api_secret": "...", "merchant_id": "..."}
-- Example metadata for automatic NatCash: {"api_key": "...", "api_secret": "..."}
-- Remove the old single integration_mode column and add separate flags for each mode
-- This allows admin to enable both manual and automatic modes simultaneously

-- Add new columns for dual mode support
ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS manual_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS automatic_enabled boolean DEFAULT false;

-- Drop the old integration_mode column if it exists (we're replacing it)
ALTER TABLE payment_methods DROP COLUMN IF EXISTS integration_mode;

-- Add comment for clarity
COMMENT ON COLUMN payment_methods.manual_enabled IS 'Whether manual payment mode is enabled for this method';
COMMENT ON COLUMN payment_methods.automatic_enabled IS 'Whether automatic (API) payment mode is enabled for this method';
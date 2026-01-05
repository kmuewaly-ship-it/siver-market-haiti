-- Ensure consolidation_settings always has a row with is_active = true by default
INSERT INTO consolidation_settings (
  id, 
  consolidation_mode, 
  time_interval_hours, 
  order_quantity_threshold, 
  is_active,
  notify_threshold_percent
) VALUES (
  gen_random_uuid(),
  'hybrid',
  48,
  50,
  true,
  80
) ON CONFLICT DO NOTHING;

-- Update existing row to always be active
UPDATE consolidation_settings SET is_active = true WHERE is_active = false;

-- Create function to ensure initial PO exists on system start
CREATE OR REPLACE FUNCTION ensure_active_po_on_startup()
RETURNS TRIGGER AS $$
BEGIN
  -- Whenever consolidation settings is activated, ensure a PO exists
  IF NEW.is_active = true AND (OLD IS NULL OR OLD.is_active = false) THEN
    PERFORM get_or_create_active_po();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create PO when consolidation is enabled
DROP TRIGGER IF EXISTS trigger_ensure_po_on_activation ON consolidation_settings;
CREATE TRIGGER trigger_ensure_po_on_activation
  AFTER INSERT OR UPDATE OF is_active ON consolidation_settings
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION ensure_active_po_on_startup();

-- Ensure there's always an active PO now
SELECT get_or_create_active_po();
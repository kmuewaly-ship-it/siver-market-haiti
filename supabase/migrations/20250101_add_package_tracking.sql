-- ============================================
-- PACKAGE TRACKING TABLES
-- ============================================
-- Migration: Add package tracking system
-- Purpose: Enable real-time package tracking for orders

-- Create package_tracking table
CREATE TABLE IF NOT EXISTS package_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders_b2b(id) ON DELETE CASCADE,
  carrier VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(255) NOT NULL UNIQUE,
  current_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  -- Enum: pending, in_transit, out_for_delivery, delivered, exception
  current_location VARCHAR(255) NOT NULL DEFAULT 'Origin',
  estimated_delivery TIMESTAMP,
  is_delivered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_tracking_status CHECK (
    current_status IN ('pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception')
  )
);

-- Create tracking_events table for history
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_tracking_id UUID NOT NULL REFERENCES package_tracking(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  -- Enum: pending, in_transit, out_for_delivery, delivered, exception
  location VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_event_status CHECK (
    status IN ('pending', 'in_transit', 'out_for_delivery', 'delivered', 'exception')
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_package_tracking_order_id ON package_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_package_tracking_tracking_number ON package_tracking(tracking_number);
CREATE INDEX IF NOT EXISTS idx_package_tracking_carrier ON package_tracking(carrier);
CREATE INDEX IF NOT EXISTS idx_tracking_events_package_id ON tracking_events(package_tracking_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_timestamp ON tracking_events(timestamp DESC);

-- Enable RLS
ALTER TABLE package_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for package_tracking
CREATE POLICY "Users can view their own order tracking"
ON package_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders_b2c o
    WHERE o.id = package_tracking.order_id
    AND o.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM orders_b2b o
    WHERE o.id = package_tracking.order_id
    AND o.buyer_id = auth.uid()
  )
);

CREATE POLICY "Sellers can view tracking for their shipments"
ON package_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders_b2b o
    WHERE o.id = package_tracking.order_id
    AND o.seller_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all tracking"
ON package_tracking FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- RLS Policies for tracking_events
CREATE POLICY "Users can view events for their tracked packages"
ON tracking_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM package_tracking pt
    WHERE pt.id = tracking_events.package_tracking_id
    AND (
      EXISTS (
        SELECT 1 FROM orders_b2c o
        WHERE o.id = pt.order_id
        AND o.user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM orders_b2b o
        WHERE o.id = pt.order_id
        AND o.buyer_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Sellers can view events for their shipments"
ON tracking_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM package_tracking pt
    WHERE pt.id = tracking_events.package_tracking_id
    AND EXISTS (
      SELECT 1 FROM orders_b2b o
      WHERE o.id = pt.order_id
      AND o.seller_id = auth.uid()
    )
  )
);

CREATE POLICY "Admins can manage all events"
ON tracking_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_package_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_package_tracking_timestamp
BEFORE UPDATE ON package_tracking
FOR EACH ROW
EXECUTE FUNCTION update_package_tracking_timestamp();

-- Function to mark package as delivered and update order status
CREATE OR REPLACE FUNCTION mark_package_delivered(p_tracking_id UUID)
RETURNS VOID AS $$
DECLARE
  v_order_id UUID;
BEGIN
  UPDATE package_tracking
  SET current_status = 'delivered', is_delivered = TRUE
  WHERE id = p_tracking_id
  RETURNING order_id INTO v_order_id;

  IF v_order_id IS NOT NULL THEN
    UPDATE orders_b2b
    SET status = 'delivered', updated_at = NOW()
    WHERE id = v_order_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grants for authenticated users
GRANT SELECT ON package_tracking TO authenticated;
GRANT SELECT ON tracking_events TO authenticated;
GRANT INSERT ON tracking_events TO authenticated;

-- Grants for service role (backend)
GRANT ALL ON package_tracking TO service_role;
GRANT ALL ON tracking_events TO service_role;

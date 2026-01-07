-- Trigger to automatically update order status when payment_status changes to 'paid'
CREATE OR REPLACE FUNCTION public.fn_update_order_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment_status changes to 'paid', update status to 'paid' if it's still 'placed'
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.status = 'placed' THEN
    NEW.status = 'paid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_update_order_status_on_payment ON public.orders_b2b;

-- Create the trigger
CREATE TRIGGER trg_update_order_status_on_payment
  BEFORE UPDATE ON public.orders_b2b
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_order_status_on_payment();

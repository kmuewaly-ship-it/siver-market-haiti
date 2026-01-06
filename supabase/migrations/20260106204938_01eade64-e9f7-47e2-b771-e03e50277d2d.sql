-- Drop table if it was partially created
DROP TABLE IF EXISTS public.payment_methods;

-- Create payment_methods table to store admin and seller payment configurations
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('admin', 'seller', 'store')),
  owner_id UUID, -- NULL for admin, user_id for seller, store_id for store
  method_type TEXT NOT NULL CHECK (method_type IN ('bank', 'moncash', 'natcash', 'stripe')),
  is_active BOOLEAN DEFAULT true,
  display_name TEXT,
  -- Bank fields
  bank_name TEXT,
  account_type TEXT,
  account_number TEXT,
  account_holder TEXT,
  bank_swift TEXT,
  -- Mobile money fields (MonCash/NatCash)
  phone_number TEXT,
  holder_name TEXT,
  -- Metadata for additional info
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can read admin payment methods
CREATE POLICY "Anyone can view admin payment methods"
ON public.payment_methods
FOR SELECT
USING (owner_type = 'admin');

-- Policy: Authenticated users can view their own payment methods
CREATE POLICY "Users can view their own payment methods"
ON public.payment_methods
FOR SELECT
USING (auth.uid() = owner_id);

-- Policy: Users can manage their own payment methods
CREATE POLICY "Users can manage their own payment methods"
ON public.payment_methods
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy: Admins can manage all payment methods
CREATE POLICY "Admins can manage all payment methods"
ON public.payment_methods
FOR ALL
USING (public.is_admin(auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_payment_methods_owner ON public.payment_methods(owner_type, owner_id);
CREATE INDEX idx_payment_methods_type ON public.payment_methods(method_type);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
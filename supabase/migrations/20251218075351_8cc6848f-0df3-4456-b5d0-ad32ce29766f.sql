-- Create table for pending negotiation quotes
CREATE TABLE public.pending_quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  quote_number TEXT NOT NULL,
  cart_snapshot JSONB NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  seller_notes TEXT,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_quotes ENABLE ROW LEVEL SECURITY;

-- Policies for sellers to manage their quotes
CREATE POLICY "Sellers can view own quotes" 
ON public.pending_quotes 
FOR SELECT 
USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create quotes" 
ON public.pending_quotes 
FOR INSERT 
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update own quotes" 
ON public.pending_quotes 
FOR UPDATE 
USING (auth.uid() = seller_id AND status = 'pending');

-- Admins full access
CREATE POLICY "Admins can manage all quotes" 
ON public.pending_quotes 
FOR ALL 
USING (is_admin(auth.uid()));

-- Function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_number := 'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for auto quote number
CREATE TRIGGER set_quote_number
BEFORE INSERT ON public.pending_quotes
FOR EACH ROW
EXECUTE FUNCTION public.generate_quote_number();

-- Add admin WhatsApp number to a settings table if not exists
INSERT INTO public.price_settings (key, value, description)
VALUES ('admin_whatsapp', 50937000000, 'Número de WhatsApp del Admin para negociaciones (sin + ni espacios)')
ON CONFLICT (key) DO NOTHING;
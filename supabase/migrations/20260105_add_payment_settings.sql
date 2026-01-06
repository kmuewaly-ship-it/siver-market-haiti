-- Create payment_settings table
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Bank Transfer Details
  bank_name character varying(255) NOT NULL DEFAULT 'Banco Nacional de Haití',
  bank_account character varying(255) NOT NULL DEFAULT '001-234567-89',
  bank_beneficiary character varying(255) NOT NULL DEFAULT 'Siver Market 509 SRL',
  bank_swift character varying(50) NOT NULL DEFAULT 'BNHAHTHX',
  
  -- MonCash Details
  moncash_number character varying(255) NOT NULL DEFAULT '+509 3XXX XXXX',
  moncash_name character varying(255) NOT NULL DEFAULT 'Siver Market 509',
  
  -- Metadata
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert default payment settings if table is empty
INSERT INTO public.payment_settings (
  bank_name,
  bank_account,
  bank_beneficiary,
  bank_swift,
  moncash_number,
  moncash_name
)
SELECT 
  'Banco Nacional de Haití',
  '001-234567-89',
  'Siver Market 509 SRL',
  'BNHAHTHX',
  '+509 3XXX XXXX',
  'Siver Market 509'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings);

-- Enable RLS
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read (anyone can see payment settings)
CREATE POLICY "Payment settings are publicly readable" ON public.payment_settings
  FOR SELECT USING (true);

-- Create policy to allow admins to update
CREATE POLICY "Only admins can update payment settings" ON public.payment_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

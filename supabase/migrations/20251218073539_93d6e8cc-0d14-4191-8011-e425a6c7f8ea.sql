-- 1. Enum para estado de verificación
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending_verification', 'verified', 'rejected');

-- 2. Enum para tipos de solicitud de aprobación
CREATE TYPE public.approval_request_type AS ENUM ('kyc_verification', 'referral_bonus', 'credit_limit_increase', 'credit_activation');

-- 3. Enum para estado de solicitud
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- 4. Tabla de verificaciones KYC
CREATE TABLE public.kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status verification_status NOT NULL DEFAULT 'unverified',
  id_front_url TEXT,
  id_back_url TEXT,
  fiscal_document_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  admin_comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Tabla de créditos de sellers
CREATE TABLE public.seller_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  balance_debt NUMERIC NOT NULL DEFAULT 0,
  max_cart_percentage INTEGER NOT NULL DEFAULT 50,
  is_active BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. Tabla de referidos
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  first_purchase_completed BOOLEAN NOT NULL DEFAULT false,
  first_purchase_at TIMESTAMP WITH TIME ZONE,
  bonus_amount NUMERIC DEFAULT 0,
  bonus_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

-- 7. Tabla de códigos de referido
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 8. Tabla central de solicitudes de aprobación
CREATE TABLE public.admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type approval_request_type NOT NULL,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status approval_status NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  amount NUMERIC,
  admin_comments TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Configuración del programa de referidos
CREATE TABLE public.referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_per_referral NUMERIC NOT NULL DEFAULT 20,
  referrals_for_credit_increase INTEGER NOT NULL DEFAULT 5,
  credit_increase_amount NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insertar configuración por defecto
INSERT INTO public.referral_settings (bonus_per_referral, referrals_for_credit_increase, credit_increase_amount)
VALUES (20, 5, 100);

-- 10. Historial de movimientos de crédito
CREATE TABLE public.credit_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_verifications
CREATE POLICY "Users can view own kyc" ON public.kyc_verifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc_verifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.kyc_verifications FOR UPDATE USING (auth.uid() = user_id AND status = 'unverified');
CREATE POLICY "Admins can manage all kyc" ON public.kyc_verifications FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for seller_credits
CREATE POLICY "Users can view own credits" ON public.seller_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all credits" ON public.seller_credits FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for referrals
CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
CREATE POLICY "Users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);
CREATE POLICY "Admins can manage all referrals" ON public.referrals FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for referral_codes
CREATE POLICY "Users can view own code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view codes for lookup" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Admins can manage codes" ON public.referral_codes FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for admin_approval_requests
CREATE POLICY "Users can view own requests" ON public.admin_approval_requests FOR SELECT USING (auth.uid() = requester_id);
CREATE POLICY "Admins can manage all requests" ON public.admin_approval_requests FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for referral_settings
CREATE POLICY "Anyone can view settings" ON public.referral_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.referral_settings FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for credit_movements
CREATE POLICY "Users can view own movements" ON public.credit_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage movements" ON public.credit_movements FOR ALL USING (is_admin(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON public.kyc_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_seller_credits_updated_at BEFORE UPDATE ON public.seller_credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_approval_requests_updated_at BEFORE UPDATE ON public.admin_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Función para generar código de referido único
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  -- Solo generar código para sellers verificados
  IF NEW.status = 'verified' AND (OLD IS NULL OR OLD.status != 'verified') THEN
    -- Generar código único
    new_code := 'SIVER' || UPPER(SUBSTRING(MD5(NEW.user_id::TEXT || NOW()::TEXT) FROM 1 FOR 6));
    
    -- Insertar código si no existe
    INSERT INTO public.referral_codes (user_id, code)
    VALUES (NEW.user_id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_referral_code_on_verify
AFTER UPDATE ON public.kyc_verifications
FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- Crear bucket privado para documentos KYC
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Políticas de storage para KYC
CREATE POLICY "Users can upload own kyc docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all kyc docs" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND is_admin(auth.uid()));
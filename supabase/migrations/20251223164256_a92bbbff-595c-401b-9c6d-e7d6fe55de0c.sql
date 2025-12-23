-- Corregir search_path en función is_promo_active
CREATE OR REPLACE FUNCTION public.is_promo_active(
  p_promo_active BOOLEAN,
  p_promo_starts_at TIMESTAMP WITH TIME ZONE,
  p_promo_ends_at TIMESTAMP WITH TIME ZONE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN p_promo_active = true 
    AND (p_promo_starts_at IS NULL OR p_promo_starts_at <= now())
    AND (p_promo_ends_at IS NULL OR p_promo_ends_at > now());
END;
$$;
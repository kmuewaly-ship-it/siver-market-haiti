-- Add banner_url field to profiles table for personal profile banner
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS banner_url TEXT;
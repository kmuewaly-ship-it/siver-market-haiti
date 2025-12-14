-- Paso 1: Agregar 'seller' al enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'seller';
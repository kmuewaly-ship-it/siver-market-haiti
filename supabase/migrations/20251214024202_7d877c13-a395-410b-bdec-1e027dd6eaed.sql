-- Agregar políticas para que sellers puedan registrarse y ver su propio perfil
CREATE POLICY "Sellers can insert their own record" 
ON public.sellers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can view their own record" 
ON public.sellers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own record" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid() = user_id AND is_verified = true);
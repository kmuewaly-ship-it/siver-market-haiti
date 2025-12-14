-- Eliminar la política restrictiva de update
DROP POLICY IF EXISTS "Sellers can update their own record" ON public.sellers;

-- Crear una política más permisiva para que sellers puedan actualizar su perfil
CREATE POLICY "Sellers can update their own record" 
ON public.sellers 
FOR UPDATE 
USING (auth.uid() = user_id);
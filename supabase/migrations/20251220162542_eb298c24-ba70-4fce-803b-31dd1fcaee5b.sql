-- Insertar perfil del usuario que falta
INSERT INTO public.profiles (id, email, full_name)
VALUES ('c08fbabb-c05c-4ec9-9dbd-cf7022ded212', 'zletioficial@gmail.com', 'Cliente tes 1')
ON CONFLICT (id) DO NOTHING;

-- Eliminar trigger duplicado que solo asigna roles
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- Eliminar función duplicada
DROP FUNCTION IF EXISTS public.handle_new_user_role();

-- Crear trigger que use la función handle_new_user existente (que crea perfil Y asigna rol)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
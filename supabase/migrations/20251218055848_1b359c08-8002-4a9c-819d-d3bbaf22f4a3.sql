-- Function to create store when seller role is assigned
CREATE OR REPLACE FUNCTION public.fn_create_seller_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_store_id UUID;
BEGIN
  -- Only process when a seller role is assigned
  IF NEW.role = 'seller' THEN
    -- Check if store already exists for this user
    SELECT id INTO v_store_id
    FROM public.stores
    WHERE owner_user_id = NEW.user_id
    LIMIT 1;
    
    IF v_store_id IS NULL THEN
      -- Get user info from profiles
      SELECT email, full_name INTO v_user_email, v_user_name
      FROM public.profiles
      WHERE id = NEW.user_id;
      
      -- Create store for the seller
      INSERT INTO public.stores (
        owner_user_id,
        name,
        slug,
        description,
        is_active
      ) VALUES (
        NEW.user_id,
        COALESCE(v_user_name, 'Mi Tienda'),
        'tienda-' || REPLACE(NEW.user_id::TEXT, '-', ''),
        'Tienda de ' || COALESCE(v_user_name, v_user_email),
        true
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS on_seller_role_assigned ON public.user_roles;
CREATE TRIGGER on_seller_role_assigned
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_create_seller_store();
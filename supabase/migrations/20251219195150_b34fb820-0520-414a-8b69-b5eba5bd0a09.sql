-- Create B2C carts table
CREATE TABLE public.b2c_carts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open',
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create B2C cart items table
CREATE TABLE public.b2c_cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cart_id uuid NOT NULL REFERENCES public.b2c_carts(id) ON DELETE CASCADE,
  seller_catalog_id uuid REFERENCES public.seller_catalog(id),
  sku text NOT NULL,
  nombre text NOT NULL,
  unit_price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  total_price numeric NOT NULL,
  image text,
  store_id uuid REFERENCES public.stores(id),
  store_name text,
  store_whatsapp text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.b2c_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2c_cart_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for b2c_carts
CREATE POLICY "Users can view own carts" 
ON public.b2c_carts FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create own carts" 
ON public.b2c_carts FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own open carts" 
ON public.b2c_carts FOR UPDATE 
USING (user_id = auth.uid() AND status = 'open');

CREATE POLICY "Admins can manage all carts" 
ON public.b2c_carts FOR ALL 
USING (public.is_admin(auth.uid()));

-- RLS policies for b2c_cart_items
CREATE POLICY "Cart items visible with parent cart" 
ON public.b2c_cart_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.b2c_carts c 
  WHERE c.id = b2c_cart_items.cart_id 
  AND (c.user_id = auth.uid() OR public.is_admin(auth.uid()))
));

CREATE POLICY "Cart items insertable with open cart" 
ON public.b2c_cart_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.b2c_carts c 
  WHERE c.id = b2c_cart_items.cart_id 
  AND c.user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Cart items updatable with open cart" 
ON public.b2c_cart_items FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.b2c_carts c 
  WHERE c.id = b2c_cart_items.cart_id 
  AND c.user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Cart items deletable with open cart" 
ON public.b2c_cart_items FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.b2c_carts c 
  WHERE c.id = b2c_cart_items.cart_id 
  AND c.user_id = auth.uid() 
  AND c.status = 'open'
));

CREATE POLICY "Admins can manage all cart items" 
ON public.b2c_cart_items FOR ALL 
USING (public.is_admin(auth.uid()));
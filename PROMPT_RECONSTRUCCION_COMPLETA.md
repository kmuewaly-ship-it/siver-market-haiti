# 🛒 PROMPT COMPLETO: Marketplace B2B/B2C para Haití

## DESCRIPCIÓN GENERAL

Construye un **marketplace dual B2B/B2C** para Haití con las siguientes características:
- **B2B**: Vendedores compran productos al por mayor del catálogo central
- **B2C**: Clientes finales compran productos de las tiendas de los vendedores
- Sistema de wallets, comisiones, KYC, puntos de recogida con mapas
- Multi-rol: Admin, Seller, Buyer (usuario final)
- Moneda: USD con soporte para pagos locales (MonCash + transferencias bancarias)

---

## 🎨 SISTEMA DE DISEÑO

### Paleta de Colores (HSL)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 262.1 83.3% 57.8%;
  --primary-foreground: 210 20% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 20% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 262.1 83.3% 57.8%;
  --radius: 0.5rem;
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
  --sidebar-primary: 262.1 83.3% 57.8%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 4.8% 95.9%;
  --sidebar-accent-foreground: 240 5.9% 10%;
  --sidebar-border: 220 13% 91%;
  --sidebar-ring: 262.1 83.3% 57.8%;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 20% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 20% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 20% 98%;
  --primary: 263.4 70% 50.4%;
  --primary-foreground: 210 20% 98%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 20% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 20% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 20% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 263.4 70% 50.4%;
  --sidebar-background: 240 5.9% 10%;
  --sidebar-foreground: 240 4.8% 95.9%;
  --sidebar-primary: 262.1 83.3% 57.8%;
  --sidebar-primary-foreground: 0 0% 98%;
  --sidebar-accent: 240 3.7% 15.9%;
  --sidebar-accent-foreground: 240 4.8% 95.9%;
  --sidebar-border: 240 3.7% 15.9%;
  --sidebar-ring: 262.1 83.3% 57.8%;
}
```

### Tipografía
- Font principal: **Plus Jakarta Sans**
- Importar desde @fontsource/plus-jakarta-sans

### Componentes UI
- Usar **shadcn/ui** con Tailwind CSS
- Iconos: **Lucide React**
- Animaciones: **Framer Motion** para transiciones suaves
- Toast: **Sonner** para notificaciones

---

## 📊 ESQUEMA DE BASE DE DATOS COMPLETO

### Enums
```sql
CREATE TYPE app_role AS ENUM ('admin', 'seller', 'buyer');
CREATE TYPE stock_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'cancelled');
CREATE TYPE payment_method AS ENUM ('bank_transfer', 'moncash', 'credit', 'cash');
CREATE TYPE approval_request_type AS ENUM ('credit_activation', 'credit_increase', 'withdrawal');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE wallet_transaction_type AS ENUM ('sale', 'withdrawal', 'commission', 'refund', 'adjustment');
CREATE TYPE wallet_transaction_status AS ENUM ('pending', 'completed', 'cancelled', 'released');
```

### Tablas Principales

#### 1. profiles (usuarios)
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2. user_roles (roles de usuario)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role DEFAULT 'buyer',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);
```

#### 3. categories (categorías jerárquicas)
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_visible_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. suppliers (proveedores)
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  country TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 5. products (catálogo B2B central)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_interno TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  descripcion_corta TEXT,
  descripcion_larga TEXT,
  imagen_principal TEXT,
  galeria_imagenes TEXT[],
  categoria_id UUID REFERENCES categories(id),
  proveedor_id UUID REFERENCES suppliers(id),
  costo_base_excel NUMERIC DEFAULT 0,
  precio_mayorista NUMERIC NOT NULL DEFAULT 0,
  precio_sugerido_venta NUMERIC,
  precio_promocional NUMERIC,
  promo_active BOOLEAN DEFAULT false,
  promo_starts_at TIMESTAMPTZ,
  promo_ends_at TIMESTAMPTZ,
  moq INTEGER DEFAULT 1,
  stock_fisico INTEGER DEFAULT 0,
  stock_status stock_status DEFAULT 'in_stock',
  peso_kg NUMERIC,
  dimensiones_cm JSONB,
  currency_code TEXT DEFAULT 'USD',
  rating NUMERIC DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  url_origen TEXT,
  embedding VECTOR(384),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. product_variants (variantes de producto)
```sql
CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  option_type TEXT NOT NULL,
  option_value TEXT NOT NULL,
  price NUMERIC,
  precio_promocional NUMERIC,
  stock INTEGER DEFAULT 0,
  moq INTEGER DEFAULT 1,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. sellers (vendedores)
```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMPTZ,
  verification_badge_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. stores (tiendas de vendedores)
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  logo TEXT,
  banner TEXT,
  whatsapp TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  city TEXT,
  country TEXT,
  is_active BOOLEAN DEFAULT true,
  is_accepting_orders BOOLEAN DEFAULT true,
  allow_comments BOOLEAN DEFAULT true,
  show_stock BOOLEAN DEFAULT true,
  shipping_policy TEXT,
  return_policy TEXT,
  bank_name TEXT,
  account_type TEXT,
  account_number TEXT,
  account_holder TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 9. seller_catalog (inventario B2C del vendedor)
```sql
CREATE TABLE seller_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_store_id UUID NOT NULL REFERENCES stores(id),
  source_product_id UUID REFERENCES products(id),
  source_order_id UUID REFERENCES orders_b2b(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio_costo NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  stock INTEGER DEFAULT 0,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  imported_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(seller_store_id, sku)
);
```

#### 10. b2b_carts (carrito B2B)
```sql
CREATE TABLE b2b_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'open',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 11. b2b_cart_items (items carrito B2B)
```sql
CREATE TABLE b2b_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES b2b_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  size TEXT,
  color TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 12. orders_b2b (órdenes B2B)
```sql
CREATE TABLE orders_b2b (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  buyer_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  total_quantity INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  payment_method TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 13. order_items_b2b (items de orden B2B)
```sql
CREATE TABLE order_items_b2b (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders_b2b(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario NUMERIC NOT NULL,
  descuento_percent NUMERIC DEFAULT 0,
  subtotal NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 14. b2c_carts (carrito B2C)
```sql
CREATE TABLE b2c_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'open',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 15. b2c_cart_items (items carrito B2C)
```sql
CREATE TABLE b2c_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES b2c_carts(id) ON DELETE CASCADE,
  seller_catalog_id UUID REFERENCES seller_catalog(id),
  store_id UUID REFERENCES stores(id),
  sku TEXT NOT NULL,
  nombre TEXT NOT NULL,
  image TEXT,
  store_name TEXT,
  store_whatsapp TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 16. seller_wallets (billeteras)
```sql
CREATE TABLE seller_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) UNIQUE,
  available_balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  commission_debt NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 17. wallet_transactions (transacciones)
```sql
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES seller_wallets(id),
  type wallet_transaction_type NOT NULL,
  status wallet_transaction_status DEFAULT 'pending',
  amount NUMERIC NOT NULL,
  fee_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  description TEXT,
  reference_type TEXT,
  reference_id UUID,
  release_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  processed_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 18. commission_debts (deudas de comisión)
```sql
CREATE TABLE commission_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  wallet_id UUID REFERENCES seller_wallets(id),
  order_id UUID,
  order_type TEXT,
  sale_amount NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  tax_amount NUMERIC DEFAULT 0,
  total_debt NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_from_wallet BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 19. seller_credits (línea de crédito)
```sql
CREATE TABLE seller_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  credit_limit NUMERIC DEFAULT 0,
  balance_debt NUMERIC DEFAULT 0,
  max_cart_percentage NUMERIC DEFAULT 50,
  is_active BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 20. kyc_verifications (verificación KYC)
```sql
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  id_front_url TEXT,
  id_back_url TEXT,
  fiscal_document_url TEXT,
  status verification_status DEFAULT 'unverified',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  admin_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 21. pickup_points (puntos de recogida)
```sql
CREATE TABLE pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT DEFAULT 'Haiti',
  phone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  operating_hours JSONB DEFAULT '{}',
  manager_user_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 22. pickup_point_staff (personal de punto)
```sql
CREATE TABLE pickup_point_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_point_id UUID NOT NULL REFERENCES pickup_points(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(pickup_point_id, user_id)
);
```

#### 23. order_deliveries (entregas con código QR)
```sql
CREATE TABLE order_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  order_type TEXT NOT NULL,
  pickup_point_id UUID REFERENCES pickup_points(id),
  delivery_code TEXT NOT NULL,
  qr_code_data TEXT,
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES profiles(id),
  escrow_release_at TIMESTAMPTZ,
  funds_released BOOLEAN DEFAULT false,
  funds_released_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 24. notifications (notificaciones)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  is_email_sent BOOLEAN DEFAULT false,
  is_whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 25. pending_quotes (cotizaciones)
```sql
CREATE TABLE pending_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL,
  seller_id UUID NOT NULL,
  cart_snapshot JSONB NOT NULL,
  total_quantity INTEGER DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  seller_notes TEXT,
  admin_notes TEXT,
  responded_at TIMESTAMPTZ,
  whatsapp_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 26. addresses (direcciones de usuario)
```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT DEFAULT 'Casa',
  full_name TEXT NOT NULL,
  phone TEXT,
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Haiti',
  notes TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 27. product_reviews (reseñas de productos)
```sql
CREATE TABLE product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  images JSONB DEFAULT '[]',
  is_verified_purchase BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 28. store_reviews (reseñas de tiendas)
```sql
CREATE TABLE store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 29. store_followers (seguidores de tiendas)
```sql
CREATE TABLE store_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(store_id, user_id)
);
```

#### 30. seller_statuses (estados/stories de vendedores)
```sql
CREATE TABLE seller_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  image_url TEXT NOT NULL,
  caption TEXT,
  expires_at TIMESTAMPTZ DEFAULT now() + interval '24 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 31. referral_codes (códigos de referido)
```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 32. referrals (referidos)
```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL UNIQUE,
  referral_code TEXT NOT NULL,
  first_purchase_completed BOOLEAN DEFAULT false,
  first_purchase_at TIMESTAMPTZ,
  bonus_amount NUMERIC DEFAULT 0,
  bonus_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 33. referral_settings (configuración de referidos)
```sql
CREATE TABLE referral_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bonus_per_referral NUMERIC DEFAULT 20,
  referrals_for_credit_increase INTEGER DEFAULT 5,
  credit_increase_amount NUMERIC DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 34. admin_approval_requests (solicitudes de aprobación)
```sql
CREATE TABLE admin_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  request_type approval_request_type NOT NULL,
  status approval_status DEFAULT 'pending',
  amount NUMERIC,
  metadata JSONB DEFAULT '{}',
  admin_comments TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 35. admin_banners (banners publicitarios)
```sql
CREATE TABLE admin_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT,
  target_audience TEXT DEFAULT 'all',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 36. platform_settings (configuración de plataforma)
```sql
CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuraciones iniciales
INSERT INTO platform_settings (key, value, description) VALUES
  ('commission_percentage', 15, 'Porcentaje de comisión por venta B2C'),
  ('tax_tca_percentage', 10, 'Porcentaje TCA sobre comisión'),
  ('escrow_days', 7, 'Días de retención en escrow'),
  ('min_withdrawal', 50, 'Monto mínimo para retiro');
```

#### 37. price_settings (configuración de precios B2B)
```sql
CREATE TABLE price_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value NUMERIC DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar configuraciones
INSERT INTO price_settings (key, value, description) VALUES
  ('margen_plataforma', 25, 'Margen de ganancia de la plataforma %'),
  ('costo_envio_base', 5, 'Costo base de envío USD'),
  ('peso_max_gratis', 2, 'Peso máximo para envío gratis kg');
```

#### 38. dynamic_expenses (gastos dinámicos para pricing)
```sql
CREATE TABLE dynamic_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_gasto TEXT NOT NULL,
  tipo TEXT NOT NULL,
  operacion TEXT NOT NULL,
  valor NUMERIC DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 39. seller_commission_overrides (comisiones personalizadas)
```sql
CREATE TABLE seller_commission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id) UNIQUE,
  commission_percentage NUMERIC,
  commission_fixed NUMERIC,
  tax_tca_percentage NUMERIC,
  reason TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 40. product_views (vistas de productos)
```sql
CREATE TABLE product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  user_id UUID,
  session_id TEXT,
  source TEXT DEFAULT 'direct',
  viewed_at TIMESTAMPTZ DEFAULT now()
);
```

#### 41. inventory_movements (movimientos de inventario)
```sql
CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  seller_catalog_id UUID REFERENCES seller_catalog(id),
  change_amount INTEGER NOT NULL,
  previous_stock INTEGER,
  new_stock INTEGER,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 42. order_refunds (reembolsos)
```sql
CREATE TABLE order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders_b2b(id),
  amount NUMERIC DEFAULT 0,
  reason TEXT,
  status VARCHAR DEFAULT 'requested',
  requested_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 43. b2b_payments (pagos B2B)
```sql
CREATE TABLE b2b_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  payment_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  method payment_method NOT NULL,
  reference TEXT NOT NULL,
  status payment_status DEFAULT 'pending',
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### 44. credit_movements (movimientos de crédito)
```sql
CREATE TABLE credit_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  movement_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 45. product_price_history (historial de precios)
```sql
CREATE TABLE product_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  campo_modificado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  modificado_por UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 46. user_notification_preferences (preferencias de notificación)
```sql
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  whatsapp_notifications BOOLEAN DEFAULT true,
  order_notifications BOOLEAN DEFAULT true,
  promotional_emails BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔐 FUNCIONES DE BASE DE DATOS

### Función is_admin
```sql
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Función is_seller
```sql
CREATE OR REPLACE FUNCTION is_seller(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = $1 AND role = 'seller'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Trigger para crear perfil automáticamente
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'buyer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## 📱 ESTRUCTURA DE PÁGINAS

### Páginas Públicas (B2C)
1. **/** - Landing page con productos destacados, categorías trending, tiendas populares
2. **/marketplace** - Catálogo completo de productos B2C de todas las tiendas
3. **/categories** - Vista de todas las categorías
4. **/category/:slug** - Productos de una categoría específica
5. **/product/:sku** - Detalle de producto B2C
6. **/store/:slug** - Perfil de tienda con productos
7. **/search** - Resultados de búsqueda
8. **/trends** - Productos y tiendas trending
9. **/cart** - Carrito B2C
10. **/checkout** - Proceso de checkout
11. **/favorites** - Productos favoritos
12. **/my-purchases** - Historial de compras del usuario
13. **/account** - Configuración de cuenta, direcciones
14. **/login** - Autenticación

### Páginas de Vendedor (Seller)
Todas bajo **/seller/...**
1. **/seller/dashboard** - Panel principal con estadísticas
2. **/seller/catalogo** - Catálogo B2B para comprar productos
3. **/seller/cart** - Carrito B2B
4. **/seller/checkout** - Checkout B2B
5. **/seller/mis-compras** - Órdenes B2B realizadas
6. **/seller/inventario** - Inventario B2C para vender
7. **/seller/pedidos** - Pedidos B2C recibidos
8. **/seller/wallet** - Billetera y transacciones
9. **/seller/kyc** - Verificación KYC y créditos
10. **/seller/perfil** - Perfil de tienda
11. **/seller/account** - Configuración de cuenta
12. **/seller/favorites** - Productos B2B favoritos

### Páginas de Admin
Todas bajo **/admin/...**
1. **/admin/login** - Login de administrador
2. **/admin/dashboard** - Panel principal
3. **/admin/catalogo** - Gestión de productos B2B
4. **/admin/categorias** - Gestión de categorías
5. **/admin/vendedores** - Gestión de vendedores
6. **/admin/proveedores** - Gestión de proveedores
7. **/admin/pedidos** - Órdenes B2B
8. **/admin/cotizaciones** - Cotizaciones pendientes
9. **/admin/aprobaciones** - Solicitudes de crédito/retiro
10. **/admin/comisiones** - Configuración de comisiones
11. **/admin/precios** - Motor de precios dinámico
12. **/admin/banners** - Gestión de banners
13. **/admin/pickup-points** - Puntos de recogida
14. **/admin/conciliacion** - Conciliación de pagos
15. **/admin/reembolsos** - Gestión de reembolsos

---

## 🧩 COMPONENTES PRINCIPALES

### Layout Components
- **GlobalHeader** - Header para páginas B2C públicas
- **GlobalMobileHeader** - Header móvil B2C
- **Footer** - Footer global
- **SellerLayout** - Layout con sidebar para vendedores
- **AdminLayout** - Layout con sidebar para admins
- **MobileBottomNav** - Navegación inferior móvil

### Product Components
- **ProductCard** - Card de producto B2C
- **ProductCardB2B** - Card de producto B2B
- **ProductGrid** - Grid de productos
- **ProductCarousel** - Carrusel de productos
- **FeaturedCarousel** - Carrusel de productos destacados
- **ProductBottomSheet** - Sheet móvil para producto
- **VariantSelector** - Selector de variantes
- **VariantDrawer** - Drawer para selección de variantes
- **ProductReviews** - Sección de reseñas

### Cart Components
- **CartSidebarB2B** - Sidebar del carrito B2B
- **CartPage** - Página de carrito B2C

### Category Components
- **CategorySidebar** - Sidebar de categorías
- **CategoryGrid** - Grid de categorías
- **CategoryCard** - Card de categoría
- **SubcategoryGrid** - Grid de subcategorías
- **MobileCategoryHeader** - Header móvil de categorías

### Store Components
- **TrendingStoresSection** - Sección de tiendas trending
- **TrendingStoreCard** - Card de tienda trending
- **StoreReviewModal** - Modal para reseñas de tienda
- **SellerStatusViewer** - Visor de estados/stories
- **SellerStatusUpload** - Subir estados

### Seller Components
- **SellerSidebar** - Sidebar de navegación
- **SellerDesktopHeader** - Header desktop
- **SellerMobileHeader** - Header móvil
- **KYCUploadForm** - Formulario de verificación
- **CreditReferralDashboard** - Panel de créditos y referidos
- **SellerQuotesHistory** - Historial de cotizaciones
- **StoreEditDialog** - Editar tienda
- **UserEditDialog** - Editar usuario

### Inventory Components (Seller)
- **InventarioStats** - Estadísticas de inventario
- **InventarioTable** - Tabla de productos
- **PublicacionDialog** - Publicar producto
- **StockAdjustDialog** - Ajustar stock
- **SellerBulkPriceDialog** - Actualizar precios masivamente
- **MarginAlert** - Alerta de margen bajo

### Admin Components
- **AdminSidebar** - Sidebar de navegación
- **ProductFormDialog** - Crear/editar producto
- **ProductEditDialog** - Editar producto
- **BulkImportDialog** - Importar productos masivamente
- **BulkPriceUpdateDialog** - Actualizar precios
- **HierarchicalCategorySelect** - Selector de categorías jerárquicas
- **VariantManager** - Gestión de variantes

### Map Components
- **PickupPointsMap** - Mapa de puntos de recogida (Leaflet/OpenStreetMap)

### Notification Components
- **NotificationBell** - Campana de notificaciones

### UI Components (shadcn/ui)
Todos los componentes estándar de shadcn: Button, Card, Dialog, Drawer, Sheet, Tabs, Table, Form, Input, Select, Checkbox, Badge, Avatar, Accordion, etc.

---

## 🪝 HOOKS PRINCIPALES

### Authentication
- **useAuth** - Autenticación y sesión
- **useCart** - Carrito genérico
- **useCartB2B** - Carrito B2B con Supabase
- **useB2CCartSupabase** - Carrito B2C con Supabase

### Data Fetching
- **useProducts** - Productos B2B
- **useProductsB2B** - Productos B2B con filtros
- **useCategories** - Categorías
- **useSellerCatalog** - Catálogo del vendedor
- **useStore** - Datos de tienda
- **useTrendingProducts** - Productos trending
- **useTrendingStores** - Tiendas trending
- **useTrendingCategories** - Categorías trending

### Orders & Payments
- **useOrders** - Órdenes B2B
- **useB2COrders** - Órdenes B2C
- **useBuyerOrders** - Órdenes del comprador
- **useQuotes** - Cotizaciones
- **usePayments** - Pagos

### Wallet & Credits
- **useSellerWallet** - Billetera del vendedor
- **useSellerCredits** - Créditos del vendedor
- **useReferrals** - Sistema de referidos

### Features
- **useFavorites** - Favoritos B2C
- **useSellerFavorites** - Favoritos B2B
- **useProductVariants** - Variantes de producto
- **useProductReviews** - Reseñas
- **useNotifications** - Notificaciones
- **useRealtimeNotifications** - Notificaciones en tiempo real
- **useAddresses** - Direcciones del usuario
- **usePickupPoints** - Puntos de recogida
- **useGeolocation** - Geolocalización

### Pricing
- **usePriceEngine** - Motor de precios B2B
- **useDynamicPricing** - Precios dinámicos con comisiones

### Admin
- **useAdminApprovals** - Solicitudes de aprobación
- **useAdminBanners** - Banners
- **useCommissionOverrides** - Comisiones personalizadas
- **usePlatformSettings** - Configuración de plataforma
- **useKYC** - Verificación KYC

---

## 🔔 EDGE FUNCTIONS

### send-notification-email
Envía emails usando Resend para notificaciones de:
- Cambios de estado de wallet
- Confirmación de retiros
- Nuevos pedidos

### send-whatsapp-notification
Envía mensajes WhatsApp usando WhatsApp Business API para:
- Alertas de nuevos pedidos
- Confirmación de pagos
- Recordatorios

### verify-role
Verifica el rol de un usuario (admin, seller, buyer)

---

## 📦 DEPENDENCIAS PRINCIPALES

```json
{
  "dependencies": {
    "@fontsource/plus-jakarta-sans": "^5.x",
    "@hookform/resolvers": "^3.x",
    "@radix-ui/react-*": "^1.x",
    "@supabase/supabase-js": "^2.x",
    "@tanstack/react-query": "^5.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "date-fns": "^3.x",
    "embla-carousel-react": "^8.x",
    "embla-carousel-autoplay": "^8.x",
    "framer-motion": "^11.x",
    "leaflet": "^1.9.x",
    "lucide-react": "^0.4x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-hook-form": "^7.x",
    "react-leaflet": "^5.x",
    "react-router-dom": "^6.x",
    "recharts": "^2.x",
    "sonner": "^1.x",
    "tailwind-merge": "^2.x",
    "tailwindcss-animate": "^1.x",
    "vaul": "^0.9.x",
    "zod": "^3.x",
    "zustand": "^5.x"
  }
}
```

---

## 🚀 FLUJOS PRINCIPALES

### Flujo B2B (Vendedor compra al mayoreo)
1. Vendedor navega catálogo B2B (/seller/catalogo)
2. Agrega productos al carrito B2B
3. Puede solicitar cotización o proceder a checkout
4. Selecciona método de pago (MonCash, transferencia, crédito)
5. Admin verifica pago
6. Productos se agregan automáticamente al inventario B2C del vendedor
7. Vendedor puede publicar productos en su tienda

### Flujo B2C (Cliente compra de tienda)
1. Cliente navega marketplace o tienda específica
2. Agrega productos al carrito B2C
3. Checkout con selección de punto de recogida
4. Se genera código de entrega QR
5. Cliente recoge en punto y confirma con código
6. Fondos entran en escrow (7 días)
7. Después del período, fondos se liberan a wallet del vendedor
8. Sistema calcula comisión + TCA y lo registra como deuda

### Flujo de Wallet
1. Vendedor acumula balance de ventas
2. Balance en escrow por período configurable
3. Fondos liberados van a balance disponible
4. Vendedor puede solicitar retiro
5. Admin aprueba y procesa retiro
6. Se descuentan comisiones pendientes

### Flujo de Crédito
1. Vendedor solicita activación de crédito
2. Admin revisa KYC y aprueba
3. Vendedor puede usar hasta X% del crédito en carrito
4. Deuda se registra y debe pagarse

---

## 🎯 CARACTERÍSTICAS ESPECIALES

1. **Dual Mode**: El mismo producto puede mostrarse en modo B2B o B2C
2. **Stories/Estados**: Vendedores pueden subir contenido temporal (24h)
3. **Verificación KYC**: Subida de documentos con revisión admin
4. **Códigos QR**: Para confirmar entregas en puntos de recogida
5. **Escrow**: Retención de fondos configurable
6. **Comisiones Dinámicas**: Por vendedor o globales
7. **Motor de Precios**: Gastos dinámicos configurables
8. **Referidos**: Sistema de referidos con bonos
9. **Mapas**: Visualización de puntos de recogida con geolocalización
10. **Notificaciones**: In-app, email y WhatsApp

---

## 📝 NOTAS DE IMPLEMENTACIÓN

1. **RLS Policies**: Cada tabla debe tener políticas de seguridad apropiadas
2. **Indexes**: Crear índices para campos frecuentemente consultados
3. **Triggers**: Para actualizar timestamps, calcular totales, etc.
4. **Storage Buckets**: Para imágenes de productos, KYC, logos, banners
5. **Realtime**: Habilitar para notificaciones y actualizaciones de stock
6. **Mobile First**: Diseño responsive con prioridad móvil
7. **Error Handling**: Toast notifications para errores y éxitos
8. **Loading States**: Skeletons y spinners para carga
9. **Optimistic Updates**: Para mejor UX en operaciones de carrito

---

Este prompt contiene todo lo necesario para reconstruir el marketplace completo con la misma funcionalidad y estructura de base de datos.

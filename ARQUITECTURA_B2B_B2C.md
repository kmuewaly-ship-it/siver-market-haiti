# Arquitectura B2B/B2C - SIVER Market

## 📋 Descripción General

Este documento explica la separación estricta entre las experiencias Mayorista (B2B) y Minorista (B2C) en SIVER Market.

## 🏗️ Separación de Datos

### Campos de Precio

| Campo | Visibilidad | Propósito | Ejemplo |
|-------|------------|----------|---------|
| `precio_b2b` | Admin, Seller | Precio mayorista | $10.00 |
| `moq` | Admin, Seller | Mínimo de pedido | 100 unidades |
| `precio_b2c` | Cliente Final | Precio minorista | $15.00 |

### Regla Crítica

```
⚠️ La API BACKEND debe asegurar que:
- Los endpoints B2C NUNCA incluyan precio_b2b ni moq
- Los endpoints B2B NUNCA sean accesibles para clientes finales
- El filtrado ocurre en el BACKEND, no en el frontend
```

## 🔐 Roles de Usuario

### 1. Administrador (Admin)
- **Acceso**: Módulo `/admin/*`
- **Permisos**: 
  - Ver todos los productos con precios B2B y B2C
  - Gestionar inventario global
  - Gestionar usuarios (Admin, Seller, Cliente)
  - Gestionar pagos B2B
  - Acceso a reportes

**Redirección al login**: `/admin/dashboard`

### 2. Vendedor (Seller)
- **Acceso**: Módulo `/seller/*`
- **Permisos**: 
  - Ver catálogo B2B (precios mayoristas)
  - Realizar pedidos en lotes
  - Gestionar pagos anticipados
  - Ver historial de compras

**Redirección al login**: `/seller/adquisicion-lotes` ✨ (Automática)

### 3. Administrador - Acceso B2B
- **Acceso**: También puede acceder a `/seller/adquisicion-lotes` y `/seller/checkout`
- **Propósito**: Testear, simular compras, validar flujos como vendedor
- **Redirección automática**: `/admin/dashboard` (pero puede navegar a `/seller/*` manualmente)### 3. Cliente Final (Client)
- **Acceso**: Experiencia pública `/` y `/marketplace`
- **Permisos**:
  - Ver catálogo B2C (precios minoristas)
  - Buscar productos y tiendas
  - Agregar a carrito
  - Realizar compras

**Nota**: NO puede acceder a `/admin/*` o `/seller/*`

## 🗺️ Rutas de la Aplicación

### Rutas Públicas (B2C)

```
/                           → Página de inicio
/marketplace                → Catálogo B2C
/tienda/[ID_Vendedor]      → Tienda individual
/producto/[SKU]             → Página de producto
/registro-vendedor          → Landing page de registro B2B
```

### Rutas de Admin

```
/admin/login                → Formulario de acceso
/admin/dashboard            → Panel principal (Protegido)
/admin/catalogo             → Gestión de productos (Protegido)
/admin/categorias           → Gestión de categorías (Protegido)
/admin/conciliacion         → Gestión de pagos (Protegido)
```

### Rutas de Seller

```
/seller/adquisicion-lotes   → Portal de compras B2B (Protegido)
```

## 🔑 Sistema de Autenticación

### Flujo de Login

1. **Usuario Admin/Seller inicia sesión**
   ```
   /admin/login → Autentica → Redirige a /admin/dashboard
   /seller/login → Autentica → Redirige a /seller/adquisicion-lotes
   ```

2. **Cliente Final** (sin login obligatorio)
   ```
   Permanece en / o /marketplace
   ```

### Componente ProtectedRoute

```tsx
<ProtectedRoute requiredRoles={[UserRole.ADMIN, UserRole.SELLER]}>
  <AdminDashboard />
</ProtectedRoute>
```

## 📊 Estructura de Base de Datos

### Tabla: `products` (Con todos los campos)
```sql
- id (PK)
- sku (UNIQUE)
- name
- description
- precio_b2b (Mayorista) ← Solo para Admin/Seller
- moq (Mínimo de pedido) ← Solo para Admin/Seller
- precio_b2c (Minorista) ← Solo para Cliente
- stock
- images[]
- category
- seller_id
- created_at
```

### Tabla: `products_b2c` (Vista o tabla específica)
```sql
- id
- sku
- name
- description
- precio_b2c ✓ Incluido
- stock
- images[]
- category
- seller_id
- seller_name
- created_at
```

**Nota**: Esta tabla/vista NUNCA incluye `precio_b2b` ni `moq`

### Tabla: `user_roles`
```sql
- user_id (FK)
- role ('admin' | 'seller' | 'client')
```

## 🔄 Flujo de Separación

```
┌─────────────────────────────────────┐
│     Usuario intenta acceder         │
└──────────────────┬──────────────────┘
                   │
         ┌─────────┴──────────┐
         │                    │
    Autenticado?         No autenticado
         │                    │
    ┌────┴────┐          ┌────┴────┐
    │          │          │         │
  Admin    Seller      Client   Público
    │          │          │         │
    ↓          ↓          ↓         ↓
  /admin    /seller       /    /marketplace
    │          │          │         │
    ├─ Ver todo├─ Comprar├─ Ver B2C└─ Ver B2C
    │  precios │ mayorista│  precios   precios
    └──────────┴──────────┴─────────────┘
```

## 💾 Servicios de API

### Para Admin/Seller
```typescript
getProductsB2B(userRole) // Con precio_b2b y moq
```

### Para Cliente Final
```typescript
getProductsB2C(filters)        // Sin precio_b2b ni moq
getProductB2C(sku)             // Producto específico
getSellerProducts(sellerId)    // Productos de vendedor
searchProducts(searchTerm)     // Búsqueda pública
```

## 🚀 Implementación en el Backend (Supabase)

### SQL: Crear vista B2C

```sql
CREATE VIEW products_b2c AS
SELECT 
  id, sku, name, description,
  precio_b2c, stock, images, category,
  seller_id, created_at, updated_at
FROM products
WHERE active = true;
```

### RLS (Row Level Security)

```sql
-- Solo admin y seller ven precios B2B
CREATE POLICY "view_b2b_prices" ON products
FOR SELECT
USING (auth.jwt() ->> 'role' IN ('admin', 'seller'));

-- Clientes finales ven solo vista B2C
CREATE POLICY "view_b2c_prices" ON products_b2c
FOR SELECT
USING (true); -- Acceso público
```

## ✅ Checklist de Implementación

- [x] Tipos de datos (auth.ts, products.ts)
- [x] ProtectedRoute component
- [x] useAuth hook con redirección automática
- [x] Rutas públicas (StorePage, ProductPage)
- [x] Landing page de registro vendedor
- [x] App.tsx con enrutamiento completo
- [x] Servicios de API para B2B/B2C
- [x] B2B types (ProductB2BCard, CartItemB2B, CartB2B, OrderB2B)
- [x] useCartB2B hook con localStorage persistence
- [x] ProductCardB2B con MOQ validation
- [x] SearchFilterB2B con categorías y ordenamiento
- [x] CartSidebarB2B flotante
- [x] SellerAcquisicionLotes page (catálogo completo)
- [x] SellerCheckout page (confirmación de orden)
- [ ] Crear tabla `orders_b2b` en Supabase
- [ ] Implementar guardado de órdenes en checkout
- [ ] Configurar RLS en Supabase para B2B
- [ ] Crear vista `products_b2c`
- [ ] Implementar endpoints específicos en Edge Functions
- [ ] Integración de pagos (Stripe, MonCash, Transfer)
- [ ] Confirmación de email para órdenes
- [ ] Historial de órdenes para vendedores
- [ ] Testing de separación de datos

## 📝 Notas Importantes

1. **Seguridad**: La separación debe ocurrir en el BACKEND, no solo en el frontend
2. **Redirección**: El Seller se redirige automáticamente a `/seller/adquisicion-lotes` después del login
3. **Cliente Final**: Nunca puede acceder a `/admin/*` o `/seller/*`
4. **Precios**: Los precios B2B nunca deben ser visibles para clientes finales

## 🛒 Flujo Completo de B2B (Mayorista)

### Fase 1: Adquisición/Catálogo (`/seller/adquisicion-lotes`)
1. Vendedor logueado ve catálogo de **10,000+ productos B2B**
2. **Filtros disponibles**:
   - 🔍 Búsqueda por SKU o nombre
   - 📁 Categoría (multi-select)
   - 📦 Stock (Todos, En Stock, Stock Bajo, Agotado)
   - 💰 Ordenar por (Más nuevo, Precio ↑, Precio ↓, MOQ ↑, MOQ ↓)
3. **Para cada producto**:
   - 💵 Muestra: `precio_b2b` (precio mayorista)
   - 📦 MOQ (mínimo de pedido, ej: "100 unidades")
   - 📊 Stock disponible
   - ➕➖ Selector de cantidad con validación
4. **Validaciones en tiempo real**:
   - ❌ Cantidad < MOQ: Botón deshabilitado + mensaje de error
   - ❌ Cantidad > Stock: Botón deshabilitado + mensaje de error
   - ✅ Cantidad válida: Botón habilitado
5. **Carrito flotante**:
   - 🛒 Badge con contador de artículos
   - 📝 Resumen de items en carrito
   - 💵 Subtotal actualizado en tiempo real
   - 💾 Persiste en localStorage
   - 🔗 Botón "Proceder al Checkout"

### Fase 2: Carrito (`CartSidebarB2B`)
- Gestión de items: +/−/eliminar con validaciones
- Cálculo automático de subtotal por item
- Validación continua de MOQ y stock
- Carrito persiste al cerrar sesión

### Fase 3: Checkout (`/seller/checkout`)
1. **Resumen del Pedido**:
   - Información del vendedor (nombre, email)
   - Lista de productos con cantidades y precios
   - Total de unidades
   - Subtotal (sin impuestos/envío aún)
2. **Método de Pago** (radio buttons):
   - 💳 Stripe (tarjetas de crédito)
   - 📱 MonCash (billetera haitiana)
   - 🏦 Transferencia bancaria
3. **Confirmación**:
   - Botón "Confirmar Pedido" (con spinner)
   - Validación final de stock/MOQ
   - Crear OrderB2B en base de datos
   - Mostrar confirmación con número de orden
   - Limpiar carrito (localStorage)
4. **Post-checkout**:
   - Email de confirmación
   - Acceso a historial de órdenes
   - Opción de volver al catálogo

## 🤝 Flujo de Registro de Vendedor

1. Usuario visita `/registro-vendedor`
2. Completa formulario KYC (sin acceder a datos B2B)
3. Envía solicitud
4. Admin aprueba y crea usuario con rol `seller`
5. Vendedor recibe email y se loguea en `/seller/login`
6. Sistema lo redirige a `/seller/adquisicion-lotes` automáticamente

---

**Última actualización**: Diciembre 10, 2024
**Versión**: 1.0

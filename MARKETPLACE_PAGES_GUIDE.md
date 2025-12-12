# Guía de Uso - Nuevas Páginas Marketplace

## 🚀 Navegación del Sistema

### Flujo Principal de Usuario (B2C)

```
Home (/)
    ↓
[Click en categoría o "Ver Categorías"]
    ↓
Categorías (/categorias)
    ↓
[Click en una categoría]
    ↓
Productos por Categoría (/categoria/{slug})
    ↓
[Click en un producto]
    ↓
Detalle de Producto (/producto/{sku})
    ↓
[Click en "Ver Tienda" o nombre del vendedor]
    ↓
Perfil de Tienda (/tienda/{storeId})
    ↓
[Click en un producto de la tienda]
    ↓
Vuelve a Detalle de Producto (/producto/{sku})
```

---

## 📄 Descripción de Cada Página

### 1. CategoriesPage (/categorias)

**URL Completa:** `https://yourdomain.com/categorias`

**Propósito:** Mostrar todas las categorías disponibles en el marketplace

**Elementos Principales:**
- Grid de 22 categorías (mujer, curvy, niños, hombre, etc.)
- Cada categoría muestra:
  - Imagen/icono
  - Nombre de la categoría
  - Contador de productos disponibles
  - Efecto hover (escala aumenta)
- Breadcrumb: Inicio > Todas las Categorías
- Loading states con Skeleton loaders

**Acciones Disponibles:**
- Click en cualquier categoría → `/categoria/{slug}`
- Filtrado automático de categorías raíz (sin categorías padre)

**Estados:**
- Cargando (muestra Skeletons)
- Vacío (si no hay categorías)
- Normal (mostrando 22 categorías)

---

### 2. CategoryProductsPage (/categoria/:slug)

**URL Completa:** `https://yourdomain.com/categoria/mujer`

**Propósito:** Mostrar todos los productos de una categoría específica con opciones de filtrado y ordenamiento

**Elementos Principales:**
- Breadcrumb interactivo: Inicio > Categorías > {Nombre Categoría}
- Contador de resultados: "X productos disponibles"
- Barra de herramientas con:
  - Dropdown de ordenamiento:
    - Más nuevo
    - Precio (menor a mayor)
    - Precio (mayor a menor)
    - Mejor rating
  - Filtro de precio (rango)
  - Filtro de rating mínimo
  - Búsqueda por nombre

- Grid de productos (4 columnas en desktop, responsive):
  - Imagen con efecto zoom hover
  - Badge de descuento (rojo, top-left)
  - Badge de feature (azul, top-right): "TENDENCIA", "ENVÍO GRATIS"
  - Nombre del producto (máx 2 líneas)
  - Rating con estrellas + número de opiniones
  - Precio actual (bold) + precio original (tachado)
  - Información del vendedor: "Vendido por [Nombre Tienda]" (clickable)
  - Botón "Ver Detalles"

**Acciones Disponibles:**
- Click en producto → `/producto/{sku}`
- Click en nombre vendedor → `/tienda/{sellerId}`
- Cambiar ordenamiento → recarga productos ordenados
- Ajustar filtros → filtra productos

**Estados:**
- Cargando (Skeleton cards)
- Vacío (si no hay productos que coincidan)
- Normal (mostrando productos filtrados)

**Mock Data:**
- 6 productos de ejemplo por categoría
- Precios entre $15-$65
- Ratings entre 4.5-4.9 estrellas
- Diferentes tipos de badges

---

### 3. ProductPage (/producto/:sku)

**URL Completa:** `https://yourdomain.com/producto/DRESS-001`

**Propósito:** Mostrar información completa de un producto con opciones de compra (B2C y B2B)

**Secciones:**

#### A. Galería de Imágenes (Columna Izquierda)
- Imagen principal grande (800x1000px)
- Navegación entre imágenes:
  - Flechas (< >)
  - Miniaturas debajo (clickables)
- Badge de descuento en la esquina (rojo)
- Botón de wishlist (corazón)
- Zoom suave en hover

#### B. Información del Producto (Columna Derecha)
- **Rating:** Estrellas + número de opiniones + ventas totales
- **Nombre:** Texto grande y destacado
- **SKU:** Identificador del producto
- **Precio:**
  - Precio actual (grande, azul)
  - Precio original (tachado)
  - Ahorro calculado automáticamente
- **Beneficios:** Box verde con 3 beneficios principales
- **Stock:** "X unidades disponibles" con icono de rayo
- **Opciones:**
  - Selector de Color (buttons)
  - Selector de Talla (grid)
  - Control de Cantidad (+/-)
- **Botones de Acción:**
  - "Comprar Ahora" (B2C) - Azul principal
  - "Comprar Mayorista (B2B)" - Naranja
  - "Añadir a Favoritos" - Outline

#### C. Información del Vendedor
- Logo del vendedor (16x16)
- Nombre del vendedor (clickable → `/tienda/{vendedor-id}`)
- Rating del vendedor
- Tiempo de respuesta
- Botón "Contactar" (abre chat)

#### D. Detalles Adicionales (Columna Izquierda Baja)
- **Descripción:** Párrafo con detalles del producto
- **Especificaciones:** Tabla de 5-6 características
- **Instrucciones de Cuidado:** Texto con instrucciones de lavado/uso

#### E. Garantías (Columna Derecha Baja)
4 cards coloridas:
- Envío Rápido (azul)
- Devolución Fácil (verde)
- Protección del Comprador (púrpura)
- Producto Certificado (ámbar)

**Breadcrumb:** Inicio > Categorías > {Categoría} > {Nombre Producto}

**Acciones Disponibles:**
- Seleccionar color/talla
- Cambiar cantidad
- Click en "Comprar Ahora" → carrito B2C (sin implementar)
- Click en "Comprar Mayorista" → carrito B2B (sin implementar)
- Click en nombre vendedor → `/tienda/{vendedor-id}`
- Navegar categoría → `/categoria/{slug}`

**Mock Data:**
- 4 imágenes de ejemplo
- 5-6 especificaciones
- 6 beneficios
- 4 tallas (XS-XXL)
- 4 colores

---

### 4. StoreProfilePage (/tienda/:storeId)

**URL Completa:** `https://yourdomain.com/tienda/seller1`

**Propósito:** Mostrar perfil completo de una tienda/vendedor con todos sus productos

**Secciones:**

#### A. Header Banner
- Banner grande (1200x300px) con imagen de fondo
- Gradient overlay (oscuridad progresiva)
- Logo de tienda (124x124 o 160x160 en MD)

#### B. Información Principal del Vendedor
- Logo + Nombre + Badge de verificación (azul)
- Badges de logros: "Top Seller", "Envío Gratis", "Respuesta Rápida"
- Rating: Estrellas + número de opiniones
- Seguidores: "[X] seguidores"
- Productos: "[X] productos"
- Botones de acción (derecha):
  - "Seguir" (azul principal)
  - "Contactar" (outline azul)
  - "Compartir" (outline gris)

#### C. Información Extendida (4 columnas)
- Ubicación
- Tiempo de respuesta
- Fecha de unión
- Tasa de envío

#### D. Descripción de la Tienda
- Texto de descripción de la tienda
- Información sobre servicios y garantías

#### E. Búsqueda y Filtros de Productos
- Barra de búsqueda (búsqueda full-text)
- Dropdown de categorías
- Chips/buttons para filtrar por categoría rápidamente

#### F. Grid de Productos
- 4 columnas (responsive)
- Productos mostrados:
  - Imagen
  - Badge de descuento
  - Nombre (2 líneas máx)
  - Rating
  - Precio actual + original
  - Vendidos

**Acciones Disponibles:**
- Click en producto → `/producto/{sku}`
- Búsqueda de productos → filtra productos
- Click en categoría → filtra por esa categoría
- Seguir, Contactar, Compartir (funcionalidad pendiente)
- Click en "Seguir" → añadir a favoritos (pendiente)

**Mock Data:**
- 6 productos con información completa
- 5 categorías
- Ratings del vendedor
- Información del vendedor

---

## 🎯 Uso de la Navegación

### Breadcrumb (Pan de Migas)
Presente en: ProductPage
```
Inicio > Categorías > {Categoría} > {Nombre Producto}
```
Todos los elementos son clickables:
- "Inicio" → vuelve a home
- "Categorías" → va a `/categorias`
- "{Categoría}" → va a `/categoria/{slug}`

### Links Internos
Todos estos enlaces están integrados:

| Acción | Origen | Destino |
|--------|--------|---------|
| Click categoría | Index | `/categorias` |
| Click categoría grid | CategoriesPage | `/categoria/{slug}` |
| Click producto | CategoryProductsPage | `/producto/{sku}` |
| Click vendedor | CategoryProductsPage | `/tienda/{sellerId}` |
| Click "Ver Tienda" | ProductPage | `/tienda/{seller.id}` |
| Click vendedor nombre | ProductPage | `/tienda/{seller.id}` |
| Click producto | StoreProfilePage | `/producto/{sku}` |
| Breadcrumb | ProductPage | Varios |

---

## 🎨 Estilos y Temas

### Colores Utilizados
- **Azul Primario:** #2563eb (botones, links, highlights)
- **Naranja:** #f97316 (B2B, CTAs importantes)
- **Rojo:** #ef4444 (descuentos, ofertas)
- **Verde:** #16a34a (disponibilidad, positivo)
- **Púrpura:** #a855f7 (protección)
- **Ámbar:** #d97706 (certificación)
- **Gris:** escalas para elementos secundarios

### Responsive Design
- **Móvil (base):** 1 columna
- **md (768px):** 2-3 columnas
- **lg (1024px):** 3-4 columnas
- **xl (1280px):** 4+ columnas

### Componentes UI
- **Cards:** Sombra hover, transición suave
- **Botones:** Variantes primary, outline, secondary
- **Inputs:** Borde gris, focus azul
- **Badges:** Pequeños, coloridos, informativos

---

## 💻 Integración con Supabase

### Tablas Necesarias

#### products
```sql
SELECT 
  sku, nombre, precio, precio_original, 
  categoria_id, seller_id, rating, 
  reviews_count, sales_count, stock,
  images, specifications, colors, sizes
FROM products
```

#### categories
```sql
SELECT 
  id, name, slug, parent_id, product_count
FROM categories
```

#### users (sellers)
```sql
SELECT 
  id, name, logo, banner, rating, 
  reviews_count, followers_count, 
  products_count, location, response_time,
  description, joined_at, badges
FROM users
WHERE role = 'SELLER'
```

### Hooks a Crear
```typescript
// Productos
usePublicProducts(filters?)
useProductById(sku)
useProductsByCategory(categorySlug)
useStoreProducts(storeId, filters?)

// Tiendas
useStoreProfile(storeId)
useStoresByRating()

// Categorías
usePublicCategories()
getCategoryBySlug(slug)
```

---

## ✅ Checklist de Implementación

- [x] Página de Categorías (CategoriesPage.tsx)
- [x] Página de Productos por Categoría (CategoryProductsPage.tsx)
- [x] Página de Detalle de Producto (ProductPage.tsx)
- [x] Página de Perfil de Tienda (StoreProfilePage.tsx)
- [x] Rutas en App.tsx
- [x] Navigation entre páginas
- [ ] Integración Supabase (productos)
- [ ] Integración Supabase (tiendas)
- [ ] Integración Supabase (categorías)
- [ ] Carrito B2C funcional
- [ ] Carrito B2B funcional
- [ ] Sistema de favoritos
- [ ] Sistema de reviews/opiniones
- [ ] Chat con vendedor

---

**Versión:** 1.0
**Última actualización:** Diciembre 2024
**Autor:** Sistema de Marketplace

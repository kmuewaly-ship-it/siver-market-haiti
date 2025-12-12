# 📋 REFERENCIA RÁPIDA - Nuevas Páginas Marketplace

## 📍 Ubicación de Archivos

```
src/pages/
├── StoreProfilePage.tsx (611 líneas) ← NUEVA ✨
├── ProductPage.tsx (actualizado) ← MEJORADA ✨
├── ProductDetailPage.tsx (539 líneas) ← RESPALDO ✨
├── CategoriesPage.tsx (existente)
├── CategoryProductsPage.tsx (existente)
└── ... otras páginas
```

## 🔗 Rutas Disponibles

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/categorias` | CategoriesPage | Grid de 22 categorías |
| `/categoria/:slug` | CategoryProductsPage | Productos de una categoría |
| `/producto/:sku` | ProductPage | Detalle completo de producto |
| `/tienda/:storeId` | StoreProfilePage | Perfil de vendedor + productos |

## 🎨 Paleta de Colores

```
Azul Primario:     #2563eb (botones, links)
Naranja Acción:    #f97316 (B2B, importante)
Rojo Descuentos:   #ef4444 (ofertas)
Verde Disponible:  #16a34a (positivo)
Púrpura Seguro:    #a855f7 (protección)
Ámbar Certificado: #d97706 (calidad)
```

## 📊 Datos Mock Clave

### Productos
- 6 productos por página
- Precios: $12.99 - $129.99
- Ratings: 4.5 - 4.9 estrellas
- Cada uno con 4 imágenes
- Colores: Negro, Azul, Rosa, Verde
- Tallas: XS, S, M, L, XL, XXL

### Categorías
22 categorías totales:
- Mujer, Curvy, Niños, Hombre
- Sweaters, Celulares, Joyería
- Tops, Hogar, Belleza, Zapatos
- Y 10 más...

### Tienda
- Nombre: Fashion World Store
- Rating: 4.7 estrellas
- 125,643 seguidores
- 1,254 productos
- 5 categorías diferentes

## 🧭 Flujo de Navegación

```
Inicio
  ↓
Categorías (/categorias)
  ↓
Productos (/categoria/:slug)
  ├→ Click Producto → Detalle (/producto/:sku)
  │                    └→ Click Vendedor → Tienda (/tienda/:storeId)
  │
  └→ Click Vendedor → Tienda (/tienda/:storeId)
                       └→ Click Producto → Detalle (/producto/:sku)
```

## 💻 Componentes UI Utilizados

### Shadcn/ui
- Button (primario, outline, secondary)
- Skeleton (estados de carga)
- Tooltip
- Card

### Lucide Icons
- Star (ratings)
- Heart (favoritos)
- ShoppingCart (compra)
- Truck (envío)
- Shield (protección)
- ChevronLeft/Right (navegación)
- SearchIcon (búsqueda)
- Y más...

## 📱 Responsive Breakpoints

```
Mobile:    1 columna   (base)
SM:        1-2 columnas (640px)
MD:        2-3 columnas (768px)
LG:        3-4 columnas (1024px)
XL:        4+ columnas  (1280px)
```

## ⚙️ Interfaces TypeScript

### ProductDetail
```typescript
interface ProductDetail {
  sku: string;
  name: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  rating: number;
  reviews: number;
  sales: number;
  stock: number;
  seller: SellerInfo;
  specifications: Record<string, string>;
  colors?: string[];
  sizes?: string[];
  care?: string;
}
```

### StoreProfile
```typescript
interface StoreProfile {
  id: string;
  name: string;
  logo: string;
  banner: string;
  rating: number;
  reviews: number;
  followers: number;
  products: number;
  location: string;
  responseTime: string;
  description: string;
  categories: string[];
  badges: string[];
}
```

## 🔍 URLs de Prueba Rápida

```
http://localhost:5173/categorias
http://localhost:5173/categoria/mujer
http://localhost:5173/producto/DRESS-001
http://localhost:5173/tienda/seller1
```

Otras opciones de categoría:
- `/categoria/niños`
- `/categoria/hombre`
- `/categoria/sweaters`
- `/categoria/celulares-y-accs`

Otros SKUs de producto:
- `TOP-002`, `BLOUSE-003`
- `SHOES-004`, `ACC-005`
- `DRESS-006`

## ✨ Características Principales

### CategoriesPage
✓ 22 categorías en grid
✓ Contador de productos
✓ Efectos hover
✓ Navegación a categoría

### CategoryProductsPage
✓ 6 productos
✓ Ordenamiento (4 opciones)
✓ Información del vendedor
✓ Búsqueda y filtros
✓ Grid responsivo

### ProductPage
✓ Galería (4 imágenes)
✓ Selector color/talla
✓ Control cantidad
✓ Especificaciones
✓ Garantías
✓ Info vendedor
✓ Breadcrumb

### StoreProfilePage
✓ Banner y perfil
✓ 6 productos
✓ Búsqueda
✓ Filtrado por categoría
✓ Información extendida
✓ Botones de acción

## 📄 Documentación

- `PAGES_UPDATE_SUMMARY.md` - Resumen técnico
- `MARKETPLACE_PAGES_GUIDE.md` - Guía completa
- `PROJECT_COMPLETION_STATUS.md` - Estado del proyecto
- `QUICK_TEST_GUIDE.md` - Guía rápida de prueba
- `QUICK_REFERENCE.md` - Este archivo

## 🚀 Próximos Pasos

1. Integrar Supabase (reemplazar mock data)
2. Implementar carrito funcional
3. Sistema de reviews/ratings
4. Wishlist/favoritos
5. Chat con vendedor

## ✅ Estado

**Compilación:** ✓ Sin errores
**Navegación:** ✓ Integrada
**Responsivo:** ✓ Mobile-friendly
**Diseño:** ✓ Profesional
**Documentación:** ✓ Completa

---

**Última actualización:** Diciembre 2024
**Versión:** 2.0

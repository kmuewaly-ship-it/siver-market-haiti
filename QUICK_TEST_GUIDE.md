# 🧪 Guía de Prueba Rápida - Nuevas Páginas Marketplace

## ▶️ URLs de Prueba Directa

Abre tu navegador y copia estas URLs (asumiendo `localhost:5173`):

### Categorías
```
http://localhost:5173/categorias
```

### Productos (Ejemplos)
```
http://localhost:5173/categoria/mujer
http://localhost:5173/categoria/niños
http://localhost:5173/categoria/hombre
```

### Detalles de Producto
```
http://localhost:5173/producto/DRESS-001
http://localhost:5173/producto/TOP-002
http://localhost:5173/producto/BLOUSE-003
http://localhost:5173/producto/SHOES-004
```

### Tienda del Vendedor
```
http://localhost:5173/tienda/seller1
```

---

## ✅ Lo que Deberías Probar

### 1. Visualizar Categorías
- [ ] Ve a `/categorias`
- [ ] Deberías ver 22 categorías en un grid
- [ ] Hover en una categoría - debe hacer zoom
- [ ] Click en cualquier categoría - navega a `/categoria/{slug}`

### 2. Ver Productos por Categoría
- [ ] Ve a `/categoria/mujer`
- [ ] Verás 6 productos
- [ ] Prueba el dropdown de ordenamiento (arriba)
- [ ] Click en un producto - navega a `/producto/{sku}`
- [ ] Click en el nombre del vendedor - navega a `/tienda/{sellerId}`

### 3. Ver Detalle de Producto
- [ ] Ve a `/producto/DRESS-001`
- [ ] Haz click en las flechas para navegar entre imágenes
- [ ] Selecciona un color (debe cambiar borde a azul)
- [ ] Selecciona una talla (debe cambiar fondo a azul)
- [ ] Aumenta la cantidad con los botones +/-
- [ ] Lee las especificaciones y garantías
- [ ] Click en nombre del vendedor - navega a `/tienda/seller1`

### 4. Ver Tienda del Vendedor
- [ ] Ve a `/tienda/seller1`
- [ ] Verás el banner, logo y perfil completo
- [ ] Busca un producto en la caja de búsqueda
- [ ] Filtra por categoría usando los chips abajo
- [ ] Click en cualquier producto - navega a `/producto/{sku}`

---

## 🎨 Cosas que Deberías Notar

✅ **Diseño:** Profesional (AliExpress/Shein style)
✅ **Colores:** Azul, Naranja, Rojo, Verde
✅ **Responsivo:** Probación en móvil (F12) y desktop
✅ **Navegación:** Todos los links funcionan
✅ **Imágenes:** De unsplash.com, todas cargan bien
✅ **Efectos:** Hover zoom, transiciones suaves
✅ **Precios:** Están formateados con $ y decimales

---

## 🚫 Cosas que NO Funcionan Aún (Pendiente)

❌ "Comprar Ahora" - aún no connected a carrito
❌ "Comprar Mayorista" - aún no connected a carrito B2B
❌ "Seguir" tienda - no guarda seguidores
❌ "Contactar" - no abre chat
❌ "Compartir" - no comparte
❌ "Añadir a Favoritos" - no guarda en wishlist

(Esto se implementará en la siguiente fase)

---

## 🐛 Reporte de Bugs

Si algo no funciona, reporta:
- **Página:** (ej: `/producto/DRESS-001`)
- **Acción:** (ej: Click en selector de talla)
- **Problema:** (ej: No selecciona la talla)
- **Expected:** (ej: Debería cambiar a azul)

---

## 📊 Resumen Rápido

| Página | URL | Elementos |
|--------|-----|-----------|
| Categorías | /categorias | 22 categorías |
| Productos | /categoria/:slug | 6 productos |
| Detalle | /producto/:sku | Galería, info, specs |
| Tienda | /tienda/:storeId | Perfil, búsqueda, 6 productos |

---

**¡Listo para probar!** 🚀

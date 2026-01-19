# DIAGNÓSTICO ARQUITECTURA: VISUALIZACIÓN DE VARIANTES EN CARRITO B2B/B2C
## Informe Técnico - Silver Market Haiti

---

## 📋 RESUMEN EJECUTIVO

El sistema **SÍ captura correctamente los datos de variantes** (color, talla) durante la selección en la UI, **pero NO los está persistiendo de forma estructurada en la base de datos**, lo que causa que:

1. **En el carrito**: Los datos de color/talla se pierden después de recargar
2. **En el checkout**: Se muestran pero sin relación clara con el producto
3. **En el historial de pedidos**: Se extraen mediante parsing del SKU (frágil y poco confiable)

---

## 🔍 DIAGNÓSTICO DETALLADO

### 1. ESTRUCTURA DE DATOS DEL CARRITO

#### Estado Actual (INCORRECTO):

**Tabla `b2b_cart_items`** en Supabase:
```sql
CREATE TABLE b2b_cart_items (
  id UUID PRIMARY KEY,
  cart_id UUID,
  product_id UUID,
  sku TEXT,                    -- ❌ Aquí se incluye todo: "PROD-Rojo-M"
  nombre TEXT,
  color TEXT | NULL,           -- ✅ Campo existe pero NO se está USANDO
  size TEXT | NULL,            -- ✅ Campo existe pero NO se está USANDO
  quantity INTEGER,
  unit_price NUMERIC,
  total_price NUMERIC,
  image TEXT,
  metadata JSONB               -- ❌ Datos de variante no se guardan aquí
);
```

**¿Por qué no se usa?**

En `cartService.ts` línea 180-190, cuando se inserta un item B2B:

```typescript
// ❌ PROBLEMA: color y size NO se están enviando
const { data: inserted, error: insertError } = await supabase
  .from('b2b_cart_items')
  .insert([{
    cart_id: cart.id,
    product_id: productId || null,
    sku: params.sku,              // Solo contiene: "PROD-123"
    nombre: params.name,           // Solo contiene: "Producto - Rojo / M"
    unit_price: params.priceB2B,
    total_price: params.priceB2B * params.quantity,
    quantity: params.quantity,
    image: params.image || null,
    // ❌ FALTA: color, size, metadata no se están enviando
  }])
```

---

### 2. FLUJO DE DATOS: Dónde SE pierden las variantes

#### **PASO 1: Selección en UI (✅ CORRECTO)**

En `VariantSelectorB2B.tsx` línea 180-200:
```typescript
// ✅ Los datos de variante SÍ se capturan correctamente
onSelectionChange?.({
  selections: [
    {
      variantId: "var-123",
      sku: "PROD-Rojo-M",
      label: "Rojo / M",
      quantity: 5,
      price: 15.00,
      colorLabel: "Rojo"  // ✅ Se envía
    }
  ],
  totalQty: 5,
  totalPrice: 75.00
})
```

#### **PASO 2: Agregación al Carrito (❌ PROBLEMA)**

En `ProductBottomSheet.tsx` línea 360-380 y `cartService.ts` línea 150:
```typescript
// ❌ Se pierden los detalles de variante
await addItemB2B({
  userId: user.id,
  productId: product.id,
  sku: product.sku,              // Solo base SKU: "PROD"
  name: `${product.name} - ${v.label}`,  // Nombre concatenado: "Producto - Rojo / M"
  priceB2B: priceB2B,
  quantity: v.quantity,
  image: product.image,
  // ❌ NO se envía: color, size, variantId
});
```

#### **PASO 3: Consulta del Carrito (🔴 RECUPERACIÓN FRÁGIL)**

En `useB2BCartItems.ts` línea 80-120 y `SellerMisComprasPage.tsx` línea 650-665:

```typescript
// 🔴 HACK: Extrayendo color/talla del SKU con regex
const skuParts = item.sku?.split('-') || [];
const color = skuParts[1] || null;     // Asume posición [1] = color
const size = skuParts[2] || null;      // Asume posición [2] = talla

// ⚠️ PROBLEMAS CON ESTE ENFOQUE:
// 1. Si SKU cambia formato, se rompe
// 2. No funciona con productos sin variantes
// 3. Falsa si el nombre contiene "-"
// 4. No es escalable para 3+ atributos (ej: Color + Talla + Material)
```

---

### 3. MAPEO DE COMPONENTES: Acceso a Datos

| Componente | ¿Tiene Acceso? | Estado |
|-----------|----------------|--------|
| `CartSidebarB2B.tsx` | SÍ (línea 180) | Muestra nombre pero NO color/talla separado |
| `SellerCheckout.tsx` | SÍ (línea 120) | Intenta mostrar variantes del SKU |
| `SellerMisComprasPage.tsx` | SÍ (línea 650) | Extrae del SKU con parsing |
| `MyPurchasesPage.tsx` | NO (línea 156) | Solo muestra nombre, sin variantes |
| Invoice/PDF | NO | Solo nombre del producto |

**Ejemplo de lo que VE el usuario:**

```
Carrito B2B:
├─ Producto Remera - Rojo / M     (nombre completo en UN campo)
│  ├─ Cantidad: 5
│  └─ Subtotal: $75.00
└─ ❌ Color y talla NO se muestran como badges separados

Checkout:
├─ PROD-123-Rojo-M
│  ├─ Cantidad: 5
│  └─ Subtotal: $75.00
└─ ❌ Solo ve el SKU completo, no es user-friendly

Mi Compras (Historial):
├─ Remera - Rojo / M              (extrae del nombre)
│  ├─ Cantidad: 5
│  └─ Precio unitario: $15.00
└─ ⚠️ Depende del parsing del nombre
```

---

### 4. INCONSISTENCIA DE BASE DE DATOS

**Relaciones actuales:**

```
b2b_cart_items
├─ product_id → products (✓)
├─ color → NULL (campo no usado)
├─ size → NULL (campo no usado)
└─ metadata → {} (vacío)

product_variants (EAV)
├─ id (UUID)
├─ product_id → products
├─ attribute_combination {color: "Rojo", size: "M"}
├─ images[] (URLs de imágenes específicas)
└─ stock, price, etc.
```

**¿Por qué no se relacionan?**

No hay referencia de `variant_id` en `b2b_cart_items`:
```sql
-- ❌ FALTA: No se guarda qué variante específica se compró
ALTER TABLE b2b_cart_items ADD COLUMN variant_id UUID REFERENCES product_variants(id);
```

---

## 💡 PROPUESTA DE SOLUCIÓN

### OBJETIVO:
Mostrar al usuario "Negro / 4XL" en lugar de "Camisa - Negro / 4XL"

### SOLUCIÓN RECOMENDADA (3 Opciones):

---

## OPCIÓN A: ✅ RECOMENDADA - Normalización Completa (MEJOR)

**Implementar relación 1:N entre cartItem y variante**

### Cambios en Supabase:

```sql
-- 1. Agregar columna variant_id a b2b_cart_items
ALTER TABLE b2b_cart_items 
ADD COLUMN variant_id UUID REFERENCES product_variants(id),
ADD COLUMN variant_attributes JSONB DEFAULT NULL;

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX idx_b2b_cart_items_variant ON b2b_cart_items(variant_id);

-- 3. Igual para B2C
ALTER TABLE b2c_cart_items 
ADD COLUMN variant_id UUID REFERENCES product_variants(id),
ADD COLUMN variant_attributes JSONB DEFAULT NULL;
```

### Cambios en TypeScript:

**`src/types/b2b.ts`** - Actualizar interfaz:
```typescript
export interface CartItemB2B {
  productId: string;
  sku: string;
  nombre: string;
  precio_b2b: number;
  cantidad: number;
  subtotal: number;
  image: string | null;
  moq?: number;
  
  // ✅ NUEVO
  variantId?: string;              // ID del product_variant
  variantAttributes?: {            // Datos normalizados
    color?: string;
    size?: string;
    age?: string;
    material?: string;
  };
}
```

**`src/services/cartService.ts`** - Actualizar función:
```typescript
interface B2BAddItemParams {
  userId: string;
  productId?: string;
  variantId?: string;              // ✅ NUEVO
  sku: string;
  name: string;
  priceB2B: number;
  quantity: number;
  image?: string | null;
  variantAttributes?: Record<string, string>;  // ✅ NUEVO
}

export const addItemB2B = async (params: B2BAddItemParams) => {
  // ... crear carrito ...
  
  const { data: inserted, error: insertError } = await supabase
    .from('b2b_cart_items')
    .insert([{
      cart_id: cart.id,
      product_id: params.productId || null,
      variant_id: params.variantId || null,      // ✅ NUEVO
      sku: params.sku,
      nombre: params.name,
      color: params.variantAttributes?.color,   // ✅ NUEVO
      size: params.variantAttributes?.size,     // ✅ NUEVO
      quantity: params.quantity,
      unit_price: params.priceB2B,
      total_price: params.priceB2B * params.quantity,
      image: params.image || null,
      variant_attributes: params.variantAttributes,  // ✅ NUEVO (backup)
    }]);
```

**`src/components/products/ProductBottomSheet.tsx`** - Al agregar:
```typescript
if (isSeller && selectedVariant) {
  // ✅ Enviar datos estructurados
  const variantAttrs = selectedVariant.attribute_combination || {};
  
  await addItemB2B({
    userId: user.id,
    productId: product.id,
    variantId: selectedVariant.id,              // ✅ NUEVO
    sku: selectedVariant.sku,
    name: product.name,
    priceB2B: selectedVariant.price ?? priceB2B,
    quantity: quantity,
    image: finalImage,
    variantAttributes: variantAttrs,            // ✅ NUEVO
  });
}
```

### Cambios en Componentes:

**`src/components/b2b/CartSidebarB2B.tsx`** - Renderizar variantes:
```tsx
{cart.items.map((item) => (
  <div key={item.id} className="border rounded-lg p-3">
    <h4 className="font-semibold text-sm">{item.nombre}</h4>
    
    {/* ✅ NUEVO: Mostrar variantes como badges */}
    {(item.color || item.size) && (
      <div className="flex gap-2 mt-2">
        {item.color && (
          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
            {item.color}
          </span>
        )}
        {item.size && (
          <span className="bg-secondary/10 text-secondary px-2 py-1 rounded text-xs font-medium">
            {item.size}
          </span>
        )}
      </div>
    )}
    
    <p className="text-xs text-muted-foreground mt-1">
      {item.cantidad} uds × ${item.precio_b2b}
    </p>
  </div>
))}
```

**`src/pages/seller/SellerMisComprasPage.tsx`** - Usar datos normalizados:
```tsx
// ❌ ANTES: Parsing del SKU
const skuParts = item.sku?.split('-') || [];
const color = skuParts[1] || null;

// ✅ DESPUÉS: Usar datos directos
const color = item.color;
const size = item.size;
```

---

### VENTAJAS:

✅ **Datos normalizados**: Color/talla en columnas separadas  
✅ **Relación con variante**: Acceso a imágenes, atributos adicionales  
✅ **Sin parsing frágil**: No depende de formato de SKU  
✅ **Escalable**: Funciona con cualquier número de atributos  
✅ **Auditoría**: Qué variante exacta se compró  
✅ **Búsquedas eficientes**: Índices en variant_id  

### DESVENTAJAS:

⚠️ Migración de datos históricos necesaria  
⚠️ Cambios en 3-4 servicios  
⚠️ Actualizar hooks de carrito  

### ESFUERZO: **4-6 horas** (cambios medianos)

---

## OPCIÓN B: 🟡 INTERMEDIA - Campos Simples (SIN Variante ID)

Usar solo las columnas `color` y `size` existentes sin variant_id:

```typescript
// En cartService.ts - Extraer de attribute_combination
const variantColor = selectedVariant?.attribute_combination?.color;
const variantSize = selectedVariant?.attribute_combination?.size;

await supabase.from('b2b_cart_items').insert([{
  // ... otros campos ...
  color: variantColor || null,      // ✅ Usar columnas existentes
  size: variantSize || null,
}]);
```

**VENTAJAS:**
✅ No necesita migraciones de schema  
✅ Usa columnas ya existentes  
✅ Rápido de implementar  

**DESVENTAJAS:**
❌ Limitado a solo color/talla  
❌ No se guardan otros atributos  
❌ Sin relación a product_variants  

**ESFUERZO: 2-3 horas**

---

## OPCIÓN C: 🔴 MÍNIMA - Solo UI (Sin BD)

No cambiar BD, solo mejorar visualización en UI:

```tsx
// En CartSidebarB2B.tsx
const [color, size] = item.nombre.match(/\[(.*?)\]/)?.[1]?.split('/')?.map(s => s.trim()) || [];

// Renderizar los valores encontrados
```

**VENTAJAS:**
✅ Cambios solo en componentes  
✅ Implementable en horas  

**DESVENTAJAS:**
❌ Frágil, depende del formato del nombre  
❌ No persiste en BD  
❌ No escalable  

**ESFUERZO: 1-2 horas** (pero mala práctica)

---

## 🎯 RECOMENDACIÓN FINAL

**→ IMPLEMENTAR OPCIÓN A (Normalización Completa)**

Es la única solución robusta para un marketplace en producción. Los datos de variantes son críticos para:
- Generación de órdenes
- Reporte de demanda
- Generador de tracking
- Auditoría de transacciones

---

## 📊 IMPACTO EN TRACKING (Respuesta a tu pregunta)

### Estado Actual:
```
Order ID: "ORD-20260115-001"
Tracking: "HAI-ORD-20260115-001-001-PROD"
           └─ NO incluye variante
```

### Después de la solución:

Si integras `variant_id` en el tracking:
```
Order ID: "ORD-20260115-001"
Item 1: "HAI-ORD-20260115-001-001-VAR-abc123def"
        └─ Incluye: Color, Talla, Atributos específicos
```

**¿Afecta el generador de tracking?**

Depende de tu lógica actual. Si usas solo product_id:
```typescript
// ❌ ACTUAL
const trackingId = `HAI-${orderId}-${itemIndex}-${item.product_id}`;

// ✅ MEJORADO
const trackingId = `HAI-${orderId}-${itemIndex}-${item.variant_id || item.product_id}`;
```

**Impacto**: MÍNIMO - Solo agregar fallback

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Confirmar si deseas proceder con Opción A
2. 📝 Crear migración SQL para agregar columnas
3. 🔄 Actualizar cartService.ts
4. 🎨 Actualizar componentes de carrito/checkout
5. ✔️ Agregar tests para verificar flujo
6. 📤 Deploy y validación en producción

---

**Documento preparado:** 2026-01-19  
**Arquitecto:** AI Assistant  
**Estado:** Listo para implementación

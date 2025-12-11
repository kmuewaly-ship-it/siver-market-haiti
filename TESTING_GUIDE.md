#!/bin/bash
# TESTING GUIDE - B2B Seller Interface
# Instrucciones detalladas para probar todas las características

cat << 'EOF'

╔════════════════════════════════════════════════════════════════════════════╗
║                     GUÍA DE TESTING - B2B SELLER INTERFACE                  ║
╚════════════════════════════════════════════════════════════════════════════╝

ANTES DE EMPEZAR:
================
1. Asegúrate de tener la aplicación corriendo: npm run dev
2. Base de datos de prueba con usuario "SELLER"
3. Abre DevTools: F12 para ver console y localStorage


═══════════════════════════════════════════════════════════════════════════════
TEST 1: ACCESO A LA PÁGINA DE CATÁLOGO
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 1.1: Navega a /seller/adquisicion-lotes SIN loguear
  ESPERADO: Redirige a /registro-vendedor o muestra login (sin acceso)
  VERIFICAR: 
    □ No ves el catálogo
    □ Ves mensaje de protección o login

✓ PASO 1.2: Loguéate con cuenta SELLER
  CÓMO: 
    1. Ir a /seller/login (o /registro-vendedor → crear cuenta)
    2. Ingresa email y password
    3. Deberías ver: Auto-redirect a /seller/adquisicion-lotes ✨
  VERIFICAR:
    □ Eres redirigido automáticamente
    □ Ves el encabezado: "Catálogo de Adquisición B2B"
    □ Ves: "Bienvenido, [TU_NOMBRE]"
    □ Ves la barra de filtros
    □ Ves 5 productos mock en la página

✓ PASO 1.2B: (ADMIN TESTING) Loguéate con cuenta ADMIN
  CÓMO:
    1. Ir a /admin/login
    2. Ingresa credenciales de admin
    3. Serás redirigido a /admin/dashboard
    4. Navega manualmente a /seller/adquisicion-lotes
  VERIFICAR:
    □ Admin puede acceder a /seller/adquisicion-lotes ✓
    □ Admin puede ver catálogo y realizar "compras" de prueba
    □ Útil para testear flujo B2B sin necesidad de cuenta seller

✓ PASO 1.3: Verificar estructura de página
  DEBE VER:
    □ Header (con logo SIVER Market)
    □ Título y subtítulo de bienvenida
    □ SearchFilterB2B (barra de búsqueda + filtros)
    □ Grid de ProductCardB2B (responsive)
    □ Footer
    □ CartSidebarB2B (botón flotante azul con contador)


═══════════════════════════════════════════════════════════════════════════════
TEST 2: BUSCAR Y FILTRAR PRODUCTOS
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 2.1: Buscar por SKU
  HACER: Escribe "TSHIRT" en la barra de búsqueda
  ESPERADO:
    □ La búsqueda es casi instantánea (debounce 300ms)
    □ Solo aparece "Camiseta Básica Blanca" (SKU: TSHIRT-001)
    □ Dice "Productos (1)"
  
✓ PASO 2.2: Buscar por nombre
  HACER: Borra lo anterior y escribe "Zapatillas"
  ESPERADO:
    □ Aparece solo "Zapatillas Deportivas Negras"
    □ Dice "Productos (1)"

✓ PASO 2.3: Búsqueda sin coincidencias
  HACER: Escribe algo que no existe, ej: "XXXXXX"
  ESPERADO:
    □ Dice "Productos (0)"
    □ Muestra mensaje: "No se encontraron productos"

✓ PASO 2.4: Filtrar por Categoría
  HACER: 
    1. Abre dropdown "Categoría"
    2. Selecciona "Ropa"
  ESPERADO:
    □ Aparecen 3 productos (Camiseta, Pantalón, Vestido)
    □ Dice "Productos (3)"

✓ PASO 2.5: Filtrar por Stock
  HACER:
    1. Abre dropdown "Stock"
    2. Selecciona "Agotado"
  ESPERADO:
    □ Aparece solo la Correa de Cuero (stock = 0)
    □ Dice "Productos (1)"

✓ PASO 2.6: Ordenar
  HACER:
    1. Abre dropdown "Ordenar"
    2. Intenta: Precio ↑, Precio ↓, MOQ ↑, MOQ ↓
  ESPERADO:
    □ Los productos se reorganizan en ese orden
    □ Verificar: Precio ↑ debería mostrar camiseta primero ($2.50)
    □ Verificar: Precio ↓ debería mostrar zapatillas primero ($12.00)

✓ PASO 2.7: Combinar filtros
  HACER:
    1. Busca "Jeans"
    2. Filtra por "Ropa"
    3. Filtra por "En Stock"
  ESPERADO:
    □ Solo aparece "Pantalón Vaquero Azul"
    □ Dice "Productos (1)"


═══════════════════════════════════════════════════════════════════════════════
TEST 3: VALIDACIÓN DE MOQ (Mínimo de Pedido)
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 3.1: MOQ Validation - Cantidad muy baja
  HACER:
    1. Abre ProductCardB2B de "Camiseta" (MOQ: 50)
    2. Selector de cantidad = 10
    3. Intenta click en "Añadir al Carrito"
  ESPERADO:
    □ Botón está DESHABILITADO (gris)
    □ Mensaje de error rojo: "Mínimo de 50 unidades"
    □ NO se añade al carrito

✓ PASO 3.2: MOQ Validation - Cantidad exacta MOQ
  HACER:
    1. Mantén MOQ = 50
    2. Cambia selector a 50 exactos
    3. Click en "Añadir al Carrito"
  ESPERADO:
    □ Botón está HABILITADO (azul)
    □ Se añade al carrito exitosamente
    □ CartSidebarB2B muestra badge: [1]

✓ PASO 3.3: MOQ Validation - Cantidad > MOQ
  HACER:
    1. Selector = 100
    2. Click en "Añadir al Carrito"
  ESPERADO:
    □ Botón está HABILITADO
    □ Se añade al carrito
    □ Badge ahora muestra: [2]


═══════════════════════════════════════════════════════════════════════════════
TEST 4: VALIDACIÓN DE STOCK
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 4.1: Stock Validation - Cantidad > Stock disponible
  HACER:
    1. Abre ProductCardB2B de "Pantalón" (Stock: 200, MOQ: 30)
    2. Selector = 250 (más que stock disponible)
    3. Intenta click "Añadir al Carrito"
  ESPERADO:
    □ Botón está DESHABILITADO
    □ Mensaje de error: "Stock insuficiente. Disponible: 200"
    □ NO se añade al carrito

✓ PASO 4.2: Stock Validation - Cantidad = Stock disponible
  HACER:
    1. Selector = 200 exacto
    2. Click "Añadir al Carrito"
  ESPERADO:
    □ Botón está HABILITADO
    □ Se añade exitosamente

✓ PASO 4.3: Stock = 0 (Agotado)
  HACER:
    1. Abre ProductCardB2B de "Correa de Cuero" (Stock: 0)
    2. Intenta cualquier cantidad
  ESPERADO:
    □ Botón DESHABILITADO
    □ Indicador rojo: "Agotado"
    □ Mensaje de error

✓ PASO 4.4: Stock bajo (entre 0 y MOQ*2)
  HACER:
    1. Abre "Vestido" (Stock: 75, MOQ: 25)
    2. Intenta 75 unidades
  ESPERADO:
    □ Stock bajo: muestra indicador
    □ Si cantidad es válida: botón habilitado


═══════════════════════════════════════════════════════════════════════════════
TEST 5: CARRITO (CartSidebarB2B)
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 5.1: Abrir/Cerrar carrito
  HACER:
    1. Click botón azul flotante [🛒 3]
  ESPERADO:
    □ Sidebar se desliza desde la derecha
    □ Overlay oscuro aparece detrás
    □ Click overlay o botón X: Cierra carrito

✓ PASO 5.2: Ver items en carrito
  HACER:
    1. (Después de Paso 3.2) Click botón carrito
  ESPERADO:
    □ Ves lista de items:
      - Camiseta: 50 unidades × $2.50 = $125.00
      - Pantalón: 200 unidades × $8.50 = $1,700.00
      - Vestido: 75 unidades × $6.00 = $450.00
    □ Total Unidades: 325
    □ SUBTOTAL: $2,275.00

✓ PASO 5.3: Actualizar cantidad en carrito
  HACER:
    1. En carrito, en el item Camiseta: Click [+]
    2. Cantidad debe cambiar a 51
  ESPERADO:
    □ Cantidad se incrementa
    □ Subtotal item se recalcula: 51 × $2.50 = $127.50
    □ Total SUBTOTAL se actualiza
    □ Badge carrito no cambia (seguirá mostrando cantidad de items)

✓ PASO 5.4: Validar MOQ al actualizar en carrito
  HACER:
    1. En carrito, intenta disminuir cantidad debajo de MOQ
    2. Para Camiseta (MOQ: 50), intenta 49
  ESPERADO:
    □ Botón − se deshabilita cuando cantidad < MOQ
    □ NO te permite ir debajo de MOQ
    □ Se muestra tooltip/error

✓ PASO 5.5: Eliminar item del carrito
  HACER:
    1. Click botón 🗑 (Trash) en un item
  ESPERADO:
    □ Item se elimina de la lista
    □ Totales se recalculan
    □ Badge carrito se decrementa
    □ Si no quedan items: Muestra "Carrito Vacío"

✓ PASO 5.6: Persistencia en localStorage
  HACER:
    1. F12 → Storage → localStorage
    2. Busca clave "siver_b2b_cart"
    3. Cierra el navegador/pestaña completamente
    4. Vuelve a abrir la aplicación
  ESPERADO:
    □ El carrito se mantiene igual
    □ Los items siguen ahí con sus cantidades
    □ Los totales son los mismos


═══════════════════════════════════════════════════════════════════════════════
TEST 6: CHECKOUT
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 6.1: Navegar a checkout
  HACER:
    1. Click botón "Proceder al Checkout" en CartSidebarB2B
  ESPERADO:
    □ Eres redirigido a /seller/checkout
    □ Ves resumen del pedido

✓ PASO 6.2: Verificar información del vendedor
  HACER:
    1. En checkout, mira sección "Información del Vendedor"
  ESPERADO:
    □ Ves tu nombre correcto
    □ Ves tu email correcto

✓ PASO 6.3: Verificar productos en checkout
  HACER:
    1. Mira sección "Productos (X)"
  ESPERADO:
    □ Aparecen los mismos items del carrito
    □ Con cantidades y precios correctos
    □ Subtotales calculados correctamente

✓ PASO 6.4: Seleccionar método de pago
  HACER:
    1. Intenta seleccionar cada opción:
       - Tarjeta de Crédito (Stripe)
       - MonCash
       - Transferencia Bancaria
  ESPERADO:
    □ Se marca el radio button correspondiente
    □ Puedes cambiar la selección

✓ PASO 6.5: Verificar resumen de totales
  HACER:
    1. Panel derecho (Resumen del Pedido)
  ESPERADO:
    □ Subtotal correcto (suma de todos los items)
    □ Total Unidades correcto (suma de cantidades)
    □ TOTAL = Subtotal (sin impuestos/envío en versión actual)

✓ PASO 6.6: Confirmar pedido
  HACER:
    1. Click botón verde "Confirmar Pedido"
  ESPERADO:
    □ Botón muestra spinner: "Procesando..."
    □ Espera 2-3 segundos
    □ Ves pantalla de éxito con ✓
    □ Mensaje: "¡Pedido Confirmado!"
    □ Console muestra el objeto Order (F12)

✓ PASO 6.7: Post-checkout
  HACER:
    1. En pantalla de éxito, click "Continuar Comprando"
  ESPERADO:
    □ Regresa a /seller/adquisicion-lotes
    □ Carrito está VACÍO (badge muestra 0)
    □ localStorage["siver_b2b_cart"] está limpio
    □ Puedes empezar nueva orden

✓ PASO 6.8: Checkout con carrito vacío
  HACER:
    1. Accede directamente a /seller/checkout sin items
  ESPERADO:
    □ Ves mensaje: "Carrito Vacío"
    □ Botón: "Volver al Catálogo"
    □ No puedes procesar pedido


═══════════════════════════════════════════════════════════════════════════════
TEST 7: RESPONSIVE DESIGN
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 7.1: Desktop (1920x1080)
  HACER:
    1. DevTools: Modo normal
  ESPERADO:
    □ Grid de productos: 4 columnas
    □ Búsqueda y filtros en una fila
    □ CartSidebarB2B alineado correctamente

✓ PASO 7.2: Tablet (768x1024)
  HACER:
    1. DevTools: Toggle device toolbar (iPad)
  ESPERADO:
    □ Grid de productos: 2 columnas
    □ Filtros se reorganizan si es necesario
    □ CartSidebarB2B funciona correctamente

✓ PASO 7.3: Mobile (375x667)
  HACER:
    1. DevTools: Toggle device toolbar (iPhone)
  ESPERADO:
    □ Grid de productos: 1 columna
    □ Filtros pueden ser stacked o scrollable
    □ CartSidebarB2B sigue siendo accessible
    □ Todo texto legible sin zoom


═══════════════════════════════════════════════════════════════════════════════
TEST 8: VALIDACIONES FINALES
═══════════════════════════════════════════════════════════════════════════════

✓ PASO 8.1: Sin acceso sin ser Seller
  HACER:
    1. Abre incógnito/nueva sesión
    2. Intenta acceder a /seller/adquisicion-lotes
  ESPERADO:
    □ Eres redirigido a login o ves "No autorizado"
    □ Mensaje: "Debes ser vendedor para acceder"

✓ PASO 8.2: Actualizar página
  HACER:
    1. En /seller/adquisicion-lotes, F5 (refresh)
  ESPERADO:
    □ Página recarga
    □ useAuth mantiene la sesión
    □ Carrito se restora desde localStorage
    □ No necesitas volver a loguear

✓ PASO 8.3: Console sin errores
  HACER:
    1. F12 → Console
    2. Realiza todas las acciones anteriores
  ESPERADO:
    □ No hay errores rojos
    □ Solo warnings o logs normales de React
    □ Puedes ver logs de: CartSidebarB2B, useCartB2B, etc.

✓ PASO 8.4: Performance
  HACER:
    1. DevTools → Network → Desactiva cache
    2. Carga página, mira tiempos
  ESPERADO:
    □ Página carga en < 3 segundos
    □ Sin componentes que se quedan en loading
    □ Búsqueda y filtros son rápidos (debounce)

✓ PASO 8.5: Admin Access (Admin Testing)
  HACER:
    1. Loguéate como ADMIN
    2. Serás redirigido a /admin/dashboard
    3. Navega manualmente a: /seller/adquisicion-lotes
  ESPERADO:
    □ Admin puede acceder sin problemas
    □ Ve el mismo catálogo que un seller
    □ Puede añadir al carrito
    □ Puede hacer checkout
    □ Útil para testear flujo sin crear cuenta seller


═══════════════════════════════════════════════════════════════════════════════
CASOS ESPECIALES / EDGE CASES
═══════════════════════════════════════════════════════════════════════════════

1. CANTIDAD DECIMAL
   HACER: Intenta poner 10.5 unidades
   ESPERADO: Sistema acepta solo números enteros

2. CANTIDAD NEGATIVA
   HACER: Intenta poner -50
   ESPERADO: Sistema no acepta números negativos

3. BÚSQUEDA CON ESPACIOS
   HACER: Busca "TSH  IRT" (con espacios extra)
   ESPERADO: Debería ignorar espacios extras o no encontrar nada

4. MÚLTIPLES SESIONES
   HACER: Abre 2 pestañas, loguéate en ambas
   ESPERADO: localStorage comparte carrito entre pestañas

5. CARRITO MÁS DE 1000 UNIDADES
   HACER: Añade múltiples items grandes
   ESPERADO: Sistema maneja números grandes sin problema

6. PRODUCTO SIN IMAGEN
   HACER: (Esperar que haya producto sin imagen_principal)
   ESPERADO: Muestra placeholder o imagen por defecto


═══════════════════════════════════════════════════════════════════════════════
CHECKLIST FINAL
═══════════════════════════════════════════════════════════════════════════════

□ Todas las validaciones MOQ funcionan
□ Todas las validaciones Stock funcionan
□ Carrito persiste en localStorage
□ Checkout procesa correctamente
□ Pantalla de éxito muestra confirmación
□ Cart se limpia post-checkout
□ Redirección automática al login funciona
□ ProtectedRoute protege las páginas
□ Responsive design en 3+ resoluciones
□ Sin errores en console
□ Sin warnings innecesarios
□ Todas las transiciones son smooth
□ Todos los botones tienen estados hover/disabled
□ Mensajes de error son claros

PROBLEMAS ENCONTRADOS:
======================

(Documenta aquí cualquier issue que encuentres durante testing)

_________________________________________________________________
_________________________________________________________________
_________________________________________________________________


═══════════════════════════════════════════════════════════════════════════════
COMANDOS ÚTILES PARA TESTING
═══════════════════════════════════════════════════════════════════════════════

# Ver contenido del carrito en localStorage
JSON.parse(localStorage.getItem('siver_b2b_cart'))

# Limpiar carrito manualmente
localStorage.removeItem('siver_b2b_cart')

# Limpiar todo localStorage
localStorage.clear()

# Ver logs del useCartB2B
// Buscar en console logs con keyword "CartB2B"

# Verificar usuario actual
// useAuth() te muestra el user

# Disparar validación manual
// En console: window.useCartB2B.validateItem(product)


═══════════════════════════════════════════════════════════════════════════════

Último actualizado: Diciembre 11, 2024
Versión: 1.0

EOF

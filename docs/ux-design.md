# Diseño UX — Análisis de User Journeys e Interfaz

**Versión:** 1.0  
**Fecha:** Mayo 2026  
**Basado en:** especificacion-funcional.md v1.1

---

## Principios de Diseño

Antes de cualquier pantalla, estos principios guían cada decisión de UX:

1. **La autora no es contadora.** La app habla en lenguaje de escritora, no de ERP.
2. **Lo frecuente debe ser instantáneo.** Registrar una venta en una feria no puede tomar más de 30 segundos.
3. **La complejidad se esconde hasta que se necesita.** Un libro nuevo no obliga a configurar tiradas ni canales para poder empezar.
4. **La app trabaja para la autora, no al revés.** El dashboard responde preguntas reales: *¿cuánto gané este mes? ¿me deben plata? ¿me queda stock?*
5. **Mobile-first en los formularios.** Aunque es una web app, los formularios de venta deben funcionar perfectamente desde el celular en una feria.

---

## Análisis de Fricción — Problemas en el Diseño Actual

Antes de proponer soluciones, estos son los puntos de fricción identificados al leer el documento funcional con ojos de usuaria:

| # | Problema | Impacto |
|---|---|---|
| 1 | La navegación tiene **8 secciones de primer nivel** — demasiadas para una app personal | Alto |
| 2 | Para registrar una venta hay que pasar por: Ventas → Registrar → elegir libro → elegir canal → llenar formulario. Muy profundo. | Alto |
| 3 | El concepto de "Tirada" es técnico y puede asustar a alguien que solo quiere registrar que imprimió 200 libros | Medio |
| 4 | No hay onboarding: una usuaria nueva entra y no sabe qué hacer primero | Alto |
| 5 | El inventario, las tiradas y los gastos están en módulos separados pero están conceptualmente unidos | Medio |
| 6 | En una feria del libro, la autora necesita registrar ventas desde el celular pero la app no fue pensada para eso | Alto |
| 7 | Los canjes y colaboraciones están enterrados en Inventario, cuando son una actividad de marketing | Bajo |
| 8 | El dashboard actual lista muchas métricas sin jerarquía clara — ¿qué es lo más importante? | Medio |

---

## User Journeys Principales

### Journey 1 — Primera vez que usa la app

**Contexto:** La autora acaba de recibir el acceso. Tiene un libro publicado, vende en Amazon y en una librería local, y próximamente tiene una feria.

**Sin onboarding (problema actual):**
> Entra a un dashboard vacío. No sabe qué hacer. Cierra la app.

**Con onboarding guiado (propuesta):**

```
Pantalla de bienvenida
        ↓
"¿Cuál es tu primer libro?" → Formulario simplificado (solo título + portada)
        ↓
"¿Dónde vendes tu libro?" → Selección visual de canales (Amazon / Librería / Yo misma / Otro)
        ↓
"¿Tienes ejemplares impresos?" → Sí / No → Si sí: cuántos y cuánto costaron
        ↓
Dashboard ya poblado con el libro y canales configurados
        ↓
Tooltip: "Ya puedes registrar tu primera venta →"
```

**Reglas del onboarding:**
- Máximo 4 pasos
- Todo campo es opcional excepto el título del libro
- Se puede saltar en cualquier momento con "Configurar después"
- Cuando vuelva, el dashboard le recuerda lo que falta configurar

---

### Journey 2 — Registro de venta en una feria del libro

**Contexto:** Son las 3pm en la Feria del Libro. La autora acaba de vender 3 libros y un tote bag. Tiene el celular en la mano.

**Flujo objetivo: menos de 30 segundos**

```
Botón flotante "+" visible siempre en el dashboard
        ↓
Modal rápido: "¿Qué vendiste?"
  [📚 Libro]  [🛍️ Merch]  [📚+🛍️ Los dos]
        ↓
Selección rápida del libro (foto + título, tap)
        ↓
Cantidad: [−] [3] [+]   Precio: $8.000 (pre-llenado con precio habitual)
        ↓
Canal: [tap en "Feria del Libro Santiago 2026"] (los eventos recientes aparecen primero)
        ↓
Método de pago: [💵 Efectivo] [📱 Transferencia] [💳 Tarjeta]
        ↓
✅ "Venta registrada — $24.000"
```

**Principios de este flujo:**
- Nunca más de 3 niveles de profundidad
- Los valores más comunes están pre-seleccionados
- El teclado numérico aparece automáticamente para cantidad y precio
- Confirmación visual clara antes de guardar
- "Venta rápida" no requiere ingresar notas ni detalles opcionales — se pueden agregar después

---

### Journey 3 — Rutina mensual (primer lunes del mes)

**Contexto:** La autora se sienta con el computador a hacer el cierre del mes anterior.

**Flujo ideal:**

```
Dashboard muestra banner: "Tienes tareas de cierre pendientes para abril"
        ↓
Lista de tareas del mes:
  ✅ Importar reporte Amazon KDP
  ⏳ Registrar cobro de Librería del Centro (vence en 3 días)
  ⏳ Revisar stock en Librería Metales Pesados (quedan 2 ejemplares)
  ✅ Meta de abril: 87% alcanzada
        ↓
[Importar KDP] → Drag & drop del CSV → Vista previa → Confirmar
        ↓
[Registrar cobro] → Pre-llenado con el monto estimado → Confirmar monto real → Guardar
        ↓
[Revisar stock] → "¿Llevas más ejemplares? Registra un envío" → Formulario rápido
        ↓
Dashboard actualizado. Cierre de mes completo.
```

**Clave:** El sistema sabe qué falta hacer. No obliga a la autora a recordar sus propios procesos.

---

### Journey 4 — Registrar una nueva tirada de impresión

**Contexto:** La autora acaba de retirar 300 ejemplares de la imprenta. Pagó $360.000 en total.

**Flujo:**

```
Desde la ficha del libro → pestaña "Tiradas" → "Nueva tirada"
        ↓
Formulario en un solo paso:
  - ¿Cuántos ejemplares recibiste? [300]
  - ¿Cuánto pagaste en total? [$360.000]
  - Costo por unidad: $1.200 (calculado automáticamente)
  - Fecha: [hoy] (pre-llenado)
  - Imprenta: [campo de texto libre]
  ↓ "Guardar tirada"
        ↓
El sistema pregunta: "¿Quieres registrar gastos adicionales de esta tirada?"
(flete, diseño actualizado, etc.) → Sí / No, gracias
        ↓
Dashboard de inventario se actualiza: +300 en stock
```

**Regla:** Los campos avanzados (proveedor, notas, gastos adicionales) son opcionales y van después del formulario principal — no bloquean el flujo.

---

### Journey 5 — Enviar libros a una librería

**Contexto:** La autora va a dejar 20 ejemplares en consignación en una librería nueva.

```
Inventario → "Distribuir ejemplares"
        ↓
¿A quién? → [Librería nueva] → Si no existe: "Agregar librería" (formulario rápido con solo nombre y ciudad)
        ↓
¿Qué libro? [Selección] ¿Cuántos? [20]
        ↓
¿Ya tienes un acuerdo de consignación con ellos?
  → Sí, ya lo tengo registrado
  → Sí, quiero registrarlo ahora (formulario de acuerdo — % y periodicidad de pago)
  → Lo registro después
        ↓
✅ "20 ejemplares enviados a [Librería]. Stock en mano: 280"
```

---

### Journey 6 — Ver cuánto gané y cuánto me deben

**Contexto:** La autora quiere saber su situación financiera rápida antes de una reunión con su contador.

```
Dashboard → tarjeta "Cobros pendientes" → click
        ↓
Vista "¿Qué me deben?"
  Lista ordenada por fecha de vencimiento:
  🔴 Amazon KDP — $45.200 — Vence hoy
  🟡 Librería del Centro — $18.000 — Vence en 8 días
  🟢 Buscalibre — $12.500 — Vence en 22 días
        ↓
Click en cualquier fila → detalle del período que cubre
        ↓
"Exportar para contador" → PDF de cobros pendientes
```

---

### Journey 7 — Registrar un canje con influencer

**Contexto:** Una bookstagrammer le pidió un libro para reseñar.

```
Canjes → "Nuevo canje"
        ↓
Formulario conversacional:
  "¿A quién le enviaste el libro?"  → [Nombre / cuenta]
  "¿Cuántos ejemplares?"           → [1]
  "¿Qué acordaron?"                → [Reseña en Instagram antes del 30 de junio]
  "¿Cuándo lo enviaste?"           → [fecha]
        ↓
✅ Guardado. Recordatorio automático creado para el 30 de junio.
```

---

## Propuesta de Navegación Simplificada

El mapa de 8 secciones actual se consolida en **5 secciones principales**:

```
┌─────────────────────────────────────────────────────┐
│  🏠 Inicio   📚 Mis Libros   💰 Finanzas   📊 Reportes   ⚙️ Config  │
└─────────────────────────────────────────────────────┘
```

| Sección actual (8) | Sección nueva (5) |
|---|---|
| Dashboard | 🏠 Inicio |
| Libros | 📚 Mis Libros |
| Tiradas de Impresión | 📚 Mis Libros → ficha del libro |
| Canales | 📚 Mis Libros + ⚙️ Config |
| Merchandising | 📚 Mis Libros (tab "Merch") |
| Ventas | 🏠 Inicio (botón "+") + 📚 Mis Libros |
| Inventario | 📚 Mis Libros → ficha del libro |
| Reportes | 📊 Reportes |
| Proyecciones | 📊 Reportes |
| Configuración | ⚙️ Config |

**El botón de acción rápida "+" es siempre visible** — registrar una venta nunca requiere navegar a una sección específica.

---

## Estructura de Pantallas Detallada

### 🏠 Inicio (Dashboard)

```
┌────────────────────────────────────────────────────────────┐
│  Hola, [Nombre] 👋          Mayo 2026    [CLP ▾]           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Este mes     │  │ Este año     │  │ Pendiente    │     │
│  │ $124.500     │  │ $892.000     │  │ $63.200      │     │
│  │ ↑ 12% vs mes │  │              │  │ ⚠ cobrar    │     │
│  │ anterior     │  │              │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
│  Ventas últimos 12 meses ──────────────────────────────    │
│  [gráfico de barras simple, por canal, con colores]        │
│                                                            │
│  ┌─── Pendiente hacer ───────────────────────────────┐     │
│  │ 📥 Importar reporte KDP de abril                  │     │
│  │ 💰 Librería del Centro te debe $18.000 (8 días)   │     │
│  │ 📦 Stock bajo en Librería Metales Pesados (2 ej.) │     │
│  └───────────────────────────────────────────────────┘     │
│                                                            │
│  Por canal este mes ────────────────────────────────────   │
│  Amazon KDP        ████████████ $68.000   55%             │
│  Ventas directas   ██████ $34.000         27%             │
│  Librerías         ████ $22.500           18%             │
│                                                            │
└────────────────────────────────────────────────────────────┘
                                            ╔═══╗
                                            ║ + ║  ← siempre visible
                                            ╚═══╝
```

**Jerarquía visual:**
- Los números grandes primero — ingreso del mes es la métrica #1
- Las tareas pendientes son el segundo bloque — la app dice qué hacer
- El gráfico y los canales son contexto, no el foco principal

---

### 📚 Mis Libros

```
┌────────────────────────────────────────────────────────────┐
│  Mis Libros                              [+ Agregar libro] │
├────────────────────────────────────────────────────────────┤
│  [Libros]  [Merchandising]                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │ [portada]  El jardín de las palabras             │      │
│  │            Ebook · Impreso                       │      │
│  │            487 vendidos · $1.240.000 total       │      │
│  │            Stock: 180 en mano · 45 en librerías  │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
│  ┌──────────────────────────────────────────────────┐      │
│  │ [portada]  Las voces del sur                     │      │
│  │            Ebook · Impreso · Audiolibro           │      │
│  │            212 vendidos · $486.000 total          │      │
│  │            Stock: 95 en mano · 20 en librerías   │      │
│  └──────────────────────────────────────────────────┘      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Ficha del libro — pestañas:**
```
[Resumen]  [Ventas]  [Inventario]  [Tiradas]  [Canales]
```

La pestaña **Resumen** es la pantalla principal — muestra todo lo importante sin necesitar navegar a las otras tabs.

---

### Modal "+" — Registro rápido de venta

Este modal aparece desde cualquier pantalla al presionar el botón "+".

```
┌─────────────────────────────────────────┐
│  Registrar venta               [✕]      │
├─────────────────────────────────────────┤
│                                         │
│  ¿Qué vendiste?                         │
│  ┌──────────┐  ┌──────────┐            │
│  │    📚    │  │    🛍️    │            │
│  │  Libro   │  │   Merch  │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  Libro                                  │
│  ┌─────────────────────────────────┐    │
│  │ [portada] El jardín de las...   │    │
│  └─────────────────────────────────┘    │
│  (tap para cambiar)                     │
│                                         │
│  Cantidad            Precio unitario    │
│  ┌─────────────┐     ┌──────────────┐   │
│  │  [−] 1 [+] │     │   $ 8.000    │   │
│  └─────────────┘     └──────────────┘   │
│                                         │
│  Canal                                  │
│  ● Feria del Libro Santiago 2026        │
│  ○ Instagram                            │
│  ○ Otro evento...                       │
│                                         │
│  Pago  [💵 Efectivo] [📱 Transfer] [💳] │
│                                         │
│  Total: $8.000                          │
│                                         │
│  [        Registrar venta        ]      │
│                                         │
└─────────────────────────────────────────┘
```

**Reglas de este modal:**
- El libro más vendido aparece pre-seleccionado
- El precio se pre-llena con el precio habitual de ese libro en ese canal
- Los canales se ordenan por frecuencia de uso (los más usados arriba)
- El total se actualiza en tiempo real al cambiar cantidad o precio
- Botón de "Registrar" siempre visible, nunca hay que hacer scroll para llegar a él

---

### 💰 Finanzas

Renombrado de "Reportes de ingresos" a un lenguaje más directo:

```
┌────────────────────────────────────────────────────────────┐
│  Finanzas                                                  │
├────────────────────────────────────────────────────────────┤
│  [Ingresos]  [Gastos]  [¿Qué me deben?]  [Rentabilidad]   │
├────────────────────────────────────────────────────────────┤
```

Los tabs usan lenguaje cotidiano, no terminología contable.

**Tab "¿Qué me deben?"** (antes "Cobros pendientes"):
- Lista ordenada por urgencia con semáforo de colores
- Rojo: vencido | Amarillo: vence esta semana | Verde: vence después
- Un click en cada fila para marcar como cobrado

**Tab "Rentabilidad"** (antes mezclado en Reportes):
- Vista por libro: ingresé X, gasté Y, gané Z
- Vista por tirada: cuánto costó esta impresión y cuánto generó
- Punto de equilibrio visual: "Te faltan 28 ejemplares para recuperar la 2ª tirada"

---

## Patrones de Interacción Clave

### Formularios progresivos
Los formularios complejos (registrar librería, nueva tirada) se dividen en pasos:
- **Paso 1:** Lo mínimo necesario para crear el registro
- **Paso 2 (opcional):** Detalles adicionales
- **Siempre:** Un "Guardar y completar después" visible

### Estados vacíos con acción clara
Cuando no hay datos, la pantalla vacía no dice solo "No hay ventas" sino:

```
┌────────────────────────────────────┐
│                                    │
│         📚                         │
│  Aún no tienes ventas              │
│  registradas este mes              │
│                                    │
│  ¿Vendiste algo hoy?               │
│  [  Registrar primera venta  ]     │
│                                    │
└────────────────────────────────────┘
```

### Confirmaciones con resumen
Antes de guardar cualquier registro importante, se muestra un resumen:
```
¿Confirmar?
  Libro: El jardín de las palabras
  Canal: Feria del Libro Santiago 2026
  3 ejemplares × $8.000 = $24.000
  [Confirmar]  [Editar]
```

### Edición inline
Las métricas simples (precio de un canal, stock de una librería) se pueden editar
haciendo click directo en el valor, sin necesitar ir a un formulario separado.

### Feedback inmediato
Toda acción de registro muestra una confirmación breve tipo toast:
```
✅ Venta registrada — $24.000 sumados a mayo
```

---

## Lenguaje de la Interfaz

La app habla como una asistente amigable, no como un sistema ERP.

| ❌ Evitar | ✅ Usar en su lugar |
|---|---|
| "Registrar movimiento de inventario" | "Llevar libros a una librería" |
| "Configurar canal de distribución" | "¿Dónde vendes este libro?" |
| "Gestionar tirada de impresión" | "Registrar nueva impresión" |
| "Cobros pendientes de cobro" | "¿Qué te deben?" |
| "Movimiento tipo CANJE" | "Enviar a influencer / colaboración" |
| "Punto de equilibrio" | "Te faltan X libros para recuperar lo invertido" |
| "Período de consignación vencido" | "El acuerdo con [Librería] venció — ¿qué hacemos?" |
| "Sin datos para el período seleccionado" | "Aún no hay ventas en este período" |

---

## Responsive — Prioridad Mobile

Aunque es una web app, los formularios de venta deben funcionar perfectamente desde el celular para el caso de uso de ferias.

**Reglas para formularios en mobile:**
- Un campo por línea, nunca dos columnas en mobile
- Botones de acción con altura mínima de 48px (área táctil cómoda)
- El teclado numérico aparece automáticamente en campos de cantidad/precio
- El botón "+" flotante es más grande en mobile (56px mínimo)
- Los selectors (libro, canal) usan bottom sheets en lugar de dropdowns

**Pantallas que deben funcionar perfectamente en mobile:**
1. Dashboard (solo lectura)
2. Modal de registro rápido de venta
3. Registro de canje

**Pantallas que pueden ser desktop-only en MVP:**
1. Configuración de canales y librerías
2. Importación de CSV de KDP
3. Reportes detallados y exportación

---

## Paleta Visual Sugerida

Una autora independiente no necesita un diseño corporativo frío. El tono visual debe ser:
- **Cálido pero profesional** — no un diseño genérico de SaaS azul
- **Claro y legible** — los números financieros deben ser fáciles de escanear
- **Con personalidad** — que se sienta hecho para una escritora, no para un contador

**Dirección de diseño:** Editorial moderna — tipografía con carácter, blancos amplios, un acento de color fuerte, ilustraciones simples de línea para los estados vacíos.

| Elemento | Propuesta |
|---|---|
| Color primario | Tinta oscura (casi negro) — `oklch(15% 0 0)` |
| Acento | Terracota o verde salvia — color cálido, no el azul genérico de SaaS |
| Fondo | Blanco marfil — `oklch(97% 0.01 80)` — no blanco puro |
| Tipografía headings | Serif con personalidad (ej. Playfair Display, Lora, o similar) |
| Tipografía cuerpo | Sans-serif legible (ej. Inter, DM Sans) |
| Gráficos | Colores de la paleta, nunca colores random de librería de charts |
| Íconos | Línea fina, coherentes — Lucide o Phosphor |

---

## Cambios Funcionales Sugeridos (impacto en especificación)

Estos cambios en el documento funcional surgen del análisis UX:

| Cambio | Justificación |
|---|---|
| Agregar **flujo de onboarding guiado** (4 pasos) | Sin él, la primera sesión es confusa |
| Agregar **"tareas pendientes"** en el dashboard | El sistema debe guiar la rutina mensual |
| Renombrar "Cobros pendientes" → **"¿Qué me deben?"** | Más directo y emocional |
| Agregar **botón de acción rápida "+"** accesible desde cualquier pantalla | Registrar ventas en ferias es el caso de uso más frecuente |
| Mover **Canjes** de Inventario a una sección propia dentro de Marketing/Canales | Conceptualmente es marketing, no logística |
| Simplificar navegación de **8 secciones a 5** | Reducir carga cognitiva |
| **Formularios en 2 pasos** para registros complejos | No abrumar con campos opcionales |
| Agregar **estados vacíos con CTA** en todas las pantallas | La app debe guiar, no dejar en blanco |
| **Edición inline** para valores simples (precios, stocks) | Evitar formularios para cambios mínimos |

---

*Documento de diseño UX v1.0 — para revisión antes de comenzar implementación.*

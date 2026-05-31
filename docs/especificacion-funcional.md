# Especificación Funcional — Seguimiento de Ventas de Libros

**Versión:** 1.5  
**Fecha:** Mayo 2026  
**Estado:** Borrador para revisión  

---

## Historial de Cambios

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0 | Mayo 2026 | Versión inicial |
| 1.1 | Mayo 2026 | Módulo de Merchandising; Tiradas de impresión como entidad propia; Canje/colaboración con influencers; Ads en redes sociales; Gastos asociables a tiradas |
| 1.2 | Mayo 2026 | Incorporación de análisis UX: onboarding guiado; botón de venta rápida; tareas pendientes en dashboard; navegación simplificada a 5 secciones; Canjes movidos a sección propia; renombrado "¿Qué me deben?"; formularios en 2 pasos; lenguaje conversacional; estados vacíos con acción |
| 1.3 | Mayo 2026 | Corrección conceptual: breakeven de tiradas expresado en dinero (channel-agnostic) con desglose secundario en unidades por canal |
| 1.4 | Mayo 2026 | Mecanismo de prevención de ventas duplicadas: hash de archivo, períodos bloqueados por canal, detección de coincidencias individuales, advertencias en ingreso manual |
| 1.5 | Mayo 2026 | Soporte para preventa, bundles y ediciones especiales: estado de venta (Confirmada/Pendiente de entrega/Entregada/Cancelada), tipo Bundle en Merchandising, canal de tipo Preventa, movimiento de Ensamblaje de bundle |

---

## Principios de Diseño

Estos principios guían cada decisión de la interfaz y deben respetarse durante el desarrollo:

1. **La autora no es contadora.** La app habla en lenguaje de escritora, no de sistema contable.
2. **Lo frecuente debe ser instantáneo.** Registrar una venta en una feria no puede tomar más de 30 segundos.
3. **La complejidad se esconde hasta que se necesita.** Agregar un libro no obliga a configurar tiradas ni canales para poder empezar.
4. **La app trabaja para la autora, no al revés.** El sistema recuerda qué tareas están pendientes — ella no tiene que recordarlas.
5. **Los formularios son progresivos.** Primero lo mínimo necesario, los detalles opcionales vienen después.

---

## Resumen del Producto

Aplicación web para que autoras independientes gestionen y analicen las ventas de sus libros y merchandising a través de múltiples canales de distribución: plataformas digitales, librerías físicas y ventas directas.

El objetivo principal es tener **una sola vista** de todos los ingresos y gastos, sin importar de dónde vienen, y contar con proyecciones que ayuden a planificar el trabajo creativo y comercial.

---

## Usuarios del Sistema

| Rol | Descripción | Permisos |
|---|---|---|
| **Propietaria** | La autora, dueña de la cuenta | Todo: configurar, ingresar, ver, exportar |
| **Editor** | Asistente o colaborador | Ingresar ventas, ver reportes |
| **Visor** | Contador, gestor, familiar | Solo ver reportes y exportar |

La propietaria puede invitar a otros usuarios por correo electrónico y asignarles un rol.

---

## Navegación Principal

La app tiene **5 secciones principales** en la barra de navegación. Todo lo demás vive dentro de estas secciones o en acciones rápidas.

```
🏠 Inicio   |   📚 Mis Libros   |   💰 Finanzas   |   📊 Reportes   |   ⚙️ Configuración
```

El **botón "+" flotante** es visible en todas las pantallas y abre el modal de venta rápida sin necesidad de navegar a ninguna sección específica.

| Sección | Contenido |
|---|---|
| 🏠 **Inicio** | Dashboard, tareas pendientes, alertas, resumen de ingresos |
| 📚 **Mis Libros** | Catálogo de libros, tiradas, inventario, merch, canjes |
| 💰 **Finanzas** | Ingresos, gastos, ¿qué me deben?, rentabilidad |
| 📊 **Reportes** | Todos los reportes, proyecciones y metas |
| ⚙️ **Configuración** | Canales, usuarios, moneda, preferencias |

---

## Módulos de la Aplicación

---

### 1. Onboarding — Primera Vez

Cuando una usuaria ingresa por primera vez, la app la guía en 4 pasos para dejar todo listo antes de mostrar el dashboard.

**Flujo de onboarding:**

```
Paso 1 — Tu primer libro
  ¿Cómo se llama tu libro?  [campo de texto]
  ¿Tienes una imagen de portada?  [subir imagen — opcional]
  → "Siguiente"

Paso 2 — ¿Dónde vendes?
  Selección visual de canales (tap para activar, se pueden elegir varios):
  [ Amazon KDP ]  [ Buscalibre ]  [ Librerías ]  [ Yo misma / Ferias ]  [ Otro ]
  → "Siguiente"

Paso 3 — ¿Tienes ejemplares impresos?
  ¿Mandaste a imprimir copias físicas?  [ Sí / No ]
  Si Sí:
    ¿Cuántos ejemplares tienes?  [número]
    ¿Cuánto costó la impresión?  [monto — opcional]
  → "Siguiente"

Paso 4 — ¡Listo!
  Resumen de lo configurado
  "Ya puedes registrar tu primera venta →"
  [ Ir al dashboard ]
```

**Reglas del onboarding:**
- Se puede saltar cualquier paso con "Completar después"
- Los pasos 2 y 3 son totalmente opcionales — solo el título del libro es obligatorio
- Al volver, el dashboard muestra un banner discreto con lo que falta configurar
- El onboarding no se repite una vez completado o saltado explícitamente

---

### 2. Inicio — Dashboard Principal

La pantalla de inicio muestra un resumen ejecutivo y las tareas pendientes del período.

**Jerarquía de contenido:**

#### 2.1 Tarjetas de resumen *(primer bloque, más prominente)*

| Tarjeta | Contenido |
|---|---|
| Este mes | Ingresos totales del mes actual + comparación con el mes anterior (↑↓%) |
| Este año | Ingresos acumulados del año |
| ¿Qué me deben? | Total de ingresos ganados pero no cobrados aún — clickeable para ver detalle |
| Unidades vendidas | Total de unidades del mes (libros + merch) |

#### 2.2 Tareas pendientes *(segundo bloque)*

El sistema detecta automáticamente qué acciones están pendientes y las lista en orden de urgencia. La autora no tiene que recordar su propia rutina.

**Ejemplos de tareas generadas automáticamente:**

| Tarea | Cuándo aparece |
|---|---|
| 📥 Importar reporte KDP de [mes] | Primer lunes de cada mes si no se importó aún |
| 💰 [Librería] te debe $X (vence en N días) | Cuando un cobro se acerca a su fecha límite |
| 📦 Stock bajo en [Librería] (quedan N ej.) | Cuando el stock en una librería cae bajo el umbral |
| 🤝 [Influencer] no publicó — fecha límite hoy | Cuando un canje vence sin resultado registrado |
| ⚠️ Consignación en [Librería] vence en 30 días | Próximo al vencimiento de un acuerdo |

Cada tarea tiene un botón de acción directa — no hay que navegar a otro módulo para resolverla.

#### 2.3 Gráfico de ventas *(tercer bloque)*

- Barras de los últimos 12 meses
- Colores diferenciados por tipo de canal (digital / librerías / directo)
- Selector de período: mes, trimestre, año, personalizado

#### 2.4 Rendimiento por canal *(cuarto bloque)*

Tabla simple: canal, unidades vendidas, ingresos del período, porcentaje del total.

**Controles globales del dashboard:**
- Selector de período (afecta gráfico y tabla de canales)
- Selector de moneda (CLP / USD / otra configurada)

---

### 3. Botón "+" — Registro de Venta Rápida

El botón "+" flotante es la acción más importante de la app. Está visible en **todas las pantallas** y abre un modal optimizado para registrar ventas en segundos, incluso desde el celular.

**Flujo del modal:**

```
¿Qué vendiste?
  [ 📚 Libro ]   [ 🛍️ Merch ]   [ 📚+🛍️ Ambos ]

↓ (si eligió Libro)

Libro: [ portada + título del más vendido — tap para cambiar ]

Cantidad          Precio unitario
  [−] [1] [+]      [ $8.000 ]

Canal:
  ● Feria del Libro Santiago 2026   ← los más recientes primero
  ○ Instagram
  ○ Otro...

Pago: [ 💵 Efectivo ]  [ 📱 Transferencia ]  [ 💳 Tarjeta ]

Total: $8.000

[ Registrar venta ]
```

**Reglas del modal de venta rápida:**
- El libro más vendido aparece pre-seleccionado
- El precio se pre-llena con el último precio usado para ese libro en ese canal
- Los canales se ordenan por frecuencia de uso reciente
- El total se calcula en tiempo real
- Campos opcionales (notas) no aparecen — se pueden agregar editando el registro después
- Al confirmar, aparece un toast: *"✅ Venta registrada — $24.000 sumados a mayo"*
- El modal funciona correctamente en pantallas de celular (campos grandes, teclado numérico automático)

---

### 4. Mis Libros

Sección unificada que agrupa libros, tiradas, inventario, merchandising y canjes.

#### 4.1 Lista de Libros

Vista en tarjetas: portada, título, formatos disponibles, total vendido, stock en mano.

Tab secundario: **[ Libros ]  [ Merchandising ]**

**Botón:** "+ Agregar libro"

#### 4.2 Ficha de un Libro

Pestañas dentro de la ficha:

```
[ Resumen ]  [ Ventas ]  [ Inventario ]  [ Tiradas ]  [ Canales ]
```

La pestaña **Resumen** muestra lo más importante sin necesitar ir a otras tabs:
- Métricas del mes y acumuladas
- Stock actual (en mano + en librerías)
- Última tirada activa con su punto de equilibrio
- Acceso rápido a registrar una venta de este libro

**Ficha de un libro — campos:**

| Campo | Obligatorio | Descripción |
|---|---|---|
| Título | ✅ | |
| Subtítulo | — | Opcional |
| ISBN | — | Puede tener uno por formato |
| Formato(s) | ✅ | Ebook / Impreso / Audiolibro |
| Idioma | — | |
| Fecha de publicación | — | |
| Portada | — | Imagen |
| Descripción | — | Sinopsis o notas internas |
| Serie | — | Si pertenece a una serie |

> **UX:** Al crear un libro, solo se piden título y formato. Los demás campos aparecen en una sección "Completar información" dentro de la ficha — no bloquean el flujo inicial.

**Series:**
- Los libros se pueden agrupar en una serie
- La vista de serie muestra el rendimiento acumulado de todos los títulos

---

### 5. Tiradas de Impresión

Las tiradas son una **entidad de primer nivel**. Cada vez que la autora manda a imprimir un lote de ejemplares, se registra como una tirada independiente con su propio costo y seguimiento de rentabilidad.

**¿Por qué tratarlas como entidad propia?**
- Cada tirada tiene un costo por unidad diferente
- Los gastos asociados varían (flete, correcciones, rediseño de portada)
- La rentabilidad se analiza tirada por tirada
- El inventario necesita saber de qué tirada provienen los ejemplares

#### 5.1 Registro de una Nueva Tirada — Formulario en 2 pasos

**Paso 1 — Lo esencial:**

| Campo | Descripción |
|---|---|
| Libro | A qué libro corresponde |
| Cantidad impresa | Total de ejemplares |
| Costo total de impresión | Monto pagado a la imprenta |
| Costo por unidad | Calculado automáticamente |
| Fecha de recepción | Pre-llenada con hoy |

**Paso 2 — Detalles opcionales** *(aparece al guardar el paso 1, o se puede saltar)*

| Campo | Descripción |
|---|---|
| Imprenta / Proveedor | Nombre |
| ¿Gastos adicionales? | Flete, correcciones, rediseño — se pueden agregar uno a uno |
| Notas | Cambios de esta edición, observaciones |

#### 5.2 Vista de una Tirada

La ficha de cada tirada muestra en tiempo real:

| Métrica | Descripción |
|---|---|
| Ejemplares impresos | Total de esta tirada |
| Vendidos | Canales físicos |
| En librerías | Distribuidos, aún no vendidos |
| Canjeados | Enviados a influencers/colaboraciones |
| En mano | Disponibles con la autora |
| Costo total | Impresión + gastos adicionales |
| Ingresos generados | Ventas atribuibles a esta tirada (neto autora, en moneda base) |
| Por recuperar | Costo total − Ingresos generados — siempre expresado en dinero |
| Progreso | Barra visual: % de la inversión recuperado hasta hoy |

**Desglose de equivalencia por canal** *(sección expandible, opcional)*

Dado que cada canal tiene un margen diferente, el monto por recuperar se traduce a unidades de forma separada por canal, para ayudar a decidir dónde conviene vender el stock restante:

```
Inversión en esta tirada:   $360.000
Ingresos generados:         $214.500   ████████████░░░░  60%
Por recuperar:              $145.500

Para recuperar el resto, necesitarías vender:
  · 18 ejemplares en feria o venta directa     ($8.000 neto/ej.)
  · 26 ejemplares en Amazon KDP                ($5.600 neto/ej.)
  · 45 ejemplares en Librería del Centro       ($3.200 neto/ej.)
```

> Los márgenes por canal se calculan automáticamente con la configuración de cada canal (% regalía o % consignación definidos en Configuración). Si un canal no tiene ejemplares físicos disponibles (ej. ebook en Amazon), no aparece en este desglose.

#### 5.3 Comparativa entre Tiradas

La pestaña Tiradas de la ficha del libro muestra todas las impresiones comparadas:

| Tirada | Fecha | Cantidad | Costo/unidad | Ingresos | Por recuperar | Estado |
|---|---|---|---|---|---|---|
| 1ª tirada | Ene 2025 | 200 | $1.500 | $310.000 | — | ✅ Recuperada |
| 2ª tirada | Mar 2026 | 300 | $1.200 | $214.500 | $145.500 | ⏳ 60% recuperado |

---

### 6. Canales de Venta

Configuración de los canales a través de los cuales se venden los libros. Los canales se gestionan desde **⚙️ Configuración** para mantener la navegación principal limpia.

#### 6.1 Canales Digitales

Plataformas donde se distribuye el libro en formato digital o impresión bajo demanda.

**Ejemplos:** Amazon KDP, Buscalibre, Google Play Books, Kobo, Apple Books

**Configuración:**

| Campo | Descripción |
|---|---|
| Plataforma | Lista predefinida o "Otra" |
| Moneda de pago | La moneda en que paga esta plataforma |
| Porcentaje de regalía | % que recibe la autora |
| Desfase de pago | Días desde las ventas hasta el cobro |
| Notas | |

**Importación de reportes CSV:**
- Subir el archivo mensual descargado desde la plataforma
- Vista previa de ventas detectadas antes de confirmar
- El sistema aplica un mecanismo de tres niveles para prevenir duplicados (ver sección 6.1.1)

#### 6.1.1 Prevención de Ventas Duplicadas en Importación CSV

La duplicación puede ocurrir en cuatro escenarios distintos, cada uno con su propio mecanismo de detección:

| Escenario | Descripción | Mecanismo |
|---|---|---|
| **A** | Se importa el mismo archivo CSV dos veces | Hash del archivo |
| **B** | Se registró una venta manual en Amazon y luego se importa el CSV del mismo período | Período bloqueado por canal |
| **C** | El CSV cubre múltiples marketplaces y algunas ventas ya fueron ingresadas manualmente | Coincidencia de registros individuales |
| **D** | Se importó un CSV y después se agrega un registro manual en el mismo período | Advertencia en ingreso manual |

---

**Nivel 1 — Hash del archivo (escenario A)**

Cada archivo CSV importado queda registrado con su hash (huella digital del contenido del archivo). Antes de procesar cualquier importación nueva, el sistema compara el hash con los archivos ya procesados.

Si el archivo ya fue importado:
```
⛔ Este archivo ya fue importado
   "kdp-report-march-2026.csv" fue importado el 3 de abril de 2026.
   Importarlo nuevamente duplicaría las ventas de ese período.

   [ Ver importación anterior ]   [ Cancelar ]
```

La importación se bloquea completamente. No hay opción de forzar — si realmente necesita reemplazarse, primero se debe eliminar la importación anterior.

---

**Nivel 2 — Período bloqueado por canal (escenario B)**

Cada vez que se confirma una importación CSV de un canal, el sistema registra el **período cubierto** (canal + mes/año + libro). Ese período queda marcado como "importado desde CSV".

Si una importación nueva incluye un período ya cubierto:
```
⚠️  Período con datos existentes detectado

   El archivo cubre marzo 2026 para Amazon KDP.
   Ya tienes registros en ese período:

   Origen          Unidades   Ingresos
   ─────────────────────────────────────
   Manual (tuyo)       12     $67.200
   Este CSV            15     $84.000
   ─────────────────────────────────────
   Si confirmas ambos  27    $151.200  ← posible duplicado

   ¿Qué quieres hacer?
   ○ Reemplazar los registros manuales con el CSV  (recomendado)
   ○ Mantener solo los registros manuales y descartar el CSV
   ○ Importar el CSV de todas formas y revisar manualmente después
   [ Continuar ]   [ Cancelar ]
```

La decisión queda registrada en el historial de importaciones para auditoría.

---

**Nivel 3 — Coincidencia de registros individuales (escenario C)**

Durante el procesamiento del CSV, antes de mostrar la vista previa, el sistema compara cada fila del archivo con los registros existentes usando tres campos clave:

- Canal + Libro + Fecha *(coincidencia exacta)*
- Canal + Libro + Semana *(coincidencia aproximada — misma semana)*

Las filas del CSV se clasifican en tres categorías y se muestran en la vista previa con colores:

```
Vista previa — Amazon KDP, marzo 2026
─────────────────────────────────────────────────────────────────
Estado       Fecha       Libro                Unidades  Ingresos
─────────────────────────────────────────────────────────────────
✅ Nueva     15 mar      El jardín...              8    $44.800
✅ Nueva     22 mar      El jardín...              4    $22.400
⚠️ Posible   10 mar      Las voces del sur         3    $16.800  ← registro manual del 10 mar existe
⚠️ Posible   10 mar      Las voces del sur         3    $16.800  ← mismo libro, misma semana
─────────────────────────────────────────────────────────────────
Resumen: 2 nuevas ✅ · 2 con posible duplicado ⚠️

[ Ver detalle de posibles duplicados ]   [ Importar solo nuevas ]   [ Importar todas ]   [ Cancelar ]
```

Al hacer click en "Ver detalle de posibles duplicados", se muestra una comparación lado a lado:

```
⚠️  Posible duplicado — Las voces del sur, 10 marzo 2026

  Registro existente (manual)     Este CSV
  ──────────────────────────────────────────────────
  Origen:    Manual               Amazon KDP CSV
  Fecha:     10 mar 2026          10 mar 2026
  Unidades:  3                    3
  Ingresos:  $16.800              $16.800
  ──────────────────────────────────────────────────
  Diferencia: ninguna — probablemente el mismo registro

  ¿Qué hacer con esta fila?
  ○ Ignorar — ya está registrada manualmente  (recomendado)
  ○ Importar de todas formas
```

La acción elegida se aplica fila por fila o a todas las coincidencias a la vez.

---

**Nivel 4 — Advertencia en ingreso manual (escenario D)**

Cuando la autora intenta registrar una venta manual en un canal y período que ya tiene datos importados desde CSV, el formulario muestra una advertencia antes de guardar:

```
⚠️  Ya tienes datos importados para este período

   Amazon KDP · marzo 2026 · El jardín de las palabras
   fue importado desde CSV el 3 de abril (15 unidades, $84.000).

   Agregar este registro manual podría duplicar ventas.

   ¿Estás segura de que esta venta no está incluida en el CSV?
   [ Sí, es una venta adicional — Guardar ]   [ Cancelar ]
```

Si confirma, el registro se guarda con una etiqueta interna `origen: manual_sobre_csv` que lo hace visible en el historial para revisión posterior.

---

**Historial de importaciones**

En la sección de cada canal digital (dentro de Configuración), hay un registro de todas las importaciones realizadas:

| Fecha importación | Archivo | Período cubierto | Registros | Duplicados ignorados | Acción |
|---|---|---|---|---|---|
| 3 abr 2026 | kdp-march-2026.csv | Mar 2026 | 12 importados | 3 ignorados | Ver detalle |
| 2 mar 2026 | kdp-feb-2026.csv | Feb 2026 | 8 importados | 0 ignorados | Ver detalle |

Desde aquí se puede **eliminar una importación completa** si fue un error, lo que elimina todos los registros asociados a ese archivo y libera el período para volver a importarlo.

---

**Reglas generales del sistema de deduplicación:**

1. El sistema **nunca elimina datos silenciosamente** — siempre muestra qué encontró y pide una decisión
2. En caso de duda, la opción por defecto es **conservadora**: no importar la fila sospechosa
3. Toda decisión tomada durante una importación queda registrada en el historial
4. Los registros marcados como `manual_sobre_csv` aparecen destacados en el historial de ventas para revisión

---

#### 6.2 Librerías Físicas

**Configuración — Paso 1 (obligatorio):**

| Campo | Descripción |
|---|---|
| Nombre de la librería | |
| Ciudad / País | |

**Configuración — Paso 2 (opcional, completar después):**

| Campo | Descripción |
|---|---|
| Persona de contacto | Nombre y teléfono/email |
| Tipo de acuerdo | Consignación o Compra directa |
| Porcentaje de la librería | Ej. 40% librería / 60% autora |
| Periodicidad de pago | Mensual, trimestral, etc. |
| Duración de consignación | Ej. 3 meses |
| Fecha de inicio | |

> **UX:** Se puede registrar una librería solo con nombre y ciudad para agilizar un envío urgente. Los términos del acuerdo se pueden completar después sin bloquear el flujo.

**Gestión de inventario en librería:**
- Registro de envíos: qué libro, qué tirada, cuántos ejemplares
- Registro periódico de ventas (el sistema calcula el ingreso según el % acordado)
- Registro de devoluciones
- Alertas de stock bajo y vencimiento de consignación

**Registro de cobro recibido:**
- Monto real recibido, fecha, período que cubre
- Diferencia visible entre "ganado" y "cobrado"

#### 6.3 Ventas Directas

Ventas sin intermediarios: ferias, redes sociales, colegios, sitio web.

- Los eventos y canales directos se crean como **etiquetas** (ej. "Feria del Libro Santiago 2026", "Instagram")
- Las etiquetas recientes aparecen primero en el modal de venta rápida
- Una etiqueta puede reutilizarse en múltiples ventas del mismo evento

**Tipo especial: Preventa**

Una etiqueta de venta directa puede marcarse como **Preventa**. Esto activa comportamiento adicional:

| Campo adicional | Descripción |
|---|---|
| Fecha de cierre de preventa | Hasta cuándo se aceptan pedidos |
| Fecha estimada de entrega | Cuándo se entregarán los productos |

Cuando el canal es de tipo Preventa, todas las ventas registradas en él se crean automáticamente con estado `Pendiente de entrega`. El dinero se registra como recibido, pero los ingresos aparecen separados en el dashboard como *"preventa pendiente de cumplir"* hasta que se marcan como `Entregada`.

**Flujo de cierre de una preventa:**

Al llegar la fecha de entrega, el dashboard muestra una tarea:
```
📦 Preventa Lanzamiento — 50 sets pendientes de entrega
   [ Marcar todas como entregadas ]   [ Ver detalle ]
```

La autora puede marcar la entrega en bloque o individualmente si las entregas son escalonadas.

---

### 7. Inventario

#### 7.1 Inventario de Libros Físicos

Vista organizada por libro y tirada.

| Vista | Contenido |
|---|---|
| Por libro | Stock total en mano, en librerías, en canje |
| Por tirada | De los 300 de la 2ª tirada: 85 vendidos, 45 en librerías, 2 canjeados, 168 en mano |
| Por librería | Stock de todos los libros en cada librería |

**Tipos de movimiento:**

| Tipo | Descripción | Efecto |
|---|---|---|
| Nueva tirada | Se reciben ejemplares de imprenta | ↑ Stock en mano |
| Llevar a librería | Envío en consignación | ↓ En mano / ↑ En librería |
| Venta directa | Venta personal | ↓ En mano |
| Devolución de librería | Librería devuelve ejemplares | ↑ En mano / ↓ En librería |
| Enviar a influencer | Canje o colaboración | ↓ En mano / ↑ En canje |
| Ensamblaje de bundle | Se arman N sets usando componentes del inventario | ↓ componentes / ↑ stock del bundle |
| Baja | Dañado, perdido, uso personal | ↓ En mano |

> **UX:** Los tipos de movimiento usan lenguaje cotidiano. Nunca se muestra "registrar movimiento de inventario tipo OUTBOUND_CONSIGNMENT".

#### 7.2 Canjes y Colaboraciones

Los canjes tienen su propia subsección dentro de **Mis Libros**, separados del inventario general porque conceptualmente son una actividad de marketing, no de logística.

**Registro de un canje — formulario conversacional:**

```
¿A quién le enviaste el libro?    → [nombre / cuenta de Instagram / medio]
¿Cuántos ejemplares?              → [1]
¿Qué acordaron?                   → [Reseña en Instagram antes del 30 de junio]
¿Cuándo lo enviaste?              → [fecha]
```

Al guardar, el sistema crea automáticamente un recordatorio para la fecha límite acordada.

**Campos completos de un canje:**

| Campo | Obligatorio | Descripción |
|---|---|---|
| Destinatario | ✅ | Nombre o cuenta |
| Libro y tirada | ✅ | |
| Cantidad | ✅ | |
| Fecha de envío | ✅ | |
| Tipo de canje | — | Reseña / Entrevista / Intercambio / Otro |
| Resultado esperado | — | Descripción del acuerdo |
| Fecha límite | — | Genera recordatorio automático |
| Estado | auto | Pendiente / Cumplido / No cumplido |
| Link de evidencia | — | URL de la publicación o reseña |
| Notas | — | |

**Vista de canjes:**
- Lista con semáforo de estado: 🟡 Pendiente / ✅ Cumplido / 🔴 Vencido sin resultado
- Métrica: ejemplares enviados en canje vs. ventas en el período siguiente (indicador de impacto)

---

### 8. Finanzas

Sección renombrada con lenguaje directo. Sus tabs usan términos cotidianos:

```
[ Ingresos ]   [ Gastos ]   [ ¿Qué me deben? ]   [ Rentabilidad ]
```

#### 8.1 Ingresos

Vista consolidada de todos los ingresos con filtros de período y canal.

**Métricas:**
- Ingresos brutos por canal
- Ingresos netos (descontando comisiones de plataformas y librerías)
- Cobros recibidos
- Desglose: libros vs. merchandising

#### 8.2 Gastos

**Categorías:**

| Categoría | Descripción |
|---|---|
| Impresión de libros | Alimentado automáticamente desde el módulo de Tiradas |
| Diseño y arte | Portada, ilustraciones, identidad visual |
| Edición y corrección | Servicios editoriales |
| Producción de merchandising | Fabricación de productos de merch |
| Publicidad en redes sociales | Pauta en Meta, TikTok, Google, etc. |
| Ferias y eventos | Inscripción, stand, traslados, materiales |
| Marketing — otros | Folletería, bookmarks, materiales físicos |
| Envíos y logística | Fletes, correo, empaques |
| Plataformas y software | Suscripciones digitales |
| Otros | Gastos que no encajan en las categorías anteriores |

**Niveles de asociación de un gasto:**

1. **General** — no vinculado a ningún libro (ej. suscripción a software)
2. **Por libro** — vinculado a un título (ej. diseño original de portada)
3. **Por tirada** — vinculado a una impresión concreta (ej. flete de la 2ª tirada)

Esta granularidad permite calcular la rentabilidad real de cada tirada.

#### 8.3 ¿Qué me deben?

*(antes: "Cobros pendientes")*

Lista de ingresos ganados pero no cobrados todavía, ordenada por urgencia:

```
🔴 Amazon KDP — $45.200 — Vence hoy
🟡 Librería del Centro — $18.000 — Vence en 8 días
🟢 Buscalibre — $12.500 — Vence en 22 días
```

- Click en cualquier fila para marcar como cobrado (ingresando monto real y fecha)
- Botón "Exportar para contador" → PDF del estado de cobros

#### 8.4 Rentabilidad

Vista de resultado económico real, en lenguaje simple:

**Por libro:**
- Ingresos totales − Gastos asignados = **Ganancia neta**

**Por tirada:**
- Ingresos de ventas físicas (neto autora) − Costo de impresión − Gastos adicionales = **Resultado de la tirada**
- El resultado siempre se expresa en **dinero**, no en unidades, porque cada canal tiene un margen diferente
- Como métrica secundaria opcional: equivalencia en unidades desglosada por canal disponible (ver sección 5.2)
- Ejemplo: *"Invertiste $360.000. Llevas $214.500 recuperados (60%). Por recuperar: $145.500"*

**Por campaña de ads:**
- Gasto en pauta del período vs. ventas del mismo período (indicativo — no cruzado automáticamente en MVP)

---

### 9. Merchandising

Gestión de productos de la marca de la autora.

**Ejemplos:** remeras, tote bags, stickers, bookmarks, postales firmadas, sets de lanzamiento

#### 9.1 Catálogo de Productos

Los productos de merch tienen dos tipos:

| Tipo | Descripción |
|---|---|
| **Producto simple** | Un ítem individual (tote bag, taza, sticker) |
| **Bundle / Set** | Conjunto de múltiples ítems vendido como una unidad a un precio único (ej. set de lanzamiento) |

**Campos de un producto:**

| Campo | Obligatorio | Descripción |
|---|---|---|
| Nombre | ✅ | Ej. "Set de lanzamiento — Edición especial" |
| Tipo | ✅ | Simple / Bundle |
| Imagen | — | Foto del producto o set |
| Precio de venta sugerido | — | Precio del ítem o del set completo |
| Categoría | — | Ropa / Accesorios / Papelería / Coleccionables / Set / Otro |
| Asociado a | — | Libro o serie relacionado |
| Estado | auto | Activo / Descontinuado |
| SKU | — | Código interno opcional |
| Descripción | — | |

**Campos adicionales solo para Bundles:**

| Campo | Descripción |
|---|---|
| Componentes | Lista de los ítems que forman el set — es informativa, no genera vínculos automáticos en MVP |
| Edición | Texto libre: "Edición especial de lanzamiento", "Edición limitada Feria 2026", etc. |

> **UX:** Los componentes del bundle se listan como referencia para que la autora sepa qué armar. En MVP el descuento de inventario de cada componente es manual (vía movimiento de Ensamblaje). No se crean foreign keys entre el bundle y sus partes — eso sería sobre-ingeniería para la frecuencia de uso.

#### 9.2 Lotes de Producción

Cada vez que se fabrica o ensambla un lote de merch se registra su costo:

| Campo | Descripción |
|---|---|
| Producto | |
| Cantidad producida | |
| Costo total | |
| Costo por unidad | Calculado automáticamente |
| Fecha de recepción | |
| Proveedor | |

Los gastos adicionales (diseño, envío desde proveedor) se asocian al lote.

#### 9.3 Ensamblaje de Bundles

Cuando la autora arma un lote de sets (ej. 50 sets de lanzamiento con libro + tote bag + taza + folleto), registra un **movimiento de Ensamblaje**:

```
¿Qué set estás armando?   → Set de lanzamiento — Edición especial
¿Cuántos sets armaste?    → 50

Componentes a descontar:
  · 50 × El jardín de las palabras (del stock de libros)
  · 50 × Tote bag
  · 50 × Taza
  · 50 × Folleto conmemorativo  ← si está registrado como producto, si no se omite

[ Confirmar ensamblaje ]
```

Al confirmar:
- Se descuenta cada componente de su inventario respectivo
- Se suma 50 unidades al stock del bundle "Set de lanzamiento"
- Se registra el movimiento en el historial como `Ensamblaje de bundle`

> Si algún componente no tiene stock suficiente, el sistema advierte antes de confirmar.

#### 9.4 Inventario y Ventas de Merch

- Stock en mano por producto (incluyendo bundles ensamblados) con alerta de stock bajo configurable
- Las ventas de merch y bundles se registran desde el mismo botón "+" que las ventas de libros
- Una transacción puede incluir libros, merch simple y bundles simultáneamente

**Métricas:**
- Ingresos por producto / bundle
- Unidades vendidas
- Rentabilidad por lote (ingresos − costo de producción/ensamblaje)

---

### 10. Reportes

```
[ Ventas ]  [ Inventario ]  [ Finanzas ]  [ Proyecciones ]
```

| Reporte | Tab | Descripción |
|---|---|---|
| Ventas por período | Ventas | Agrupadas por canal o libro |
| Ingresos por canal | Ventas | Comparativa de rendimiento |
| Rendimiento por libro | Ventas | Ventas e ingresos por título |
| Inventario actual | Inventario | Stock en mano y librerías por tirada |
| Estado de consignaciones | Inventario | Acuerdos activos, stock, pagos pendientes |
| Canjes y colaboraciones | Inventario | Historial con estados y resultados |
| Gastos por categoría | Finanzas | Desglose del período |
| Rentabilidad por tirada | Finanzas | Costo vs. ingresos por impresión |
| Merchandising | Finanzas | Ventas, inventario y rentabilidad de merch |
| ¿Qué me deben? | Finanzas | Cobros pendientes por canal |
| Publicidad | Finanzas | Gasto en ads del período |
| Resumen anual | Finanzas | Para contabilidad o declaración de impuestos |
| Forecast | Proyecciones | Proyección a 1/3/6/12 meses |
| Metas | Proyecciones | Progreso hacia metas definidas |

Todos los reportes se exportan en **CSV** y **PDF**.

---

### 11. Proyecciones y Metas

#### 11.1 Proyección de Ingresos

Basada en el historial de los últimos meses:
- Proyección a 1, 3, 6 y 12 meses
- Desglosada por canal
- Escenario optimista / realista / conservador

#### 11.2 Simulador de Escenarios

Proyecciones manuales:
- *"¿Cuánto ganaré si vendo 100 libros en la próxima feria?"*
- *"¿Qué pasa si Amazon sube mis regalías al 70%?"*

#### 11.3 Metas

- Meta de ingresos o unidades por período (mes / trimestre / año)
- Progreso visible en el dashboard
- Notificación al llegar al 50%, 75% y 100%

---

### 12. Notificaciones y Alertas

| Alerta | Cuándo se activa | Dónde aparece |
|---|---|---|
| Cobro próximo a vencer | N días antes de la fecha límite | Dashboard + email opcional |
| Cobro vencido | Pasada la fecha de cobro | Dashboard + email |
| Consignación por vencer | 30 días antes del fin del acuerdo | Dashboard |
| Stock bajo en librería | Bajo el umbral configurado | Dashboard |
| Stock bajo en mano | Bajo el umbral configurado | Dashboard |
| Stock bajo de merch | Bajo el umbral de cada producto | Dashboard |
| Canje sin resultado | Al llegar la fecha límite sin evidencia | Dashboard + email |
| Preventa pendiente | Al llegar la fecha estimada de entrega | Dashboard |
| Meta alcanzada | Al 50%, 75% y 100% | Dashboard |
| Recordatorio KDP | Primer lunes del mes si no se importó | Dashboard |

---

### 13. Estados Vacíos

Cada pantalla sin datos muestra un estado vacío con una acción clara — nunca una pantalla en blanco.

**Ejemplos:**

| Pantalla | Mensaje | Acción |
|---|---|---|
| Dashboard sin ventas | *"Aún no hay ventas este mes"* | "Registrar venta" |
| Lista de libros vacía | *"Agrega tu primer libro para empezar"* | "Agregar libro" |
| Tiradas sin registros | *"¿Mandaste a imprimir? Registra tu primera tirada"* | "Nueva tirada" |
| Canjes vacíos | *"Aún no enviaste libros a colaboradores"* | "Registrar canje" |
| ¿Qué me deben? vacío | *"Nada pendiente de cobro — ¡al día!"* | — |

---

### 14. Configuración de la Cuenta

**Perfil:**
- Nombre artístico
- Foto de perfil
- Correo electrónico

**Preferencias:**
- Moneda base (default: CLP)
- Formato de fecha
- Alertas por correo (activar/desactivar por tipo)

**Canales:**
- Gestión de canales digitales, librerías y etiquetas de venta directa
- (Movido aquí desde la navegación principal para no saturar el menú)

**Usuarios y accesos:**
- Lista de usuarios con acceso
- Invitar por correo y asignar rol
- Revocar acceso

**Seguridad:**
- Cambiar contraseña
- Cerrar sesión en todos los dispositivos

---

## Mapa de Navegación

```
🏠 Inicio
   ├── Tarjetas resumen (este mes / este año / ¿qué me deben? / unidades)
   ├── Tareas pendientes
   ├── Gráfico de ventas (12 meses)
   └── Rendimiento por canal

   [+] Botón flotante → Modal de venta rápida (accesible desde cualquier pantalla)

📚 Mis Libros
   ├── [ Libros ] ─────────────────────────────────────────
   │    ├── Lista de libros
   │    └── Ficha de libro
   │         ├── Resumen
   │         ├── Ventas
   │         ├── Inventario
   │         ├── Tiradas
   │         └── Canales
   ├── [ Merchandising ] ──────────────────────────────────
   │    ├── Catálogo de productos
   │    └── Ficha de producto (lotes, inventario, ventas)
   └── [ Canjes ] ─────────────────────────────────────────
        ├── Lista de canjes
        └── Nuevo canje

💰 Finanzas
   ├── [ Ingresos ]
   ├── [ Gastos ]
   ├── [ ¿Qué me deben? ]
   └── [ Rentabilidad ]

📊 Reportes
   ├── [ Ventas ]
   ├── [ Inventario ]
   ├── [ Finanzas ]
   └── [ Proyecciones y Metas ]

⚙️ Configuración
   ├── Perfil
   ├── Canales (digitales / librerías / directos)
   ├── Usuarios
   └── Preferencias
```

---

## Modelo Conceptual de Datos *(referencia)*

```
Autora
 ├── Libros
 │    ├── Tiradas de Impresión
 │    │    └── Gastos de Tirada
 │    ├── Canales (digital / librería / directo / preventa)
 │    └── Ventas
 │         └── estado: CONFIRMADA | PENDIENTE_ENTREGA | ENTREGADA | CANCELADA
 └── Merchandising
      ├── Productos
      │    ├── tipo: SIMPLE | BUNDLE
      │    ├── componentes[]: lista informativa (solo bundles)
      │    └── edicion: texto libre (solo bundles)
      │    └── Lotes de Producción / Ensamblajes
      └── Ventas de Merch
           └── estado: CONFIRMADA | PENDIENTE_ENTREGA | ENTREGADA | CANCELADA

Canales de Venta Directa
 ├── etiqueta normal (feria, Instagram, etc.)
 └── tipo Preventa
      ├── fecha_cierre_preventa
      └── fecha_estimada_entrega

Inventario
 ├── Movimientos de Libros (por tirada)
 │    ├── Nueva tirada
 │    ├── Llevar a librería
 │    ├── Venta directa
 │    ├── Devolución de librería
 │    ├── Enviar a influencer (Canje)
 │    └── Baja
 └── Movimientos de Merch
      ├── Entrada de lote
      ├── Ensamblaje de bundle  ← descuenta componentes, suma stock del set
      ├── Venta
      └── Baja / regalo

Gastos
 ├── Gasto general
 ├── Gasto → Libro
 └── Gasto → Tirada específica

Canjes
 ├── Destinatario
 ├── Libro + Tirada
 ├── Resultado esperado + Fecha límite
 └── Estado + Evidencia

Cambios al modelo vs v1.4 (mínimos, sin nuevas entidades):
  Sale              + campo estado (enum)
  Sale              + fecha_entrega_estimada (nullable)
  Sale              + fecha_entrega_real (nullable)
  MerchandiseProduct + campo tipo (SIMPLE | BUNDLE)
  MerchandiseProduct + campo componentes (JSON[], solo bundles)
  MerchandiseProduct + campo edicion (string, nullable)
  DirectSalesChannel + campo es_preventa (boolean)
  DirectSalesChannel + fecha_cierre_preventa (nullable)
  DirectSalesChannel + fecha_estimada_entrega (nullable)
  InventoryMovement  + nuevo tipo ENSAMBLAJE_BUNDLE
```

---

## Lo que NO incluye el MVP

- Integración automática (API) con Amazon KDP — MVP importa por CSV
- App móvil — la API la soporta, pero la interfaz mobile es fase posterior
- Integración con sistemas contables externos (ej. SII Chile)
- Cruce automático de gasto en ads vs. ventas (requiere integración con Meta/Google)
- Marketplace de servicios editoriales
- CRM de lectores

---

## Preguntas para Revisar con la Autora

1. **¿Qué plataformas digitales usa actualmente?** (Amazon KDP, Buscalibre, ¿otras?)
2. **¿En cuántas librerías tiene libros actualmente?** ¿Chile o también otros países?
3. **¿Lleva algún registro de ventas hoy?** (Excel, cuaderno) — para planear la migración inicial
4. **¿Trabaja con asistente o contador?** — para definir roles desde el día 1
5. **¿Tiene más de un libro publicado o en camino?**
6. **¿Participa en ferias regularmente?**
7. **¿Ya tiene o planea tener merchandising?** ¿Qué tipo de productos?
8. **¿Ya realizó canjes con influencers?** ¿Lleva algún registro?
9. **¿Usa pauta en redes sociales?** (Meta Ads, TikTok, etc.)
10. **¿Cuántas tiradas ha tenido cada libro?** — para planear la carga de datos históricos

---

*Documento preparado para revisión. Versión 1.5 — incorpora preventa, bundles y ediciones especiales.*

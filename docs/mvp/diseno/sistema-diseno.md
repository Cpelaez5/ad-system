# Sistema de diseño — AD System

> Fuente de verdad del diseño visual del producto **AD System** (rol `cliente`, móvil primero).
> Usuaria objetivo: dueña de bodega de 65 años, solo usa WhatsApp, teléfono Android.
> Complementa `PLAN-MVP.md §2` ("prueba de la abuela") y `diseno/fase2-spec.md`. No reemplaza ninguno de los dos.

**No confundir marcas:** este documento es de **AD System** (el producto, logo con flecha de crecimiento dentro de la "D"). **AD Business Group** es la firma contable de Lic. Angélica Devis (logo sin flecha, ver `examples/identidad-visual.png`) y NO se usa en el sistema.

---

## 1. Principios (máximo 10)

1. **Una acción principal por pantalla**, con un botón grande y un verbo claro.
2. **Cero jerga en la primera capa.** El término técnico va entre paréntesis o detrás de un (?), nunca solo.
3. **La foto primero.** Registrar algo empieza por una foto, no por un formulario.
4. **El sistema calcula, la persona confirma.** Nunca se le pide a la usuaria que entienda de impuestos.
5. **Siempre decir qué pasó.** Todo error o éxito es un mensaje visible en lenguaje llano (`AvisoAmable`/`AppSnackbar`), nunca solo consola.
6. **Legible para ojos cansados.** Cuerpo ≥16px, botones táctiles ≥48px (≥56px la acción principal), contraste AA verificado.
7. **Móvil primero, siempre.** Se diseña para el teléfono y se adapta hacia arriba, no al revés.
8. **No reinventar Vuetify.** Cada componente nuevo es un envoltorio delgado que fija nuestro estándar (tamaño, color, variante, copy) sobre el componente de Vuetify equivalente — nunca un widget hecho a mano cuando Vuetify ya lo resuelve.
9. **El dorado de marca nunca es texto.** Solo fondo, ícono o borde — su contraste sobre blanco es ~2:1 (falla AA).
10. **El rojo de marca y el rojo de error son distintos a propósito.** Así una pantalla roja nunca se confunde con "algo salió mal".

---

## 2. Identidad visual AD System

### 2.1 El logo

El logo de AD System es un **imagotipo**: el isotipo "AD" con una flecha de crecimiento y barras dentro de la "D", seguido del wordmark "System" en una sans humanista redondeada. Fuente oficial: `public/ADSystem/Manual/manual.pdf` y `public/ADSystem/editable/LOGO.svg`.

Variaciones del manual: **Normal** (color), **Negro**, **Blanco**, **Metal**. Formatos: **Completo** (isotipo + "System") e **Icono** (solo el isotipo, sin texto).

**Uso correcto:**
- Mantener la proporción original (el ancho se ajusta solo al alto, nunca al revés).
- Respetar una zona de seguridad alrededor ≈ 1/4 del alto del logo (ya aplicada por `LogoAdSystem.vue`).
- Alto mínimo recomendado: 24px para el ícono solo, 32px para el logo completo.
- Variación **Negro**/**Blanco** del Completo solo sobre fondos sólidos de alto contraste (nunca sobre fotos o degradados sin una capa oscura/clara detrás).

**Uso incorrecto (del manual, no se negocia):**
- No alargar ni ensanchar el logo (nunca `object-fit: fill` ni estirar un solo eje).
- No agregarle objetos, sombras, contornos ni efectos que no estén en el manual.
- No recolorear el isotipo fuera de las variaciones oficiales (color/negro/blanco/metal).
- No usar el logo de **AD Business Group** (la firma contable) en ninguna pantalla del producto.

### 2.2 Componente `LogoAdSystem`

`src/components/ui/LogoAdSystem.vue` — props `variante` (`'completo'` | `'icono'`) y `tono` (`'color'` | `'negro'` | `'blanco'`), más `alto` (px, opcional). Resuelve internamente qué archivo oficial usar:

| variante | tono | archivo | tipo |
|---|---|---|---|
| completo | color | `/ADSystem/png/logo.png` | raster, imagotipo completo "Normal" |
| completo | negro | `/ADSystem/editable/LOGO.svg` | vector (ya es negro puro) |
| completo | blanco | `/ADSystem/editable/LOGO.svg` + `filter: invert(1)` | vector invertido (sin grises intermedios, no distorsiona) |
| icono | color | `/ADSystem/png/icono2.png` | raster cuadrado, isotipo "Normal" |
| icono | negro | `/ADSystem/png/svg_logo_000000_3000x3000.png` | raster cuadrado, isotipo negro |
| icono | blanco | `/ADSystem/png/svg_logo_FFFFFF_3000x3000.png` | raster cuadrado, isotipo blanco |

No usa `object-fit: fill` en ningún caso (siempre `height` fijo + `width: auto`), para no violar la regla de "no estirar/ensanchar".

### 2.3 Inventario de usos actuales del logo (no se tocó ninguna vista — solo referencia)

Todas las vistas de abajo **ya usan los archivos oficiales correctos** de `public/ADSystem/`; no hay ningún uso del logo de AD Business Group ni de un logo incorrecto. Son candidatos opcionales para migrar a `<LogoAdSystem>` en una tarea futura (no urgente, no es un bug):

| Archivo | Línea | Uso actual |
|---|---|---|
| `src/components/layout/Sidebar.vue` | 18 | `<img src="/ADSystem/png/icono.png">` |
| `src/services/retention-pdf-service.js` | 19-20 | `import systemLogo from '/ADSystem/logo.png'` + marca de agua `svg_logo_ADADAD_...png` |
| `src/services/receipt-pdf-service.js` | 13 | `import systemLogo from '/ADSystem/logo.png'` |
| `src/views/LandingPage.vue` | 5 | `<img src="/ADSystem/png/logo.png">` |
| `src/views/shared/TrialExpired.vue` | 5 | `<img src="/ADSystem/logo.png">` |
| `src/views/cliente/Checkout.vue` | 6 | `<img src="/ADSystem/logo.png">` (vista en lista prohibida — no tocar sin permiso del orquestador) |
| `src/views/auth/SetPassword.vue` | 7, 26 | `<img src="/ADSystem/png/logo.png">` (x2) |
| `src/views/shared/Login.vue` | 7, 26 | `<img src="/ADSystem/png/logo.png">` (x2) |
| `src/views/auth/Register.vue` | 7, 38 | `<img src="/ADSystem/png/logo.png">` (x2) |
| `src/views/cliente/Fiscal360.vue` | 787 | `import systemLogo from '/ADSystem/logo.png'` (vista en lista prohibida) |
| `src/views/auth/register/RegisterFirm.vue` | 5 | `<img src="/ADSystem/png/icono.png">` |
| `src/views/auth/register/RegisterAccountant.vue` | 5 | `<img src="/ADSystem/png/icono.png">` |

**Legado — NO usar, no se referencian desde ninguna vista:**
`public/icon-adaptableV2.svg`, `public/icon-dark.svg`, `public/icon-light.svg`, `src/assets/icon-adaptableV2.svg`, `src/assets/icon-dark.svg`, `src/assets/icon-light.svg`. Son restos de una identidad anterior; un futuro agente de limpieza (Fase 1) puede borrarlos con seguridad.

Los favicons en `public/logo/` (`favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `android-chrome-*.png`, `apple-touch-icon.png`) **ya son de AD System** (confirmado por color de píxel: granate `#8E1818` + gris metal `#9CA3AF`) y están correctamente enlazados en `index.html`. No requieren cambio.

### 2.4 Paleta de color (verificada por contraste AA)

Los tonos de marca se tomaron leyendo los píxeles reales de los archivos oficiales (`public/ADSystem/png/logo.png`, `icono.png`, `icono2.png` y los favicons), no de memoria. `LOGO.svg` en sí es monocromático (negro puro); el color de marca sale de los PNG exportados en color.

| Token | Hex | Origen | Uso | Contraste |
|---|---|---|---|---|
| `primary` (granate AD System) | `#8E1818` | píxel de `logo.png`/`icono.png`/favicon | Marca, botón principal, enlaces, íconos de marca | Texto blanco sobre `#8E1818`: **9,2:1** (AAA) |
| `granateOscuro` | `#320B0B` | variante oscura oficial exportada del logo | Estado presionado/activo, fondos oscuros de marca | — (no se usa como texto) |
| `secondary` (azul de apoyo) | `#1F355C` | paleta de AD Business Group, conservada como apoyo | Información, navegación, texto sobre fondos dorados/metal | Texto blanco sobre `#1F355C`: **12,2:1** (AAA) |
| `accent` (dorado de apoyo) | `#E0B04F` | paleta de AD Business Group, conservada como apoyo | Fondo de advertencia, íconos, bordes — **nunca texto** | Texto blanco sobre dorado: **2,0:1** ❌. Texto `#1F355C` sobre dorado: **6,1:1** ✅. Texto negro sobre dorado: **10,5:1** ✅ |
| `metal` (gris oficial) | `#9CA3AF` | píxel de los favicons oficiales | Fondos secundarios, bordes, divisores — siempre con texto oscuro | Texto negro sobre metal: **8,3:1** ✅. Texto blanco sobre metal: **2,5:1** ❌ |
| `error` | `#D32F2F` | elegido para distinguirse del granate de marca | Mensajes de error, validación, acción destructiva (siempre `outlined`) | Texto blanco sobre `#D32F2F`: **5,0:1** ✅ |
| `success` | `#2E7D32` | Material Design "green 800" (el estándar `#4CAF50` no pasa AA) | Confirmaciones, montos positivos | Texto blanco sobre `#2E7D32`: **5,1:1** ✅ |
| `background` | `#EFEFEF` | gris neutro conservado | Fondo general de la app | Texto negro: 18,3:1 · Texto `#1F355C`: 10,6:1 |
| `surface` | `#FFFFFF` | — | Tarjetas, campos | — |

**¿Por qué el rojo de marca y el rojo de error son distintos?** `#8E1818` (granate, apagado/marrón) y `#D32F2F` (error, más vivo/anaranjado) se distinguen por tono aun para quien no ve bien el matiz, y además todo mensaje de error **siempre** lleva el ícono `mdi-alert-circle` y texto explicativo (nunca solo un color). Las acciones destructivas (`BotonAccion variante="destructiva"`) son **siempre** `outlined`, nunca rellenas, y la pantalla que las usa debe pedir una confirmación antes de ejecutar.

**Corrección de contraste aplicada globalmente:** antes, `success` (`#4CAF50`) y el dorado usado como texto fallaban AA. Se corrigió en `src/main.js` (tema de Vuetify) y con una regla en `src/styles/vuetify-overrides.css` que oscurece cualquier texto con la clase `.text-warning` a `#1F355C`, dejando los íconos en dorado.

### 2.5 Tipografía

**Berlin Sans FB** (fuente del manual de marca, usada ahí solo para el wordmark "System" dibujado) no es una fuente web ni está instalada, y añadirla implicaría una licencia nueva. Se mantiene la decisión ya vigente del proyecto:

- **Montserrat** (ya instalada vía `@fontsource`) para títulos, botones, tabs, nombres de tarjeta — es geométrica y de peso similar a Berlin Sans FB, la aproximación razonable sin fuente nueva.
- **Open Sans** (ya instalada vía `@fontsource`) para texto de cuerpo/lectura — mejor legibilidad en párrafos largos y en pantallas pequeñas que una fuente geométrica.

Esto ya estaba parcialmente en el CSS pero una regla `!important` más amplia (que forzaba Montserrat en *todo*) lo pisaba. Se corrigió en `src/styles/vuetify-overrides.css` (ver §4) sin tocar ninguna vista.

#### Escala tipográfica (px)

| Elemento | Móvil | Escritorio | Fuente |
|---|---|---|---|
| H1 | 32px | 40px | Montserrat 600 |
| H2 | 28px | 32px | Montserrat 600 |
| H3 | 24px | 28px | Montserrat 600 |
| H4 | 20px | 24px | Montserrat 600 |
| H5 | 18px | 20px | Montserrat 500 |
| H6 | 16px | 18px | Montserrat 500 |
| Cuerpo | **16px** (mínimo, nunca menos) | 16px | Open Sans 400 |
| Texto secundario / ayuda | 14px | 14px | Open Sans 400 |
| Monto destacado (`ResumenMonto`) | 32px | 32px | Montserrat 700 |

> Antes, una regla en `global.css` bajaba el cuerpo a 14px por debajo de 768px — se eliminó (ver §4): el cuerpo nunca baja de 16px, como pide `PLAN-MVP.md §2` regla 6.

---

## 3. Tokens

### 3.1 Espaciado

Escala existente (`--spacing-*` en `global.css`), sin cambios: `4 / 8 / 16 / 24 / 32 / 48px` (xs/sm/md/lg/xl/2xl).

### 3.2 Radios

Ya vigentes, se documentan como estándar: `10px` en botones, `20px` en tarjetas/campos/menús/listas. No crear un tercer valor sin necesidad.

### 3.3 Sombras

El sistema usa **cero sombras** (`box-shadow: none !important` ya aplicado globalmente); la jerarquía se construye con color, borde y espaciado, no con elevación. Mantener esa decisión.

### 3.4 Alturas táctiles mínimas

| Elemento | Alto mínimo |
|---|---|
| Botón normal | 48px |
| Botón de acción principal de la pantalla | **56px** |
| Campo de texto/select | ≥48px (ya lo cumple la densidad `comfortable` + padding 20px vigente) |
| Ítem de lista tocable / `TarjetaAccion` | 72px |
| Ícono tocable aislado (ej. `AyudaTermino`) | 44px de área táctil aunque el ícono visual sea más chico |

Aplicado de forma **aditiva** en `global.css` (`.v-btn:not(.v-btn--icon)` sube a 44-48px mínimo): nunca encoge un botón existente, solo sube los que estaban por debajo del mínimo.

### 3.5 Movimiento

Duraciones y curvas ya definidas en `src/styles/animations.css` (`--animation-duration-*`, `--ease-*`) — se mantienen, no se agregó un segundo sistema de animación. Reglas:

- Entradas/salidas de hojas, diálogos y snackbars: 300-500ms, `ease-out` al entrar.
- Micro-interacciones (presionar un botón/tarjeta): 150-160ms, `scale(0.97-0.98)`.
- `@media (prefers-reduced-motion: reduce)` ya está implementado globalmente (reduce toda animación/transición a 0,01ms) — **no quitar esa regla**.
- Nunca animar accesos repetidos (barra inferior, tabs) — solo transiciones de entrada/salida de contenido nuevo. Esto prohíbe específicamente cualquier rebote/escala en el ícono de un tab al tocarlo (ej. `scale()` en el ícono activo de la barra inferior). **Excepción explícita:** el indicador posicional que marca cuál tab está activo (una barra/subrayado que se desliza de un ítem a otro) no es una animación de "contenido" sino de posición de la selección — se permite, en `--ad-move-rapido` (150ms), sin rebote ni escala.

**Tokens de movimiento de los componentes de dashboard** (`TarjetaKPI`, `SeccionPanel`, `ListaRanking`, `SelectorPeriodo`, `GraficoBarras` — pantalla "¿Cómo voy?"). Aditivo, no un segundo sistema: mismos números en CSS (`src/styles/animations.css`, variables `--ad-move-*`) y en JS (`src/components/ui/movimiento.js`, para lo que no es CSS puro: duración de `AnimatedNumber` y de la animación de `chart.js`).

| Token | Valor | Uso |
|---|---|---|
| `--ad-move-duracion-entrada` / `DURACION_ENTRADA_MS` | 280ms | Fade + `translateY(10px)` al aparecer una tarjeta/sección, una vez al montar (clase `.ad-move-entrada`). |
| `--ad-move-escalon-lista` / `ESCALON_LISTA_MS` | 50ms | Escalón entre ítems de una lista o tarjetas de una fila (`animation-delay: calc(escalón * índice)`). |
| `--ad-move-duracion-press` / `DURACION_PRESS_MS` | 150ms | Feedback táctil al presionar (clase `.ad-move-press`, `scale(0.98)`). |
| `--ad-move-curva-entrada` / `CURVA_ENTRADA` | `cubic-bezier(0.22, 1, 0.36, 1)` | Curva de toda entrada suave (más marcada que `--ease-out`). |
| `DURACION_NUMERO_MS` (JS) | 600ms | `AnimatedNumber` al cambiar de período en `TarjetaKPI`/`ResumenMonto` (prop `animar`). |
| `DURACION_CHART_MS` / `EASING_CHART` (JS) | 600ms / `easeOutQuart` | Animación de entrada de `GraficoBarras` (chart.js). |

Barras de `ListaRanking` crecen desde 0 al aparecer (y al cambiar de período) vía un `model-value` que pasa de 0 al valor real un frame después de montar. El cambio de período en el dashboard usa un fundido corto (`transition name="cruce"`, 280ms) en vez de un salto brusco de contenido a contenido. Todo lo anterior queda neutralizado por la regla global de `prefers-reduced-motion` ya vigente (`animations.css`); los dos casos en JS (`AnimatedNumber`, `chart.js`) se apagan además explícitamente con `prefiereMovimientoReducido()` porque esa regla CSS global no los alcanza.

### 3.6 Microcopy

- **Tuteo siempre** ("Registra lo que gastaste", nunca "Registre lo que gastó").
- **Verbos de acción, no sustantivos**: "Vendí algo" en vez de "Nueva venta"; "Gasté o compré algo" en vez de "Nuevo gasto".
- **Cero jerga en la primera capa**: "Impuesto que te descontaron" con un (?) para "retención de IVA", nunca al revés.
- **Mensajes de error con causa y salida**: "No pudimos guardar tu registro. Intenta de nuevo." — nunca "Error 500" ni un `console.log` como única pista.
- **Confirmaciones humanas**: "¡Listo! Guardamos tu gasto." en vez de "Operación completada exitosamente".

---

## 4. Cambios aplicados a `src/main.js` y los CSS globales

Todos son **aditivos o de corrección de color/tipografía** — ninguno reestructura una vista.

- **`src/main.js`** (tema de Vuetify): `primary` → `#8E1818` (granate AD System, antes `#A81C22` de la firma contable); `error` → `#D32F2F` (antes igual al `primary`, ahora distinto a propósito); `success` → `#2E7D32` (antes `#4CAF50`, fallaba AA con texto blanco); se agregaron los tokens nuevos `metal` (`#9CA3AF`) y `granateOscuro` (`#320B0B`); tema oscuro con `primary` → `#C18080` (granate aclarado).
- **`src/styles/global.css`**: mismas variables CSS (`--color-primary`, `--color-error`, `--color-success`, + `--color-metal`, `--color-granate-oscuro`) sincronizadas con el tema; se quitó la regla que bajaba el cuerpo a 14px en móvil; se agregó el bloque de alturas táctiles mínimas (aditivo, nunca encoge) y un foco visible (`:focus-visible`) consistente.
- **`src/styles/vuetify-overrides.css`**: se agregó un bloque que devuelve Open Sans a los contenedores de texto de cuerpo (`p`, `.v-card-text`, `.v-alert`, `.v-field__input`, `.v-messages`, `.v-tooltip`, `.text-body-*`) sin tocar títulos/botones/menús (siguen en Montserrat); y la corrección de contraste del dorado como texto (`.text-warning` → `#1F355C`, íconos se quedan dorados).

No se modificó `esbuild`/`drop console`, el `errorHandler` ni la lógica de notificaciones de `main.js`/`App.vue`.

---

## 5. Catálogo de componentes (`src/components/ui/`)

Todos son **envoltorios delgados** sobre el componente de Vuetify equivalente: fijan tamaño/variante/color/copy del estándar AD System, no reemplazan a Vuetify ni reinventan su markup. Props documentadas en JSDoc dentro de cada archivo; tests de render en `src/components/ui/__tests__/`.

| Componente | Envuelve | Cuándo usarlo |
|---|---|---|
| `LogoAdSystem` | `<img>` + assets oficiales | Cualquier lugar donde se muestre la marca (header, login, PDF, splash). |
| `BotonAccion` | `<v-btn>` | La acción principal o secundaria de una pantalla/tarjeta — reemplaza un `<v-btn>` escrito a mano cuando necesitas el tamaño/variante estándar (56px principal, 48px normal, destructiva siempre outlined). Para botones chicos de tabla/ícono, sigue usando `<v-btn icon>` directo — no es su caso de uso. |
| `TarjetaAccion` | `<v-card>` + `<v-card-item>` | Menús grandes de inicio ("Vendí algo", "¿Cómo voy?") y cualquier lista de opciones grandes y tocables con ícono+título+subtítulo. |
| `EstadoVacio` | `<v-empty-state>` (nativo de Vuetify 3.5+) | Cualquier lista/tabla sin datos todavía ("Todavía no tienes proveedores", "Este mes no registras nada"). |
| `AvisoAmable` | `<v-alert>` | Mensajes inline de info/advertencia/error en lenguaje llano, con o sin botón de acción. Para notificaciones flotantes sigue usando `AppSnackbar` (ya existe, no se toca). |
| `ResumenMonto` | `<v-card>` + `formatMoney()` | Un monto grande destacado con su etiqueta y, debajo, el equivalente chico en bolívares (inicio del cliente, resumen de "¿Cómo voy?"). |
| `PasoGuiado` | `<v-progress-linear>` + título | Cabecera "Paso X de Y" de un flujo tipo asistente (ej. modo simple de `SimpleInvoiceForm`). No es un `v-stepper` completo a propósito: en móvil solo hace falta la cabecera. |
| `HojaInferior` | `<v-bottom-sheet>` (móvil) / `<v-dialog>` (escritorio) | Cualquier formulario o menú contextual que deba verse como hoja inferior en el teléfono y como diálogo centrado en escritorio, con la misma API (`v-model`, slot por defecto, slot `acciones`, prop `titulo`). |
| `DialogoAdaptable` | `<v-dialog scrollable>` (pantalla completa en xs) | **Todo formulario o contenido que pueda crecer** (subir documento, editar proveedor, ajustar inventario, etc.). Título con ícono + cerrar, contenido con scroll, slot `acciones` fijo abajo, prop `cargando` bloquea el cierre. Regla: ningún `v-dialog` suelto en vistas del cliente. |
| `ChipTasa` | `<v-chip>` + `<v-tooltip>` | Tasa de cambio compacta SIN etiqueta larga ("$ 36,50"), tooltip fijo "Tasa oficial BCV de hoy". Usado en el app bar (`BarraSuperior`, ≥600px) y en la sección "Tasas del día" de la hoja "Más" del cliente. Pulso sutil cuando `rateValue` cambia. Para la etiqueta larga ("Dólar BCV hoy: Bs 36,50") sigue existiendo `ExchangeRateChip` en `components/common/`. |
| `EncabezadoPagina` | `<h1>` + `<p>` + slot de acciones | Título editorial de una vista (dentro del contenido, no el app bar): h1 + subtítulo opcional + acciones a la derecha en escritorio (apiladas en móvil). Tipografía según §2.5 (32px móvil / 40px escritorio). |
| `SelectorPeriodo` | `<v-chip-group>` | Elegir "Este mes" / "Mes pasado" / "Este año" con `v-model` (string) — las tres opciones son fijas, es el único período de la pantalla "¿Cómo voy?" del cliente. Combina con `obtenerRangoPeriodo` de `src/utils/resumenFinanciero.js`. |
| `TarjetaKPI` | Extiende `ResumenMonto` | Una tarjeta resumen con monto animado (USD + Bs chico) y comparación contra el período anterior en lenguaje llano: flecha + color + texto, nunca solo color (`variacion`, `subirEsBueno` deciden el color; el texto sale de `textoComparacion`). Usada por "Vendí" / "Gasté" / "Me queda" en el dashboard del cliente. |
| `SeccionPanel` | `<v-card>` + `<v-card-item>` | Una sección con título (h2) + subtítulo opcional + contenido (slot por defecto) + acción opcional en la cabecera (slot `accion`). Para cualquier bloque con nombre propio de un dashboard ("Últimos 6 meses", "¿En qué gasto más?") en vez de armar `<v-card><v-card-title>` a mano. |
| `ListaRanking` | `<v-progress-linear>` | Top N (categorías de gasto, clientes...) como lista de nombre + monto (`formatMoney`) + barra horizontal relativa al primer ítem — las barras crecen desde 0 al aparecer. Recibe `items` ya ordenado (ver `topCategorias`/`topClientes`). |
| `FilaLista` | `<div>` + `<v-avatar>`/`<v-chip>` | Fila de un listado genérico en móvil (xs) en vez de tabla: ícono opcional + título + subtítulo a la izquierda, valor (`formatMoney`/texto ya formateado) + chip de estado a la derecha, slot `acciones` con botones ícono. Usada en Inventario (productos), Mi área, Facturación/Suscripción (historial de pagos del plan), Archivo. Para movimientos de dinero (ventas/compras/gastos) usa `FilaMovimiento` en su lugar, no la dupliques. |
| `GraficoBarras` | `BarChart` (chart.js, `src/components/chart/`) | Comparar 2 series por mes (ej. "Vendí" vs "Gasté") con la paleta y las especificaciones de la skill `dataviz` ya aplicadas (barras ≤24px con esquina redondeada 4px, grilla en pelo, tooltip con `formatMoney`, leyenda siempre visible). No reescribe la lógica de chart.js del `BarChart` base. |

**Regla para agregar un componente nuevo a este catálogo:** si Vuetify + un default global en `main.js` ya resuelven el caso, **no crear un componente** — documentar aquí "usa `<v-xxx>` directamente con tal prop" en su lugar.

### Cómo ver el catálogo en el navegador (`CatalogoUI.vue`)

`src/views/dev/CatalogoUI.vue` muestra los componentes de esta tabla con datos de ejemplo. **No está en el router a propósito** (es solo para desarrollo). Para verla temporalmente:

1. Abre `src/router/index.js`.
2. Agrega una ruta temporal, por ejemplo:
   ```js
   {
     path: '/dev/catalogo-ui',
     name: 'CatalogoUI',
     component: () => import('@/views/dev/CatalogoUI.vue'),
   }
   ```
3. Visita `/dev/catalogo-ui` en `npm run dev`.
4. **Quita la ruta antes de hacer commit/push** — nunca debe llegar a producción (igual que `/ocr-demo` y `/test-form`, ver `PLAN-MVP.md` Fase 3).

---

## 6. Pendiente para otro agente (fuera de este alcance)

- Migrar los `<img>` sueltos del §2.3 a `<LogoAdSystem>` (opcional, cosmético, no urgente).
- Borrar los SVG legado listados en §2.3 (tarea de limpieza, Fase 1).
- Integrar `AyudaTermino` (glosario) dentro de `AvisoAmable`/pantallas fiscales — no es parte de este encargo.
- Revisar si el resto de pantallas (fuera del rol `cliente`) deben adoptar `BotonAccion`/`TarjetaAccion`; este encargo no tocó ninguna vista existente.

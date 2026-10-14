# Patrón de pantallas del cliente — "Mis papeles" como referencia

Fecha: 2026-10-13. El usuario pidió que todas las pantallas del cliente tengan el enfoque de Mis papeles: **intuitivo, visual y que incentive a usar y familiarizarse con el sistema**. Fuentes: rediseño de `src/views/cliente/Fiscal360.vue` (implementación de referencia), `src/views/cliente/Inicio.vue`, crítica con la skill **impeccable** (`craft-floor` + `operate`) y `docs/mvp/estrategia/norkut-capturas-analisis.md` (ideas, no copia).

## La pregunta de cada pantalla
Antes de dibujar: **¿qué vino a hacer la persona aquí y cuál es la UNA cosa que debería hacer ahora?** La pantalla responde eso arriba, y lo demás va abajo, en orden.

## Las 5 piezas (componentes en `src/components/ui/`)
| Pieza | Componente | Para qué |
|---|---|---|
| Encabezado | `EncabezadoPagina` | Título = el mismo nombre del menú. Subtítulo en llano. UNA acción principal granate; el resto (exportar, papelera…) en un menú ⋮. |
| Avance visual | `BarraSegmentos` (o una cifra + frase) | Un segmento por elemento; se ve qué falta sin leer. Debajo, una frase que motiva (sin regaños). |
| Siguiente paso | `PanelSiguientePaso` | UNA acción concreta con botón grande. Cuando no queda nada: mensaje de logro. |
| Filtros | `FiltroChips` | Filtros de un toque con cantidad ("Por resolver · 3"). Nunca un `v-select` para filtrar estados. |
| Lista | `SeccionLista` + filas | Una superficie por grupo con líneas divisorias (no una tarjeta por fila). Cada fila: ícono de estado en cuadro de 44px, nombre en negrita, estado en palabras + dato secundario, **una** acción visible y el resto en ⋮. En el teléfono la acción baja a todo el ancho. |
| Familiarización | `ListaPasos` | "Primeros pasos" marcados con datos reales; logro al completar. |

Además: `DialogoAdaptable` para todo formulario (pantalla completa en el teléfono), `EstadoVacio` que enseña ("Agrega tu primer producto…" + botón), `AyudaTermino` junto a cada término fiscal.

## Reglas visuales (no negociables)
- Paleta: granate `primary` solo para acciones y lo seleccionado; carbón `secondary`; semánticos (error, warning, success) solo para estados. **Nada de azul marino**, dorado ni tarjetas de colores fuertes como decoración.
- **Prohibido:** fila de "tarjetas KPI" de colores (cifra grande + etiqueta + ícono), etiquetas encima de los títulos, bordes laterales de color, una tarjeta por fila de lista, gradientes de adorno.
- Montserrat en todo. Cuerpo ≥ 16px. Contraste AA.
- Ancho máximo de contenido: 1120px, centrado. En escritorio, dos columnas solo si la segunda aporta (Inicio: primeros pasos).
- Movimiento: una sola animación con intención por pantalla (la barra que se llena, la entrada de la lista). 150–250 ms, `--ad-move-*`, siempre con `prefers-reduced-motion`.
- Estados completos: carga (skeleton con la forma real), vacío que enseña, error con "Reintentar", y botones con carga.

## Pantalla por pantalla

### Inicio — HECHO (2026-10-13)
Siguiente paso global (plan → papeles → datos del negocio → primer registro), 3 acciones, pendientes y "Primeros pasos" (perfil, primer gasto, primera venta, RIF, sello y firma, ¿Cómo voy?).

### Mis papeles — HECHO (referencia)

### ¿Cómo voy? — Alto
- Arriba, una frase de resultado ("En octubre te quedan $X: vendiste… gastaste…") y 3 cifras en línea, sin tarjetas de colores: Vendí, Gasté y **Lo que vas a declarar** (IVA estimado = débito − crédito − retenciones del período; diferenciador D1, con `AyudaTermino`).
- Selector de período en `FiltroChips` (Este mes · Mes pasado · Este año).
- Gráfico de 6 meses con leyenda clara (Vendí / Gasté) y colores de marca; en el teléfono, barras horizontales o la lista de meses si no se lee.
- "Lo que más vendes / en qué más gastas" con `SeccionLista` (ranking).
- Estado vacío que enseña, sin ícono azul.
- Título de la barra superior: "¿Cómo voy?" (ya corregido).

### Mis movimientos — Alto
- Sin la fila de 4 tarjetas de colores. En su lugar: frase del período + 3 cifras (Vendí · Gasté · Retenciones).
- Las pestañas (Todas, Ventas, Compras, Gastos, Retenciones, Papelera) en `FiltroChips` con cantidad.
- Lista móvil con `FilaMovimiento` (ya existe); en escritorio la tabla puede quedarse, pero con chips de estado consistentes.
- Siguiente paso: "Tienes 3 facturas en borrador → Revisarlas" o "Te deben $X de hace más de 30 días".
- A futuro (anotado): totales en vivo junto al formulario; chip "Ajuste de tasa" entre emisión y pago (idea de Norkut, dolor real en Venezuela).

### Mi negocio — Alto
- Avance: "Tu negocio está X% listo" (`ListaPasos` o barra) con los bloques: Datos de la empresa · Perfil fiscal · Sello y firma · Tu cuenta.
- Siguiente paso: el primer bloque incompleto.
- Secciones en lugar de un formulario largo; cada una guarda por separado, con el botón deshabilitado hasta que esté válida, validación junto al campo y ayuda "¿Dónde lo encuentro?" en RIF y licencia.
- Perfil fiscal guiado (U4): preguntas sí/no (¿contribuyente especial?, ¿agente de retención municipal?, ¿vendes productos o servicios?) sobre las columnas que ya existen (`es_contribuyente_especial`, `es_agente_retencion_municipal`, `activity_type`).
- Sello y firma: zona de arrastrar/soltar con vista previa.

### Mis proveedores — Medio
- Sin tarjetas KPI de colores: frase ("Tienes 20 proveedores; a 3 les falta el RIF") + `FiltroChips` (Todos · Empresas · Personas · Con retención · Datos incompletos).
- Lista en `SeccionLista` con filas: nombre, RIF, chips de retención (IVA 75%, ISLR, Municipal) en estilo sobrio, compras acumuladas; acción "Ver" y ⋮.
- Siguiente paso: "Completa el RIF de 3 proveedores para poder retenerles".

### Mi mercancía — Medio
- Avance de stock con `BarraSegmentos` (agotado / bajo / bien) y siguiente paso ("4 productos por agotarse → Revisar").
- Estado vacío que enseña con dos salidas: "Agregar producto" y "Subir lista de Excel" (anotar como futuro si no existe).
- Ajustes de cantidad con botones +/− grandes.

### Mi plan — Medio
- Arriba: tu plan actual, días que quedan (barra) y estado del pago con chip; siguiente paso ("Reporta tu pago" / "Tu pago está en revisión").
- Comparación de planes debajo, más compacta; los colores fuertes (azul y dorado) se reemplazan por el patrón (destacado = borde granate). La decisión de precios y planes sigue en la Fase 4.
- Historial de pagos en `SeccionLista`.

### Registro por foto (OCR) — Alto (en curso de corrección)
Después de las correcciones de la revisión: pasos cortos con `PasoGuiado` (Foto → Revisa lo que leímos → Guardar) y un resumen de lo detectado que se confirma campo por campo.

### Chat de soporte con IA — Alto (ola siguiente)
Respuesta en dos capas: una frase en llano + una tarjeta con datos y una acción. Historial de conversaciones.

## Cómo se verifica cada pantalla
1. Skill **impeccable**: leer `craft-floor.md` y `operate.md` antes de editar; correr el detector al terminar.
2. Capturas reales en escritorio (1440) y teléfono (Pixel 7): una ronda de inspección, un lote de correcciones y una ronda de confirmación. No más.
3. `TZ=America/Caracas npx vitest run` + `npm run build` en verde; E2E de la pantalla actualizada.

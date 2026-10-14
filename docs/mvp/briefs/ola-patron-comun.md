# Ola "patrón cliente" — reglas comunes (léelo entero)

Objetivo (pedido del usuario): que cada pantalla del cliente sea **intuitiva, visual y que incentive a usar y familiarizarse con el sistema**, con el mismo enfoque de "Mis papeles". Usuarios: dueños de pequeños negocios, muchos mayores y poco digitales. **Móvil primero.**

## Lee antes de tocar nada
1. `docs/mvp/diseno/patron-cliente.md` — el patrón y la especificación de TU pantalla (es vinculante).
2. La implementación de referencia: `src/views/cliente/Fiscal360.vue` (Mis papeles) y `src/views/cliente/Inicio.vue`, más los componentes `src/components/ui/{BarraSegmentos,PanelSiguientePaso,FiltroChips,SeccionLista,ListaPasos,EncabezadoPagina,DialogoAdaptable,EstadoVacio,AyudaTermino}.vue` y `src/components/fiscal/TarjetaDocumentoFiscal.vue` (fila de referencia).
3. `docs/mvp/manuales/00-REGLAS-COMUNES.md` y `docs/mvp/diseno/sistema-diseno.md`.
4. Carga la skill **impeccable** (Skill tool) y lee `reference/craft-floor.md` y `reference/operate.md` antes de editar UI. Al terminar, ejecuta su detector:
   `C:\Users\cpela\.claude\skills\impeccable\scripts\impeccable.cmd detect --json <archivos que cambiaste>` y corrige lo que reporte.

## Reglas
- **Usa los componentes ui existentes**; no reinventes. Si un patrón nuevo se repite en 2+ pantallas, créalo en `src/components/ui/` con su test y agrégalo al catálogo de `sistema-diseno.md`.
- Prohibido: filas de "tarjetas KPI" de colores, etiquetas encima de títulos, bordes laterales de color, una tarjeta por fila de lista, azul marino (#1F355C) y dorado decorativo, gradientes de adorno, `v-select` para filtrar estados.
- Granate (`primary`) solo para acciones y selección; `secondary` es carbón. Montserrat. Cuerpo ≥16px. Textos en llano, tuteo.
- Conserva TODA la funcionalidad existente (acciones, diálogos, servicios). Es un rediseño de presentación y estructura, no de lógica de negocio. Si una idea necesita BD o servicios nuevos, déjala anotada en tu informe en vez de inventarla.
- Fechas con `src/utils/fechas.js`; montos con `src/utils/formatMoney.js`.
- Movimiento: una sola animación con intención por pantalla, tokens `--ad-move-*`, `prefers-reduced-motion`.
- **Verificación visual obligatoria:** `npx vite build && npx vite preview --host 127.0.0.1 --port <tu puerto>` y capturas con Playwright (escritorio 1440×900 y `devices['Pixel 7']`) usando la sesión `e2e/.auth/cliente.json` (si no existe en tu copia, cópiala desde la carpeta principal del repo `e2e/.auth/`; no la commitees). Hay cortes de red intermitentes en este equipo: si una carga falla, reintenta. Haz UNA ronda de inspección, UN lote de correcciones y UNA ronda de confirmación. Guarda las capturas finales en `docs/mvp/briefs/capturas/<pantalla>-{escritorio,movil}.png`.
- Actualiza o agrega tests unitarios de lo que cambies y el E2E de tu pantalla si existe.
- **Prohibido:** `git stash`, `git reset`, `git checkout -- …`, `git restore`, `git clean`; aplicar migraciones o escribir en la BD real (no guardes registros: abre y cancela). No lances subagentes.
- Al terminar: `TZ=America/Caracas npx vitest run` y `npm run build` en verde; commits en español con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. Informe en `docs/mvp/briefs/ola-patron-<pantalla>-informe.md`. Devuelve solo: estado, commits, una línea de tests y dudas.

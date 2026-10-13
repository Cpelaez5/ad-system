# Reglas comunes para TODOS los agentes

> Léelo completo antes de tu manual. Es corto a propósito.

## 1. Qué leer (y qué NO)
- **Leer:** este archivo → tu manual → solo las secciones de `docs/mvp/auditorias/` que cita tu manual → los archivos de código de tu tarea.
- **No leer completos:** `CONTEXTO_PROYECTO.txt`, `.agent/`, `src/views/GEMINI.md`, `README.md` antiguos. Están desactualizados. Si necesitas una regla fiscal, está en `auditorias/audit-docs.md §3`.
- **Fuente de verdad:** el código y la BD real > `docs/mvp/` > cualquier otro documento.

## 2. Producción
- Sitio: https://adsystemapp.com. Netlify **compila automáticamente en cada `git push` a `main`** (`npm run build`). Push a `main` = deploy.
- Supabase `ybeippdhlvjzfgpbcoqy`. **Aún no hay clientes reales (pre-lanzamiento, oct-2026):** se pueden crear y borrar datos de prueba y aplicar migraciones. Aun así:
  - Todo cambio de esquema va como archivo en `supabase/migrations/` (versionado), nunca solo desde el SQL Editor.
  - **Solo el orquestador (Claude principal) aplica migraciones y despliega Edge Functions**, siempre después de verificarlas. Los demás agentes (subagentes, Gemini) escriben el archivo y lo reportan; nunca lo aplican.
  - No borres usuarios ni datos existentes sin preguntar: la contadora puede estar usándolos para probar.
  - Antes del lanzamiento real se separará un proyecto de desarrollo (manual 01, S1).

## 3. Stack y convenciones (vigentes)
- Vue 3 (Options API en la mayoría de las vistas) + Vuetify 3 + Pinia + Vite 5. Supabase (Postgres + RLS + Edge Functions en Deno/TS).
- Formulario de factura **activo:** `src/components/forms/SimpleInvoiceForm.vue`. `ClientInvoiceForm.vue` es legado. `InvoiceForm.vue` se usa en el flujo contador.
- Lógica de negocio con nombres en español e infraestructura en inglés.
- Errores con forma `{ code, message }`. **Todo error que vea el usuario va en lenguaje llano** (snackbar `AppSnackbar`), nunca `alert()`.
- No uses `console.log` en código nuevo: usa el logger (cuando exista, Fase 1).
- Secretos: **nunca** con prefijo `VITE_` (todo `VITE_*` llega al navegador). Las llamadas a IA o a APIs con clave van por Edge Functions.

## 3b. No reinventar la rueda
- Stack: **Vue 3 + Vuetify 3**. Si Vuetify ya tiene el componente (diálogos, hojas inferiores, navegación inferior, listas, chips, skeletons, snackbars, steppers, data tables, menús…), **úsalo**. Los componentes propios en `src/components/ui/` son envoltorios delgados sobre Vuetify que fijan nuestro estándar visual, no reimplementaciones.
- Para algo complejo que Vuetify no trae (gráficos, editores, exportaciones), usa una **librería probada** (ya instaladas: chart.js, exceljs, jspdf, pdf-lib, date-fns, @vuepic/vue-datepicker). Si falta una, instálala con `npm install` y justifícalo en el commit. Nada de reescribir a mano lo que ya resuelve una librería mantenida.
- **Todo componetizado:** cada patrón visual que aparezca en más de una vista (encabezado de página, tarjeta de resumen, sección, lista, selector de período, chip de tasa, estados vacíos/errores) es un componente de `src/components/ui/` y se reutiliza; las vistas componen, no redibujan. Antes de crear uno, revisa el catálogo de `sistema-diseno.md` y `src/views/dev/CatalogoUI.vue`; si creas uno nuevo, agrégalo a ambos.
- El aspecto "premium" sale de los tokens, los `defaults` de Vuetify y la composición, no de widgets hechos a mano. Referencia: `docs/mvp/diseno/sistema-diseno.md`.

## 4. Decisiones que NO se revierten
Las 17 decisiones de `GEMINI.md` (patrón adaptador de IA, schema OCR en inglés, `taxableAmount`, correlativos fiscales inmutables, `retentionDate` separado de `issueDate`, alícuota 16% en el PDF de retención IVA, retención municipal solo con el mismo municipio, lookup en vivo de proveedores, Cashea por cuota con tasa del día del pago).

## 5. Cómo trabajar
0. **Varios agentes comparten la misma carpeta.** Prohibido `git stash`, `git reset`, `git checkout`, `git restore` sobre archivos ajenos y `git clean`. Si necesitas comparar con lo commiteado usa `git diff` o `git show HEAD:archivo`.
1. Rama por tarea: `feat/<fase>-<tema>` o `fix/<tema>`. Nunca trabajes directo en `main`.
2. Antes de tocar cálculos fiscales: `npm test` en verde y, si falta, un test que fije el comportamiento actual.
3. Cambios pequeños y verificables. Un commit por cambio lógico, en español: `fix(seguridad): ...`, `feat(ux): ...`.
4. Al terminar: `npm test` + `npm run build` sin errores + verificación manual del flujo afectado.
5. **Entrega:** actualiza la casilla de tu tarea en tu manual (`- [x]`) y añade 1-3 líneas en `docs/mvp/BITACORA.md` (fecha, agente, qué cambió, qué quedó pendiente). Ese es todo el reporte.

## 6. Cuándo parar y preguntar
- Cualquier cambio en producción (SQL, Storage, Auth, Edge Functions, Netlify).
- Cualquier duda de regla fiscal: pregúntala y la responde la contadora. No inventes alícuotas ni porcentajes.
- Si una tarea exige tocar más de ~5 archivos que no son de tu área.

## 7. Skills obligatorias por tipo de tarea
Antes de empezar, invoca con la herramienta Skill las que apliquen. Si falta una que haría el resultado claramente mejor, instálala (`npx skills add …`) y anótalo en la bitácora.

| Tarea | Skills |
|---|---|
| Pantallas, componentes, rediseños | `impeccable`, `emil-design-eng`, `ui-ux-pro-max` (accesibilidad), `minimalist-ui` si aplica |
| Animación y micro-interacciones | `emil-design-eng`, `animate`, `find-animation-opportunities`, `improve-animations` |
| Gráficos y dashboards | `dataviz` (siempre antes del primer gráfico) |
| Landing con GSAP | `gsap-core`, `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance`, `copywriting`, `cro` |
| Base de datos, RLS, migraciones, Edge Functions | `supabase`, `supabase-postgres-best-practices` |
| Videos y piezas animadas de marketing | `hyperframes`, `hyperframes-animation`, `video` |
| Precios, onboarding, correos, legal | `pricing`, `onboarding`, `emails`, `copywriting` |
| Pruebas en navegador | `webapp-testing` (si aplica) + Claude in Chrome |
| Revisión de cambios grandes | `code-review` |

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
  - No borres usuarios ni datos existentes sin preguntar: la contadora puede estar usándolos para probar.
  - Antes del lanzamiento real se separará un proyecto de desarrollo (manual 01, S1).

## 3. Stack y convenciones (vigentes)
- Vue 3 (Options API en la mayoría de las vistas) + Vuetify 3 + Pinia + Vite 5. Supabase (Postgres + RLS + Edge Functions en Deno/TS).
- Formulario de factura **activo:** `src/components/forms/SimpleInvoiceForm.vue`. `ClientInvoiceForm.vue` es legado. `InvoiceForm.vue` se usa en el flujo contador.
- Lógica de negocio con nombres en español e infraestructura en inglés.
- Errores con forma `{ code, message }`. **Todo error que vea el usuario va en lenguaje llano** (snackbar `AppSnackbar`), nunca `alert()`.
- No uses `console.log` en código nuevo: usa el logger (cuando exista, Fase 1).
- Secretos: **nunca** con prefijo `VITE_` (todo `VITE_*` llega al navegador). Las llamadas a IA o a APIs con clave van por Edge Functions.

## 4. Decisiones que NO se revierten
Las 17 decisiones de `GEMINI.md` (patrón adaptador de IA, schema OCR en inglés, `taxableAmount`, correlativos fiscales inmutables, `retentionDate` separado de `issueDate`, alícuota 16% en el PDF de retención IVA, retención municipal solo con el mismo municipio, lookup en vivo de proveedores, Cashea por cuota con tasa del día del pago).

## 5. Cómo trabajar
1. Rama por tarea: `feat/<fase>-<tema>` o `fix/<tema>`. Nunca trabajes directo en `main`.
2. Antes de tocar cálculos fiscales: `npm test` en verde y, si falta, un test que fije el comportamiento actual.
3. Cambios pequeños y verificables. Un commit por cambio lógico, en español: `fix(seguridad): ...`, `feat(ux): ...`.
4. Al terminar: `npm test` + `npm run build` sin errores + verificación manual del flujo afectado.
5. **Entrega:** actualiza la casilla de tu tarea en tu manual (`- [x]`) y añade 1-3 líneas en `docs/mvp/BITACORA.md` (fecha, agente, qué cambió, qué quedó pendiente). Ese es todo el reporte.

## 6. Cuándo parar y preguntar
- Cualquier cambio en producción (SQL, Storage, Auth, Edge Functions, Netlify).
- Cualquier duda de regla fiscal: pregúntala y la responde la contadora. No inventes alícuotas ni porcentajes.
- Si una tarea exige tocar más de ~5 archivos que no son de tu área.

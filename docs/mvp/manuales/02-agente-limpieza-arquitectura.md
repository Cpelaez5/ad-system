# Manual 02 — Agente Limpieza & Arquitectura (Fase 1)

**Misión:** reducir el código y la documentación a lo que se usa de verdad, y arreglar los errores visibles, sin cambiar comportamiento.
**Modelo sugerido:** Claude Sonnet o Gemini 3.1 Pro (Antigravity).
**Lee:** `00-REGLAS-COMUNES.md`, `auditorias/audit-codigo.md` (completo, 217 líneas), `auditorias/audit-docs.md` §5-§6.
**Requisito:** Fase 0 terminada (al menos S1 y S2).

## Tareas

### L1. Código muerto (verifica cada archivo con grep antes de borrarlo)
- [x] Borrar: `components/**/AppNavigation-old.vue`, `Sidebar-old.vue`, `TrialBanner-old.vue`, `views/cliente/DashboardOld.vue`, `views/cliente/InvoiceFormPage.vue`, `views/shared/SingUp.vue`, `AnimatedTable.vue`, `CountrySelector.vue`, `CurrencyConverter.vue`, `LoadingSpinner.vue`, `AnimatedForm.vue`, `components/sections/PricingSection.vue`, `services/userService.fixed.js`, `services/userService.new.js`, `countryConfig.js`, `localStorageService.js`, `src/test_export.js`.
- [x] Router: quitar el import `ClienteArchivo` y la ruta comentada; ocultar `/ocr-demo` y `/test-form` con `import.meta.env.DEV`.
- [ ] Router: `/profile` → vista real o eliminar.
- [x] Raíz: mover a `scripts/legacy/` o borrar `debug_registration.js`, `test_*.{js,mjs,cjs,txt}`, `test-*.{js,mjs,cjs}`, `TEST_INVITATION.sql`, `INVITATION_SYSTEM.sql`, `supabase-schema.sql`, `supabase-seed-data.sql`.
- [x] `npm test` + `npm run build` en verde después de cada bloque.

### L2. Formularios de factura
- [ ] Confirmar con QA que `SimpleInvoiceForm` cubre ventas, compras y gastos con retenciones y Cashea. Luego quitar el `v-else` con `ClientInvoiceForm` y el flag `USE_SIMPLE_FORM` de `views/cliente/Facturacion.vue`.
- [ ] No tocar `InvoiceForm.vue` (flujo contador) en el MVP.
- [ ] Extraer los cálculos fiscales de `SimpleInvoiceForm.vue` (2945 líneas) a `src/utils/` o `src/services/fiscal/` con tests (coordinar con el agente Fiscal, manual 04).

### L3. Robustez
- [ ] Logger `src/utils/logger.js` (`debug/info/warn/error`, silencioso en producción salvo `error`) y `esbuild: { drop: ['console','debugger'] }` en el build de producción en `vite.config.js` (deja `console.error` si se decide así).
- [ ] Router guard (`src/router/index.js` ~312-488): una sola obtención del usuario por navegación (cachear en el store Pinia), snackbar en vez de `alert()`, limpiar `operationalRoutes` y los console.log.
- [ ] `router.onError`: si el error es "Failed to fetch dynamically imported module" / "Importing a module script failed", recargar la página una sola vez (pasa tras cada deploy de Netlify con chunks nuevos). Verificar antes si ocurre en producción.
- [ ] Manejador global de errores: `app.config.errorHandler` → snackbar "Algo salió mal, intenta de nuevo" + logger.

### L4. Errores visibles reportados por UX
- [ ] Proveedores: la etiqueta "IVA: 75%" es el **% de retención de IVA** → "Retención IVA: 75%" (y en lenguaje llano en el modo cliente).
- [ ] Dashboard admin, "Distribución de Gastos": agrupar por categoría (`expense_categories`), no por descripción de la línea.
- [ ] Landing: precios $0,00 → leer de `subscription_plans` o fijar los valores acordados (decisión D1 del plan).

### L5. Documentación
- [ ] Archivar `.agent/`, `CONTEXTO_PROYECTO.txt`, `src/views/GEMINI.md`, `src/views/README.md` en `docs/archivo/` (no borrar, por si acaso).
- [ ] Crear `docs/negocio/reglas-fiscales.md` a partir de `auditorias/audit-docs.md §3`, validado por la contadora.
- [ ] Actualizar `README.md` (cómo correr, entornos, deploy) y reducir `GEMINI.md` a: stack, decisiones vigentes y puntero a `docs/mvp/`.
- [ ] Reemplazar `.claude/agents/contabilidad-fullstack-dev.md` por agentes que apunten a estos manuales (o borrarlo).

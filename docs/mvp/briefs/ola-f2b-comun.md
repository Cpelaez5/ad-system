# Ola Fase 2b — reglas comunes (léelo entero antes de empezar)

Proyecto: AD System, SaaS contable venezolano. Vue 3 + Vite + Vuetify 3 + Pinia + Supabase. Usuario final: dueños de pequeños negocios, muchos mayores y poco digitales. **Móvil primero.**

1. Lee `docs/mvp/manuales/00-REGLAS-COMUNES.md` y `docs/mvp/diseno/sistema-diseno.md` (catálogo de componentes).
2. **No reinventar:** usa Vuetify y los componentes de `src/components/ui/` (EncabezadoPagina, EstadoVacio, AvisoAmable, BotonAccion, TarjetaAccion, DialogoAdaptable, HojaInferior, ResumenMonto, AyudaTermino, SeccionPanel). Si un patrón visual se repite en 2+ vistas y no existe, créalo en `src/components/ui/` con test en `src/components/ui/__tests__/` y añádelo al catálogo de `sistema-diseno.md`.
3. **Movimiento:** tokens `--ad-move-*` (`src/styles/animations.css`) y `src/components/ui/movimiento.js`. Siempre respetar `prefers-reduced-motion`. Animaciones sobrias, con estética premium.
4. Fechas: nunca `new Date('YYYY-MM-DD')`; usa `src/utils/fechas.js`. Montos: `src/utils/formatMoney.js`.
5. Textos en español llano, tuteo, sin jerga contable en la superficie (la jerga va en "detalles" o con AyudaTermino).
6. Errores: snackbar en lenguaje llano con acción "Reintentar" cuando aplique; botones con estado de carga; nada de clics muertos.
7. **Prohibido:** `git stash`, `git reset`, `git checkout -- …`, `git restore`, `git clean`. Prohibido aplicar migraciones o escribir en la base de datos real (no guardes registros de prueba). Si necesitas un cambio de BD, escribe el SQL propuesto en tu informe y deja esa parte detrás de una comprobación que no rompa si la columna no existe.
8. No lances subagentes.
9. Al terminar: `TZ=America/Caracas npx vitest run` y `npm run build` en verde; commits pequeños en tu rama, mensajes en español (`feat(...)`/`fix(...)`), terminando con la línea `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
10. Los E2E (`npx playwright test <archivo>`) levantan su propio build en 127.0.0.1:5174; credenciales en `e2e/.env.e2e.local` (cópialo desde la carpeta principal del repo `C:\Users\cpela\Documents\Development\Angelica\code\sistema-contabilidad\e2e\.env.e2e.local` si tu copia no lo tiene; nunca lo commitees). Son de solo lectura.
11. Informe completo en el archivo de informe indicado (qué cambiaste, archivos, tests, dudas). Devuelve solo: estado, commits, una línea de tests, dudas.

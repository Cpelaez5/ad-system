# Manual 07 — Agente QA (transversal)

**Misión:** ninguna fase se da por cerrada sin evidencia. Detectar regresiones y medir si de verdad es fácil de usar.
**Modelo sugerido:** Claude Sonnet con Claude in Chrome (navegador) + vitest.
**Lee:** `00-REGLAS-COMUNES.md`, `PLAN-MVP.md §2 y §6`, `auditorias/audit-ux.md` (línea base: 4/10).

## Reglas
- Prueba en **DEV** (Fase 0, S1). Si DEV aún no existe: solo navegar, sin guardar ni borrar nada.
- Credenciales de prueba: las del seed de DEV (no las escribas en informes).
- No dispares `alert()`/`confirm()` del navegador (bloquean la herramienta).
- La herramienta de resize del navegador **no** cambia bien el viewport: para móvil usa el modo dispositivo de DevTools vía `javascript_tool` o pide al usuario una prueba en su teléfono.

## Checklist por fase
- [ ] `npm test` (219+ tests) y `npm run build` en verde.
- [ ] Consola sin errores en los flujos tocados.
- [ ] **Flujo cliente:** login → inicio → registrar gasto con foto → registrar venta → ver "¿Cómo voy?" → mis papeles → plan/pago. Contar toques y tiempos.
- [ ] **Flujo super admin:** panel → aprobar un pago → invitar usuario → configuración IA.
- [ ] **Seguridad (tras la Fase 0):** usuario de la org A no ve filas ni archivos de la org B; signUp con rol forzado termina en `cliente`; anónimo no puede ejecutar RPCs de billing.
- [ ] **Prueba de la abuela** (7 principios de `PLAN-MVP.md §2`): puntuar 1-10 por pantalla.
- [ ] Informe breve en `docs/mvp/auditorias/qa-<fecha>.md` (hallazgos con severidad + puntuación) y línea en `BITACORA.md`.

## Facturas reales para probar el OCR
`examples/facturas-prueba/` (fuera de git, datos reales del usuario: no copiar su contenido a informes):
Corpelec ×2 (luz, Bs), Inter ×2 (internet, Bs), factura de imprenta digital (formato Providencia), courier internacional, Amazon y GitHub (USD).
Para cada una: subirla en "Gasté o compré algo" (modo simple), medir cuántos de los 4 datos salen bien sin corregir, si detecta la moneda y la tasa, y si trae los ítems. Registrar resultados en el informe de QA. No guardar los registros salvo que el usuario lo pida (y si se guardan, anotarlos para borrarlos).

## Suite E2E (Playwright)

Automatiza buena parte del checklist de arriba (flujo cliente, flujo super
admin, seguridad, consola sin errores) en los dos tamaños que importan.
Informe de referencia: `docs/mvp/auditorias/e2e-2026-10-13.md` (qué cubre,
cómo se montó, flakiness del entorno de pruebas y cómo se mitigó).

```bash
cp e2e/.env.e2e.example e2e/.env.e2e.local   # una vez, con las credenciales de prueba
npx playwright install chromium               # una vez

npm run test:e2e                               # desktop + mobile, los 10 flujos
npx playwright test --grep-invert @ocr         # igual, sin los tests de OCR (lentos)
npx playwright show-report                     # HTML con screenshots/traces de los fallos
```

- No crea, modifica ni borra datos reales: solo navega, abre diálogos y los
  cancela. Usa `storageState` (login real una sola vez por rol, ver
  `e2e/global-setup.js`), no reloguea en cada test.
- Si un flujo nuevo necesita un selector estable que no exista, prefiere
  `getByRole`/`getByText`; agrega `data-testid` o `aria-label` solo cuando de
  verdad no hay otra forma (documentarlo en el informe de la tarea).
- Errores de consola: lista blanca documentada en `e2e/helpers/base.js`
  (`ALLOWED_CONSOLE_PATTERNS`). Un error nuevo no listado hace fallar el
  test — investígalo antes de agregarlo a la lista (puede ser un bug real).

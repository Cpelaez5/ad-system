# Fase 2 — Especificación de diseño (simplicidad extrema, rol `cliente`)

> Fuente de verdad de la Fase 2. Complementa `manuales/03-agente-ux-simplicidad.md` (principios) y `PLAN-MVP.md §2` ("prueba de la abuela").
> Usuaria objetivo: dueña de bodega, 65 años, solo usa WhatsApp, teléfono Android. **Móvil primero.**

## 0. Reglas que no se negocian
1. **Un solo motor fiscal.** `SimpleInvoiceForm.vue` sigue siendo el único formulario. El "modo simple" es una forma de presentarlo, no un formulario nuevo. Ningún cálculo cambia (los tests de `tests/fiscal/` lo vigilan).
2. **Una sola forma de guardar.** La lógica de `Facturacion.vue → handleInvoiceSubmit` (RPC `registrar_compra_con_retenciones` si hay retenciones o es compra/gasto; `invoiceService.createInvoice/updateInvoice` en otro caso; email; evento `ad-proveedor-changed`) se mueve a `src/services/registroService.js → guardarRegistro(formData)` y la usan todas las pantallas.
3. Textos de la primera capa sin jerga. Para el término técnico: `<AyudaTermino clave="iva" />` (lee `src/constants/glosario.js`).
4. Cuerpo ≥16px, botones principales ≥56px de alto en móvil, contraste AA, nada de `alert()`.

## 1. Mapa de navegación del cliente
| Ruta | Pantalla | Nombre en menú | Antes |
|---|---|---|---|
| `/cliente/inicio` (nueva, **destino por defecto del cliente**) | `views/cliente/Inicio.vue` | Inicio | — |
| `/cliente/dashboard` | `views/cliente/Dashboard.vue` (sin cambios de lógica) | ¿Cómo voy? | Dashboard |
| `/cliente/facturacion` | igual | Mis movimientos | Facturación |
| `/cliente/fiscal-360` | igual (rediseño en U5) | Mis papeles | Expediente Fiscal 360 |
| `/cliente/inventario`, `/cliente/proveedores`, `/cliente/mi-area`, `/cliente/planes` | iguales | Mi mercancía, Mis proveedores, Mi negocio, Mi plan | — |

- Toda redirección que hoy manda al cliente a `/cliente/dashboard` (login, guard, `/dashboard`, logo) pasa a `/cliente/inicio`.
- **Móvil (<600px):** barra inferior fija (`v-bottom-navigation`, `grow`) con 4 ítems con ícono + texto: **Inicio · Registrar · Mis números · Más**.
  - *Registrar* abre una hoja inferior (`v-bottom-sheet`) con dos botones gigantes: "Vendí algo" y "Gasté o compré algo".
  - *Mis números* → `/cliente/facturacion`. *Más* → hoja con el resto del menú.
- **Escritorio:** menú lateral con texto siempre visible (sin modo "solo íconos" por defecto) que **empuja** el contenido (`v-navigation-drawer` permanente, no `temporary`).
- Header: las píldoras de tasa llevan etiqueta visible: "Dólar BCV hoy: Bs 36,50" (2 decimales). En móvil solo la del dólar.

## 2. Inicio del cliente (`/cliente/inicio`)
```
┌──────────────────────────────────┐
│ ¡Hola, María!                    │
│ En octubre vendiste $1.250 y     │
│ gastaste $830. Te quedan $420.   │  ← una frase, montos en USD (y Bs pequeño)
├──────────────────────────────────┤
│ [ 🛒  Vendí algo            ]    │  ← botones 72px, ancho completo, icono + texto
│ [ 🧾  Gasté o compré algo   ]    │
│ [ 📊  ¿Cómo voy?            ]    │
├──────────────────────────────────┤
│ Lo que tienes pendiente          │
│ 🔴 Tu RIF vence en 5 días   [Ver]│  ← de fiscal_docs (expiration_date), semáforo
│ 🟡 Tu plan vence en 9 días  [Pagar]
│ (vacío: "Todo al día 👍")        │
└──────────────────────────────────┘
```
- Datos del mes: ventas = facturas `flow=VENTA`, gastos = `flow=COMPRA` del mes actual del cliente (reutiliza `invoiceService.getInvoices` o la RPC `get_invoice_stats` si sirve; montos en USD con la tasa guardada en cada factura). Si no hay datos: "Este mes todavía no registras nada. Empieza tocando **Gasté o compré algo**."
- Pendientes: documentos de `fiscal_docs` con `expiration_date` en ≤30 días o vencidos (misma regla que `fiscalService`), y factura de suscripción pendiente (`system_invoices` status pending/overdue). Máximo 3; enlace "Ver todo".
- "Vendí algo" / "Gasté o compré algo" abren `SimpleInvoiceForm` en **modo simple** (diálogo `fullscreen` en móvil) con `flow` VENTA / COMPRA y guardan con `registroService.guardarRegistro`. Al terminar: snackbar "¡Listo! Guardamos tu gasto." + botón "Registrar otro".

## 3. Modo simple de `SimpleInvoiceForm` (prop nueva `simple: Boolean`, default `false`)
Con `simple=false` el formulario queda **exactamente igual** que hoy (lo usa Facturación).
Con `simple=true`:
1. **Paso 1 — ¿Tienes la factura?** Tres botones grandes: `📷 Tomarle foto` (input `accept="image/*" capture="environment"`), `📎 Subir archivo` (PDF/imagen), `✍️ No tengo factura` (tipo de documento `RECIBO`, salta el OCR). Reutiliza el panel OCR existente (líneas ~51-110), solo cambia su presentación.
2. **Mientras lee:** mensajes humanos ("Leyendo tu factura…", "Buscando el total…") y skeleton; nunca jerga del OCR.
3. **Paso 2 — Confirma 4 datos** (tarjeta grande):
   - COMPRA: **¿A quién le pagaste?** (selector de proveedor existente) · **¿Cuánto?** (total + moneda) · **¿Cuándo?** · **¿En qué?** (categoría de gasto con íconos, `ExpenseCategorySelector`).
   - VENTA: **¿A quién le vendiste?** · **¿Cuánto?** · **¿Cuándo?** · **¿Cómo te pagaron?** (método de pago).
   - Debajo, un acordeón cerrado **"Ver detalles contables"** que contiene TODO lo demás del formulario actual (número de factura y control, tipo de documento, estado, ítems, impuestos, tasa, Cashea, retenciones, mis datos). Se renderiza siempre (`v-show`/`eager`), así los cálculos y validaciones siguen funcionando.
   - Si la validación falla por un campo dentro de "detalles", el acordeón se abre solo, hace scroll al campo y muestra un mensaje llano ("Falta el número de la factura. Lo encuentras arriba a la derecha del papel.").
4. **Retenciones:** si el perfil del cliente NO es agente de retención (`clients.es_contribuyente_especial` y `es_agente_retencion_municipal` falsos, y no `retains_islr`), en modo simple no se muestra nada de retenciones. Si lo es, una línea: "También preparamos tu comprobante de retención" (el cálculo sigue siendo el actual).
5. **Botón principal** fijo abajo: "Guardar" (56px). Tras guardar: pantalla de éxito con "Registrar otro" y "Volver al inicio"; si hubo retención, "Descargar comprobante".

## 4. Componentes y utilidades nuevos
- `src/utils/formatMoney.js`: `formatMoney(monto, moneda='USD', { abreviar=false })` → "$ 1.250,00", "Bs 36,50", abreviado "Bs 20,5 millones" (≥1.000.000). Separadores venezolanos (miles con punto, decimales con coma). Con tests.
- `src/components/common/AyudaTermino.vue`: ícono (?) 24px tocable (área 44px) que abre un `v-menu`/`v-bottom-sheet` (móvil) con `simple`, `explicacion` y `ejemplo` del glosario.
- `src/services/registroService.js` (ver regla 0.2) con tests mockeando servicios.

## 5. Tipografía y tema (main.js `createVuetify`)
- Base 16px; `v-btn` `size="x-large"` en acciones principales del cliente; inputs `density="comfortable"`.
- Corrige contraste: el dorado `#E0B04F` nunca como color de texto sobre blanco.

## 6. Orden de trabajo y reparto
| Ola | Tarea | Agente | Archivos (no pisarse) |
|---|---|---|---|
| 1 | `formatMoney` + `AyudaTermino` | Gemini | `src/utils/formatMoney.js`, `src/components/common/AyudaTermino.vue` + tests |
| 1 | `registroService` + `Inicio.vue` + rutas del cliente | Sonnet A | `src/services/registroService.js`, `src/views/cliente/Inicio.vue`, `src/router/index.js`, `src/views/cliente/Facturacion.vue` (solo usar el servicio) |
| 1 | Modo simple de `SimpleInvoiceForm` | Sonnet B | `src/components/forms/client/SimpleInvoiceForm.vue` |
| 2 | Navegación (barra inferior + menú con texto) + header + tipografía | Sonnet C | `src/components/layout/*`, `src/App.vue`, `src/main.js` |
| 3 | Perfil fiscal guiado (U4), Mis papeles (U5), bienvenida (U6) | por definir | — |
| cierre | QA "prueba de la abuela" en móvil | QA | — |

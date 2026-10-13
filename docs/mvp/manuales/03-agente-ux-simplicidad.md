# Manual 03 — Agente UX Simplicidad (Fase 2) ⭐ diferenciador

**Misión:** que una persona de 65 años que solo usa WhatsApp pueda registrar lo que vende y lo que gasta desde su teléfono sin ayuda. Pasar de 4/10 a ≥8/10 en facilidad para novatos.
**Modelo sugerido:** Gemini 3.1 Pro en Antigravity para iterar pantallas, con revisión de Claude. Sirven las skills de diseño `impeccable`, `minimalist-ui` y `emil-design-eng`.
**Lee:** `00-REGLAS-COMUNES.md`, `PLAN-MVP.md §2` (principios, **obligatorios**), `auditorias/audit-ux.md` (completo), `auditorias/competencia.md §5`, `auditorias/audit-examples.md` (identidad visual).

## Identidad visual (respetar)
Rojo `#A81C22`, azul `#1F355C`, dorado `#E0B04F`, gris `#EFEFEF`. Títulos con Montserrat (instalada) y cuerpo con Open Sans. Verifica contraste AA: el dorado sobre blanco **no** pasa para texto.

## Tareas

### U1. Base transversal (primero)
- [ ] Tokens de tipografía: cuerpo ≥16px, botones ≥48px de alto, inputs grandes. Ajustar el tema de Vuetify (`src/plugins` o donde esté `createVuetify`).
- [ ] Navegación: en móvil, barra inferior con 4 ítems con ícono y **texto** (Inicio, Registrar, Mis números, Más). En escritorio, menú lateral con texto visible que **empuje** el contenido en lugar de taparlo.
- [ ] Header: las dos píldoras de moneda llevan etiqueta ("Dólar BCV hoy: Bs X"). Formato de montos: 2 decimales y abreviado en grandes (`Bs 20,5 millones`), con el exacto en tooltip. Crear `src/utils/formatMoney.js` si no existe y reutilizarlo.
- [ ] Componente `<AyudaTermino termino="iva_retenido">` con un (?) que abre una explicación de 1-2 líneas. Glosario en `src/constants/glosario.js` (textos validados por la contadora).
- [ ] Estados vacíos que enseñan ("Aún no registras gastos. Toca **Registrar** y tómale una foto a tu factura").

### U2. Inicio del cliente (`/cliente/dashboard`)
- [ ] Arriba, una frase: "En octubre vendiste $X y gastaste $Y. Te quedan $Z."
- [ ] Tres botones gigantes: **Vendí**, **Gasté / Compré**, **¿Cómo voy?**
- [ ] Bloque "Lo que tienes pendiente" (vencimientos del Expediente, pagos de plan) con semáforo.
- [ ] Mover los gráficos a "¿Cómo voy?".

### U3. Registro por foto (flujo principal, máximo 3 toques)
- [ ] "Gasté / Compré" abre directamente: `[📷 Tomar foto] [📎 Subir archivo] [✍️ Sin factura]` (en móvil, `capture="environment"`).
- [ ] Durante el OCR: progreso con mensajes humanos ("Leyendo tu factura...") y skeleton.
- [ ] Tarjeta de confirmación con 4 campos: **¿A quién le pagaste?** (proveedor, autocompletado), **¿Cuánto?** (total y moneda), **¿Cuándo?**, **¿En qué?** (categoría con íconos). Botón grande **"Guardar"**.
- [ ] "Ver detalles contables ▾" plegado: base imponible, IVA, exento, retenciones (calculadas automáticamente por el agente Fiscal, manual 04).
- [ ] Al guardar: confirmación clara + "¿Registrar otra?". Si la retención genera un comprobante: "Listo, también preparamos tu comprobante de retención [Descargar] [Enviar por WhatsApp]".
- [ ] Reutilizar `SimpleInvoiceForm` como motor (no crear un 4º formulario): la vista simple es una capa de presentación encima, o un modo `simple` del mismo componente.
- [ ] Mismo patrón para **Vendí**.

### U4. Perfil fiscal guiado (`/cliente/mi-area`)
- [ ] Asistente de preguntas sí/no en lenguaje llano: "¿Vendes productos, servicios o ambos?", "¿El SENIAT te nombró contribuyente especial?", "¿Tu alcaldía te nombró agente de retención?", "¿Llevas inventario?".
- [ ] Las respuestas guardan flags en `clients` que **ocultan** los módulos que no aplican (retenciones IVA, municipal, inventario). Coordinar las columnas con el agente Seguridad/BD.

### U5. "Mis papeles y vencimientos" (antes Expediente Fiscal 360)
- [ ] Renombrar en la UI. Intro de 2 líneas: "Aquí guardas los papeles de tu negocio y te avisamos antes de que se venzan."
- [ ] Tarjetas por documento con semáforo (gris = falta mucho, verde = recién emitido, amarillo = se acerca, rojo = vence pronto o ya venció) y "vence en X días". Spec: `examples/expediente-fiscal-360.md`.
- [ ] Fechas de emisión y vencimiento obligatorias al subir. Barra de progreso "Tu negocio está al día: 7 de 10".
- [ ] Resolver "Cartelera fiscal" según la decisión D3.

### U6. Primer ingreso
- [ ] Bienvenida de 3 pantallas (qué es, cómo registrar con foto, dónde ver cómo voy) → perfil fiscal guiado → "Registra tu primer gasto". Reutilizar `/welcome`.

### U7. Errores y feedback
- [ ] Todos los `catch` de las vistas del cliente muestran un snackbar en lenguaje llano con acción ("Reintentar").
- [ ] Botones con estado de carga; nada de clics "muertos".

## Criterios de aceptación de la fase
- Recorrido QA en móvil real (390px) sin scroll horizontal ni contenido tapado.
- Gasto con foto: ≤3 toques y ≤60 s.
- Ningún término fiscal en la primera capa sin su (?).
- `npm test` en verde y los cálculos sin cambios (tests del agente Fiscal).

### U8. Diálogos usables en el teléfono (hallazgo E2E 2026-10-13)
- [ ] Crear `src/components/ui/DialogoAdaptable.vue` (envoltorio de v-dialog: `scrollable`, `fullscreen` en xs, acciones fijas abajo, título con botón cerrar) y migrar TODOS los diálogos del cliente. Caso real: el diálogo de subir documento de Mis papeles era más alto que la pantalla y "Guardar/Cancelar" quedaban inalcanzables (corregido puntualmente en FiscalDocDialog).
- Archivos con diálogos sin `scrollable`/`fullscreen`: ClienteMiArea, Compras, Facturacion (4), FacturacionSuscripcion (3), Fiscal360, Gastos, Inventario (4), Proveedores, Ventas, CasheaInstallmentsModal, ClientInvoiceForm, InventoryAdjustmentDialog, HojaInferior (revisar).
- Cubrir con un test E2E móvil por diálogo principal (abrir → los botones de acción están visibles sin scroll → cancelar).

# Tarea B — Consistencia de "Mi negocio" (Proveedores, Inventario, Mi área, Plan y pagos)

Vistas: `src/views/cliente/Proveedores.vue`, `Inventario.vue`, `ClienteMiArea.vue`, `FacturacionSuscripcion.vue`, `Planes.vue`, `Checkout.vue`, `Archivo.vue`; componentes `src/components/forms/client/CasheaInstallmentsModal.vue`, `src/components/inventory/InventoryAdjustmentDialog.vue`.

1. **Diálogos (U8):** cada `v-dialog` → `DialogoAdaptable` (o `HojaInferior` para menús cortos). Acciones en el slot `acciones`.
2. **Encabezado** con `EncabezadoPagina`; **estados vacíos** con `EstadoVacio` que enseñan.
3. **Listas en móvil** (proveedores, productos, facturas del plan): en xs tarjetas/lista legible en vez de tabla; en escritorio tabla. Para eso crea un componente ui genérico `FilaLista` (título, subtítulo, valor a la derecha, chip de estado, slot de acciones). El agente A crea `FilaMovimiento` para facturas; no lo dupliques.
4. **Planes:** precios con `formatMoney`, plan recomendado destacado, comparación clara contra el plan actual.
5. **Errores (U7)** y botones con carga.
6. Checkout: solo presentación; no toques la lógica de pago.
7. Crea `e2e/11-mi-negocio.spec.js` (solo lectura, móvil y escritorio): Proveedores, Inventario y Mi área cargan sin errores de consola; un diálogo de Proveedores abre con "Cancelar" visible sin scroll y se cierra sin guardar. Usa `e2e/helpers/`.

Informe: `docs/mvp/briefs/ola-f2b-B-informe.md`.

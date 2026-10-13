# Corrección de la revisión independiente — ola F2b

Lee primero `docs/mvp/briefs/ola-f2b-comun.md` (reglas comunes) y el informe de la revisión:
`C:\Users\cpela\Documents\Development\Angelica\code\sistema-contabilidad\docs\mvp\auditorias\review-ola-f2b.md`
(está en la carpeta principal, no en tu copia, porque `auditorias/` no se versiona).

Corrige TODOS los Críticos e Importantes y los Menores indicados abajo, con las decisiones del orquestador (son vinculantes):

## Críticos
- **C1 lista móvil de Facturación:** cada `FilaMovimiento` debe ofrecer las mismas acciones que la tabla de escritorio (ver, editar, cuotas Cashea cuando aplique, Excel/descargas, mover a papelera). Toque en la fila = ver detalle; el resto en un menú de "⋮" (v-menu) o deslizable, como prefieras, pero con targets ≥44px. En la pestaña **Papelera**: restaurar y eliminar definitivamente (con confirmación) también desde el móvil.
- **C2 retenciones con proveedor nuevo (pendiente del OCR):** la vista previa y el guardado deben calcular las retenciones igual que con un proveedor existente. Decisión: el proveedor pendiente usa valores por defecto — `tipo_persona` deducido de la letra del RIF (J, G, C → jurídica; V, E, P → natural), `iva_retention_rate` = 75 (porcentaje legal por defecto), sin concepto ISLR salvo que la persona lo elija. Mostrar un `AvisoAmable` en el formulario: "Proveedor nuevo: revisamos las retenciones con valores por defecto; confírmalas en Ver detalles". El proveedor se crea con esos mismos valores. Test que demuestre que un cliente agente de retención con proveedor pendiente obtiene la retención de IVA calculada y el RPC la recibe.

## Importantes
- **I1** la lista móvil respeta la moneda de cada factura (igual que la tabla: monto en su moneda + equivalente).
- **I2** `normalizarRif`: formato SENIAT = letra (V, E, J, P, G, C) + 8 dígitos + 1 dígito verificador. Si el cuerpo trae menos de 8 dígitos, rellenar con ceros a la izquierda. Validar el dígito verificador con el algoritmo del SENIAT. Si no valida o falta el verificador, devolver `null`: no se autocrea el proveedor y se deja el campo para que la persona lo escriba. Aceptar prefijos como "RIF:", espacios, puntos y guiones. Tests con RIF válidos e inválidos (usa RIF inventados que calcules con el algoritmo; no copies datos de facturas reales).
- **I3** al detectar un proveedor nuevo por OCR, limpiar `issuer.id` previo. `_proveedorPendiente` **nunca** se guarda dentro de la factura (quitarlo del payload antes del RPC/update). Al cambiar de flujo (Gasté ↔ Vendí), cancelar o editar, se descarta.
- **I4** si la búsqueda de duplicados falla, NO crear el proveedor: error en lenguaje llano y no guardar. Si la factura falla después de crear el proveedor en ese mismo intento, borrar ese proveedor recién creado (compensación) y avisar.
- **I5 + Menor "la X se salta los cierres propios":** `DialogoAdaptable` debe pasar por el cierre de cada vista. Revisa los ~15 diálogos migrados en la ola y cablea su método de cierre/reset (p. ej. `@update:model-value="v => !v && cerrarX()"`), para que la X, el botón Cancelar y el clic afuera hagan lo mismo. `InventoryAdjustmentDialog` se reinicia al cerrarse, y "Confirmar consumo" no puede ejecutarse dos veces (deshabilitar mientras guarda + reinicio al cerrar).
- **I6** con ítems de venta del OCR, no recalcular la base imponible con precios del inventario. Los ítems se adjuntan con los precios leídos; base, IVA y total quedan los del OCR. Si la suma de ítems no coincide con la base, mostrar un aviso, no corregir en silencio.
- **I7** al escanear una compra no se crean productos de inventario hasta guardar de verdad; si se cancela, no queda nada.
- **I8** E2E: en `08-facturacion` usa un selector inequívoco (data-testid o `.first()` justificado). En `05-ocr` verifica de verdad que el proveedor y la categoría quedaron prellenados (o el aviso de proveedor nuevo). No hace falta que los ejecutes: el orquestador los corre.
- **I9** `sugerirCategoria`:
  - coincidencias por palabra completa (con límites de palabra y sin acentos ni mayúsculas);
  - quitar "PDV" de combustible;
  - ignorar etiquetas como "Teléfono:", "Tlf:" o "Email:";
  - la categoría se elige por nombre exacto normalizado, no por parte del nombre.
  - Solo se **prellena** con confianza alta (historial del proveedor o palabra clave fuerte). Con confianza media, mostrar un chip "¿Es «X»?" que la persona toca para aceptar.

## Menores a corregir
- Fechas con `new Date('YYYY-MM-DD')` en Plan y pagos → `src/utils/fechas.js`.
- `animation-delay` y entradas escalonadas: anular con `prefers-reduced-motion`.
- Estados vacíos con filtros activos: "No hay resultados con estos filtros" + botón "Limpiar filtros" (en vez de "Aún no registras…").
- `ocrProveedorYCategoria.test.js`: que pruebe el componente o las funciones reales, no una copia de la lógica.
- El resto de Menores del informe: corrígelos si son de bajo riesgo; si no, déjalos listados en tu informe con el porqué.

## No tocar
`src/components/layout/*` (menú lateral recién rehecho por el orquestador), las migraciones ni la base de datos.

Informe: `docs/mvp/briefs/ola-f2b-fix-informe.md` (estado de cada hallazgo: corregido / no corregido + motivo).

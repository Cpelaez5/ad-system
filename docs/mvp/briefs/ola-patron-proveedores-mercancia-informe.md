# Informe: Mis proveedores y Mi mercancía (ola patrón cliente)

- Mis proveedores: frase de resumen, buscador, `FiltroChips`, lista en `SeccionLista` (fila con "Ver" + ⋮), "Tu siguiente paso" (completar RIF). Sin tarjetas KPI.
- Mi mercancía: frase, `BarraSegmentos` (bien / por agotarse / agotados según `min_stock`), "Tu siguiente paso", `FiltroChips` de stock, filas con "Editar" + ⋮, estado vacío con dos salidas.
- `EstadoVacio`: nueva segunda salida opcional (`textoAccionSecundaria`), con test.
- `ProveedorModalForm`: cuerpo con `min-height: 0` y `overflow-auto` para que el pie quepa.
- E2E `11-mi-negocio`: verde (6/6; 2 reintentos por red). La falla de "881px" y "1212px" era medir el botón durante la transición de entrada del diálogo; el spec ahora espera a que se asiente.
- Pendiente / futuro: "Subir lista de Excel" solo avisa que llegará (no existe importación). Botones +/− grandes: ver `InventoryAdjustmentDialog` (sin cambios de lógica).
- Nota de entorno: en la copia aislada `node_modules` está vacío, por lo que `tests/calidad/iconos.spec.js` falla ahí; los íconos usados se verificaron contra @mdi del repo principal.

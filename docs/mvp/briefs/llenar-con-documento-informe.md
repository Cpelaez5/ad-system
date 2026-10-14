# Llenar con un documento (v1): informe

Puntos 1, 2 y 3 de `docs/mvp/diseno/llenar-con-documento.md`.

## Qué se hizo
- `src/services/documentoIaService.js`: `leerDocumento` (reutiliza `reducirImagen` de `productoFotoService`; PDF tal cual si pesa 8 MB o menos), mapeos puros `aProveedor`, `aCliente`, `aEmpresa`, `aplicarSoloVacios` y `restaurar`, y mensajes amables por código de error.
- `src/components/ui/LlenarConDocumento.vue`: botón con `mdi-card-account-details-outline` (verificado en el CSS de MDI). En el teléfono abre un menú con "Tomar foto" y "Subir foto o PDF". En escritorio va directo al selector. Muestra "Leyendo tu documento…", la marca "Llenado con IA desde el RIF/la cédula · revisa los datos" y "Deshacer". Nunca bloquea.
- Integrado en Nuevo proveedor (`ProveedorModalForm`, solo al crear; el RIF dispara la búsqueda en el catálogo global que ya existía; sin tocar retenciones), Nuevo cliente (`Clientes.vue`) y Mi negocio (`ClienteMiArea.vue`).
- Mi negocio: el componente rechaza el documento si el RIF no coincide con el del negocio o si es una cédula, y no llena nada en esos casos. Si viene `fecha_vencimiento`, pregunta "¿Guardamos también tu RIF en Mis papeles con vencimiento el DD/MM/AAAA?". Solo si acepta, `fiscalService.saveFiscalDoc` sube ese mismo archivo como papel RIF (categoría LEGAL).

## Decisiones
- `tipo_persona` se sobrescribe al llenar (tiene un valor por defecto), pero "Deshacer" lo restaura.
- Con `legible === false` no se llena nada. Con confianza baja se llena, se muestra el mensaje amable y queda la marca de revisar.
- `ClienteMiArea.vue`: cambios localizados (bloque en la cabecera de "Datos de la empresa", imports y 3 métodos).

## Verificación
- `TZ=America/Caracas npx vitest run`: 110 archivos, 1031 pruebas en verde. `npm run build` en verde.
- E2E nuevo `e2e/14-llenar-con-documento.spec.js` (botón en Nuevo proveedor y Nuevo cliente, cancelar sin guardar). No se ejecutó con Playwright: se verificó el mismo flujo con un script de capturas.
- IA real una vez por formulario con un RIF ficticio (Distribuidora Ejemplo, C.A., J-40123456-7), sin guardar nada. Llenó nombre, RIF, tipo de persona, teléfono y dirección sin avisos. Para el script la sesión se inyectó en el origen 127.0.0.1:5191, porque la sesión guardada pertenece al 5174.
- Capturas: `docs/mvp/briefs/capturas/documento-{escritorio,movil}-{cliente,proveedor}-{1-boton,2-leyendo,3-lleno}.png`.
- Pendiente: captura de Mi negocio y de la oferta de guardar el RIF (cubierta por revisión de código, no por prueba visual).

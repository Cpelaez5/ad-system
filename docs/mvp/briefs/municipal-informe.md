# Retenciones municipales por municipio — informe (2026-10-15)

## Hecho
1. **Servicio** (`src/services/municipalConceptsService.js`): `getConcepts({ municipioId })` trae los activos comunes (organization_id null) y los del despacho, con `origen: 'comun' | 'despacho'`; con municipio, primero los de ese municipio y luego los generales. Crear y editar aceptan `municipio_id`, `ordenanza`, `vigente_desde`; `{ comun: true }` (super admin) crea/edita en el catálogo común. Se mantiene `{ success, data }`. Nuevos: `getMunicipios()` (con caché), `resolverMunicipio()` y `sugerirConceptoPorLicencia()`.
2. **/municipal-settings** rediseñado con el patrón del cliente: filtro de municipio (selector, son 24), filtro de origen con `FiltroChips` (Todos · AD System · Mi despacho), lista en filas (no tabla), diálogo con `DialogoAdaptable` (municipio, ordenanza, vigente desde), 0 % aceptado, quitar con confirmación propia. Cliente solo consulta (aviso + "No encuentro mi código"); admin y contador gestionan los de su despacho; el super admin además crea y gestiona los comunes (interruptor "Código común de AD System"). También se corrigió un fallo viejo: la vista asignaba la respuesta `{success,data}` entera a la lista.
3. **Mi negocio**: `src/components/cliente/RetencionesMunicipales.vue`, insertado con 5 líneas en `ClienteMiArea.vue`, solo si `es_agente_retencion_municipal`. Muestra municipio, códigos que aplican, "Ver todos los códigos" y "No encuentro mi código" (evento `ad-open-support-chat`, confirmado en `SupportChat.vue`). Sin municipio: "Elige tu municipio en Datos de la empresa".
4. **Registro de compras**: `RetentionAdjustSheet` filtra los conceptos al municipio del negocio y preselecciona el concepto cuyo `codigo` coincide con la licencia del proveedor ("Sugerido por la actividad del proveedor"), sin pisar una elección previa y siempre editable. `SimpleInvoiceForm` solo pasa tres props; el cálculo no cambió.

## Hallazgo importante (dato)
`clients.municipio_id` guarda el **nombre** ("Chacao", "Caroní"), mientras `proveedores.municipio_id` guarda uuid (algunos valores raros como `m-baruta`). Por eso `resolverMunicipio` acepta id o nombre, usa el estado para desempatar y, si no hay coincidencia única (p. ej. "Caroní" no está entre los 24), **no filtra** (muestra todos). Conviene normalizar en una ola futura.

## Verificación
- Capturas: `docs/mvp/briefs/capturas/municipal-*.png` (inspección, sin datos: lista vacía) y `municipal-confirmacion-*.png` (con 3 códigos de ejemplo simulados en el navegador y la pregunta de agente respondida "Sí" solo en pantalla; nada se guardó en la BD).
- Ronda de inspección: aviso del cliente apretado en teléfono y chips cortados; corregidos (botón debajo del texto, chips que saltan de línea). Se hizo una pasada extra de confirmación tras esos arreglos.
- La sesión guardada de `cliente.json` estaba vencida (token renovado por otro uso), así que las capturas se hicieron con un inicio de sesión nuevo en un solo contexto; no se tocó el archivo compartido.
- Cortes de red intermitentes (`ERR_NETWORK_ACCESS_DENIED`) reintentados.
- E2E nuevo `e2e/15-municipal-settings.spec.js` (escritorio y teléfono, sin guardar): escrito pero **no ejecutado** aquí (la sesión compartida está vencida; correrlo regenera la sesión).
- El test antiguo `tests/services/municipalConceptsService.spec.js` se reemplazó por `src/services/__tests__/municipalConceptsService.test.js`.

## Pendiente / ideas
- No se escribió en la BD: el catálogo común sigue vacío (carga de alícuotas = tarea del super admin).
- Normalizar `clients.municipio_id` a uuid.
- Revisar las 7 retenciones municipales de prueba existentes (punto 5 de la auditoría).

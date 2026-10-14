# Mis clientes: informe

## Hecho
- `src/services/clientesNegocioService.js`: listar con totales (90 días, año, por cobrar CRÉDITO/VENCIDA, última compra) unidos en JS sin embeds; obtener, obtenerBasico, crear, actualizar, papelera, buscar, `asegurarClienteDeVenta`. Moneda con `aUSD` de Mis movimientos.
- `src/utils/telefono.js`: `0414-123.45.67` -> `584141234567`, enlace wa.me (solo abre) y mensaje amable de cobro.
- `src/views/cliente/Clientes.vue` (`/cliente/clientes`), menú lateral y hoja "Más" tras "Mis proveedores", ícono `mdi-account-group-outline` (verificado).
- `ClienteNegocioAutocomplete.vue` en `SimpleInvoiceForm` (modo simple y completo), con "Nuevo cliente: «texto»" (RIF y teléfono opcionales), "Consumidor final" y aviso de contribuyente especial.
- Prellenado: `/cliente/facturacion?cliente=<id>` abre una venta nueva con ese cliente (prop `clienteInicial`).
- `registroService`: una llamada a `asegurarClienteDeVenta` antes de guardar VENTA (crear y editar). `invoiceService` envía y devuelve `cliente_negocio_id`.

## Notas y decisiones
- El cliente nuevo se crea solo al guardar. Si la factura falla después, el cliente queda creado (es un cliente real que la persona escribió); no se compensa.
- `asegurarClienteDeVenta` devuelve `{ success, id, creado, message }`, no solo el id. Si no puede comprobar duplicados, no guarda.
- Sin RIF válido no se busca por nombre: nunca se fusionan personas por nombre.
- Editar una venta antigua sin vínculo la enlaza (o crea el cliente) al guardar.
- Pendiente de la otra rama: `?ver=<id>` en Mis movimientos.
- Tres tests de `tests/auditoria/conexiones-modulos.spec.js` (inventario) fallan por diseño: demuestran huecos de otra tarea.
- El puerto 5187 estaba ocupado por otra vista previa; se usó 5197.
- La sesión `cliente.json` sirvió (origen remapeado a mi puerto). Hubo cortes `ERR_NETWORK_ACCESS_DENIED` intermitentes; se reintentó. El E2E `12-mis-clientes.spec.js` no se ejecutó completo por esa red.

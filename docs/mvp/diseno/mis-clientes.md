# Mis clientes — a quién le vende el negocio

Fecha: 2026-10-14. Pedido del usuario: "veo que falta un módulo de Clientes", dentro de la revisión de conexiones entre módulos.

## Situación actual (verificada en la BD)
- No existe una tabla de clientes del negocio. Cada venta guarda al comprador como JSON en `invoices.client_info`, y no se reutiliza entre ventas.
- `invoices` tampoco tiene `proveedor_id`: las compras guardan al proveedor en el JSON `issuer` y se vinculan con `proveedores` por RIF.
- Ojo con el nombre: `clients` ya es la tabla de las EMPRESAS que usan AD System. La tabla nueva se llama **`clientes_negocio`**.

## Modelo de datos (migración aditiva)
- `clientes_negocio`: `id`, `client_id` (FK a `clients`; es la ÚNICA FK), `organization_id` (sin FK), `tipo_persona` (`natural` | `juridica`), `nombre`, `rif` (opcional: una persona natural puede no darlo), `rif_normalizado` (índice único por `client_id` cuando tenga formato SENIAT válido, igual que proveedores), `telefono`, `correo`, `direccion`, `es_contribuyente_especial` (nos retiene IVA), `notas`, `deleted_at`, `created_at` y `updated_at`.
- RLS igual que `proveedores`: la empresa ve solo los suyos; admin y contador de la organización ven todos.
- `invoices.cliente_negocio_id uuid` y `invoices.proveedor_id uuid` **sin FK**, con índice. Una FK haría que `invoices` pareciera tabla puente entre `clients` y `clientes_negocio`, y los embeds de PostgREST se volverían ambiguos (regla del incidente del 2026-10-13). La integridad la garantiza la app y un trigger liviano, si hace falta.
- **Migración de datos:** por cada venta existente, crear o encontrar el cliente por RIF normalizado (o, si no hay RIF, por nombre normalizado) y llenar `cliente_negocio_id`. Lo mismo con `proveedor_id` para las compras, enlazando con `proveedores` por RIF. El proceso es idempotente.

## Pantalla "Mis clientes" (pensada primero para el teléfono, con el patrón del cliente)
- Encabezado "Mis clientes", subtítulo "A quién le vendes y quién te debe", botón **"Nuevo cliente"** y el menú ⋮ (Exportar Excel, Importar desde Excel en una fase 2).
- Una frase-resumen: "Tienes 24 clientes. **Te deben $X** entre 5 clientes."
- **Tu siguiente paso:** "Juan Pérez te debe $120 desde hace 18 días → **Recordarle por WhatsApp**". Abre `wa.me/<teléfono>?text=` con un mensaje amable prellenado; **no se envía nada automáticamente**: la persona toca Enviar en su WhatsApp. Si no hay teléfono: "Agregar teléfono".
- Filtros con conteo: Todos · Me deben · Frecuentes (3 o más compras en 90 días) · Sin datos fiscales.
- Cada fila muestra iniciales, nombre, RIF o "Sin RIF", total comprado en los últimos 90 días, un chip "Te debe $X" si debe, y una acción (Cobrar o Ver). Con ⋮: Editar, Llamar, WhatsApp, Papelera.
- **Detalle del cliente:**
  - datos;
  - cifras: comprado este año, por cobrar y última compra;
  - su historial de ventas, que enlaza a Mis movimientos;
  - el botón "Registrar venta a este cliente", que abre el formulario con el cliente ya elegido.

## Conexión con el registro de ventas (`SimpleInvoiceForm`)
- En VENTA, "¿A quién le vendiste?" pasa a ser un autocompletado de `clientes_negocio` (por nombre o RIF), con la opción "Nuevo cliente: «texto»". El cliente nuevo **se crea al guardar la venta**, no al escribirlo, igual que el proveedor pendiente del OCR. Si la venta se cancela, no se crea nada.
- "Consumidor final" sigue disponible sin crear cliente.
- Al guardar: `cliente_negocio_id` en la factura y `client_info` sigue lleno (compatibilidad con los PDF y los libros de ventas).
- Si el cliente es contribuyente especial, el formulario recuerda: "Este cliente te retiene IVA; pídele el comprobante". Eso alimenta "Mis retenciones".

## Fuera de alcance (fase 2)
- Recordatorios automáticos de cobro programados.
- Listas de precios por cliente.
- Importación de clientes desde Excel (reutilizar el motor de `importacionProductos`).
- Segmentación para marketing.

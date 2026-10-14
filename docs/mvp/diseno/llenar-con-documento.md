# "Llenar con un documento": la IA llena los formularios

Fecha: 2026-10-14. Pedido del usuario:

> que pueda agregar proveedores o clientes usando un documento que analice la IA… le paso un RIF o una cédula, ya sea imagen o PDF, y que la IA me mapee los datos en el formulario. Este enfoque hay que aplicarlo donde sea posible, para facilitarle los procesos a los clientes.

## Pieza común
- **Edge Function `documento-ia`** (v1, desplegada y probada con un RIF ficticio: 8 s, confianza alta):
  - Recibe `POST { archivo: { base64, mime }, tipo_esperado?: 'rif' | 'cedula' | 'auto' }` y devuelve `{ documento: { tipo, tipo_persona, nombre, rif, cedula, domicilio_fiscal, estado, fecha_inscripcion, fecha_vencimiento, telefono, correo, confianza, legible } }`.
  - Acepta JPG, PNG, WebP o PDF, de hasta 8 MB.
- **Privacidad:** el archivo **no se guarda** en ningún lado; se procesa y se descarta. De una cédula **nunca** se extraen fecha de nacimiento, estado civil, firma ni huella. En `ai_usage_logs` solo quedan el modelo, los tokens y el resultado.
- **Componente `LlenarConDocumento.vue`** (`src/components/ui/`):
  - **Botón:** "Llenar con un documento", con el ícono `mdi-card-account-details-outline`. En el teléfono ofrece "Tomar foto" (cámara trasera) o "Subir foto o PDF".
  - **Imagen:** se reduce en el navegador (lado mayor de unos 1600 px, JPEG 0,85) antes de enviarla. El PDF va tal cual si pesa menos de 8 MB.
  - **Mientras trabaja:** muestra el mensaje "Leyendo tu documento…".
  - **Al terminar:** emite `datos`. El formulario llena **solo los campos vacíos** y marca "Llenado con IA desde el RIF · revisa los datos". Hay un enlace "Deshacer" que restaura lo anterior.
  - **Si la lectura falla:** si `legible` es false o la confianza es baja, muestra "No pudimos leer bien el documento. Prueba con una foto más clara, de frente y con buena luz". Nunca bloquea el formulario.
- **Servicio `documentoIaService.js`:** `leerDocumento(file, tipoEsperado)` y un mapeo puro por formulario, con tests: `aProveedor(doc)`, `aCliente(doc)` y `aEmpresa(doc)`.

## Dónde se aplica
| # | Lugar | Qué llena | Fase |
|---|---|---|---|
| 1 | **Nuevo proveedor** (Mis proveedores y el "+ Nuevo" del registro de compra) | nombre o razón social, RIF, tipo de persona, dirección, teléfono y correo si aparecen. Después consulta el **catálogo global** por RIF y la configuración de retenciones sugerida por tipo de persona (sin imponerla) | v1 |
| 2 | **Nuevo cliente** (Mis clientes y el autocompletado de la venta → "Nuevo cliente") | nombre, RIF o cédula, tipo de persona, dirección | v1 |
| 3 | **Mi negocio → datos de la empresa** | razón social, RIF, domicilio fiscal y estado. Si el RIF trae **fecha de vencimiento**, ofrece "¿Guardamos también tu RIF en Mis papeles con vencimiento el DD/MM/AAAA?", que sube el archivo a Mis papeles **solo si el cliente acepta** | v1 |
| 4 | **Mis papeles → subir un papel**: la IA detecta qué papel es y su fecha de vencimiento (licencias, permisos, solvencias) | tipo de papel y fechas | v2 (necesita una acción `papel` en `documento-ia`) |
| 5 | **Registro público de cuenta** (antes de iniciar sesión) | datos de la empresa desde el RIF | v2 (requiere una versión sin sesión, con límite de uso y captcha) |
| 6 | Representante legal o socios (cédulas) | nombre y cédula | v2, si se agrega esa sección |

Las compras y ventas ya se llenan desde la factura con el OCR existente. Esto completa el mismo enfoque para los **contactos y los datos de la empresa**.

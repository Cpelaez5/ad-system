# "SENIAT del mes": archivos TXT de IVA y XML de ISLR, revisados y listos para subir

Fecha: 2026-10-16. Pedido del usuario:

> Sí (exportar TXT IVA y XML ISLR), pero analiza cómo podemos mejorar aún más esos flujos, optimizar y hacerlos lo más intuitivos posible. Diseño first mobile.

Contexto: es la brecha fiscal más clara frente a LealtyApp (`../estrategia/lealtyapp-analisis-2026-10-16.md`). Ellos venden "los archivos del SENIAT listos para subir" a contadores. Nosotros podemos hacer algo mejor para el comerciante: **no solo generar el archivo, sino decirle qué toca entregar, revisar que el SENIAT no lo vaya a rechazar y acompañarlo hasta que quede declarado.**

## Lo que hay hoy (y por qué no basta)

| Hoy | Problema |
|---|---|
| Los libros de compras y de ventas se exportan desde el menú ⋮ de Mis movimientos, con un diálogo de mes. | Escondido. El cliente no sabe que existe ni cuándo usarlo. |
| Los comprobantes de retención (PDF) se descargan **factura por factura**. | Para el SENIAT no sirven: el portal pide un archivo TXT (IVA) o XML (ISLR) con todas las retenciones del período. |
| No hay TXT ni XML. | El cliente (o su contador) los arma a mano en Excel. Es el trabajo que LealtyApp vende. |
| No hay revisión previa. | Un RIF mal escrito, una factura sin número de control o un concepto sin código hacen que el portal rechace **todo** el archivo, con un mensaje técnico. |
| No hay registro de qué se declaró. | Nadie sabe si la quincena ya se subió. |

## Idea central: una lista de tareas por período, no un exportador

Una pantalla, **"SENIAT del mes"**, que responde tres preguntas en este orden:
1. **¿Qué me toca entregar?** Tarjetas por obligación y período.
2. **¿Está todo bien?** Revisión automática en lenguaje llano, con "Arreglar" al lado de cada problema.
3. **¿Ya lo hice?** Estado por tarjeta: *Nada que declarar* · *Faltan datos* · *Lista para descargar* · *Descargada* · *Declarada*.

### Pantalla (pensada primero para el teléfono)

```
┌────────────────────────────────┐
│ SENIAT del mes                 │  h1 (EncabezadoPagina)
│ Los archivos que pide el portal│
│ del SENIAT, revisados.         │
│ [Octubre ▾] [Septiembre] ...   │  selector de mes (chips; por defecto el mes que corresponde declarar)
│                                │
│ ┌────────────────────────────┐ │
│ │ Retenciones de IVA         │ │
│ │ 1ra quincena · 1 al 15     │ │
│ │ 4 comprobantes · Bs 12.345 │ │
│ │ ● Lista para descargar     │ │  chip de estado (color + ícono + texto)
│ │ [ Descargar archivo TXT  ] │ │  acción principal, ancho completo
│ │ Enviar a mi contador · Ya  │ │  acciones secundarias
│ │ lo declaré                 │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ Retenciones de IVA         │ │
│ │ 2da quincena · 16 al 31    │ │
│ │ ▲ Faltan datos en 2        │ │  → abre la revisión
│ │ [ Revisar y arreglar     ] │ │
│ └────────────────────────────┘ │
│ ┌ Retenciones de ISLR · oct ┐  │  XML
│ ┌ Libro de compras · oct    ┐  │  Excel (reusa exportService)
│ ┌ Libro de ventas · oct     ┐  │  Excel
└────────────────────────────────┘
```

- **Un solo botón grande por tarjeta**, siempre el siguiente paso: *Revisar y arreglar*, *Descargar archivo*, o nada si ya está declarada.
- **Mes por defecto:** antes del día 16 se muestra el mes anterior (2da quincena y ISLR pendientes); desde el 16, el mes en curso.
- **Solo lo que aplica:**
  - Las tarjetas de IVA solo aparecen si el negocio es contribuyente especial (`clients.es_contribuyente_especial`).
  - Si no lo es, en su lugar aparece una nota: "Solo los contribuyentes especiales retienen IVA. ¿Lo eres? Cámbialo en Mi negocio".
  - ISLR aparece si hay retenciones de ISLR en el período. Si no hay, dice "Nada que declarar".
- **Escritorio:** las tarjetas van en 2 columnas, y la revisión se abre como panel lateral (DialogoAdaptable).

### Revisión previa: lo que nadie más hace

Antes de descargar se valida cada línea con las reglas del portal. Cada problema se escribe en **lenguaje llano** y trae su arreglo:

| Regla | Mensaje al cliente | Arreglar |
|---|---|---|
| RIF del negocio (agente) ausente o inválido | "Falta el RIF de tu negocio" | → Mi negocio |
| RIF del proveedor inválido (no cumple L-8dígitos-dígito) | "El RIF de *Distribuidora X* no está completo (J-1234567)" | → editar proveedor |
| Factura sin número | "A la factura del 05/10 de *X* le falta el número" | → editar registro |
| Sin número de control (IVA) | "A la factura 123 de *X* le falta el número de control" | → editar registro |
| Comprobante de retención sin número o con formato distinto de 14 dígitos (AAAAMM + 8) | "El comprobante de la factura 123 no tiene número" | → editar registro |
| Concepto de ISLR sin código oficial del SENIAT | "No sabemos qué código del SENIAT usar para *Servicios generales*. Ya le avisamos al equipo" | equipo (super admin) |
| Monto retenido ≠ base × % (más de 1 céntimo) | "El monto retenido de la factura 123 no cuadra con el porcentaje" | → ajustar retención |
| Fecha del comprobante fuera del período | (no se incluye; se explica) | — |

- **Si hay problemas**, el botón de descarga queda desactivado y la tarjeta dice "Faltan datos en N".
  - En la revisión hay un enlace pequeño: "Descargar igual (el SENIAT podría rechazarlo)", para el contador que sabe lo que hace.
- **Normalización silenciosa**, sin molestar: quitar guiones del RIF, recortar espacios y usar punto decimal.
  - Para ISLR se dejan solo los dígitos del número de factura y de control.
  - Cada cambio queda visible en la revisión como "Arreglamos esto por ti" (plegado).

### Después de descargar: "¿Y ahora?"

Una hoja inferior, también reachable desde la tarjeta con el texto "¿Cómo lo subo?", con 3 pasos cortos:
1. Entra al portal del SENIAT con tu usuario.
2. Busca la opción para declarar retenciones de IVA (o ISLR) e importa el archivo.
3. Guarda la planilla o el comprobante que te da el portal.

Termina con el botón **"Ya lo subí"**, que marca la tarjeta como declarada. Opcionalmente se guarda el número de planilla.

Los pasos 1 a 3 se dicen en general **a propósito**: los nombres exactos de los menús del portal cambian. La guía detallada vive en `/ayuda/seniat-retenciones`, a validar por la contadora.

### "Enviar a mi contador"

En el teléfono usa el menú de compartir del sistema (Web Share API con el archivo adjunto), así el archivo se va por WhatsApp o por correo en dos toques. Si no hay Web Share, descarga el archivo y copia un texto listo para pegar.

## Formatos (a confirmar por la contadora con una carga real)

### TXT de retenciones de IVA (portal SENIAT, contribuyentes especiales)

Una línea por comprobante, campos separados por **tabulador**, sin encabezado:

| # | Campo | Origen |
|---|---|---|
| 1 | RIF del agente, sin guiones (J123456789) | `clients.rif` |
| 2 | Período AAAAMM | mes de `retenciones.fecha_comprobante` |
| 3 | Fecha de la factura AAAA-MM-DD | `retenciones.factura_fecha` |
| 4 | Tipo de operación: `C` (compra) | fijo |
| 5 | Tipo de documento: `01` factura · `02` nota de débito · `03` nota de crédito | `invoices.document_type` |
| 6 | RIF del proveedor, sin guiones | `retenciones.proveedor_rif` |
| 7 | Número del documento | `factura_numero` |
| 8 | Número de control | `factura_control` |
| 9 | Monto total del documento, con IVA | `invoices.financial.total` |
| 10 | Base imponible | `retenciones.base_imponible` |
| 11 | Monto del IVA retenido | `retenciones.monto_retenido` |
| 12 | Número del documento afectado (`0` si no aplica) | nota de crédito o débito |
| 13 | Número del comprobante de retención (14 dígitos) | `retenciones.numero_comprobante` |
| 14 | Monto exento | `invoices.financial.nonTaxableSales` |
| 15 | Alícuota (`16.00`) | `retenciones.monto_iva / base_imponible` redondeado a las alícuotas 8, 16 o 31 |
| 16 | Número de expediente (`0`) | fijo |

- Montos con punto decimal y 2 decimales, sin separador de miles. En las notas de crédito los montos van en negativo.
- **Se separa por quincena:** días 1 a 15 y del 16 a fin de mes, según `fecha_comprobante`.

### XML de retenciones de ISLR (relación mensual)

```xml
<?xml version="1.0" encoding="ISO-8859-1"?>
<RelacionRetencionesISLR RifAgente="J123456789" Periodo="202610">
  <DetalleRetencion>
    <RifRetenido>V123456789</RifRetenido>
    <NumeroFactura>1234</NumeroFactura>
    <NumeroControl>5678</NumeroControl>
    <FechaOperacion>15/10/2026</FechaOperacion>
    <CodigoConcepto>002</CodigoConcepto>
    <MontoOperacion>1000.00</MontoOperacion>
    <PorcentajeRetencion>3.00</PorcentajeRetencion>
  </DetalleRetencion>
</RelacionRetencionesISLR>
```

- `NumeroFactura` y `NumeroControl` llevan solo dígitos; si no hay número de control se usa `NA`.
- El texto se escapa para XML.
- **Riesgo detectado:** `conceptos_islr.codigo` hoy tiene una numeración interna (001 = Honorarios PN residentes…) que **no coincide necesariamente con los códigos oficiales del SENIAT**.
  - Se agrega `conceptos_islr.codigo_seniat`, llenado con la tabla oficial del Decreto 1.808 y marcado **"por verificar por la contadora"**.
  - Mientras un concepto no tenga `codigo_seniat`, la revisión lo marca como problema del equipo, no del cliente.

## Datos

Tabla nueva `declaraciones_seniat`:
- **Columnas:** `id`, `client_id`, `organization_id`, `tipo` (IVA | ISLR | LIBRO_COMPRAS | LIBRO_VENTAS), `periodo` (AAAAMM), `quincena` (1 | 2 | null), `estado` (descargada | declarada), `descargada_en`, `declarada_en`, `numero_planilla`, `lineas`, `monto_total`, `actualizado_por`.
- **Restricción:** única por (client_id, tipo, periodo, quincena).
- **Sin FK:** a propósito, como en `invoices.cliente_negocio_id`. Una tabla con FK a `clients` y a `users` sería una ruta más entre users↔clients y rompe los embeds del login.
- **RLS:**
  - el cliente gestiona las suyas (`get_current_user_client_id()`);
  - admin y contador ven y gestionan las de su organización;
  - super_admin ve todas.
- Si una retención del período cambia después de "descargada", la tarjeta vuelve a "Lista para descargar (hubo cambios)". Se compara `lineas` y `monto_total`.

## Entradas a la pantalla

- **Menú:** "SENIAT del mes" en el menú lateral y en "Más" (teléfono), con un punto si hay algo pendiente.
- **Inicio:** una tarjeta de "Tu siguiente paso" cuando hay una quincena o un mes listo para declarar y aún no declarado.
- **Mis movimientos:** el menú ⋮ "Libros fiscales" sigue existiendo, y además ofrece "Ver todo en SENIAT del mes".

## Fuera de alcance (pendientes anotados)

- **Fechas de vencimiento por terminal de RIF:** calendario oficial anual. Lo cargaría el super admin. Va en `super-admin-pendientes.md`.
- Vista del contador (todas sus empresas en una sola lista de tareas).
- Retenciones municipales: cada alcaldía tiene su propio formato.
- Libros en el formato TXT o PDF de alguna providencia específica.

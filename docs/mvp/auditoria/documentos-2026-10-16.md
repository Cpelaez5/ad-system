# Auditoría de documentos generados — 16/10/2026

Alcance: todo lo que el sistema crea o exporta (PDF, Excel, TXT/XML del SENIAT y correos).
Reglas de marca: granate #8E1818, carbón #2A2A2E, Montserrat (Helvetica/Arial en PDF y correo). Sin azul marino ni dorado (son de AD Business Group).

## Cómo ver las muestras

`node scripts/muestras-documentos.mjs` genera todo con datos FICTICIOS en `.muestras/` (carpeta fuera de git):

- PDF: `.muestras/pdf/*.pdf` y su imagen en `.muestras/png/*.png`
- Excel: `.muestras/excel/*.xlsx` y un volcado de celdas, relleno y formato en `*.xlsx.txt`
- Correos: `.muestras/correo/<plantilla>-600.png` y `-375.png` (más el `.html`)
- TXT/XML SENIAT: `.muestras/texto/`

No toca la base de datos (Supabase apunta a un dominio falso) ni envía correos.

## PDF

| Documento | Qué estaba mal | Qué se arregló | Queda pendiente |
|---|---|---|---|
| Comprobantes de retención IVA / ISLR / Municipal (`retention-pdf-service.js`) — `png/Comprobante_Retencion_*.png` | Letra de 5,5 a 7 pt (ilegible para adultos mayores). El logo se montaba sobre el texto legal. Nombre del sujeto cortado a 70 letras ("…CONSUMO MASIVO, C." sin la "A."). Dirección cortada a 2 líneas con "...". **Período fiscal con un mes menos** (`2026-10-01` salía "MES: 09" por el desfase UTC). RIF de relleno `J-00000000-0` impreso como si fuera real. Tres franjas de cabecera con una repetida. Separador de miles dependía del idioma del navegador (`de-DE`) y un monto en texto "104036.77" se leía como 10.403.677. Texto legal sin tildes. | Letra mínima 7,5 pt (datos 9–10 pt), filas y cajas más altas, logo a su proporción real arriba a la izquierda, título centrado, nombre y dirección con ajuste de línea (hasta 3), mes correcto con `parseFechaLocal`, RIF formateado `L-NNNNNNNN-N` o "NO REGISTRADO", franja carbón + granate, `formatNumber` propio (1.234,56 siempre). Firmas y resumen sin solaparse. | La tabla sigue siendo el formato oficial de 14/11/10 columnas (no se tocó el orden). El número de comprobante de respaldo (cuando no hay fila en `retenciones`) sigue inventándose a partir de la factura. Municipio: "Libertador (Aragua)" sale por nombre ambiguo en `venezuelaLocationsService` (hay Libertador en Distrito Capital). |
| Ejemplo de sello y firma — `png/Ejemplo_sello_y_firma.png` | Sin logo, etiquetas de firma a 7 pt. | Logo oficial, etiquetas a 8,5 pt. | — |
| Recibo (`receipt-pdf-service.js`) — `png/Recibo_*.png` | Logo con el nombre repetido al lado ("AD System") y el lema viejo "Sistema de Gestion Contable". Encabezado de la tabla tapado por la primera fila; descripciones largas se salían del fondo de la fila. Sin tildes (Descripcion, Emision, Retencion, Debito, Bolivares). Retenciones en negativo pero el TOTAL no las descontaba y no había neto a pagar. Fechas con `new Date(x + 'T00:00:00')` (se rompe con fechas ISO completas). Formato `es-VE` dependiente del navegador. | Solo el logo oficial (12 mm, proporción real). Filas con altura propia y descripción completa. Tildes. Línea "Neto a pagar (tras retenciones)" cuando hay retenciones. `formatMoney` (Bs 104.036,77 · $ 1.234,56) y `formatFechaCorta`. | El recibo no muestra la tasa de cambio ni su fecha cuando la factura está en USD (no viaja en `financial` de forma confiable); conviene mostrarla en una ola siguiente. |
| Expediente fiscal / "Mis papeles" (antes dentro de `Fiscal360.vue`, ahora `expediente-pdf-service.js`) — `png/Expediente_Fiscal_*.png` | **Usaba azul marino (31,53,92) y dorado (#E0B04F)**. Rojo #A81C22 (no es el granate de la marca). Etiquetas truncadas a 38 letras, letra de 7,5–9 pt, textos grises claros (150) sobre blanco, estado naranja claro de bajo contraste. Mezcla de `new Date(x+'T00:00:00')`. Código de 300 líneas dentro del componente. | Extraído a un servicio con prueba. Carbón + granate, logo PNG oficial a su proporción, letra mínima 8,5 pt, colores de estado con contraste, etiquetas completas (solo se acorta si no cabe), fechas en hora local, pie "AD System · Página X de Y". | — |

## Excel

| Documento | Qué estaba mal | Qué se arregló | Queda pendiente |
|---|---|---|---|
| Libro de Compras y Libro de Ventas (`exportService.js`) | Encabezado amarillo chillón (#FFFF00). Cifras sin formato numérico, sin fila congelada, fila de totales sin etiqueta. `EMPRESA DEMO C.A.` / `J-00000000-0` se escribían si faltaba el dato. **En el resumen, "Compras exentas y/o sin derecho a crédito" siempre valía 0** aunque hubiera compras no gravadas. `formatCurrency` quitaba comas y rompía "1.234,56". | Encabezado granate con letra blanca, `#,##0.00` en todas las cifras y resúmenes, encabezado congelado, "TOTALES" con fondo gris, resumen conectado a la columna de no gravadas, sin datos inventados, fechas con `formatFechaCorta`, importes en texto leídos con `parseMontoVenezolano`. | Se conserva la estructura del formato oficial (filas 1–6/7 y resumen). |
| Reporte general y Factura individual | Factura individual leía `item.unit_price` (llegaba `undefined`) y no tenía formato. Reporte sin moneda ni estilo; `undefined` en número y estado. | Encabezado de marca, columna Moneda, `textoSeguro` ("—" en vez de `undefined`), formato de número, descripción con ajuste. | — |
| Inventario valorizado, Kardex, Resumen horizontal (`inventoryExportService.js`) | Fecha con `toLocaleDateString()` (formato del equipo), `Unknown`, `TODO` visible, encabezados sin estilo, formato `"Bs"` sobre valores que pueden estar en USD. | Fechas dd/mm/aaaa, "Producto sin nombre", encabezados de marca congelados, formato numérico neutro. | Kardex aún dice "Sistema" como usuario (no se guarda quién hizo el movimiento). |
| Plantilla de importación por rubro | Encabezado vino-tinto distinto (#7A1F2B). | Granate #8E1818. | — |
| Directorio de proveedores / Mis clientes (`Proveedores.vue`, `Clientes.vue`) | Encabezado carbón sin estilo común / sin estilo, cifras sin formato, sin fila congelada. | Estilo común (`src/utils/estiloExcel.js`), formato `#,##0.00` o `$`, fila congelada. | — |

## Archivos SENIAT

| Documento | Resultado |
|---|---|
| TXT de retenciones IVA (`txtIva.js`) y XML de ISLR (`xmlIslr.js`) | Revisados con datos de muestra (`.muestras/texto/`): RIF sin guiones, montos con punto y 2 decimales, fechas dd/mm/aaaa en el XML, notas de crédito en negativo, sin acentos en el TXT, Latin‑1 en el XML. Sin cambios (orden y campos intactos). |

## Correos

| Plantilla | Qué estaba mal | Qué se arregló |
|---|---|---|
| `send-invoice-email` — documento registrado | Verde/rojo fuera de marca (#A81C22), ancho fijo de 600 px (mal en el teléfono), pie con "AD Business Group LLC" y carbón con granate encima (poco contraste), textos del usuario sin escapar (inyección de HTML), fechas con `new Date(d)` (un día menos), Subtotal e IVA en 0,00 porque el servicio mandaba `subtotal`/`taxAmount` que el formulario nunca guarda, estado en crudo (`EMITIDA`). | Misma identidad que `despachar-notificacion` (logo PNG 168×36, línea granate, 560 px fluido, letra ≥ 14 px, pie claro), todo escapado, fechas dd/mm/aaaa, montos Bs/$ con el mismo formato, estados en español. `email-notification-service.js` ahora calcula subtotal = gravadas + exentas e IVA = débito fiscal. |
| `send-invoice-email` — estado del pago, reporte de pago | Íconos desde un sitio externo (flaticon), montos en formato inglés (`1,234.50`) mezclados con `es-VE`, emojis en el asunto. | Sin imágenes externas, formato venezolano, asuntos sin emojis, mismo marco. |
| `send-invoice-email` — **payment_received** | **La función `buildPaymentReceivedHtml` no existía**: el correo "Recibimos tu reporte de pago" fallaba con ReferenceError (500) cada vez; Checkout lo llama en segundo plano y nunca se notó. | Plantilla creada. |
| `avisos-vencimiento` | Pie carbón con granate encima, ancho 480 sin meta de modo oscuro, fuente 15 px. | Mismo marco que el despachador, letra 16 px, aviso de dónde cambiar las preferencias. |
| `admin-invite-user` (invitación) | **Azul marino y dorado (AD Business Group)**, sin logo (solo texto "AD SYSTEM"), botón #A81C22, nombre sin escapar. | Rehecha con la identidad AD System (logo PNG, granate, carbón), escapada, ancho fluido. |
| `despachar-notificacion` | Ya con la marca nueva (referencia). | Sin cambios. |
| `register-client` | No envía correo. | — |

Muestras: `.muestras/correo/buildEmailHtml-600.png`, `-375.png`, `buildPaymentStatusHtml-*`, `buildPaymentReportHtml-*`, `buildPaymentReceivedHtml-*`, `buildAvisoHtml-*`, `buildInvitationEmailHtml-*`, `construirCorreoHtml-*`.

## Despliegue de `avisos-vencimiento` en un solo archivo

`scripts/empaquetar-funcion.mjs <función>` (usa esbuild, ya instalado como dependencia de Vite) mete `logica.js` dentro de `index.ts` sin copiar a mano y deja `supabase/functions/avisos-vencimiento/dist/index.ts` versionado. Hay que correrlo cada vez que cambie `index.ts` o `logica.js` (nota al inicio de `index.ts`). Los imports remotos (`https:`, `jsr:`) se dejan tal cual.

## Funciones que hay que volver a desplegar

1. `send-invoice-email` — `supabase/functions/send-invoice-email/index.ts` (un solo archivo; arregla además payment_received).
2. `admin-invite-user` — `supabase/functions/admin-invite-user/index.ts`.
3. `avisos-vencimiento` — `supabase/functions/avisos-vencimiento/dist/index.ts` (el generado, no el `index.ts`).

## Pruebas

`src/services/__tests__/documentosConsistencia.test.js`: formato de montos, mes sin desfase UTC, períodos del expediente, textos seguros. Suite completa y `npm run build` en el reporte final.

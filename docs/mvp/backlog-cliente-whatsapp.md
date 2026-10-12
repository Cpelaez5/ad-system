# Observaciones de las usuarias de prueba (grupo de WhatsApp, 26/8 → 5/10/2026)

> Recopilado el 2026-10-12 (solo lectura). Participantes: **contadora** (dueña del producto) y **asistente contable** (usuaria de prueba).
> Muchas ya se respondieron como resueltas en su momento: **todas quedan para VERIFICAR** con un test o una prueba en el navegador, no para darlas por buenas.
> Estado: ✅ verificado · 🔎 verificar (dicen que está resuelto) · ⏳ pendiente · ⚠️ contradice una decisión vigente

| # | Fecha | Observación | Estado | Dónde se atiende |
|---|---|---|---|---|
| W1 | 26/8 | No se podía editar a mano el número de comprobante de retención (el lápiz no hacía nada). El 19/9 dicen que los correlativos ya funcionan bien. | 🔎 | F1/QA |
| W2 | 27/8 | "No me permite registrar la factura" de un proveedor, aunque número de factura y de comprobante no están repetidos. | 🔎 (causa desconocida) | QA + logs |
| W3 | 27/8 | El comprobante de retención municipal (alcaldía) no se podía descargar en PDF; "falta el modelo IAE" (había 3 modelos en el Excel, el sistema tenía 2). | 🔎 | Fiscal |
| W4 | 27/8 | Retención municipal necesita: **Nº de licencia de actividad económica del cliente y del proveedor, código de actividad económica y % según ese código**. Cada cliente maneja sus códigos de forma privada. | 🔎 | Fiscal |
| W5 | 27/8 | Si los municipios del comprador y el proveedor son distintos: **solo advertir, sin bloquear** ("Sin bloquear"). | ⚠️ Hoy el sistema **bloquea** (`MUNICIPAL_MISMATCH`, decisión 16 de GEMINI.md). Confirmar con la contadora y cambiar a advertencia. | Fiscal |
| W6 | 27/8 | Expediente: "Publicidad y Propaganda" se declara **mensual**, no semestral. | 🔎 | U5 (Mis papeles) |
| W7 | 27/8 | El resumen muestra la fecha de emisión un día antes (01/07 → 30/06). Error de zona horaria. | 🔎 | QA (fechas `T00:00:00` locales) |
| W8 | 28/8 | No podía registrar clientes porque el RIF ya existía de un registro anterior (hubo que borrarlos a mano). | ⏳ Mejorar: mensaje claro y opción de reactivar/reclamar | Fase 3 (super admin) |
| W9 | 28/8 | Error al cargar una factura de compra con foto (captura sin detalle). | 🔎 | QA OCR |
| W10 | 31/8 | Con retención de IVA, la base imponible tomaba el monto del IVA. | 🔎 (migración `20260831_fix_retention_base_imponible`) | F1 tests golden |
| W11 | 31/8 | La fecha del comprobante de retención puede ser distinta de la de emisión de la factura. | 🔎 (`retentionDate`, decisión 14) | F1 |
| W12 | 10/9 | Al registrarse pide licencia y actividad, y al entrar las vuelve a pedir (licencia, actividad, estado, municipio). | 🔎 | U4 (perfil guiado) |
| W13 | 10/9 | No se podía escribir un 0 al inicio de los decimales. | 🔎 | QA formulario |
| W14 | 10/9 | El total no se sumaba solo al corregir base imponible, IVA y exento. | 🔎 | QA formulario |
| W15 | 10/9 | En el PDF de ISLR el número de comprobante no era el correlativo cargado a mano. | 🔎 | Fiscal |
| W16 | 10/9 | Facturas en divisas: el OCR toma los montos y convierte con la tasa del día de registro; quiere la **tasa del día de la factura**. | ⏳ verificar comportamiento actual | Fiscal (multi-moneda) |
| W17 | 15/9 | La aprobación de pagos (acceso a cuentas bancarias) la hará la contadora como super admin; puede haber varios super admin. | ⏳ | Fase 3 (B2) |
| W18 | 18-19/9 | En los parámetros fiscales del **proveedor** no aparecen todos los conceptos de ISLR (falta honorarios profesionales 3%; solo 5%), pero en el ajuste de la factura sí aparecen. Listas inconsistentes. | ⏳ | Fiscal |
| W19 | 19/9 | El PDF de ISLR debería traer un resumen para pagar (monto tras retenciones), como el de IVA; renombrar etiquetas. | ⏳ = C2 | Fiscal C2 |
| W20 | 19/9 | Tras guardar, no se puede corregir la **fecha del comprobante** (no aparece en edición); no se pudo **eliminar** la operación (quedó en papelera sin efecto); al registrarla de nuevo, el correlativo aparece como "ya usado". | ⏳ | Fiscal + QA |
| W21 | 22/9 | Lista de "Novedades": Fecha Fiscal, formato ISLR, inventario en ventas, IVA retenido en libro de ventas, OCR de ventas con productos. | ⏳ = C1–C5 | Fiscal |
| W22 | 23/9, 29/9 | "¿Qué falta para definir ya el sistema?" — esperan respuesta y capacitaciones. | ⏳ | Comunicación: enviar resumen de avances + agendar capacitación |

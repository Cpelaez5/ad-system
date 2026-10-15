# Super admin: Inicio y Facturación del sistema — informe

Fecha: 2026-10-15. Rama del worktree, a partir de `feat/ola-f2b`.

## Inicio del super admin (`/admin/inicio`, `AdminInicio`)
- Vista `src/views/admin/InicioSuperAdmin.vue`; lógica pura en `src/utils/inicioSuperAdmin.js`; lecturas (solo SELECT, sin datos personales) en `src/services/inicioSuperAdminService.js`.
- Contenido: frase-resumen del negocio; "Tu siguiente paso" (pagos por aprobar, pruebas que vencen en 7 días, errores de IA, días sin tasa, catálogo por verificar); cifras (activas, en prueba, vencidas, ingresos del mes, pagos por aprobar, empresas nuevas en 30 días); gráfico de ingresos o empresas nuevas por mes (alternable con chips); accesos a Operación, Facturación, Usuarios y Configuración IA.
- Definiciones (investigadas en la BD, solo lectura): una "empresa" es un usuario con rol `cliente`. Vencida = `trial_end` pasó; en prueba = plan `free_trial` no vencido; activa = plan de pago no vencido. Ingresos = `system_invoices` con `status='paid'` y `paid_at` en el mes (USD). No se calcula MRR por suscripción: `client_subscriptions` está casi vacía; si se quiere MRR real, falta decidir la fuente.
- Navegación: el ítem "Dashboard" del super_admin apunta a `AdminInicio`; tras el login y en las redirecciones del guard el super_admin va a `/admin/inicio`. El `Dashboard` compartido sigue intacto para contador y admin, y el ítem "Empresas" del super_admin sigue abriéndolo.

## Facturación (`FacturacionSistema.vue`, rehecha)
Subcomponentes en `src/components/admin/`: `FacturasSistemaLista`, `PagosReportadosLista`, `MetodosPagoLista`, `DialogoEmitirFactura`, `DialogoMetodoPago`, `DialogoDetallePago`, `DialogoAprobarPago`, `DialogoRechazarPago`. Nuevos en `src/components/ui/`: `CifrasEnLinea` y `DialogoConfirmar` (catalogados en `sistema-diseno.md`). Lógica pura en `src/utils/facturacionSistema.js`.

Patrón: encabezado con una acción granate (Emitir factura), siguiente paso (pagos por aprobar, luego facturas vencidas), cifras en línea, secciones con `FiltroChips` (Facturas, Pagos reportados con cantidad, Métodos de pago), listas en `SeccionLista` + `FilaLista` (filas en el teléfono; sin tablas), diálogos con `DialogoAdaptable` y confirmaciones propias en las acciones irreversibles. Solo colores del tema (claro y oscuro); se quitaron el azul, el dorado y los colores fijos de los métodos.

### Acciones conservadas (todas)
1. Cargar facturas, reportes de pago, métodos, balance, clientes para facturar y planes.
2. Cifras: total facturado, cobrado, pendiente y vencido.
3. Buscar facturas por número, empresa o RIF.
4. Emitir factura: empresa, número automático, monto, moneda USD/VES, periodo, vencimiento, notas; validación.
5. Anular factura pendiente (antes con `confirm()`; ahora diálogo de confirmación).
6. Ver pagos reportados con empresa, factura, método, referencia, monto reportado y de la factura, estado.
7. Filtrar pagos: todos, por revisar, aprobados, rechazados.
8. Ver detalle del pago: montos, método, referencia, fecha, plan pedido, pago en bolívares y tasa BCV, datos del emisor, pago mixto con saldo a favor, motivo de rechazo.
9. Ver el comprobante (imagen o PDF por URL firmada).
10. Aprobar pago, con diálogo de confirmación; en suscripciones elegir plan y vencimiento (pre-llenados por nombre del plan y fin del periodo); exige plan; llama a `approvePayment` y envía el correo `payment_status_update` al cliente.
11. Rechazar pago con motivo obligatorio visible al cliente; llama a `rejectPayment` y envía el correo.
12. Abrir directo un pago con `?report_id=`.
13. Métodos de pago: listar, agregar, editar (el tipo no cambia), habilitar/ocultar con interruptor, eliminar (antes `confirm()`; ahora diálogo); campos por tipo (Pago Móvil, transferencia, Zelle, Binance), teléfono de soporte, IGTF 3 %, comprobante obligatorio, instrucciones.
14. Avisos de éxito o error (snackbar).

Nuevo, sin perder nada: filtro por estado de facturas con cantidades, siguiente paso, `?tab=reports` (lo usa el Inicio), "Ver más" en listas largas, el interruptor de un método vuelve atrás si falla. No existía exportación; no se añadió.

## Pruebas
- Nuevas: `inicioSuperAdmin.test.js`, `facturacionSistema.test.js` (lógica pura), `InicioSuperAdmin.test.js` y `FacturacionSistema.test.js` (componentes con servicios simulados, reescrito con más cobertura que el original: 25 casos frente a 3), `CifrasYConfirmar.test.js`; `menuPorRol.spec.js` actualizado; E2E `15-admin-operacion.spec.js` suma `/admin/inicio` (un cliente es rechazado).
- Suite completa: 129 archivos, 1260 pruebas en verde (`TZ=America/Caracas npx vitest run`); `npm run build` en verde; detector de impeccable sin hallazgos; íconos MDI verificados contra el CSS.
- Sin capturas: no hay sesión de super admin y no se monta la pantalla en un navegador real; la verificación visual (claro/oscuro, teléfono) queda pendiente de una revisión a ojo del usuario.

## Notas
- `GraficoBarras` tiene la grilla fija en `rgba(0,0,0,0.06)` (casi invisible en oscuro); no se tocó por ser un componente compartido. Pendiente de pasarla a color del tema.
- `exchange_rates`, `ai_usage_logs` y catálogo se leen con los servicios de Operación ya existentes.

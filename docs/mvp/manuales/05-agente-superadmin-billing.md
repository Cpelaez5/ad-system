# Manual 05 — Agente Super Admin & Billing (Fase 3)

**Misión:** que el dueño del negocio (super admin) opere el SaaS en 10 minutos al día: ver cómo va el negocio, aprobar pagos, gestionar usuarios y controlar el costo de la IA.
**Modelo sugerido:** Gemini 3.1 Pro (Antigravity) o Claude Sonnet.
**Lee:** `00-REGLAS-COMUNES.md`, `auditorias/audit-codigo.md §2.B`, `auditorias/audit-ux.md` (sección Super Admin), `auditorias/audit-db.md §6` (modelo de suscripciones).
**Requisito:** Fase 0 cerrada, sobre todo S5 (RPC de facturación) y S3 (roles).

## Modelo actual
`subscription_plans` → `client_subscriptions` → `system_invoices` → `payment_reports` (comprobante subido por el cliente al bucket `payment-proofs`, verificado por el super admin). Prueba gratuita: `plan_id = 'free_trial'` + `trial_end`; el guard redirige a `/trial-expired`.

## Tareas
- [ ] **B1. Panel de negocio** (`/dashboard` para `super_admin`): tarjetas grandes con clientes activos, en prueba, con prueba por vencer (7 días), vencidos/morosos, MRR en USD, pagos por verificar (con enlace) y costo de IA del mes (`ai_usage_logs`). Las consultas van en una RPC o vista agregada, no en N consultas desde el frontend.
- [ ] **B2. Bandeja de pagos** (`/admin/facturacion-sistema`): lista "Por verificar" primero; ver comprobante (URL firmada) → **Aprobar** (activa o renueva `client_subscriptions`, marca `system_invoices` como pagada) o **Rechazar con motivo**. Todo en una transacción (RPC con validación `super_admin`). Notificar al cliente por correo (`send-invoice-email` o una función nueva).
- [ ] **B3. Ciclo de vida de la suscripción:** generación de la factura del período siguiente (job programado con `pg_cron` o Edge Function), aviso al cliente antes del vencimiento y período de gracia. Definir con el usuario los días de gracia.
- [ ] **B4. Usuarios** (`/usuarios`): la invitación ya existe (commitearla en S6). Filtros por rol y estado (activo / invitado pendiente / desactivado), reenviar invitación, desactivar en vez de borrar.
- [ ] **B5. Configuración IA** (`/admin/ai-settings`): mostrar consumo por cliente y por mes, con un límite configurable por plan (enlaza con la decisión D1: planes por volumen de registros con IA).
- [ ] **B6.** Ocultar `/ocr-demo` en producción (si L1 no lo hizo).

**Aceptación:** flujo completo probado en DEV: cliente en prueba → reporta pago → super admin aprueba en ≤3 clics → el cliente queda activo y recibe el aviso.

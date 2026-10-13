# Flujo multiinquilino con contadores — especificación

> **ESTADO (2026-10-13, decisión del usuario): por ahora hay UNA SOLA firma de contadores** (la organización `1111…`). Toda empresa que se registra es cliente de esa firma y su staff (admin y contador) la gestiona. Este documento es el **diseño para cuando haya varias firmas**; no se implementa ahora. Lo único aplicado es aditivo e inocuo: columna `tipo`, org "AD System Directo" **reservada y sin uso**, y el trigger que impide staff en Directo. `register-client` v15 volvió a enviar las empresas a la firma.

Fecha: 2026-10-13. Decisión del usuario: el sistema es multiinquilino; los contadores pueden registrar a sus clientes; debe ser fácil de usar y de escalar; programa de socios contadores **sí**. El flujo lo decide el orquestador siguiendo los estándares del sector (QuickBooks Online Accountant, Xero HQ/Partner, Alegra Contador, Siigo Contador).

## 1. Cómo lo hace la industria (resumen)
- **El despacho tiene su cuenta gratis** con un panel de toda su cartera (QBOA, Xero HQ). Paga quien usa el software: la empresa. Al despacho se le da gratis porque **trae clientes**.
- **Dos puertas de entrada:** (a) el contador crea la empresa y la invita; (b) la empresa ya usa el sistema e **invita a su contador**. La segunda es el bucle viral: cada empresa invita a su contador y cada contador trae a sus otras empresas.
- **Facturación:** *retail* (la empresa paga directo y el despacho gana comisión o descuento) o *wholesale* (el despacho paga por sus clientes con descuento y les cobra a ellos). Se arranca con retail.
- **Niveles de socio** según clientes activos (QuickBooks ProAdvisor: Silver/Gold/Platinum), con beneficios crecientes.
- **Equipo del despacho:** dueño (admin) y contadores con **cartera asignada**.
- **Cambio de contador:** la empresa es dueña de sus datos; el acceso de un despacho se otorga y se revoca con consentimiento.

## 2. Modelo actual (2026-10-13) y su problema
- `organizations` = despacho. `clients` = empresa (con `organization_id`). `users` con rol `super_admin | admin | contador | cliente`; el cliente tiene `client_id`.
- Las tablas de datos llevan `organization_id` + `client_id` en cada fila y la RLS filtra por `organization_id = get_current_organization_id()` (staff) o por `client_id` (cliente).
- La empresa paga su plan (`client_subscriptions` por `client_id`).
- **Problema de aislamiento (corregir antes de lanzar):** `register-client` mete a toda empresa que se registra sola en `PUBLIC_CLIENT_ORG_ID = 1111…`, que es **un despacho real con staff**. Ese staff puede ver empresas que nunca lo eligieron como contador. Hay que crear una organización de sistema **"AD System Directo"** sin staff de ningún despacho; solo soporte (super_admin) accede, y con trazabilidad.
- El registro abierto de "admin" crea un admin **sin organización**; hay que crear su despacho en el mismo paso.

## 3. Decisión de arquitectura
**Se mantiene "una empresa pertenece a un solo despacho a la vez"** (su *contador de cabecera*) y la `organization_id` en cada fila.

**Por qué:**
- Es el caso del 95 % de las pymes venezolanas (un solo contador).
- No obliga a reescribir la RLS de 30 tablas a muchos-a-muchos.
- Mantiene las consultas rápidas (índice por `organization_id`).

**El cambio de contador** es una **transferencia con consentimiento de ambas partes**, ejecutada por una función `SECURITY DEFINER` que actualiza `organization_id` en todas las tablas con `client_id`, deja registro en `audit_logs` y quita el acceso al despacho anterior.

**Costo si está mal:** si mañana una empresa necesita **dos** despachos a la vez (raro: auditor externo + contador), habrá que agregar una tabla de accesos adicionales de solo lectura. Es aditivo y no rompe nada.

## 4. Tipos de organización
`organizations.tipo`:
- `despacho`: firma contable o contador independiente. Tiene staff y cartera.
- `directo`: **una sola** organización de sistema, "AD System Directo", para las empresas sin contador. Sin staff de despachos.

Columnas nuevas: `tipo`, `owner_user_id`, `codigo_socio` (código corto de referido, único), `nivel_socio` (calculado), `marca` (jsonb: logo y color, para el portal de sus clientes; Ola 1).

## 5. Flujos

### F1. Registro de despacho (autoservicio, gratis)
`/registro/contador` → nombre del despacho, RIF, nombre, correo y contraseña → Edge Function `register-firm` crea **organización `despacho` + usuario `admin` dueño** (rol en `app_metadata`, como `register-client`) y genera el `codigo_socio`. Bienvenida: "Agrega tu primer cliente".

### F2. El despacho agrega un cliente
"Mi cartera" → **Agregar cliente** → RIF y razón social (más datos fiscales opcionales) → dos opciones:
- **"Invitar al dueño"** (recomendado): correo o WhatsApp con enlace. El dueño crea su contraseña y entra a su empresa ya configurada. Reutiliza `invitations` + `register-client` con token.
- **"Lo manejo yo"**: empresa sin usuario cliente; el despacho registra por ella. Puede invitar al dueño después.

La suscripción de esa empresa queda con `socio_org_id` = el despacho (para comisiones).

### F3. La empresa invita a su contador (bucle viral)
En la empresa (autoservicio, en "Directo"): **Mi contador → Conectar con mi contador** → correo del contador o `codigo_socio`.
- Si el contador **ya tiene despacho**: le llega una solicitud a su "Mi cartera" → *Aceptar* → transferencia (función de §3) de Directo → despacho.
- Si **no tiene cuenta**: recibe una invitación para crear su despacho gratis (F1) con la solicitud ya pendiente.
- La empresa puede **desconectar** a su contador cuando quiera: vuelve a Directo y el despacho pierde el acceso. Con confirmación clara y registro en auditoría.

### F4. Cambio de despacho
La empresa conectada a A invita a B → B acepta → la empresa confirma ("Tu contador será B; A dejará de ver tus datos") → transferencia A → B. A recibe una notificación.

### F5. Equipo del despacho
- El admin invita contadores (`admin-invite-user`, ya existe).
- **Cartera asignada (Ola 1):** tabla `asignaciones_cartera (user_id, client_id)`. El admin ve todo. Si un contador **no tiene asignaciones, ve toda la cartera** (simple para despachos chicos); si tiene asignaciones, solo esas. La regla se aplica en la RLS con una función `puede_ver_cliente(client_id)`.

### F6. Mi cartera (panel del despacho) — el corazón de D2
Lista o tarjetas de empresas con **semáforo**:
- papeles vencidos o por vencer;
- registros sin revisar;
- próximas fechas fiscales (calendario SENIAT);
- estado del plan.

Filtros: "requieren atención", por contador. Acciones por empresa: **entrar a la empresa** (cambio de contexto con una barra visible "Estás viendo: Empresa X"), **pedir documento**, ver pendientes.

### F7. Pedir documento y revisión
- **Pedir documento:** el contador elige el tipo (estado de cuenta, licencia, factura X), agrega una nota y una fecha. El cliente recibe una notificación y la tarea en su Inicio ("Tu contador te pidió…") y la sube con foto. Tabla `solicitudes_documento`.
- **Revisado por tu contador:** cada registro tiene estado `pendiente → revisado` (o "con observación" + comentario). El cliente ve un check. Esto da tranquilidad y es diferenciador.

### F8. Socios contadores (comisiones)
- **Niveles por empresas activas que pagan:** Socio (1-9) 20 %, Plata (10-29) 25 %, Oro (30+) 30 %, comisión recurrente mensual. *Valores iniciales; ajustar al definir precios en la Fase 4.*
- **Registro de comisiones:** al aprobar el pago de una empresa con `socio_org_id`, se inserta una fila en `comisiones_socio` (periodo, empresa, monto base, %, monto, estado `pendiente → pagada`). El super admin ve y marca pagos (pago manual al inicio).
- **Beneficios no monetarios:** despacho gratis; prueba más larga para sus clientes (30 días en vez de 14); su logo en el portal de sus clientes (Ola 1); listado en el directorio "Encuentra un contador" (Ola 2, también fuente de clientes para ellos).
- **Facturación wholesale** (el despacho paga por todos): Ola 2, si los despachos la piden.

## 6. Cambios de datos (migración aditiva, sin romper)
1. `organizations`: `tipo text not null default 'despacho' check (tipo in ('despacho','directo'))`, `owner_user_id uuid`, `codigo_socio text unique`, `marca jsonb default '{}'`.
2. Crear la organización **"AD System Directo"** (`tipo='directo'`). Mover a ella las empresas autorregistradas que **no** pertenecen de verdad al despacho `1111…`. **Requiere una lista validada por el usuario o la contadora antes de mover**, porque hoy no hay forma automática de distinguir cuáles son clientes reales de ese despacho.
3. `register-client`: el destino por defecto pasa a ser la org Directo (variable de entorno).
4. `client_subscriptions.socio_org_id uuid` + tabla `comisiones_socio`.
5. Tablas `solicitudes_conexion` (empresa, despacho destino o correo, token, estado, iniciado_por, fechas), `solicitudes_documento` y `asignaciones_cartera` (Ola 1).
6. `invoices` (y registros): `revision_estado` + `revision_nota` + `revisado_por` + `revisado_en`.
7. Función `transferir_empresa(p_client_id, p_org_destino, p_solicitud_id)` `SECURITY DEFINER`:
   - verifica que la solicitud esté aceptada por ambas partes;
   - recorre las tablas con `client_id` y `organization_id`;
   - actualiza y escribe en `audit_logs`;
   - es **idempotente**.
   - Tests con dos despachos ficticios en una rama de Supabase o en local, **nunca** con datos reales.
8. RLS: la org Directo no tiene staff; el super admin accede como hoy. Revisar que ningún `admin` pueda tener `organization_id` = Directo.

## 7. Orden de implementación

> **Prioridad del usuario (2026-10-13):** por ahora el foco es el **flujo del cliente**, completo y pulido. Junto con él va lo mínimo de los otros roles para que ese flujo funcione de punta a punta: el **super admin** gestiona planes y pagos (aprobar o rechazar, facturas del sistema) y el **admin/contador** gestiona lo fiscal y contable de sus clientes (revisar registros, retenciones, libros, papeles). Los flujos de despacho de este documento (F1 a F8) se implementan **después** del flujo del cliente, salvo el paso 1 (aislamiento), que ya está hecho.

**Hecho (2026-10-13):** migración `20261013150000_org_tipo_y_directo` (aditiva). `register-client` v14 apuntó a Directo y, por la decisión de una sola firma, **v15 volvió a la firma `1111…`**. Ninguna empresa quedó en Directo.
**Antes del lanzamiento:**
1. Org Directo + `register-client` apuntando a ella + `tipo` (cierra el problema de aislamiento). *El movimiento de las empresas existentes espera la lista validada.*
2. F1 registro de despacho con su organización.
3. F6 Mi cartera (versión 1: lista con semáforo + entrar a la empresa).
4. F2 agregar o invitar cliente (pulir lo existente).
5. F3 / F4 conectar y cambiar contador + transferencia.
6. F7 pedir documento + revisado por tu contador.
7. F8 `socio_org_id` + registro de comisiones (pago manual).

**Ola 1:** F5 asignaciones, marca del despacho en el portal del cliente, reportes de cartera.
**Ola 2:** wholesale, directorio de contadores, acceso adicional de solo lectura (auditor).

## 8. Seguridad (no negociable)
- Rol y organización solo en `app_metadata` (escrito por service_role), como ya hace `register-client`.
- La transferencia exige consentimiento registrado de la empresa (dueño) y del despacho destino; nunca por un solo lado.
- Auditoría de cada entrada del staff a una empresa (quién, cuándo) y de cada transferencia.
- Pruebas de aislamiento automatizadas: el despacho A no puede leer nada del despacho B ni de Directo (tests SQL con usuarios simulados, en una rama).

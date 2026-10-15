# Estado de /municipal-settings (Retenciones municipales)

Fecha: 2026-10-15. Pedido del usuario: "revisar el status de este módulo, /municipal-settings".

## Qué hay hoy
- **Vista:** `src/views/shared/MunicipalSettings.vue`, ruta `/municipal-settings`. No aparece en el menú; solo se llega desde Configuración (`/settings`) → "Módulos Fiscales" → Configurar.
- **Qué hace:** una tabla para crear, editar y borrar "códigos de actividad económica" con su porcentaje de retención.
- **Tabla:** `conceptos_municipales` (organization_id, codigo, descripcion, porcentaje, status). **0 filas.**
- **Dónde se usa:** el registro de compras (`SimpleInvoiceForm` → `calcularRetenciones`) toma el porcentaje del concepto elegido, y el RPC `registrar_compra_con_retenciones` recibe `p_concepto_municipal_id`. También lo usa `RetentionAdjustSheet.vue`.

## Problemas encontrados
| # | Severidad | Problema |
|---|---|---|
| 1 | **Crítico** | **El cliente no puede usarla.** Según la RLS, solo `admin` o `super_admin` pueden crear, editar o borrar. Un cliente que entra ve el botón "Nuevo Código", pero al guardar la base de datos lo rechaza. El contador tampoco puede. |
| 2 | **Crítico (modelo)** | Los códigos son **por organización (el despacho)**, no por negocio ni por **municipio**. Pero el porcentaje de retención municipal lo fija la **ordenanza de cada alcaldía** (Maracaibo, Chacao, etc.), según la actividad del proveedor. Un solo listado por despacho no sirve cuando hay clientes en municipios distintos. |
| 3 | Importante | Ya existen `municipios` y, en `proveedores`, `municipio_id` y `licencia_actividad_economica`, pero el concepto no se relaciona con el municipio: el cálculo no puede sugerir el porcentaje correcto solo. |
| 4 | Importante | Ningún negocio está marcado como agente de retención municipal (`clients.es_agente_retencion_municipal`), pero hay **7 retenciones municipales** registradas (probablemente datos de prueba). Revisar su coherencia. |
| 5 | Menor | La validación del porcentaje (`!!v`) rechaza el **0 %**, que es válido para actividades exentas. |
| 6 | Menor | Diseño viejo: título `text-h4` con color fijo, encabezado del diálogo sobre fondo rojo, chip azul y tabla que no se adapta al teléfono. No sigue el patrón del cliente. |

## Propuesta (para la próxima ola)
1. **Modelo:** `conceptos_municipales` pasa a ser un **catálogo por municipio** (`municipio_id`, código, descripción, alícuota, con fuente y fecha de la ordenanza), que mantiene el **equipo de AD System** (tarea para el super admin) y que leen todos. Además, una tabla por negocio, `conceptos_municipales_negocio`, para los códigos propios o los ajustes que haga el contador. Migración aditiva, sin FK a users ni organizations.
2. **Permisos:** el contador administra los códigos de sus clientes. El cliente solo **elige** (no crea) y puede pedir "No encuentro mi código" al contador.
3. **Cálculo:** al registrar una compra con proveedor de un municipio que tiene catálogo, sugerir el concepto y el porcentaje según la `licencia_actividad_economica` del proveedor. Siempre editable.
4. **Pantalla:** moverla dentro de Mi negocio → "Retenciones municipales", visible solo si el negocio es agente de retención municipal, con el patrón del cliente y lista adaptada al teléfono.
5. Aceptar 0 % y revisar las 7 retenciones municipales existentes.

Anotado también en `docs/mvp/super-admin-pendientes.md`: cargar las alícuotas por municipio.

## Arreglos rápidos aplicados (2026-10-15)
- El **contador** ya puede crear, editar y borrar códigos (migración `20261015100000`).
- El **cliente** ya no ve "Nuevo Código" ni las acciones de la tabla. En su lugar aparece "Tu contador administra estos códigos…".
- Se acepta **0 %**.
- Sigue pendiente el rediseño por municipio (puntos 1 a 4 de la propuesta).

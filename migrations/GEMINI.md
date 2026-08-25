---
trigger: always_on
---

# 🗄️ Reglas de Base de Datos y Supabase

## SIEMPRE documentar cambios:
1. Crear migración en `/migrations/` con nombre descriptivo (`XXX_nombre.sql`).
2. Actualizar `.agent/database/schema.md`.
3. Considerar impacto en RLS (Row Level Security).

## Principios de Schema:
- **Nombres en snake_case**: `invoice_number`, `created_at`
- **UUIDs para IDs**: Evitar auto-increment
- **Soft delete**: `status = 'ANULADA'` (o 'ELIMINADO') en vez de DELETE.
- **Multi-tenant**: Siempre incluir `organization_id` en las consultas e inserciones.

## Multi-Tenancy (Filtrado por Organización):
En los servicios, siempre incluir el `organization_id`:
```javascript
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('organization_id', getCurrentOrganizationId())
```

## Acceso por Roles (RLS):
- `cliente`: Solo ve datos de su empresa (`client_id`).
- `contador`: Ve todos los clientes de su organización.
- `admin`: Todos los clientes + usuarios de la organización.
- `super_admin`: Todo el sistema.

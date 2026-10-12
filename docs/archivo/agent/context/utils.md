# 🔧 Utils y Helpers

> Documentación de funciones utilitarias del proyecto.

---

## tenantHelpers.js

**Archivo**: `src/utils/tenantHelpers.js`

Funciones para manejar multi-tenancy (aislamiento de datos por organización).

### Funciones Disponibles

| Función | Descripción |
|---------|-------------|
| `getCurrentOrganizationId()` | Obtiene el organization_id actual |
| `setCurrentOrganizationId(id)` | Guarda organization_id en localStorage |
| `clearCurrentOrganizationId()` | Limpia organization_id (logout) |
| `queryWithTenant(table, select, filters)` | Query con filtro automático de organización |
| `insertWithTenant(table, data)` | Insert con organization_id automático |
| `updateWithTenant(table, id, data)` | Update validando organización |
| `deleteWithTenant(table, id)` | Delete validando organización |
| `belongsToCurrentTenant(table, id)` | Verifica si registro pertenece a org actual |
| `getCurrentOrganizationName()` | Obtiene nombre de la organización |
| `handleTenantError(error, operation)` | Procesa errores de multi-tenancy |

---

### Uso Básico

```javascript
import {
  getCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant,
  updateWithTenant
} from '@/utils/tenantHelpers'
```

---

### getCurrentOrganizationId()

Obtiene el ID de la organización actual desde localStorage o session.

```javascript
const orgId = getCurrentOrganizationId()

if (!orgId) {
  console.error('Usuario no tiene organización asignada')
  return
}
```

---

### queryWithTenant()

Ejecuta una query de Supabase con filtro automático por `organization_id`.

```javascript
// Sin helpers (forma manual)
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('organization_id', getCurrentOrganizationId())

// Con helper (recomendado)
const { data, error } = await queryWithTenant(
  'invoices',       // tabla
  '*, client:clients(company_name)',  // select
  { flow: 'VENTA' } // filtros adicionales
)
```

---

### insertWithTenant()

Inserta un registro agregando automáticamente `organization_id`.

```javascript
// Sin helper
await supabase.from('clients').insert({
  ...clientData,
  organization_id: getCurrentOrganizationId()
})

// Con helper (recomendado)
const { data, error, rlsBlocked } = await insertWithTenant('clients', {
  company_name: 'Empresa ABC',
  rif: 'J-12345678-9',
  email: 'contacto@empresa.com'
})

if (rlsBlocked) {
  console.error('RLS bloqueó la inserción')
}
```

---

### updateWithTenant()

Actualiza un registro validando que pertenece a la organización actual.

```javascript
const { data, error } = await updateWithTenant(
  'clients',        // tabla
  'uuid-del-cliente', // id
  {
    company_name: 'Nuevo Nombre',
    email: 'nuevo@email.com'
  }
)
```

---

### deleteWithTenant()

Elimina un registro validando organización.

```javascript
const { error } = await deleteWithTenant('clients', 'uuid-del-cliente')
```

---

### belongsToCurrentTenant()

Verifica si un registro pertenece a la organización actual (útil antes de operaciones sensibles).

```javascript
const belongs = await belongsToCurrentTenant('invoices', invoiceId)

if (!belongs) {
  console.error('Este registro no pertenece a tu organización')
  return
}

// Continuar con la operación...
```

---

### handleTenantError()

Procesa errores y agrega contexto de multi-tenancy.

```javascript
try {
  await insertWithTenant('clients', data)
} catch (error) {
  const processedError = handleTenantError(error, 'crear cliente')
  console.error(processedError.message)
  // "Error al crear cliente: [mensaje del error]"
}
```

---

## initTenant.js

**Archivo**: `src/utils/initTenant.js`

Inicialización del tenant al cargar la aplicación.

```javascript
import { initializeTenant } from '@/utils/initTenant'

// En App.vue o main.js
await initializeTenant()
```

---

## Patrones de Uso

### En un Servicio

```javascript
// src/services/miService.js
import { supabase } from '@/lib/supabaseClient'
import {
  getCurrentOrganizationId,
  queryWithTenant,
  insertWithTenant
} from '@/utils/tenantHelpers'

class MiService {
  async getAll() {
    const { data, error } = await queryWithTenant('mi_tabla', '*')
    if (error) throw error
    return data
  }

  async create(payload) {
    const { data, error } = await insertWithTenant('mi_tabla', payload)
    if (error) throw error
    return data
  }
}

export default new MiService()
```

### En un Componente

```javascript
import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

export default {
  computed: {
    organizationId() {
      return getCurrentOrganizationId()
    }
  },
  
  mounted() {
    if (!this.organizationId) {
      this.$router.push('/login')
    }
  }
}
```

---

## ⚠️ Reglas Importantes

1. **SIEMPRE** usar helpers para queries (garantiza filtro por org)
2. **NUNCA** hacer queries sin filtrar por `organization_id`
3. Usar `clearCurrentOrganizationId()` al hacer logout
4. Verificar `rlsBlocked` después de inserts para detectar problemas de RLS

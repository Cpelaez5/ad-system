# ⚡ Supabase - Cheat Sheet

> Patrones de Supabase usados en este proyecto

---

## Configuración

```javascript
// src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

---

## Queries Básicas

### SELECT
```javascript
// Todos los registros
const { data, error } = await supabase
  .from('clients')
  .select('*')
  
// Con filtros
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('status', 'PAGADA')
  .eq('organization_id', orgId)
  .order('created_at', { ascending: false })

// Con relaciones (join)
const { data } = await supabase
  .from('invoices')
  .select(`
    *,
    client:clients(id, company_name, rif)
  `)
```

### INSERT
```javascript
const { data, error } = await supabase
  .from('invoices')
  .insert({
    organization_id: orgId,
    client_id: clientId,
    invoice_number: 'F-2024-001',
    status: 'BORRADOR'
  })
  .select()
  .single()
```

### UPDATE
```javascript
const { data, error } = await supabase
  .from('invoices')
  .update({ status: 'PAGADA' })
  .eq('id', invoiceId)
  .eq('organization_id', orgId) // Siempre filtrar por org
  .select()
  .single()
```

### DELETE (o Soft Delete)
```javascript
// Soft delete (preferido en este proyecto)
const { error } = await supabase
  .from('invoices')
  .update({ status: 'ANULADA' })
  .eq('id', invoiceId)

// Hard delete
const { error } = await supabase
  .from('documents')
  .delete()
  .eq('id', docId)
```

---

## Autenticación

```javascript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Logout
await supabase.auth.signOut()

// Usuario actual
const { data: { user } } = await supabase.auth.getUser()

// Sesión actual
const { data: { session } } = await supabase.auth.getSession()

// Listener de cambios de auth
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    // Usuario logueado
  }
  if (event === 'SIGNED_OUT') {
    // Usuario deslogueado
  }
})
```

---

## Storage

```javascript
// Subir archivo
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`${orgId}/${fileName}`, file)

// Obtener URL pública
const { data: { publicUrl } } = supabase.storage
  .from('documents')
  .getPublicUrl(filePath)

// Eliminar archivo
const { error } = await supabase.storage
  .from('documents')
  .remove([filePath])
```

---

## Multi-Tenancy (Patrón del Proyecto)

```javascript
// Siempre filtrar por organization_id
import { getCurrentOrganizationId } from '@/utils/tenantHelpers.js'

async function getInvoices() {
  const orgId = getCurrentOrganizationId()
  
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', orgId)
    
  return data
}
```

---

## Row Level Security (RLS)

### Habilitar RLS en una tabla
```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
```

### Políticas por operación

**SELECT** - Usa `USING`:
```sql
CREATE POLICY "Usuarios ven facturas de su org"
ON invoices FOR SELECT
TO authenticated
USING ( (SELECT auth.uid()) IN (
  SELECT id FROM users WHERE organization_id = invoices.organization_id
));
```

**INSERT** - Usa `WITH CHECK`:
```sql
CREATE POLICY "Usuarios crean facturas en su org"
ON invoices FOR INSERT
TO authenticated
WITH CHECK ( organization_id = (
  SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
));
```

**UPDATE** - Usa ambos:
```sql
CREATE POLICY "Usuarios actualizan facturas de su org"
ON invoices FOR UPDATE
TO authenticated
USING ( organization_id = get_user_organization_id() )
WITH CHECK ( organization_id = get_user_organization_id() );
```

**DELETE**:
```sql
CREATE POLICY "Solo admin elimina"
ON invoices FOR DELETE
TO authenticated
USING ( 
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  AND organization_id = get_user_organization_id()
);
```

### Funciones Helper

```sql
-- auth.uid() - ID del usuario actual
-- auth.jwt() - JWT completo (incluye claims)

-- Función personalizada para organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### ⚡ Tips de Performance RLS

1. **Usar `(SELECT auth.uid())` en vez de `auth.uid()`**:
```sql
-- ❌ Lento
USING ( auth.uid() = user_id )

-- ✅ Rápido (se cachea)
USING ( (SELECT auth.uid()) = user_id )
```

2. **Crear índices en columnas de políticas**:
```sql
CREATE INDEX idx_invoices_org ON invoices(organization_id);
```

3. **Especificar rol con TO**:
```sql
-- Evita ejecutar política para anon
CREATE POLICY "..." ON table
TO authenticated  -- Solo usuarios autenticados
USING ( ... );
```

4. **Agregar filtros en queries** (aunque RLS ya filtre):
```javascript
// Duplicar filtro mejora performance
const { data } = await supabase
  .from('invoices')
  .select('*')
  .eq('organization_id', orgId)  // Aunque RLS lo haga
```

---

## Funciones RPC

```javascript
// Llamar función PostgreSQL
const { data, error } = await supabase
  .rpc('get_invoice_stats', { org_id: orgId })
```

---

## Realtime (Suscripciones en Tiempo Real)

> ⚠️ **NO implementado actualmente** - Documentado para futura implementación

### Suscribirse a cambios en una tabla

```javascript
// En un componente Vue
import { supabase } from '@/lib/supabaseClient'

export default {
  data() {
    return {
      invoices: [],
      subscription: null
    }
  },
  
  mounted() {
    this.loadInvoices()
    this.subscribeToChanges()
  },
  
  beforeUnmount() {
    // IMPORTANTE: Limpiar suscripción
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
    }
  },
  
  methods: {
    subscribeToChanges() {
      this.subscription = supabase
        .channel('invoices-changes')
        .on(
          'postgres_changes',
          {
            event: '*',  // INSERT, UPDATE, DELETE o *
            schema: 'public',
            table: 'invoices',
            filter: `organization_id=eq.${this.orgId}`  // Filtrar por org
          },
          (payload) => {
            this.handleChange(payload)
          }
        )
        .subscribe()
    },
    
    handleChange(payload) {
      const { eventType, new: newRecord, old: oldRecord } = payload
      
      if (eventType === 'INSERT') {
        this.invoices.push(newRecord)
      } else if (eventType === 'UPDATE') {
        const index = this.invoices.findIndex(i => i.id === newRecord.id)
        if (index !== -1) this.invoices[index] = newRecord
      } else if (eventType === 'DELETE') {
        this.invoices = this.invoices.filter(i => i.id !== oldRecord.id)
      }
    }
  }
}
```

### Requisitos para Realtime

1. **Habilitar en Supabase Dashboard**:
   - Database → Replication → Enable for table

2. **RLS aplica a Realtime**:
   - Solo recibe eventos de filas que el usuario puede ver

3. **Limpiar suscripciones** en `beforeUnmount()`

### Eventos disponibles
- `INSERT` - Nueva fila creada
- `UPDATE` - Fila modificada
- `DELETE` - Fila eliminada
- `*` - Todos los eventos

---

## ❌ NO usado en este proyecto

- **Edge Functions** - No hay funciones serverless Deno

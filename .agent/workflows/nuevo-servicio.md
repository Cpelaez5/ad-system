---
description: Crear nuevo servicio de lógica de negocio
---

## Contexto

Los servicios están en `src/services/` y manejan la lógica de negocio + llamadas a Supabase.

Servicios existentes:
- `invoiceService.js` - Facturas (compras/ventas)
- `clientService.js` - Clientes
- `userService.js` - Usuarios y autenticación
- `exportService.js` - Exportar a Excel/PDF
- `bcvService.js` - Tasa BCV
- `ocrService.js` - Reconocimiento de texto

## Pasos

1. Crear archivo `src/services/nombreService.js`

2. Estructura base:
   ```javascript
   import { supabase } from '@/lib/supabaseClient'
   import { getCurrentOrganizationId } from '@/utils/tenantHelpers'

   /**
    * Servicio para [descripción]
    */

   // Obtener todos
   export async function getAll() {
     const orgId = getCurrentOrganizationId()
     
     const { data, error } = await supabase
       .from('tabla')
       .select('*')
       .eq('organization_id', orgId)
       .order('created_at', { ascending: false })
     
     if (error) throw error
     return data
   }

   // Obtener por ID
   export async function getById(id) {
     const { data, error } = await supabase
       .from('tabla')
       .select('*')
       .eq('id', id)
       .single()
     
     if (error) throw error
     return data
   }

   // Crear
   export async function create(payload) {
     const orgId = getCurrentOrganizationId()
     
     const { data, error } = await supabase
       .from('tabla')
       .insert({ ...payload, organization_id: orgId })
       .select()
       .single()
     
     if (error) throw error
     return data
   }

   // Actualizar
   export async function update(id, payload) {
     const { data, error } = await supabase
       .from('tabla')
       .update(payload)
       .eq('id', id)
       .select()
       .single()
     
     if (error) throw error
     return data
   }

   // Eliminar (soft delete)
   export async function remove(id) {
     const { error } = await supabase
       .from('tabla')
       .update({ status: 'ELIMINADO' })
       .eq('id', id)
     
     if (error) throw error
   }

   export default {
     getAll,
     getById,
     create,
     update,
     remove
   }
   ```

3. Importar en el componente:
   ```javascript
   import nombreService from '@/services/nombreService'
   ```

## Reglas importantes

- **SIEMPRE** filtrar por `organization_id` (multi-tenancy)
- Usar soft delete (`status = 'ELIMINADO'`) en vez de DELETE
- Manejar errores con try/catch en el componente

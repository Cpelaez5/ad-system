# 🚀 Guía de Ejecución: Migración de Columna `flow`

## Resumen

Esta migración agrega la columna `flow` a la tabla `invoices` para separar facturas de **VENTA** y **COMPRA**.

---

## ✅ Estado Actual

### Código Frontend: **LISTO**
- ✅ `invoiceService.js` ya incluye el campo `flow` en todas las operaciones
- ✅ Queries filtran por `flow`
- ✅ Creación/actualización incluyen `flow`
- ✅ Transformaciones manejan `flow`

### Base de Datos: **PENDIENTE**
- ⚠️ Columna `flow` NO existe en la tabla `invoices`
- ⚠️ Necesita ejecutar migración SQL

---

## 📋 Pasos para Ejecutar la Migración

### Opción 1: Desde Supabase Dashboard (Recomendado)

1. **Abrir Supabase Dashboard:**
   - Ir a: https://supabase.com/dashboard
   - Seleccionar proyecto: `ybeippdhlvjzfgpbcoqy`

2. **Ir al SQL Editor:**
   - En el menú lateral, clic en "SQL Editor"
   - Clic en "New query"

3. **Copiar y pegar el contenido del archivo:**
   ```
   migrations/20251124_add_flow_column.sql
   ```

4. **Ejecutar la migración:**
   - Clic en "Run" o presionar `Ctrl+Enter`
   - Verificar que no hay errores
   - Revisar los mensajes de confirmación

5. **Verificar resultado:**
   - Ir a "Table Editor" → "invoices"
   - Verificar que la columna `flow` aparece
   - Verificar que tiene el constraint `CHECK (flow IN ('VENTA', 'COMPRA'))`

---

### Opción 2: Usando Supabase CLI (Avanzado)

```bash
# 1. Instalar Supabase CLI (si no está instalado)
npm install -g supabase

# 2. Iniciar sesión
supabase login

# 3. Vincular proyecto
supabase link --project-ref ybeippdhlvjzfgpbcoqy

# 4. Ejecutar migración
supabase db push migrations/20251124_add_flow_column.sql
```

---

### Opción 3: Usando MCP Tool (Automático)

Si tienes acceso al MCP server de Supabase configurado:

```javascript
// Ejecutar desde el código
await mcp0_apply_migration({
  project_id: 'ybeippdhlvjzfgpbcoqy',
  name: 'add_flow_column',
  query: '/* contenido del archivo SQL */'
})
```

---

## 🔍 Verificación Post-Migración

### 1. Verificar estructura de la tabla

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name = 'flow';
```

**Resultado esperado:**
```
column_name | data_type | is_nullable | column_default
------------|-----------|-------------|---------------
flow        | text      | NO          | 'VENTA'::text
```

### 2. Verificar constraint

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'invoices'::regclass
AND conname LIKE '%flow%';
```

**Resultado esperado:**
```
conname              | pg_get_constraintdef
---------------------|---------------------
invoices_flow_check  | CHECK (flow = ANY (ARRAY['VENTA'::text, 'COMPRA'::text]))
```

### 3. Verificar índices

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'invoices' AND indexname LIKE '%flow%';
```

**Resultado esperado:**
```
indexname                      | indexdef
-------------------------------|----------
idx_invoices_flow              | CREATE INDEX idx_invoices_flow ON invoices USING btree (organization_id, flow)
idx_invoices_org_flow_status   | CREATE INDEX idx_invoices_org_flow_status ON invoices USING btree (organization_id, flow, status)
```

### 4. Verificar datos existentes

```sql
SELECT flow, COUNT(*) as total
FROM invoices
GROUP BY flow;
```

**Resultado esperado:**
```
flow   | total
-------|------
VENTA  | X
COMPRA | Y
```

---

## 🧪 Testing Post-Migración

### 1. Probar creación de factura de VENTA

```javascript
const result = await invoiceService.createInvoice({
  invoiceNumber: 'TEST-VENTA-001',
  flow: 'VENTA',
  issueDate: '2024-11-24',
  status: 'BORRADOR',
  issuer: { companyName: 'Test Company' },
  client: { companyName: 'Test Client' },
  financial: { totalSales: 1000 }
})

console.log('Factura de VENTA creada:', result)
```

### 2. Probar creación de factura de COMPRA

```javascript
const result = await invoiceService.createInvoice({
  invoiceNumber: 'TEST-COMPRA-001',
  flow: 'COMPRA',
  issueDate: '2024-11-24',
  status: 'BORRADOR',
  issuer: { companyName: 'Proveedor Test' },
  client: { companyName: 'Mi Empresa' },
  financial: { totalSales: 500 }
})

console.log('Factura de COMPRA creada:', result)
```

### 3. Probar filtros por flow

```javascript
// Obtener solo ventas
const ventas = await invoiceService.getInvoices({ flow: 'VENTA' })
console.log('Ventas:', ventas.length)

// Obtener solo compras
const compras = await invoiceService.getInvoices({ flow: 'COMPRA' })
console.log('Compras:', compras.length)
```

---

## ⚠️ Problemas Comunes

### Error: "column flow does not exist"

**Causa:** La migración no se ejecutó correctamente.

**Solución:**
1. Verificar que estás conectado al proyecto correcto
2. Ejecutar la migración nuevamente
3. Verificar logs de Supabase para errores

### Error: "new row violates check constraint"

**Causa:** Intentando insertar un valor de `flow` que no es 'VENTA' o 'COMPRA'.

**Solución:**
1. Verificar que el código solo usa 'VENTA' o 'COMPRA'
2. Revisar el constraint en la base de datos

### Error: "null value in column flow violates not-null constraint"

**Causa:** Intentando insertar una factura sin especificar `flow`.

**Solución:**
1. Asegurarse de que el código siempre incluye `flow`
2. El default 'VENTA' debería prevenir esto

---

## 🔄 Rollback (Si es necesario)

Si necesitas revertir la migración:

```sql
-- 1. Eliminar índices
DROP INDEX IF EXISTS idx_invoices_flow;
DROP INDEX IF EXISTS idx_invoices_org_flow_status;

-- 2. Eliminar columna
ALTER TABLE invoices DROP COLUMN flow;
```

**⚠️ ADVERTENCIA:** Esto eliminará permanentemente los datos de la columna `flow`.

---

## ✅ Checklist de Ejecución

- [ ] Hacer backup de la base de datos (opcional pero recomendado)
- [ ] Ejecutar migración SQL en Supabase
- [ ] Verificar que la columna se creó correctamente
- [ ] Verificar constraints e índices
- [ ] Probar creación de factura de VENTA
- [ ] Probar creación de factura de COMPRA
- [ ] Probar filtros por flow
- [ ] Verificar que las vistas funcionan correctamente
- [ ] Actualizar documentación si es necesario

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisar logs de Supabase
2. Verificar que el proyecto es el correcto
3. Consultar documentación de Supabase: https://supabase.com/docs
4. Revisar el archivo de migración para errores de sintaxis

---

**Archivo de migración:** `migrations/20251124_add_flow_column.sql`  
**Fecha:** 2025-11-24  
**Versión:** 1.0.0

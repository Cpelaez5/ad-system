---
description: Crear nueva migración de base de datos
---

## Contexto

Las migraciones están en `/migrations/` con formato: `XXX_nombre_descriptivo.sql`

## Pasos

1. Verificar el último número de migración en `/migrations/`

2. Crear archivo con el siguiente número:
   ```
   migrations/XXX_nombre_cambio.sql
   ```

3. Escribir el SQL con este header:
   ```sql
   -- migrations/XXX_nombre_cambio.sql
   -- Descripción: [qué hace esta migración]
   -- Autor: [nombre]
   -- Fecha: YYYY-MM-DD

   -- SQL aquí
   ```

4. Ir a Supabase Dashboard → SQL Editor

5. Pegar y ejecutar el SQL de la migración

6. Verificar que los cambios se aplicaron correctamente

7. Actualizar `.agent/database/schema.md` con los nuevos campos/tablas

8. Si hay nuevas políticas RLS, documentarlas

## Ejemplo

```sql
-- migrations/011_add_invoice_notes.sql
-- Descripción: Agregar campo de notas a facturas
-- Autor: Carlos
-- Fecha: 2026-02-08

ALTER TABLE invoices 
ADD COLUMN notes TEXT;

COMMENT ON COLUMN invoices.notes IS 'Notas internas de la factura';
```

## Rollback

Si necesitas revertir, crear migración inversa:
```sql
-- migrations/012_revert_invoice_notes.sql
ALTER TABLE invoices DROP COLUMN notes;
```

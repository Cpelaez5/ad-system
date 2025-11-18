# Estado de la Base de Datos: Facturas de Organización

## 📊 Resumen

La base de datos **YA está configurada correctamente** para soportar facturas de la organización (gastos, compras y ventas propias de la organización).

## ✅ Verificación de la Estructura

### Tabla `invoices`

La columna `client_id` **permite valores NULL**, lo cual es necesario para representar facturas que pertenecen directamente a la organización (sin cliente asociado).

```sql
-- Estado actual de la columna client_id
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
  AND column_name = 'client_id';
```

**Resultado esperado:**
- `is_nullable`: `YES` ✅
- `data_type`: `uuid`
- `column_default`: `NULL`

### Tipos de Facturas

La tabla `invoices` puede almacenar dos tipos de facturas:

1. **Facturas de Cliente** (`client_id IS NOT NULL`)
   - Facturas asociadas a un cliente específico
   - Accesibles por: admin, contador, y el cliente específico

2. **Facturas de Organización** (`client_id IS NULL`)
   - Gastos, compras y ventas de la organización misma
   - Accesibles por: admin y contador únicamente
   - Ejemplos:
     - **Gastos**: Pagos de servicios (internet, facturas, etc.)
     - **Compras**: Mercancía/productos para la oficina
     - **Ventas**: Ingresos propios de la organización

## 🔒 Políticas RLS (Row Level Security)

Las políticas RLS actuales permiten:

### Para `SELECT` (lectura):
- **Super Admin**: Ve todas las facturas
- **Admin/Contador**: Ve facturas de su organización (incluyendo `client_id IS NULL`)
- **Cliente**: Solo ve facturas donde `client_id = su client_id`

### Para `INSERT` (creación):
- **Super Admin**: Puede crear facturas en cualquier organización
- **Admin/Contador**: Pueden crear facturas en su organización (con o sin `client_id`)
- **Cliente**: Solo puede crear facturas con su propio `client_id`

### Para `UPDATE` (actualización):
- **Super Admin**: Puede actualizar cualquier factura
- **Admin/Contador**: Pueden actualizar facturas de su organización
- **Cliente**: Solo puede actualizar sus propias facturas

### Para `DELETE` (eliminación):
- **Super Admin**: Puede eliminar cualquier factura
- **Admin/Contador**: Pueden eliminar facturas de su organización

## 📝 Flujos de Facturación

### Flujo `VENTA`
- **Con cliente** (`client_id IS NOT NULL`): Venta emitida por la organización a un cliente
- **Sin cliente** (`client_id IS NULL`): Ingreso propio de la organización

### Flujo `COMPRA`
- **Con cliente** (`client_id IS NOT NULL`): Compra realizada por un cliente (gasto del cliente)
- **Sin cliente** (`client_id IS NULL`): Compra realizada por la organización (gasto de la organización)

### Flujo `GASTO` (usado en el frontend)
- **Con cliente** (`client_id IS NOT NULL`): Gasto del cliente (pago de servicios constantes)
- **Sin cliente** (`client_id IS NULL`): Gasto de la organización (pago de servicios constantes)

## 🔍 Consultas de Ejemplo

### Obtener todas las facturas de la organización (sin cliente)
```sql
SELECT * 
FROM invoices 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND client_id IS NULL;
```

### Obtener gastos de la organización
```sql
SELECT * 
FROM invoices 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND client_id IS NULL
  AND flow = 'COMPRA'; -- o 'GASTO' según el sistema
```

### Obtener compras de la organización
```sql
SELECT * 
FROM invoices 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND client_id IS NULL
  AND flow = 'COMPRA';
```

### Obtener ventas de la organización
```sql
SELECT * 
FROM invoices 
WHERE organization_id = '11111111-1111-1111-1111-111111111111'
  AND client_id IS NULL
  AND flow = 'VENTA';
```

## ✅ Migración Aplicada

**Archivo:** `migrations/20250118_allow_organization_invoices.sql`

**Estado:** ✅ Aplicada exitosamente

**Cambios:**
- Verifica que `client_id` permite NULL
- Agrega comentarios descriptivos a la columna y tabla
- Documenta el uso de `client_id IS NULL` para facturas de organización

## 🎯 Conclusión

La base de datos está **completamente preparada** para manejar facturas de la organización. No se requieren cambios adicionales en la estructura de la base de datos.

El sistema frontend ya está configurado para:
- Crear facturas con `client_id = NULL` cuando `organizationOnly = true`
- Filtrar facturas de organización usando `organizationOnly = true` en `invoiceService.getInvoices()`
- Mostrar módulos separados para Gastos, Compras y Ventas de la organización

## 📚 Referencias

- `MODULOS_ORGANIZACION.md`: Documentación de los módulos de organización
- `src/services/invoiceService.js`: Servicio que maneja las facturas
- `src/components/forms/InvoiceForm.vue`: Formulario con soporte para `organizationOnly`


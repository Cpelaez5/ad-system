# 🏢 Módulos de Gestión de la Organización

## 📋 Descripción General

Los módulos de **Organización** permiten a los usuarios **Admin** y **Contador** gestionar los gastos, compras y ventas propios de la empresa administradora/contadora, separados de los datos de sus clientes.

---

## 🎯 Diferencias entre Módulos

### **Módulos de Clientes** (Facturación)
Gestionan las facturas de las **Empresas Cliente** asociadas a la organización:
- **Gastos** (`/gastos`) - Facturas de venta emitidas a clientes
- **Ventas** (`/ventas`) - Facturas de venta emitidas a clientes  
- **Compras** (`/compras`) - Facturas de compra recibidas de clientes

**Características**:
- Tienen `client_id` asociado (pertenecen a una empresa cliente)
- Pueden filtrarse por cliente específico
- Son visibles para contadores y admins de la organización

### **Módulos de Organización** (Organización)
Gestionan las facturas propias de la **Empresa Administradora/Contadora**:
- **Gastos** (`/organizacion/gastos`) - Servicios constantes: internet, facturas de servicios, etc.
- **Compras** (`/organizacion/compras`) - Mercancía y productos: hojas, carpetas, suministros de oficina
- **Ventas** (`/organizacion/ventas`) - Ingresos de la organización por servicios prestados

**Características**:
- **NO tienen `client_id`** (son de la organización misma)
- Solo accesibles para `admin` y `contador`
- Separados completamente de los datos de clientes

---

## 📊 Conceptos: Gastos, Compras y Ventas

### **Gastos** (Egresos)
**Definición**: Pagos de servicios constantes que hace la organización.

**Ejemplos**:
- Factura de internet
- Factura de electricidad
- Factura de telefonía
- Servicios de limpieza
- Servicios de seguridad

**Tipo de factura**: `COMPRA` (factura recibida)
**client_id**: `NULL` (pertenece a la organización)

---

### **Compras** (Egresos)
**Definición**: Mercancía o productos y servicios ofrecidos extra curriculares que afectan directamente.

**Ejemplos**:
- Compra de hojas y carpetas para la oficina
- Compra de suministros de oficina
- Compra de equipos de computación
- Materiales de oficina

**Tipo de factura**: `COMPRA` (factura recibida)
**client_id**: `NULL` (pertenece a la organización)

---

### **Ventas** (Ingresos)
**Definición**: Ingresos de la organización por servicios prestados.

**Ejemplos**:
- Facturas emitidas por servicios contables
- Facturas emitidas por asesorías fiscales
- Ingresos por servicios profesionales

**Tipo de factura**: `VENTA` (factura emitida)
**client_id**: `NULL` (pertenece a la organización)

---

## 🔐 Acceso y Permisos

### **Roles con Acceso**
- ✅ **Admin** (`admin`) - Acceso completo
- ✅ **Contador** (`contador`) - Acceso completo
- ❌ **Cliente** (`cliente`) - Sin acceso
- ❌ **Super Admin** (`super_admin`) - Sin acceso (gestión operativa)

### **Rutas**
- `/organizacion/gastos` → `GastosOrganizacion.vue`
- `/organizacion/compras` → `ComprasOrganizacion.vue`
- `/organizacion/ventas` → `VentasOrganizacion.vue`

---

## 🛠️ Funcionalidades

Cada módulo incluye:

### **Estadísticas**
- Total de facturas
- Facturas emitidas
- Facturas pagadas
- Monto total (con conversión VES/USD)

### **Gestión CRUD**
- ✅ Crear nuevas facturas
- ✅ Ver detalles de facturas
- ✅ Editar facturas existentes
- ✅ Eliminar facturas

### **Búsqueda y Filtros**
- Búsqueda por número de factura
- Búsqueda por proveedor/cliente
- Filtro por estado (BORRADOR, EMITIDA, PAGADA, etc.)

### **Conversión de Moneda**
- Toggle entre VES y USD
- Conversión automática usando tasa BCV
- Visualización animada de montos

---

## 🔄 Flujo de Trabajo

### **Registrar un Gasto de la Organización**

1. Ir a **Organización** → **Gastos**
2. Clic en **"Nuevo Gasto"**
3. Completar el formulario:
   - Número de factura
   - Proveedor (quien emite la factura)
   - Fecha de emisión
   - Montos (subtotal, impuestos, total)
   - Descripción de servicios
4. Guardar la factura
5. El sistema la registra con `client_id = NULL` (de la organización)

### **Registrar una Compra de la Organización**

1. Ir a **Organización** → **Compras**
2. Clic en **"Nueva Compra"**
3. Completar el formulario:
   - Número de factura
   - Proveedor
   - Fecha de compra
   - Productos/servicios comprados
   - Montos
4. Guardar la factura
5. El sistema la registra con `client_id = NULL` (de la organización)

### **Registrar una Venta de la Organización**

1. Ir a **Organización** → **Ventas**
2. Clic en **"Nueva Venta"**
3. Completar el formulario:
   - Número de factura
   - Cliente (quien recibe el servicio)
   - Fecha de emisión
   - Servicios prestados
   - Montos
4. Guardar la factura
5. El sistema la registra con `client_id = NULL` (de la organización)

---

## 🔍 Filtrado en Base de Datos

### **Facturas de Clientes**
```sql
SELECT * FROM invoices 
WHERE organization_id = 'xxx' 
  AND client_id IS NOT NULL
  AND flow = 'VENTA';
```

### **Facturas de la Organización**
```sql
SELECT * FROM invoices 
WHERE organization_id = 'xxx' 
  AND client_id IS NULL
  AND flow = 'VENTA';
```

---

## 📝 Notas Importantes

1. **Separación de Datos**: Las facturas de la organización están completamente separadas de las facturas de clientes
2. **Sin Cliente Asociado**: Las facturas de organización tienen `client_id = NULL`
3. **Solo Admin/Contador**: Solo usuarios con estos roles pueden acceder
4. **Mismo Formulario**: Se usa el mismo `InvoiceForm` pero con prop `organizationOnly: true`
5. **Filtrado Automático**: El servicio `invoiceService` filtra automáticamente por `organization_id` y `client_id IS NULL`

---

## 🎯 Beneficios

1. **Organización Clara**: Separación entre datos de clientes y datos propios
2. **Control Financiero**: La organización puede gestionar sus propios gastos e ingresos
3. **Reportes Separados**: Facilita la generación de reportes financieros
4. **Auditoría**: Permite rastrear todos los movimientos financieros de la organización

---

**Última actualización**: Noviembre 2024


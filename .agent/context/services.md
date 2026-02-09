# 📡 API de Servicios

> Documentación de métodos disponibles en cada servicio.

---

## invoiceService

**Archivo**: `src/services/invoiceService.js`

Manejo de facturas (compras y ventas) con multi-tenancy.

### Métodos

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `getInvoices()` | `{ flow, organizationOnly, clientId }`, `{ trashed }` | `Invoice[]` | Listar facturas con filtros |
| `getInvoiceById(id)` | `id: string` | `Invoice` | Obtener factura por ID |
| `createInvoice(data)` | `InvoiceData` | `Invoice` | Crear nueva factura |
| `updateInvoice(id, data)` | `id, InvoiceData` | `Invoice` | Actualizar factura |
| `deleteInvoice(id)` | `id: string` | `void` | Enviar a papelera (soft delete) |
| `restoreInvoice(id)` | `id: string` | `void` | Restaurar de papelera |
| `hardDeleteInvoice(id)` | `id: string` | `void` | Eliminar permanentemente |
| `getInvoiceStats()` | - | `Stats` | Estadísticas de facturas |
| `searchInvoices(term)` | `term, { flow, clientId }` | `Invoice[]` | Buscar facturas |
| `validateUniqueInvoiceNumber(num)` | `num, excludeId?` | `boolean` | Validar número único |
| `getNextInvoiceNumber()` | - | `string` | Siguiente número sugerido |
| `uploadAttachment(file)` | `File` | `string` | Subir archivo, retorna URL |
| `deleteAttachment(path)` | `path: string` | `void` | Eliminar archivo de Storage |

### Uso

```javascript
import invoiceService from '@/services/invoiceService'

// Listar ventas
const ventas = await invoiceService.getInvoices({ flow: 'VENTA' })

// Listar compras en papelera
const eliminadas = await invoiceService.getInvoices(
  { flow: 'COMPRA' }, 
  { trashed: true }
)

// Crear factura
const nueva = await invoiceService.createInvoice({
  invoice_number: 'F-2024-001',
  client_id: 'uuid...',
  flow: 'VENTA',
  items: [...],
  total_usd: 100,
  total_bs: 3650
})
```

---

## clientService

**Archivo**: `src/services/clientService.js`

Gestión de clientes de la organización.

### Métodos

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `getClients()` | - | `Client[]` | Listar todos los clientes |
| `getClientById(id)` | `id: string` | `Client` | Obtener cliente por ID |
| `createClient(data)` | `ClientData` | `Client` | Crear nuevo cliente |
| `updateClient(id, data)` | `id, ClientData` | `Client` | Actualizar cliente |
| `deleteClient(id)` | `id: string` | `void` | Eliminar cliente (soft) |
| `getClientStats()` | - | `Stats` | Estadísticas de clientes |
| `searchClients(term)` | `term: string` | `Client[]` | Buscar clientes |
| `validateUniqueRif(rif)` | `rif, excludeId?` | `boolean` | Validar RIF único |

### Uso

```javascript
import clientService from '@/services/clientService'

// Listar clientes
const clientes = await clientService.getClients()

// Buscar
const resultados = await clientService.searchClients('empresa')

// Crear cliente
const cliente = await clientService.createClient({
  company_name: 'Empresa ABC',
  rif: 'J-12345678-9',
  email: 'contacto@empresa.com',
  phone: '0412-1234567',
  address: 'Caracas, Venezuela'
})
```

---

## userService

**Archivo**: `src/services/userService.js`

Autenticación y gestión de usuarios con Supabase Auth.

### Métodos

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `login(credentials)` | `{ email, password }` | `User` | Iniciar sesión |
| `logout()` | - | `void` | Cerrar sesión |
| `getCurrentUser()` | - | `User \| null` | Usuario actual |
| `getUsers()` | - | `User[]` | Usuarios de la org |
| `getUserById(id)` | `id: string` | `User` | Obtener usuario por ID |
| `getRoles()` | - | `Role[]` | Roles disponibles |
| `hasPermission(role, perm)` | `role, permission` | `boolean` | Verificar permiso |
| `getRolePermissions(role)` | `role: string` | `string[]` | Permisos de un rol |

### Roles disponibles

| Rol | Permisos |
|-----|----------|
| `super_admin` | `*` (todos) |
| `admin` | Gestión de org, usuarios, clientes |
| `contador` | Facturas, contabilidad, reportes |
| `cliente` | Solo sus propias facturas |

### Uso

```javascript
import userService from '@/services/userService'

// Login
const user = await userService.login({
  email: 'usuario@email.com',
  password: 'password123'
})

// Verificar permiso
if (userService.hasPermission('contador', 'invoices.create')) {
  // Puede crear facturas
}

// Obtener usuario actual
const currentUser = await userService.getCurrentUser()
```

---

## exportService

**Archivo**: `src/services/exportService.js`

Exportar datos a Excel (formato SENIAT).

### Métodos

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `exportTable(invoices, ...)` | `invoices, currency, filename, mode, companyInfo` | `void` | Exportar tabla a Excel |
| `buildLibroCompras(ws, data, info)` | Worksheet, datos, empresa | - | Crear libro de compras |
| `buildLibroVentas(ws, data, info)` | Worksheet, datos, empresa | - | Crear libro de ventas |
| `buildGeneralReport(ws, data)` | Worksheet, datos | - | Crear reporte general |
| `exportInvoice(invoice, format)` | Invoice, 'xlsx'/'pdf' | `void` | Exportar factura individual |

### Uso

```javascript
import exportService from '@/services/exportService'

// Exportar libro de ventas
await exportService.exportTable(
  facturas,
  'USD',
  'libro_ventas_enero_2024',
  'SENIAT',
  { 
    company_name: 'Mi Empresa',
    rif: 'J-12345678-9'
  }
)

// Exportar factura individual
await exportService.exportInvoice(factura, 'xlsx')
```

---

## bcvService

**Archivo**: `src/services/bcvService.js`

Obtener tasa de cambio del BCV.

### Métodos

| Método | Retorna | Descripción |
|--------|---------|-------------|
| `getRate()` | `{ rate, date }` | Tasa USD/VES actual |

### Uso

```javascript
import bcvService from '@/services/bcvService'

const { rate, date } = await bcvService.getRate()
console.log(`Tasa: ${rate} Bs/USD (${date})`)
```

---

## ocrService

**Archivo**: `src/services/ocrService.js`

Reconocimiento de texto en imágenes/PDFs de facturas.

### Métodos

| Método | Parámetros | Retorna | Descripción |
|--------|------------|---------|-------------|
| `extractFromFile(file)` | `File` | `ExtractedData` | Extraer datos de factura |
| `extractWithDeepSeek(base64)` | `base64: string` | `ExtractedData` | Usar IA para extracción |
| `extractWithTesseract(file)` | `File` | `string` | Fallback con Tesseract.js |

### Uso

```javascript
import ocrService from '@/services/ocrService'

const file = event.target.files[0]
const extracted = await ocrService.extractFromFile(file)

// extracted = {
//   invoice_number: 'F-2024-001',
//   supplier_name: 'Proveedor XYZ',
//   total: 1500.00,
//   date: '2024-01-15'
// }
```

---

## Patrones Comunes

### Multi-tenancy en todos los servicios

```javascript
// SIEMPRE filtrar por organization_id
const orgId = getCurrentOrganizationId()

const { data } = await supabase
  .from('tabla')
  .select('*')
  .eq('organization_id', orgId)
```

### Soft delete

```javascript
// NO usar .delete()
await supabase
  .from('tabla')
  .update({ status: 'ELIMINADO' })
  .eq('id', id)
```

### Manejo de errores

```javascript
try {
  const { data, error } = await supabase.from('tabla').select()
  if (error) throw error
  return data
} catch (error) {
  console.error('Error:', error)
  throw error // Re-lanzar para que el componente lo maneje
}
```

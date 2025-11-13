# 🔗 Mapeo: Flujo de Trabajo ↔ Archivos del Sistema

## 📋 Relación Directa entre el Flujo y los Archivos

Este documento relaciona cada paso del flujo de trabajo del **Expediente Fiscal 360** con los archivos específicos que lo implementan.

---

## 🎯 Los 4 Módulos y sus Archivos

### 1. 📄 **Gastos** (Facturas de Venta)

| Paso del Flujo | Archivo | Método/Función | Línea Aprox. |
|----------------|---------|----------------|--------------|
| **Ver lista de gastos** | `src/views/contador/Gastos.vue` | `loadInvoices()` | 204-223 |
| **Buscar gastos** | `src/views/contador/Gastos.vue` | `applyFilters()` | 218-231 |
| **Crear nuevo gasto** | `src/views/contador/Gastos.vue` | `openNewInvoiceDialog()` | 250-253 |
| **Abrir formulario** | `src/components/forms/InvoiceForm.vue` | Componente completo | - |
| **Subir archivo** | `src/components/forms/InvoiceForm.vue` | `handleFileUpload()` | 889-893 |
| **Extraer datos** | `src/components/forms/InvoiceForm.vue` | `extractDataFromFile()` | 895-927 |
| **Guardar factura** | `src/components/forms/InvoiceForm.vue` | `submitForm()` | 958-1003 |
| **Servicio de guardado** | `src/services/invoiceService.js` | `createInvoice()` | 234-328 |
| **Ver estadísticas** | `src/views/contador/Gastos.vue` | `computeStats()` | 207-217 |
| **Editar gasto** | `src/views/contador/Gastos.vue` | `editInvoice()` | 254-257 |
| **Eliminar gasto** | `src/views/contador/Gastos.vue` | `deleteInvoice()` | 262-265 |

**Ruta:** `/gastos`  
**Router:** `src/router/index.js` línea 38-42

---

### 2. 🛒 **Compras** (Facturas de Compra)

| Paso del Flujo | Archivo | Método/Función | Línea Aprox. |
|----------------|---------|----------------|--------------|
| **Ver lista de compras** | `src/views/contador/Compras.vue` | `loadInvoices()` | 202-221 |
| **Buscar compras** | `src/views/contador/Compras.vue` | `applyFilters()` | 234-247 |
| **Crear nueva compra** | `src/views/contador/Compras.vue` | `openNewInvoiceDialog()` | 248-251 |
| **Abrir formulario** | `src/components/forms/InvoiceForm.vue` | Componente completo | - |
| **Subir archivo** | `src/components/forms/InvoiceForm.vue` | `handleFileUpload()` | 889-893 |
| **Extraer datos** | `src/components/forms/InvoiceForm.vue` | `extractDataFromFile()` | 895-927 |
| **Guardar factura** | `src/components/forms/InvoiceForm.vue` | `submitForm()` | 958-1003 |
| **Servicio de guardado** | `src/services/invoiceService.js` | `createInvoice()` | 234-328 |
| **Ver estadísticas** | `src/views/contador/Compras.vue` | `computeStats()` | 223-233 |
| **Editar compra** | `src/views/contador/Compras.vue` | `editInvoice()` | 234-237 |
| **Eliminar compra** | `src/views/contador/Compras.vue` | `deleteInvoice()` | 242-245 |

**Ruta:** `/compras`  
**Router:** `src/router/index.js` línea 44-48

---

### 3. 💰 **Facturación** (Gestión General)

| Paso del Flujo | Archivo | Método/Función | Línea Aprox. |
|----------------|---------|----------------|--------------|
| **Ver todas las facturas** | `src/views/contador/Facturacion.vue` | `loadInvoices()` | 623-638 |
| **Buscar facturas** | `src/views/contador/Facturacion.vue` | `applyFilters()` | - |
| **Filtros avanzados** | `src/views/contador/Facturacion.vue` | Filtros por estado/fecha | 88-100 |
| **Crear nueva factura** | `src/views/contador/Facturacion.vue` | `openNewInvoiceDialog()` | 695-698 |
| **Exportar a CSV** | `src/views/contador/Facturacion.vue` | `exportTable()` | - |
| **Ver estadísticas** | `src/views/contador/Facturacion.vue` | `loadStats()` | - |
| **Servicio de facturas** | `src/services/invoiceService.js` | `getInvoices()` | 35-114 |
| **Servicio de exportación** | `src/services/exportService.js` | `exportTable()` | - |

**Ruta:** `/facturacion`  
**Router:** `src/router/index.js` línea 110-114

---

### 4. 📁 **Archivo Digital** (Expediente Fiscal 360)

| Paso del Flujo | Archivo | Método/Función | Línea Aprox. |
|----------------|---------|----------------|--------------|
| **Ver documentos** | `src/views/contador/Archivo.vue` | `cargarDocumentos()` | 494-514 |
| **Buscar documentos** | `src/views/contador/Archivo.vue` | `documentosFiltrados` (computed) | 443-470 |
| **Subir documentos** | `src/views/contador/Archivo.vue` | `subirDocumentos()` | 549-625 |
| **Seleccionar categoría** | `src/views/contador/Archivo.vue` | `seleccionarCarpeta()` | 534-536 |
| **Ver estadísticas** | `src/views/contador/Archivo.vue` | `cargarEstadisticas()` | 496-532 |
| **Subir a Storage** | `src/services/documentService.js` | `uploadFile()` | - |
| **Crear registro** | `src/services/documentService.js` | `createDocument()` | - |
| **Eliminar documento** | `src/views/contador/Archivo.vue` | `eliminarDocumento()` | 644-658 |
| **Servicio de documentos** | `src/services/documentService.js` | `getDocuments()` | - |

**Ruta:** `/archivo`  
**Router:** `src/router/index.js` línea 128-132

---

## 🔄 Flujo Completo: Paso a Paso con Archivos

### **PASO 1: Registrar un Documento**

#### Opción A: Con documento físico/digital

```
Usuario hace clic en "Nuevo"
    ↓
src/views/contador/Gastos.vue (o Compras.vue)
    → openNewInvoiceDialog() [línea 250]
    ↓
Se abre diálogo con InvoiceForm
    ↓
src/components/forms/InvoiceForm.vue
    → Usuario selecciona archivo
    → handleFileUpload() [línea 889]
    → Usuario hace clic en "Extraer"
    → extractDataFromFile() [línea 895]
    ↓
src/services/invoiceService.js
    → extractDataFromFile() [simula OCR]
    ↓
Vuelve a InvoiceForm
    → Autocompleta campos
    → Usuario revisa y corrige
    → Usuario hace clic en "Guardar"
    → submitForm() [línea 958]
    ↓
src/services/invoiceService.js
    → createInvoice() [línea 234]
    → insertWithTenant() [tenantHelpers.js]
    ↓
Supabase (tabla invoices)
    → Documento guardado
```

#### Opción B: Sin documento, solo información

```
Usuario hace clic en "Nuevo"
    ↓
src/views/contador/Gastos.vue (o Compras.vue)
    → openNewInvoiceDialog() [línea 250]
    ↓
Se abre diálogo con InvoiceForm
    ↓
src/components/forms/InvoiceForm.vue
    → Usuario llena formulario manualmente
    → Usuario hace clic en "Guardar"
    → submitForm() [línea 958]
    ↓
src/services/invoiceService.js
    → createInvoice() [línea 234]
    → insertWithTenant() [tenantHelpers.js]
    ↓
Supabase (tabla invoices)
    → Documento guardado
```

---

### **PASO 2: El Sistema Organiza Automáticamente**

```
Documento guardado en Supabase
    ↓
src/services/invoiceService.js
    → createInvoice() [línea 234]
    → Clasifica por flow: 'VENTA' o 'COMPRA'
    → Calcula totales e impuestos
    → Vincula con organization_id (multi-tenant)
    → Vincula con client_id (si aplica)
    ↓
src/utils/tenantHelpers.js
    → getCurrentOrganizationId()
    → insertWithTenant()
    ↓
Supabase (tabla invoices)
    → Documento organizado y guardado
```

---

### **PASO 3: Archivar en el Expediente Fiscal 360**

```
Usuario va a Archivo Digital
    ↓
src/views/contador/Archivo.vue
    → Usuario hace clic en "Subir Documentos"
    → abrirDialogoSubida() [línea 537]
    → Usuario selecciona archivo y categoría
    → Usuario hace clic en "Subir"
    → subirDocumentos() [línea 549]
    ↓
src/services/documentService.js
    → uploadFile() [sube a Supabase Storage]
    → createDocument() [crea registro en BD]
    ↓
Supabase Storage (bucket: documents)
    → Archivo guardado
Supabase (tabla documents)
    → Registro creado con:
       - organization_id (filtrado automático)
       - category (categoría seleccionada)
       - uploaded_by (usuario actual)
       - created_at (fecha automática)
```

---

### **PASO 4: Consultar y Revisar**

#### Buscar por módulo específico:

```
Usuario entra a Gastos/Compras/Facturación
    ↓
src/views/contador/Gastos.vue (o Compras.vue o Facturacion.vue)
    → mounted() [carga automática]
    → loadInvoices() [carga facturas]
    ↓
src/services/invoiceService.js
    → getInvoices({ flow: 'VENTA' o 'COMPRA' })
    → Filtrado automático por organization_id
    ↓
Supabase (tabla invoices)
    → Retorna facturas filtradas
    ↓
Vista muestra lista de facturas
    → Usuario puede buscar
    → applyFilters() [filtra resultados]
    → Usuario puede ver, editar, eliminar
```

#### Buscar en el Expediente Fiscal 360:

```
Usuario entra a Archivo Digital
    ↓
src/views/contador/Archivo.vue
    → mounted() [carga automática]
    → cargarDocumentos() [línea 494]
    ↓
src/services/documentService.js
    → getDocuments()
    → Filtrado automático por organization_id
    ↓
Supabase (tabla documents)
    → Retorna documentos filtrados
    ↓
Vista muestra lista de documentos
    → Usuario puede buscar
    → documentosFiltrados (computed) [línea 443]
    → Usuario puede filtrar por categoría, tipo, fecha
    → Usuario puede ver, descargar, eliminar
```

---

## 📂 Estructura de Archivos por Funcionalidad

### **Formulario de Factura (Compartido)**
```
src/components/forms/InvoiceForm.vue
    ├── Subida de archivos
    ├── Extracción de datos (OCR simulado)
    ├── Formulario completo
    ├── Validación
    └── Guardado
```

### **Servicios (Lógica de Negocio)**
```
src/services/
    ├── invoiceService.js      → Gestión de facturas
    ├── documentService.js     → Gestión de documentos
    ├── clientService.js        → Gestión de clientes
    ├── exportService.js       → Exportación a CSV
    └── bcvService.js          → Tasa de cambio BCV
```

### **Utilidades Multi-Tenant**
```
src/utils/
    └── tenantHelpers.js       → Filtrado por organization_id
```

### **Vistas por Rol**

#### **Contador/Admin:**
```
src/views/contador/
    ├── Gastos.vue            → Facturas de VENTA
    ├── Compras.vue           → Facturas de COMPRA
    ├── Facturacion.vue       → Gestión general
    └── Archivo.vue           → Expediente Fiscal 360
```

#### **Cliente:**
```
src/views/cliente/
    ├── ClienteMiArea.vue     → Área personal
    ├── Gastos.vue            → Sus facturas de VENTA
    ├── Compras.vue           → Sus facturas de COMPRA
    └── Archivo.vue           → Sus documentos
```

---

## 🔗 Conexiones entre Archivos

### **Flujo de Creación de Factura:**
```
Gastos.vue / Compras.vue
    ↓ (abre diálogo)
InvoiceForm.vue
    ↓ (valida y prepara datos)
invoiceService.js
    ↓ (guarda en BD)
tenantHelpers.js
    ↓ (aplica filtrado multi-tenant)
Supabase (tabla invoices)
```

### **Flujo de Archivado:**
```
Archivo.vue
    ↓ (sube archivo)
documentService.js
    ↓ (sube a Storage y crea registro)
Supabase Storage + Supabase (tabla documents)
```

### **Flujo de Consulta:**
```
Cualquier vista (Gastos/Compras/Facturación/Archivo)
    ↓ (carga datos)
Servicio correspondiente (invoiceService/documentService)
    ↓ (consulta con filtros)
tenantHelpers.js
    ↓ (aplica filtrado multi-tenant)
Supabase
    ↓ (retorna datos filtrados)
Vista muestra resultados
```

---

## ✅ Verificación de Funcionalidades

### ✅ Implementado y Funcional

| Funcionalidad | Archivo | Estado |
|--------------|---------|--------|
| Crear factura con archivo | `InvoiceForm.vue` | ✅ |
| Crear factura manual | `InvoiceForm.vue` | ✅ |
| Extracción de datos (OCR simulado) | `InvoiceForm.vue` | ✅ |
| Guardar factura | `invoiceService.js` | ✅ |
| Listar facturas | `Gastos.vue`, `Compras.vue`, `Facturacion.vue` | ✅ |
| Buscar facturas | Todas las vistas | ✅ |
| Filtrar facturas | Todas las vistas | ✅ |
| Estadísticas | Todas las vistas | ✅ |
| Subir documentos | `Archivo.vue` | ✅ |
| Buscar documentos | `Archivo.vue` | ✅ |
| Filtrar documentos | `Archivo.vue` | ✅ |
| Multi-tenant | `tenantHelpers.js` | ✅ |
| Control de acceso | `router/index.js` | ✅ |

---

## 📝 Resumen de Archivos Clave

### **Vistas Principales:**
- `src/views/contador/Gastos.vue` - Gestión de gastos
- `src/views/contador/Compras.vue` - Gestión de compras
- `src/views/contador/Facturacion.vue` - Gestión general
- `src/views/contador/Archivo.vue` - Expediente Fiscal 360

### **Componentes:**
- `src/components/forms/InvoiceForm.vue` - Formulario de factura (compartido)

### **Servicios:**
- `src/services/invoiceService.js` - Lógica de facturas
- `src/services/documentService.js` - Lógica de documentos
- `src/services/clientService.js` - Lógica de clientes

### **Utilidades:**
- `src/utils/tenantHelpers.js` - Multi-tenancy

### **Router:**
- `src/router/index.js` - Rutas y control de acceso

---

**Este mapeo relaciona directamente cada paso del flujo de trabajo con los archivos específicos que lo implementan en el código.**


# Arquitectura del Sistema de Facturación

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vue 3)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Facturacion.vue│  │  InvoiceForm.vue│  │ invoiceService.js│  │
│  │                 │  │                 │  │                 │  │
│  │ • Lista facturas│  │ • Formulario    │  │ • CRUD local    │  │
│  │ • Filtros       │  │ • Validación    │  │ • API calls     │  │
│  │ • Estadísticas  │  │ • Autocompletado│  │ • localStorage  │  │
│  │ • Búsqueda      │  │ • Carga archivos│  │ • Fallback      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP/REST API
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Node.js)                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   app.js        │  │ invoices.js     │  │ swagger.js      │  │
│  │                 │  │                 │  │                 │  │
│  │ • Express server│  │ • CRUD endpoints│  │ • API docs      │  │
│  │ • Middleware    │  │ • Validación    │  │ • Schemas       │  │
│  │ • CORS/Security │  │ • Auth middleware│  │ • Examples      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ In-Memory Storage (MVP)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATOS (localStorage/API)                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Facturas      │  │   Archivos      │  │   Estadísticas  │  │
│  │                 │  │                 │  │                 │  │
│  │ • JSON objects  │  │ • PDF/Images    │  │ • Counts        │  │
│  │ • CRUD ops      │  │ • Attachments   │  │ • Totals        │  │
│  │ • Filtering     │  │ • OCR simulado  │  │ • By status     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

### 1. Crear Factura
```
Usuario → InvoiceForm → invoiceService → Backend API → In-Memory Storage
   ↓           ↓              ↓              ↓              ↓
Formulario → Validación → CRUD Service → Endpoints → Datos
```

### 2. Listar Facturas
```
Usuario → Facturacion.vue → invoiceService → Backend API → In-Memory Storage
   ↓           ↓              ↓              ↓              ↓
Vista Lista → Filtros → GET /invoices → Query → JSON Data
```

### 3. Autocompletado
```
Usuario → InvoiceForm → File Upload → OCR Simulado → Formulario
   ↓           ↓              ↓              ↓              ↓
Seleccionar → Cargar → Extraer Datos → Autocompletar → Validar
```

## Componentes Principales

### Frontend
- **Facturacion.vue**: Vista principal con lista, filtros y estadísticas
- **InvoiceForm.vue**: Formulario reutilizable para crear/editar facturas
- **invoiceService.js**: Servicio para manejo de datos y API calls

### Backend
- **app.js**: Servidor Express con middleware y rutas
- **invoices.js**: Endpoints REST para operaciones CRUD
- **swagger.js**: Documentación automática de la API

### Datos
- **localStorage**: Almacenamiento local para MVP
- **In-Memory**: Datos en memoria del servidor
- **JSON Schema**: Estructura flexible para facturas

## Modelo de Datos

### Estructura de Factura
```javascript
{
  // Identificación
  id: number,
  invoiceNumber: string,
  controlNumber: string,
  documentType: string,
  
  // Fechas
  issueDate: string,
  dueDate: string,
  status: string,
  
  // Entidades
  issuer: {
    companyName: string,
    rif: string,
    taxpayerType: string,
    address: string,
    phone: string,
    email: string
  },
  
  client: {
    companyName: string,
    rif: string,
    address: string,
    phone: string,
    email: string
  },
  
  // Financiero
  financial: {
    totalSales: number,
    nonTaxableSales: number,
    taxableSales: number,
    taxDebit: number,
    ivaRetention: number,
    islrRetention: number,
    municipalRetention: number,
    igtf: number,
    currency: string,
    exchangeRate: number
  },
  
  // Items (opcional)
  items: Array<{
    code: string,
    description: string,
    quantity: number,
    unitPrice: number,
    total: number
  }>,
  
  // Archivos
  attachments: Array<{
    id: number,
    filename: string,
    originalName: string,
    mimeType: string,
    size: number,
    uploadedAt: string,
    uploadedBy: string
  }>,
  
  // Metadatos
  createdBy: string,
  createdAt: string,
  updatedAt: string,
  notes: string
}
```

## Estados y Transiciones

```
BORRADOR → EMITIDA → ENVIADA → PAGADA
    ↓         ↓         ↓         ↓
  ANULADA   ANULADA   ANULADA   ANULADA
    ↓         ↓         ↓
  VENCIDA   VENCIDA   VENCIDA
```

## Endpoints API

### Facturas
- `GET /api/invoices` - Listar con filtros
- `GET /api/invoices/:id` - Obtener por ID
- `POST /api/invoices` - Crear nueva
- `PUT /api/invoices/:id` - Actualizar
- `DELETE /api/invoices/:id` - Eliminar

### Archivos
- `POST /api/invoices/:id/upload` - Subir adjunto
- `POST /api/invoices/extract-data` - Extraer datos

## Características Técnicas

### Frontend
- **Vue 3 Composition API**: Reactividad y modularidad
- **Vuetify 3**: Componentes Material Design
- **localStorage**: Persistencia local para MVP
- **Responsive Design**: Mobile-first approach
- **Validación**: Formularios con reglas de negocio

### Backend
- **Express.js**: Framework web minimalista
- **JWT**: Autenticación stateless
- **Swagger**: Documentación automática
- **CORS**: Configuración para desarrollo
- **Rate Limiting**: Protección contra abuso

### Datos
- **JSON**: Formato flexible y legible
- **In-Memory**: Sin dependencias de BD para MVP
- **localStorage**: Persistencia del lado cliente
- **Simulación OCR**: Extracción de datos mockeada

## Escalabilidad

### Preparado para:
- **Base de Datos**: PostgreSQL + Prisma ORM
- **OCR Real**: Integración con servicios de extracción
- **Caché**: Redis para performance
- **CDN**: Almacenamiento de archivos
- **Microservicios**: Separación por dominio
- **Docker**: Containerización
- **CI/CD**: Automatización de despliegue

## Seguridad

### Implementado:
- **JWT**: Tokens seguros con expiración
- **CORS**: Configuración restrictiva
- **Rate Limiting**: Protección contra ataques
- **Helmet**: Headers de seguridad
- **Validación**: Sanitización de inputs

### Preparado para:
- **HTTPS**: Certificados SSL
- **Encriptación**: Datos sensibles
- **Auditoría**: Logs de seguridad
- **RBAC**: Control de acceso granular

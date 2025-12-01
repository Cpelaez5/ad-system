# Sistema de Contabilidad Multi-Tenant

Sistema web completo de gestión contable y tributaria con arquitectura multi-tenant, desarrollado con Vue 3, Vite, Vuetify y Supabase.

## 🚀 Características Principales

- **Multi-Tenant**: Múltiples organizaciones con aislamiento completo de datos
- **Gestión de Invitaciones**: Sistema de registro por roles (Admin, Contador, Cliente)
- **Facturación Completa**: OCR, multi-moneda, integración BCV
- **Seguridad Robusta**: Row Level Security (RLS) en Supabase
- **Interfaz Moderna**: Animaciones, drag & drop, diseño responsive
- **100% Online**: Sin instalación, acceso desde cualquier dispositivo

## 🏢 Arquitectura Multi-Tenant

### Tipos de Empresas

1. **Empresa Administradora/Contadora** (`organizations`)
   - Presta servicios contables a otras empresas
   - Tiene usuarios `admin` y `contador`
   - Gestiona múltiples clientes

2. **Empresa Cliente** (`clients`)
   - Recibe servicios contables
   - Asociada a una organización
   - Tiene usuarios `cliente`

### Jerarquía de Datos

```
ORGANIZACIÓN (organizations)
  ├── USUARIOS ADMIN/CONTADOR
  └── CLIENTES (clients)
      ├── USUARIOS CLIENTE
      ├── FACTURAS (invoices)
      └── DOCUMENTOS (documents)
```

### Roles de Usuario

- **Super Admin**: Gestiona todas las organizaciones del sistema
- **Admin**: Gestiona usuarios, clientes y datos de su organización
- **Contador**: Ve y gestiona datos de todos los clientes de su organización
- **Cliente**: Ve y gestiona solo sus propios datos

## 🎫 Sistema de Invitaciones

### Flujo de Registro

1. **Admin/Super Admin** crea invitación desde el dashboard
2. Sistema genera link único: `https://tu-dominio.com/signup?token=UUID`
3. Usuario invitado completa registro con datos específicos de su rol
4. Sistema vincula automáticamente a organización/cliente correspondiente

### Componentes del Sistema

```
src/views/auth/
├── Register.vue              # Dispatcher principal
└── register/
    ├── RegisterFirm.vue      # Registro de nueva organización
    ├── RegisterClient.vue    # Registro de cliente invitado
    └── RegisterAccountant.vue # Registro de contador invitado
```

### Base de Datos

```sql
-- Tabla de invitaciones
CREATE TABLE invitations (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    token UUID UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('admin', 'contador', 'cliente')),
    organization_id UUID REFERENCES organizations(id),
    client_id UUID REFERENCES clients(id),
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);
```

## 🛠️ Instalación

### Prerrequisitos

- Node.js 18+
- Cuenta de Supabase

### Pasos

1. **Clonar proyecto**
   ```bash
   cd sistema-contabilidad
   npm install
   ```

2. **Configurar variables de entorno**
   
   Crear archivo `.env` en la raíz:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima
   VITE_DEEPSEEK_API_KEY=tu-api-key-opcional
   ```

3. **Configurar base de datos**
   
   Ejecutar en Supabase SQL Editor:
   ```bash
   # 1. Schema principal
   INVITATION_SYSTEM.sql
   
   # 2. Datos de prueba (opcional)
   TEST_INVITATION.sql
   ```

4. **Iniciar desarrollo**
   ```bash
   npm run dev
   ```

## 🚀 Despliegue en Netlify

### Configuración

1. **Variables de entorno en Netlify**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEEPSEEK_API_KEY` (opcional)

2. **Build settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

### Links de Invitación

Los links funcionan igual en producción:
```
https://ad-businessgroup.netlify.app/signup?token=UUID
```

## 📊 Módulos Principales

### 1. Dashboard
- Estadísticas en tiempo real
- Gráficos interactivos (drag & drop)
- Accesos rápidos

### 2. Facturación
- **OCR**: Extracción automática de datos desde PDF/imágenes
- **Multi-moneda**: VES, USD, EUR con tasas BCV
- **Estados**: Borrador, Emitida, Enviada, Pagada, Vencida, Anulada
- **Vista Cliente**: Formulario adaptado para clientes (`ClientInvoiceForm.vue`)

### 3. Gestión de Clientes
- CRUD completo
- Filtros y búsqueda
- Historial de transacciones

### 4. Archivo Digital
- Subida a Supabase Storage
- Organización por categorías
- Búsqueda y descarga

### 5. Auditoría
- Logs de actividad
- Trazabilidad completa
- Reportes

## 🎨 Diseño e Identidad

### Paleta de Colores

- **Primary**: `#A81C22` (Rojo corporativo)
- **Secondary**: `#1F355C` (Azul oscuro)
- **Accent**: `#E0B04F` (Amarillo dorado)
- **Background**: `#efefef` (Gris claro)

### Tipografía

- **Montserrat**: Títulos y elementos destacados
- **Open Sans**: Texto de contenido

### Componentes Animados

- Sistema completo de animaciones CSS
- Micro-interacciones
- Transiciones de página
- Loading spinners (6 tipos)

## 🔐 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen políticas RLS que garantizan:
- Aislamiento completo entre organizaciones
- Usuarios solo ven datos de su organización
- Clientes solo ven sus propios datos

### Autenticación

- Supabase Auth con JWT
- Sesiones seguras
- Recuperación de contraseña
- Magic links

## 📝 Archivos Clave

### Documentación Técnica

- `ARQUITECTURA_EMPRESAS.md`: Arquitectura multi-tenant detallada
- `ANALISIS_SEGURIDAD_MULTI_TENANT.md`: Análisis de seguridad RLS
- `MODULOS_ORGANIZACION.md`: Estructura de módulos
- `ORGANIZACION_VISTAS_POR_ROL.md`: Vistas por tipo de usuario

### SQL

- `INVITATION_SYSTEM.sql`: Schema del sistema de invitaciones
- `TEST_INVITATION.sql`: Datos de prueba para invitaciones

### Servicios

- `src/services/userService.js`: Gestión de usuarios y autenticación
- `src/services/invoiceService.js`: Lógica de facturación
- `src/services/bcvService.js`: Integración con API del BCV
- `src/services/ocrService.js`: OCR con DeepSeek Vision

## 🧪 Testing

### Datos de Prueba

Ejecutar `TEST_INVITATION.sql` para crear:
- 1 Organización demo
- 1 Cliente demo
- 1 Invitación con token: `12345678-1234-1234-1234-123456789012`

### Probar Invitación

```
http://localhost:5173/signup?token=12345678-1234-1234-1234-123456789012
```

## 📚 Recursos Adicionales

### APIs Integradas

- **Supabase**: Backend completo
- **BCV API**: Tasas de cambio en tiempo real
- **DeepSeek Vision**: OCR para facturas

### Librerías Principales

- Vue 3 + Vite
- Vuetify 3
- Chart.js
- ExcelJS + jsPDF
- Swapy (drag & drop)

## 🤝 Contribución

Este es un proyecto privado. Para contribuir, contacta al equipo de desarrollo.

## 📄 Licencia

Propietario: AD Business Group
Todos los derechos reservados.

---

**Desarrollado con ❤️ para simplificar la gestión contable**

# Sistema de Contabilidad, Auditoría, Archivo y Facturación

Un sistema web completo desarrollado con Vue 3, Vite y Vuetify para la gestión contable y tributaria, integrado con Supabase como backend completo con arquitectura multi-tenant.

## 🚀 Características Principales

- **Control Total**: Administración desde cualquier dispositivo en línea
- **Preparado para Revisiones**: Documentación organizada y vigente
- **Interacción con Clientes**: Atención de solicitudes de contribuyentes
- **Documentación y Soporte**: Resguardo de soportes digitales
- **Totalmente Online**: Sin instalación, todo en la nube
- **Diseño Intuitivo**: Fácil de usar sin conocimientos avanzados
- **Experiencia Premium**: Sistema completo de animaciones y micro-interacciones
- **Interfaz Moderna**: Diseño Material Design con efectos visuales profesionales

## 🛠️ Tecnologías Utilizadas

### Frontend
- **Vue 3**: Framework JavaScript progresivo
- **Vite**: Herramienta de construcción rápida
- **Vuetify**: Biblioteca de componentes Material Design
- **Vue Router**: Enrutamiento del lado del cliente
- **Chart.js**: Gráficos interactivos y visualizaciones
- **Vue Date Picker**: Selector de fechas avanzado
- **ExcelJS**: Exportación de datos a Excel
- **jsPDF**: Generación de documentos PDF
- **HTML2Canvas**: Captura de pantalla y conversión
- **Swapy**: Librería de drag & drop para reorganización de elementos
- **Montserrat**: Tipografía moderna y profesional (fuente principal)
- **Open Sans**: Tipografía legible y clara (fuente secundaria)
- **CSS Animations**: Sistema completo de animaciones personalizadas

### Backend
- **Supabase**: Backend-as-a-Service completo
- **PostgreSQL**: Base de datos con Row Level Security (RLS)
- **Supabase Auth**: Autenticación con JWT
- **Supabase Storage**: Almacenamiento de archivos
- **Multi-tenancy**: Aislamiento completo de datos por organización

## 📁 Estructura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── common/         # Componentes comunes
│   │   ├── CustomButton.vue
│   │   ├── CustomDatePicker.vue
│   │   ├── NotificationSystem.vue
│   │   ├── AnimatedForm.vue
│   │   ├── AnimatedTable.vue
│   │   ├── AnimatedNumber.vue
│   │   ├── PageTransition.vue
│   │   └── LoadingSpinner.vue
│   ├── chart/          # Componentes de gráficos
│   │   ├── BarChart.vue
│   │   └── PieChart.vue
│   ├── forms/          # Formularios
│   └── layout/         # Componentes de layout
│       ├── AppNavigation.vue
│       └── AppFooter.vue
├── views/              # Páginas principales
├── router/             # Configuración de rutas
├── store/              # Estado global
├── services/           # Servicios API
├── utils/              # Utilidades
├── assets/             # Recursos estáticos
└── styles/             # Estilos globales
    ├── global.css      # Variables CSS y estilos globales
    └── animations.css  # Sistema completo de animaciones
```

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (versión 16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd sistema-contabilidad
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Supabase**
   - Crear archivo `.env.local` en la raíz del proyecto
   - Agregar las credenciales de Supabase:
     ```
     VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
     VITE_SUPABASE_ANON_KEY=tu-clave-anonima
     ```

4. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

5. **Configurar Base de Datos**
   - Ejecutar `supabase-schema.sql` en el SQL Editor de Supabase
   - Ejecutar `supabase-seed-data.sql` para datos de prueba

## 🔐 Credenciales de Acceso

El sistema incluye varios usuarios de prueba con diferentes roles:

### Usuarios de Prueba

| Usuario | Contraseña | Rol | Descripción |
|---------|------------|-----|-------------|
| `admin@sistema.local` | `admin123` | Administrador | Acceso completo al sistema |
| `contador@sistema.local` | `contador123` | Contador | Gestión contable y financiera |
| `auditor@sistema.local` | `auditor123` | Auditor | Revisión y auditoría |
| `facturador@sistema.local` | `facturador123` | Facturador | Gestión de facturación |
| `operador@sistema.local` | `operador123` | Operador | Operaciones básicas |
| `consultor@sistema.local` | `consultor123` | Consultor | Solo lectura y consultas |

### Roles y Permisos

- **Administrador**: Acceso completo, gestión de usuarios, configuración del sistema
- **Contador**: Gestión contable, facturación, reportes financieros
- **Auditor**: Revisión de datos, auditoría, reportes de trazabilidad
- **Facturador**: Emisión de facturas, gestión de clientes básica
- **Operador**: Operaciones básicas, consulta de datos
- **Consultor**: Solo lectura, generación de reportes

### Características del Login

- **Botón del ojo**: Haz clic en el ícono del ojo para mostrar/ocultar la contraseña
- **Iconos dinámicos**: El ícono cambia entre 👁️ (mostrar) y 🙈 (ocultar)
- **Autenticación simplificada**: Sin dependencias externas, funciona inmediatamente
- **Feedback visual**: Estados de carga y mensajes de error claros
- **Diseño responsive**: Funciona perfectamente en móviles, tablets y desktop

## 📋 Módulos del Sistema

### 1. Dashboard
- Resumen general del sistema
- Estadísticas principales (4 cards fijas)
- Accesos rápidos a funciones comunes (fijo)
- Gráficos y análisis (cards individuales arrastrables)
- Actividad reciente (arrastrable)
- Estado del sistema (arrastrable)
- **Funcionalidad Drag & Drop**: Reorganiza las cards individuales arrastrándolas

### 2. Gestión de Clientes
- Registro de contribuyentes
- Información de contacto
- Historial de transacciones
- Búsqueda y filtrado

### 3. Facturación

## 4. Integración BCV (Banco Central de Venezuela)

### 🏦 Servicio BCVService
- **API del BCV**: https://bcv-api.rafnixg.dev/rates/
- **Tasa en tiempo real**: Obtención automática de la tasa de cambio USD/VES
- **Cache inteligente**: 5 minutos de cache local para optimizar rendimiento
- **Manejo de errores**: Tasas por defecto cuando la API no está disponible
- **Conversión automática**: USD ↔ VES con cálculos precisos

### 💱 Componentes de Conversión
- **BCVRateDisplay**: Muestra la tasa actual del BCV con actualización automática
- **CurrencyConverter**: Conversor interactivo USD ↔ VES integrado en facturas
- **Formateo venezolano**: Números y monedas según estándares locales
- **Actualización automática**: Cada 5 minutos en tiempo real

### 🔄 Integración en Facturas
- **Conversión automática** de montos al cambiar moneda
- **Cálculos precisos** usando tasas oficiales del BCV
- **Historial de tasas** para fechas específicas
- **Validación de montos** con tasas actualizadas

## 5. Facturación
- **Sistema completo de facturación** con modelo de datos flexible
- **Facturas generales** (sin necesidad de especificar productos)
- **Autocompletado desde archivos** PDF/imagen con extracción simulada
- **CRUD completo** con localStorage para MVP sin base de datos
- **Filtros y búsqueda avanzada** por número, cliente, fecha, estado
- **Estadísticas en tiempo real** de facturas y montos
- **Vista detallada** de facturas con información completa
- **Soporte multi-moneda** (VES, USD, EUR)
- **Estados de factura**: Borrador, Emitida, Enviada, Pagada, Vencida, Anulada
- **Campos financieros completos**: totales, impuestos, retenciones, IGTF
- **Archivos adjuntos** y notas adicionales
- **Formulario modular** reutilizable (InvoiceForm.vue)
- **Integración backend** con endpoints documentados

### 4. Contabilidad
- Registro de asientos contables
- Plan de cuentas
- Estados financieros
- Reportes contables

### 5. Auditoría
- Logs de actividad
- Gestión de usuarios
- Configuración de seguridad
- Respaldos del sistema

### 6. Archivo Digital
- Subida de documentos a Supabase Storage
- Organización por categorías
- Búsqueda y descarga
- Gestión de carpetas
- Eliminación robusta (BD + Storage)
- Nombres únicos para evitar conflictos

### 7. Gestión de Usuarios
- Sistema completo de roles y permisos
- CRUD de usuarios con validaciones
- Autenticación segura con 6 roles predefinidos
- Interfaz de administración completa
- Navegación condicional basada en permisos

## 🎨 Personalización

### Paleta de Colores

El sistema utiliza una paleta de colores personalizada basada en la identidad visual del proyecto:

```javascript
theme: {
  defaultTheme: 'light',
  themes: {
    light: {
      colors: {
        primary: '#A81C22',        // Rojo principal - Color principal
        secondary: '#1F355C',      // Azul oscuro - Color secundario
        accent: '#E0B04F',         // Amarillo dorado - Acentos
        error: '#A81C22',          // Rojo - Errores
        info: '#1F355C',           // Azul oscuro - Información
        success: '#4CAF50',        // Verde - Éxito
        warning: '#E0B04F',        // Amarillo dorado - Advertencias
        surface: '#FFFFFF',        // Blanco - Superficies
        background: '#FFFFFF',     // Blanco - Fondo
      },
    },
  },
}
```

**Colores de la identidad visual:**
- **Rojo principal**: `#A81C22` - Color corporativo principal
- **Azul oscuro**: `#1F355C` - Color secundario profesional
- **Amarillo dorado**: `#E0B04F` - Color de acento y destacados
- **Gris claro**: `#E0E0E0` - Color de superficie y bordes
- **Negro**: `#000000` - Texto principal
- **Blanco**: `#FFFFFF` - Fondos y superficies

### Identidad Visual

El sistema implementa una identidad visual corporativa completa:

- **Isotipo**: `icon-adaptableV2.svg` - Logo corporativo integrado en navegación y login
- **Tipografía**: Sistema dual con Montserrat (principal) y Open Sans (secundaria) para máxima legibilidad
- **Aplicación consistente**: El isotipo se utiliza en todos los puntos de entrada del sistema
- **Paleta corporativa**: Colores basados en la identidad visual del proyecto

### Diseño de Interfaz

El sistema utiliza un diseño moderno inspirado en dashboards profesionales:

- **Header**: Color blanco (#FFFFFF) con texto negro para máximo contraste
- **Sidebar**: Color azul oscuro (#1F355C) con texto blanco para navegación clara
- **Logo dual**: Aplicado tanto en header como en sidebar para consistencia visual
- **Contraste optimizado**: El logo es visible y legible en ambos fondos
- **Diseño responsive**: Se adapta perfectamente a diferentes tamaños de pantalla

### Layout del Dashboard

El sistema implementa un layout moderno y profesional:

```
┌─────────────────────────────────────────────────────────┐
│ Header Blanco (Logo + Título + Menú Usuario)           │
├─────────────┬───────────────────────────────────────────┤
│             │                                           │
│ Sidebar     │ Contenido Principal                       │
│ Azul Oscuro │ (Cards, Gráficos, Tablas)                │
│ (Logo +     │                                           │
│  Navegación)│                                           │
│             │                                           │
└─────────────┴───────────────────────────────────────────┘
```

**Características del Layout:**
- **Header fijo**: Siempre visible con navegación principal
- **Sidebar colapsible**: Navegación lateral que se puede ocultar
- **Área de contenido**: Espacio principal para dashboards y formularios
- **Responsive**: Se adapta a móviles con sidebar superpuesto

### Sistema Tipográfico

El sistema utiliza un enfoque dual de tipografías para optimizar la legibilidad:

**Montserrat (Fuente Principal):**
- **Uso**: Títulos, botones, navegación, elementos destacados
- **Características**: Moderna, geométrica, profesional
- **Pesos**: 300, 400, 500, 600, 700, 800
- **Aplicación**: H1-H6, botones, menús, cards principales

**Open Sans (Fuente Secundaria):**
- **Uso**: Párrafos, texto de contenido, descripciones
- **Características**: Legible, clara, optimizada para lectura
- **Pesos**: 300, 400, 500, 600, 700, 800
- **Aplicación**: Párrafos, texto de formularios, contenido secundario

**Variables CSS:**
```css
--font-primary: 'Montserrat', sans-serif;
--font-secondary: 'Open Sans', sans-serif;
```

**Clases Utilitarias:**
```css
.font-primary { font-family: var(--font-primary); }
.font-secondary { font-family: var(--font-secondary); }
```

### Componentes Personalizados

El sistema incluye componentes reutilizables avanzados:

- **CustomButton**: Botones con estados y micro-animaciones
- **CustomDatePicker**: Selector de fechas con validación
- **NotificationSystem**: Sistema de notificaciones con animaciones específicas por tipo
- **AnimatedForm**: Formularios con animaciones de entrada escalonadas
- **AnimatedTable**: Tablas con animaciones de filas y efectos hover
- **AnimatedNumber**: Números animados para KPIs; soporta locale, easing y formatter
- **PageTransition**: Sistema de transiciones de página con múltiples efectos
- **LoadingSpinner**: Spinner de carga con 6 tipos diferentes y efectos profesionales
- **BarChart**: Gráficos de barras interactivos con animaciones
- **PieChart**: Gráficos de pastel con animaciones y efectos especiales

## 🚀 Funcionalidades Avanzadas

### 🎨 Sistema de Animaciones Completo
- **Más de 50 animaciones predefinidas**: Fade, slide, scale, rotate, flip, zoom, bounce
- **Animaciones de interacción**: Hover effects, click effects, micro-interacciones
- **Animaciones de carga**: Spinner, pulse, bounce, shake con 6 tipos diferentes
- **Transiciones de página**: Múltiples efectos configurables
- **Optimización GPU**: Animaciones aceleradas por hardware
- **Accesibilidad**: Soporte para preferencias de movimiento reducido
- **Clases utilitarias**: Delays, duraciones, iteraciones personalizables

### 🖱️ Sistema de Drag & Drop (Dashboard)
- **Librería Swapy**: Integración completa para reorganización de cards individuales
- **Cards arrastrables**: Gráfico de Barras, Gráfico de Pastel, Actividad Reciente, Estado del Sistema
- **Secciones fijas**: Las 4 tarjetas de estadísticas y Accesos Rápidos permanecen en su posición
- **Configuración optimizada**: Animación spring, auto-scroll, arrastre vertical
- **Efectos visuales**: Hover, drag y drop con animaciones suaves y border-radius preservado
- **Eventos de consola**: Logs detallados para debugging y seguimiento
- **Responsive**: Funciona perfectamente en todos los dispositivos

### 📊 Gráficos Interactivos
- **Dashboard con visualizaciones**: Gráficos de barras y pastel con animaciones
- **Análisis financiero**: Comparación de ingresos vs egresos
- **Distribución de gastos**: Visualización por categorías
- **Integración con Chart.js**: Gráficos profesionales y responsivos
- **Efectos especiales**: Shimmer, glow, animaciones de entrada escalonadas

### 🔔 Sistema de Notificaciones
- **Notificaciones en tiempo real**: Feedback inmediato al usuario
- **Diferentes tipos**: Éxito, error, advertencia, información
- **Animaciones específicas**: Pulse para éxito, shake para error, bounce para warning
- **Auto-dismiss**: Desaparición automática configurable
- **Posicionamiento flexible**: Top, bottom, left, right

### 📝 Componentes Mejorados
- **Formularios animados**: Validación en tiempo real con feedback visual
- **Tablas animadas**: Efectos hover, animaciones de filas, estados de carga
- **Selectores de fecha**: Con rangos y validación
- **Botones personalizados**: Estados de carga y micro-animaciones
- **Diseño Material Design**: Consistente y profesional

### 🔐 Sistema de Login Mejorado
- **Autenticación simplificada**: Sin dependencias externas problemáticas
- **Toggle de contraseña**: Botón del ojo para mostrar/ocultar contraseña
- **Iconos dinámicos**: mdi-eye y mdi-eye-off con transiciones suaves
- **Validación robusta**: Manejo de errores mejorado
- **Estados de carga**: Feedback visual durante autenticación
- **Diseño responsive**: Funciona perfectamente en todos los dispositivos
- **UX optimizada**: Interfaz intuitiva y accesible

### 📄 Sistema de Facturación Completo
- **Modelo de datos flexible**: Soporte para facturas internacionales y locales
- **Facturas generales**: Sin necesidad de especificar productos individuales
- **Autocompletado inteligente**: Carga de archivos PDF/imagen con extracción simulada
- **CRUD completo**: Crear, leer, actualizar y eliminar facturas
- **Almacenamiento local**: localStorage para MVP sin base de datos
- **Filtros avanzados**: Por estado, fecha, cliente, número de factura
- **Búsqueda en tiempo real**: Búsqueda instantánea en todos los campos
- **Estadísticas dinámicas**: Contadores y totales actualizados automáticamente
- **Vista detallada**: Modal con información completa de la factura
- **Soporte multi-moneda**: VES, USD, EUR con tasas de cambio
- **Estados de factura**: 6 estados diferentes con colores distintivos
- **Campos financieros**: Totales, impuestos, retenciones, IGTF
- **Archivos adjuntos**: Subida y gestión de documentos relacionados
- **Formulario modular**: Componente reutilizable InvoiceForm.vue
- **Integración backend**: Endpoints API documentados en Swagger
- **Responsive design**: Funciona perfectamente en móviles y desktop

### 🛠️ Correcciones y Optimizaciones del Sistema
- **Menú de usuario completamente funcional**: Implementado con patrón activator por ID
- **Consola limpia**: Eliminación de todos los warnings de Vue y Vuetify
- **NotificationSystem corregido**: Configuración segura de $app y globalProperties
- **Router-view optimizado**: Implementación correcta con slot props en transiciones
- **Z-index optimizado**: VMenu (2000), AppBar (1000) para overlays correctos
- **Configuración Vuetify mejorada**: Defaults globales para mejor rendimiento
- **Rutas completas**: Perfil y configuración añadidas al sistema de rutas
- **Navegación estable**: Sin conflictos entre componentes
- **Debug implementado**: Logs de diagnóstico para desarrollo
- **Patrón estándar**: Uso del patrón activator="#id" de Vuetify

### 📄 Preparado para Exportación
- **PDF**: Generación de reportes y facturas
- **Excel**: Exportación de datos y listados
- **Captura de pantalla**: Para documentación
- **Impresión**: Optimizado para impresión

### 🎯 Micro-interacciones
- **Efectos hover**: Elevación, glow, pulse en todos los componentes
- **Feedback visual**: Respuesta inmediata a acciones del usuario
- **Transiciones suaves**: Entre estados y páginas
- **Animaciones de carga**: Elegantes y no intrusivas

## 📄 Guía del Sistema de Facturación

### Cómo Usar el Sistema de Facturación

El sistema de facturación está diseñado para ser intuitivo y flexible, permitiendo tanto facturas generales como detalladas.

#### 1. Crear Nueva Factura
1. **Acceder**: Ve a la sección "Facturación" en el menú lateral
2. **Nueva Factura**: Haz clic en el botón "Nueva Factura"
3. **Cargar Archivo** (Opcional): 
   - Expande la sección "Cargar y Autocompletar desde Archivo"
   - Selecciona un archivo PDF o imagen
   - Haz clic en "Extraer Datos" para autocompletar el formulario
4. **Completar Información**:
   - Información básica de la factura (número, fecha, tipo)
   - Datos del emisor (empresa, RIF, dirección)
   - Datos del cliente (razón social, RIF, contacto)
   - Información financiera (totales, impuestos, retenciones)
5. **Items Detallados** (Opcional):
   - Expande la sección "Items Detallados"
   - Agrega productos/servicios con códigos, descripciones y precios
6. **Guardar**: Haz clic en "Crear Factura"

#### 2. Gestionar Facturas Existentes
- **Ver**: Haz clic en el ícono del ojo para ver detalles completos
- **Editar**: Haz clic en el ícono del lápiz para modificar
- **Descargar**: Haz clic en el ícono de descarga (preparado para PDF)
- **Eliminar**: Haz clic en el ícono de basura (con confirmación)

#### 3. Filtros y Búsqueda
- **Búsqueda**: Escribe en el campo de búsqueda para filtrar por número, cliente o emisor
- **Filtro por Estado**: Selecciona un estado específico (Borrador, Emitida, etc.)
- **Filtro por Fecha**: Establece rango de fechas de emisión
- **Limpiar Filtros**: Botón para resetear todos los filtros

#### 4. Estadísticas
Las tarjetas superiores muestran:
- **Total Facturas**: Número total de facturas en el sistema
- **Emitidas**: Facturas oficialmente emitidas
- **Pagadas**: Facturas que han sido pagadas
- **Monto Total**: Suma de todos los montos de facturas

### Modelo de Datos

#### Estructura de Factura
```javascript
{
  id: 1,
  invoiceNumber: "F-00127",
  controlNumber: "00-0008967",
  documentType: "FACTURA",
  issueDate: "2023-12-04",
  dueDate: "2023-12-04",
  status: "EMITIDA",
  
  // Información del emisor
  issuer: {
    companyName: "LA CASA DEL ACEITE RB C.A.",
    rif: "J404710183",
    taxpayerType: "Ordinario",
    address: "Dirección del emisor",
    phone: "000-000-0000",
    email: "info@empresa.com"
  },
  
  // Información del cliente
  client: {
    companyName: "SERVICIOS OJEDA ,C.A.",
    rif: "J-07016766-1",
    address: "Dirección del cliente",
    phone: "000-000-0000",
    email: "cliente@empresa.com"
  },
  
  // Información financiera
  financial: {
    totalSales: 17540.94,
    nonTaxableSales: 0,
    taxableSales: 15121.50,
    taxDebit: 2419.44,
    ivaRetention: 0,
    islrRetention: 0,
    municipalRetention: 0,
    igtf: 0,
    currency: "VES",
    exchangeRate: 1
  },
  
  // Items detallados (opcional)
  items: [
    {
      code: "BFCOT",
      description: "BASE PARA FOTOCELDA/CABLE",
      quantity: 6.00,
      unitPrice: 583.20,
      total: 3499.22
    }
  ],
  
  // Archivos adjuntos
  attachments: [],
  
  // Metadatos
  createdBy: "admin",
  createdAt: "2023-12-04T10:00:00Z",
  updatedAt: "2023-12-04T10:00:00Z",
  notes: "Factura de servicios"
}
```

#### Estados de Factura
- **BORRADOR**: Factura en proceso de creación
- **EMITIDA**: Factura oficialmente emitida
- **ENVIADA**: Factura enviada al cliente
- **PAGADA**: Factura pagada por el cliente
- **VENCIDA**: Factura vencida sin pago
- **ANULADA**: Factura anulada/cancelada

#### Tipos de Documento
- **FACTURA**: Factura estándar
- **NOTA DE CRÉDITO**: Nota de crédito
- **NOTA DE DÉBITO**: Nota de débito
- **FORMA LIBRE**: Forma libre
- **COMPROBANTE**: Comprobante

#### Campos Financieros
- **totalSales**: Total de ventas
- **nonTaxableSales**: Ventas no gravadas
- **taxableSales**: Ventas gravadas
- **taxDebit**: Débito fiscal (IVA)
- **ivaRetention**: Retención de IVA
- **islrRetention**: Retención de ISLR
- **municipalRetention**: Retención municipal
- **igtf**: Impuesto a Grandes Transacciones Financieras

### Integración con Backend

El sistema está preparado para trabajar tanto con localStorage (MVP) como con el backend real:

#### Endpoints API
- `GET /api/invoices` - Obtener todas las facturas
- `GET /api/invoices/:id` - Obtener factura por ID
- `POST /api/invoices` - Crear nueva factura
- `PUT /api/invoices/:id` - Actualizar factura
- `DELETE /api/invoices/:id` - Eliminar factura
- `POST /api/invoices/:id/upload` - Subir archivo adjunto
- `POST /api/invoices/extract-data` - Extraer datos de archivo

#### Documentación API
- **Swagger UI**: http://localhost:3001/api-docs
- **Esquemas completos**: Documentación automática de todos los endpoints
- **Ejemplos de uso**: Request/response para cada endpoint

## 🎨 Guía del Sistema de Animaciones

### Clases Utilitarias Disponibles

```css
/* Animaciones de entrada */
.animate-fade-in
.animate-slide-in-up
.animate-slide-in-down
.animate-slide-in-left
.animate-slide-in-right
.animate-scale-in
.animate-rotate-in

/* Animaciones de hover */
.animate-hover-lift
.animate-hover-glow
.animate-hover-pulse

/* Micro-interacciones */
.animate-micro-bounce
.animate-micro-rotate
.animate-micro-scale

/* Delays */
.animate-delay-100
.animate-delay-200
.animate-delay-300
.animate-delay-400
.animate-delay-500
```

### Ejemplo de Uso

```vue
<template>
  <div class="animate-slide-in-up animate-delay-200">
    <h2 class="animate-fade-in">Título Animado</h2>
    <CustomButton 
      text="Botón Animado" 
      class="animate-hover-lift"
    />
    <LoadingSpinner 
      type="dots" 
      size="medium"
      text="Cargando datos..."
    />
  </div>
</template>
```

### Componentes Animados

- **AnimatedForm**: Formularios con animaciones escalonadas
- **AnimatedTable**: Tablas con efectos hover y animaciones de filas
- **PageTransition**: Transiciones entre páginas con múltiples efectos
- **LoadingSpinner**: 6 tipos diferentes de spinner (circular, dots, pulse, bars, ring, wave)

## 🖱️ Guía del Sistema de Drag & Drop

### Cómo Usar el Drag & Drop en el Dashboard

El Dashboard incluye funcionalidad de drag & drop para reorganizar las secciones:

#### Cards Arrastrables
- **Gráfico de Barras**: Gráfico de ingresos vs egresos
- **Gráfico de Pastel**: Distribución de gastos
- **Actividad Reciente**: Lista de actividades del sistema
- **Estado del Sistema**: Indicadores de almacenamiento y respaldos

#### Secciones Fijas
- **4 Cards de Estadísticas**: Permanecen siempre en la parte superior
- **Accesos Rápidos**: Sección con botones de acceso rápido

#### Cómo Arrastrar
1. **Identifica las cards arrastrables**: Las cards individuales son arrastrables
2. **Haz clic y arrastra**: Mantén presionado el botón del mouse sobre la card
3. **Suelta en la nueva posición**: Las cards se reorganizarán automáticamente
4. **Efectos visuales**: Durante el arrastre verás efectos de hover, rotación y escala

#### Características Técnicas
- **Librería**: Swapy v1.0.3 con configuración estándar
- **Layout**: Grid CSS 2x2 (1fr 1fr) en desktop, 1 columna en móvil
- **Animación**: Dynamic (por defecto) para transiciones formales
- **Modo de intercambio**: Hover para intercambio inmediato
- **Auto-scroll**: Scroll automático durante el arrastre
- **Eje de arrastre**: Ambas direcciones (horizontal y vertical)
- **Border-radius preservado**: Los estilos se mantienen durante el arrastre
- **Eventos**: Logs en consola para debugging
- **Responsive**: Funciona en todos los dispositivos
- **Accesibilidad**: Respeta las preferencias de movimiento reducido

### Agregar Nuevas Rutas

Para agregar nuevas páginas, edita el archivo `src/router/index.js`:

```javascript
{
  path: '/nueva-pagina',
  name: 'NuevaPagina',
  component: () => import('../views/NuevaPagina.vue'),
  meta: { requiresAuth: true, title: 'Nueva Página' }
}
```

## 🔧 Comandos Disponibles

```bash
# Desarrollo
npm run dev          # Ejecutar servidor de desarrollo

# Producción
npm run build        # Construir para producción
npm run preview      # Vista previa de la construcción

# Linting
npm run lint         # Ejecutar linter (si está configurado)
```

## 📱 Responsive Design

El sistema está diseñado para ser completamente responsive:

- **Mobile**: Optimizado para dispositivos móviles
- **Tablet**: Adaptado para tablets
- **Desktop**: Experiencia completa en escritorio

## 🔒 Seguridad

### Autenticación
- Sistema de login mejorado con autenticación simplificada
- Botón toggle para mostrar/ocultar contraseña
- Sesiones persistentes con localStorage
- Protección de rutas con guards
- Validación de credenciales hardcodeada para desarrollo

### Validación
- Validación de formularios en el frontend
- Mensajes de error claros
- Sanitización de inputs

## 🔌 API Endpoints (Autenticación)

### Autenticación

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response (backend actual):
{
  "message": "Login exitoso",
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "rol": "admin"
  }
}
```

```http
POST /api/auth/logout
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Sesión cerrada correctamente"
}
```

### Gestión de Usuarios

```http
GET /api/users
Authorization: Bearer {token}

Response:
{
  "success": true,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@sistema.com",
      "firstName": "Administrador",
      "lastName": "Sistema",
      "role": "admin",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLogin": "2024-09-09T15:30:00Z"
    }
  ]
}
```

```http
GET /api/users/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "user": { ... }
}
```

```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "username": "nuevo_usuario",
  "email": "usuario@empresa.com",
  "firstName": "Nombre",
  "lastName": "Apellido",
  "role": "contador",
  "password": "password123",
  "isActive": true
}

Response:
{
  "success": true,
  "user": { ... }
}
```

```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Nombre Actualizado",
  "lastName": "Apellido Actualizado",
  "email": "nuevo@email.com",
  "role": "auditor",
  "isActive": true
}

Response:
{
  "success": true,
  "user": { ... }
}
```

```http
DELETE /api/users/{id}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Usuario eliminado correctamente"
}
```

### Gestión de Roles

```http
GET /api/roles
Authorization: Bearer {token}

Response:
{
  "success": true,
  "roles": {
    "admin": {
      "name": "Administrador",
      "description": "Acceso completo al sistema",
      "permissions": ["users.create", "users.read", ...]
    }
  }
}
```

### Cambio de Contraseña

```http
POST /api/users/{id}/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "password_actual",
  "newPassword": "nuevo_password"
}

Response:
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

### Reset de Contraseña (Admin)

```http
POST /api/users/{id}/reset-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "newPassword": "nueva_password"
}

Response:
{
  "success": true,
  "message": "Contraseña reseteada correctamente"
}
```

### Clientes

```http
GET /api/clients
Authorization: Bearer {token}

POST /api/clients
Authorization: Bearer {token}
Content-Type: application/json

PUT /api/clients/{id}
Authorization: Bearer {token}
Content-Type: application/json

DELETE /api/clients/{id}
Authorization: Bearer {token}
```

### Facturación

```http
GET /api/invoices
Authorization: Bearer {token}

POST /api/invoices
Authorization: Bearer {token}
Content-Type: application/json

PUT /api/invoices/{id}
Authorization: Bearer {token}
Content-Type: application/json

DELETE /api/invoices/{id}
Authorization: Bearer {token}
```

### Contabilidad

```http
GET /api/accounting/entries
Authorization: Bearer {token}

POST /api/accounting/entries
Authorization: Bearer {token}
Content-Type: application/json

GET /api/accounting/reports
Authorization: Bearer {token}
```

### Auditoría

```http
GET /api/audit/logs
Authorization: Bearer {token}

POST /api/audit/logs
Authorization: Bearer {token}
Content-Type: application/json
```

### Archivo Digital

```http
GET /api/archive/documents
Authorization: Bearer {token}

POST /api/archive/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

DELETE /api/archive/documents/{id}
Authorization: Bearer {token}
```

### Reportes

```http
GET /api/reports/financial
Authorization: Bearer {token}

GET /api/reports/clients
Authorization: Bearer {token}

POST /api/reports/export
Authorization: Bearer {token}
Content-Type: application/json
```

## ✅ Estado Actual del Sistema

### 🎉 Sistema Completamente Funcional

El sistema ha sido **completamente migrado a Supabase** y está funcionando perfectamente:

#### 🚀 Características Implementadas
- ✅ **Backend Supabase**: Completamente integrado
- ✅ **Multi-tenancy**: Aislamiento completo de datos por organización
- ✅ **Autenticación**: Supabase Auth funcionando
- ✅ **Base de datos**: PostgreSQL con RLS
- ✅ **Storage**: Archivos con eliminación robusta
- ✅ **Datos reales**: Todos los módulos muestran datos reales

#### 🛠️ Módulos Operativos
- ✅ **Dashboard**: Estadísticas en tiempo real
- ✅ **Facturación**: CRUD completo con Supabase
- ✅ **Clientes**: Gestión completa
- ✅ **Archivo**: Subida/eliminación robusta
- ✅ **Usuarios**: Gestión de usuarios
- ✅ **Auditoría**: Logs de actividad

#### 🔧 Funcionalidades Avanzadas
- ✅ **Subida múltiple**: Sin conflictos
- ✅ **Eliminación robusta**: BD + Storage
- ✅ **Nombres únicos**: Sin duplicados
- ✅ **Limpieza automática**: Sin archivos huérfanos
- ✅ **Logging detallado**: Para debugging

### 🚀 Estado de Desarrollo

El sistema está **100% funcional** y listo para:
- Uso en producción
- Desarrollo de nuevas funcionalidades
- Escalabilidad multi-tenant
- Integración con sistemas externos

## 🚀 Despliegue

### Construcción para Producción

```bash
npm run build
```

Los archivos construidos se generarán en la carpeta `dist/`.

### Servidor Web

Puedes servir los archivos estáticos con cualquier servidor web:

- **Nginx**
- **Apache**
- **Netlify**
- **Vercel**
- **GitHub Pages**

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de dependencias**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Puerto ocupado**
   - Cambiar el puerto en `vite.config.js`
   - O usar: `npm run dev -- --port 3001`

3. **Problemas de CORS**
   - Configurar proxy en `vite.config.js` para desarrollo

4. **Problemas de login**
   - Verificar que estés usando las credenciales correctas de la tabla
   - El botón del ojo permite verificar que escribiste la contraseña correctamente
   - Si el login falla, verifica en la consola del navegador (F12) los logs de debug

5. **Error de importación de servicios**
   - El sistema ahora usa autenticación simplificada sin dependencias externas
   - No deberían aparecer errores de importación de userService.js

6. **Problemas con menú de usuario**
   - El menú ahora usa el patrón activator="#id" que es más estable
   - Si el menú no se abre, verificar que no hay conflictos de z-index
   - Los logs de debug (🔵) aparecen en consola al hacer clic en el botón
   - Verificar que las rutas /profile y /settings están definidas en el router

7. **Warnings en consola**
   - El sistema está optimizado para no mostrar warnings de Vue o Vuetify
   - Si aparecen warnings, verificar la configuración de router-view con slot props
   - NotificationSystem usa configuración segura de $app para evitar errores

8. **Problemas de diseño visual**
   - El header es blanco con texto negro para mejor contraste
   - El sidebar es azul oscuro (#1F355C) con texto blanco
   - El logo se muestra tanto en header como en sidebar
   - Si el logo no se ve bien, verificar que el archivo icon-adaptableV2.svg esté en la carpeta assets

9. **Problemas de tipografía**
   - Montserrat se usa para títulos y elementos destacados
   - Open Sans se usa para párrafos y texto de contenido
   - Si las fuentes no cargan, verificar conexión a internet (Google Fonts)
   - Usar clases .font-primary y .font-secondary para aplicar fuentes específicas

## 📚 Recursos Adicionales

- [Documentación de Vue 3](https://vuejs.org/)
- [Documentación de Vuetify](https://vuetifyjs.com/)
- [Documentación de Vite](https://vitejs.dev/)
- [Documentación de Vue Router](https://router.vuejs.org/)

## 🤝 Contribución

Para contribuir al proyecto:

1. Fork el repositorio
2. Crear una rama para tu feature
3. Commit tus cambios
4. Push a la rama
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📞 Soporte

Para soporte técnico o preguntas:

- Revisar la documentación
- Consultar el archivo `CONTEXTO_PROYECTO.txt`
- Crear un issue en el repositorio

---

**Desarrollado con ❤️ para facilitar la gestión contable y tributaria**

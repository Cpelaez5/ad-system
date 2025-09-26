# Sistema de Contabilidad, Auditoría, Archivo y Facturación

Un sistema web completo desarrollado con Vue 3, Vite y Vuetify para la gestión contable y tributaria.

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

- **Vue 3**: Framework JavaScript progresivo
- **Vite**: Herramienta de construcción rápida
- **Vuetify**: Biblioteca de componentes Material Design
- **Vue Router**: Enrutamiento del lado del cliente
- **Pinia**: Gestión de estado
- **Axios**: Cliente HTTP
- **Chart.js**: Gráficos interactivos y visualizaciones
- **Vue Date Picker**: Selector de fechas avanzado
- **ExcelJS**: Exportación de datos a Excel
- **jsPDF**: Generación de documentos PDF
- **HTML2Canvas**: Captura de pantalla y conversión
- **Montserrat**: Tipografía moderna y profesional (fuente principal)
- **Open Sans**: Tipografía legible y clara (fuente secundaria)
- **CSS Animations**: Sistema completo de animaciones personalizadas
- **CSS Variables**: Variables CSS para consistencia de diseño

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

3. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```

4. **Configurar API Backend (opcional para login real)**
   - Crear `.env` y definir `VITE_API_BASE_URL` (por ejemplo `http://localhost:3001/api`)
   - El login usará `/api/auth/login` del backend si esta variable está presente

## 🔐 Credenciales de Acceso

El sistema incluye varios usuarios de prueba con diferentes roles:

### Usuarios de Prueba

| Usuario | Contraseña | Rol | Descripción |
|---------|------------|-----|-------------|
| `admin` | `admin123` | Administrador | Acceso completo al sistema |
| `contador` | `contador123` | Contador | Gestión contable y financiera |
| `auditor` | `auditor123` | Auditor | Revisión y auditoría |
| `facturador` | `facturador123` | Facturador | Gestión de facturación |
| `operador` | `operador123` | Operador | Operaciones básicas |
| `consultor` | `consultor123` | Consultor | Solo lectura y consultas |

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
- Estadísticas principales
- Accesos rápidos a funciones comunes

### 2. Gestión de Clientes
- Registro de contribuyentes
- Información de contacto
- Historial de transacciones
- Búsqueda y filtrado

### 3. Facturación
- Creación de facturas electrónicas
- Gestión de productos/servicios
- Estados de facturación
- Envío y descarga

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
- Subida de documentos
- Organización por categorías
- Búsqueda y descarga
- Gestión de carpetas

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

### Correcciones Implementadas (Última Actualización)

El sistema ha sido completamente optimizado y corregido para funcionar sin errores:

#### 🔧 Correcciones Técnicas
- **Menú de usuario funcional**: Implementado con patrón `activator="#id"` de Vuetify
- **Consola limpia**: Eliminados todos los warnings de Vue y Vuetify
- **NotificationSystem corregido**: Configuración segura de `$app` y `globalProperties`
- **Router-view optimizado**: Implementación correcta con slot props en transiciones
- **Z-index optimizado**: VMenu (2000), AppBar (1000) para overlays correctos
- **Configuración Vuetify mejorada**: Defaults globales para mejor rendimiento

#### 🛠️ Mejoras de Estabilidad
- **Navegación estable**: Sin conflictos entre componentes
- **Rutas completas**: Perfil y configuración añadidas al sistema
- **Debug implementado**: Logs de diagnóstico para desarrollo
- **Patrón estándar**: Uso del patrón `activator="#id"` de Vuetify

#### 🎯 Funcionalidades Verificadas
- ✅ **Login**: Funciona perfectamente con toggle de contraseña
- ✅ **Menú de usuario**: Se abre y cierra correctamente
- ✅ **Navegación**: Todas las rutas funcionan sin errores
- ✅ **Notificaciones**: Sistema de notificaciones operativo
- ✅ **Responsive**: Funciona en todos los dispositivos
- ✅ **Consola**: Sin warnings ni errores

### 🚀 Estado de Desarrollo

El sistema está **completamente funcional** y listo para:
- Desarrollo de nuevas funcionalidades
- Pruebas de usuario
- Despliegue en producción
- Integración con backend real

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

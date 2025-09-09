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
- **Poppins**: Tipografía moderna y legible
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

4. **Abrir en el navegador**
   - El servidor se ejecutará en `http://localhost:3000`
   - Se abrirá automáticamente en el navegador

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

El sistema utiliza la paleta de colores estándar de Material Design:

```javascript
theme: {
  defaultTheme: 'light',
  themes: {
    light: {
      colors: {
        primary: '#1976D2',        // Blue - Color principal
        secondary: '#424242',      // Gray - Color secundario
        accent: '#82B1FF',         // Light Blue - Acentos
        error: '#FF5252',          // Red - Errores
        info: '#2196F3',           // Info Blue - Información
        success: '#4CAF50',        // Green - Éxito
        warning: '#FFC107',        // Yellow - Advertencias
      },
    },
  },
}
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

## 🔌 API Endpoints (Futuro)

### Autenticación

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@sistema.com",
    "firstName": "Administrador",
    "lastName": "Sistema",
    "role": "admin",
    "isActive": true
  },
  "token": "jwt-token-here"
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

# 📁 Estructura de Vistas por Rol de Usuario

Este directorio contiene las vistas del sistema organizadas por roles de usuario para facilitar el mantenimiento y la comprensión del código.

## 📂 Estructura de Carpetas

```
src/views/
├── shared/          # Vistas compartidas (accesibles por todos los usuarios autenticados)
├── cliente/         # Vistas para usuarios tipo "cliente"
├── contador/        # Vistas para usuarios tipo "contador" y "admin"
└── admin/           # Vistas para usuarios tipo "admin" y "super_admin"
```

## 🗂️ Descripción de Carpetas

### 📁 `shared/` - Vistas Compartidas

Vistas accesibles por **todos los usuarios autenticados**, independientemente de su rol.

**Archivos:**
- `Dashboard.vue` - Panel principal del sistema
- `Login.vue` - Página de inicio de sesión
- `SingUp.vue` - Página de registro

**Roles que pueden acceder:**
- ✅ `super_admin`
- ✅ `admin`
- ✅ `contador`
- ✅ `cliente`

---

### 📁 `cliente/` - Vistas para Cliente

Vistas exclusivas para usuarios tipo **`cliente`**. Estos usuarios solo pueden ver y gestionar sus propios datos.

**Archivos:**
- `ClienteMiArea.vue` - Área personal del cliente (facturas y documentos propios)

**Roles que pueden acceder:**
- ✅ `cliente` (solo)

**Funcionalidades:**
- Ver solo sus propias facturas
- Ver solo sus propios documentos
- Crear y editar sus propias facturas
- Subir sus propios documentos

---

### 📁 `contador/` - Vistas para Contador y Admin

Vistas para usuarios tipo **`contador`** y **`admin`**. Estos usuarios pueden ver y gestionar datos de todas las empresas cliente de su organización.

**Archivos:**
- `ContadorArea.vue` - Área principal del contador (visión general de clientes y facturas)
- `Gastos.vue` - Gestión de gastos (facturas de tipo VENTA)
- `Compras.vue` - Gestión de compras (facturas de tipo COMPRA)
- `Clientes.vue` - Gestión de empresas cliente
- `Facturacion.vue` - Sistema completo de facturación
- `Contabilidad.vue` - Gestión contable
- `Auditoria.vue` - Logs de auditoría
- `Archivo.vue` - Archivo digital de documentos

**Roles que pueden acceder:**
- ✅ `contador`
- ✅ `admin`

**Funcionalidades:**
- Ver todas las empresas cliente de su organización
- Ver todas las facturas de todas las empresas cliente
- Gestionar facturas de todos los clientes
- Gestionar documentos de todos los clientes
- Ver logs de auditoría de su organización

---

### 📁 `admin/` - Vistas para Admin y Super Admin

Vistas para usuarios tipo **`admin`** y **`super_admin`**. Estos usuarios pueden gestionar usuarios y configuraciones del sistema.

**Archivos:**
- `Usuarios.vue` - Gestión de usuarios del sistema

**Roles que pueden acceder:**
- ✅ `admin` (solo usuarios de su organización)
- ✅ `super_admin` (todos los usuarios del sistema)

**Funcionalidades:**
- Crear, editar y eliminar usuarios
- Gestionar roles y permisos de usuarios
- Invitar y registrar nuevos usuarios
- Ver y gestionar usuarios de su organización (admin) o de todas las organizaciones (super_admin)

---

## 🔐 Control de Acceso

El control de acceso a las vistas se realiza mediante:

1. **Router Guards** (`src/router/index.js`):
   - Verificación de autenticación
   - Verificación de roles mediante `meta.roles`
   - Redirección automática según el rol del usuario

2. **Sidebar Navigation** (`src/components/layout/Sidebar.vue`):
   - Mostrar/ocultar elementos del menú según el rol
   - Navegación condicional basada en permisos

3. **Políticas RLS en Supabase**:
   - Filtrado de datos a nivel de base de datos
   - Seguridad adicional para prevenir acceso no autorizado

---

## 📋 Mapeo de Roles a Vistas

### Usuario `cliente`
```
✅ shared/Dashboard.vue
✅ cliente/ClienteMiArea.vue
❌ contador/* (no tiene acceso)
❌ admin/* (no tiene acceso)
```

### Usuario `contador`
```
✅ shared/Dashboard.vue
✅ contador/ContadorArea.vue
✅ contador/Gastos.vue
✅ contador/Compras.vue
✅ contador/Clientes.vue
✅ contador/Facturacion.vue
✅ contador/Contabilidad.vue
✅ contador/Auditoria.vue
✅ contador/Archivo.vue
❌ cliente/* (no tiene acceso)
❌ admin/* (no tiene acceso)
```

### Usuario `admin`
```
✅ shared/Dashboard.vue
✅ contador/ContadorArea.vue
✅ contador/Gastos.vue
✅ contador/Compras.vue
✅ contador/Clientes.vue
✅ contador/Facturacion.vue
✅ contador/Contabilidad.vue
✅ contador/Auditoria.vue
✅ contador/Archivo.vue
✅ admin/Usuarios.vue
❌ cliente/* (no tiene acceso)
```

### Usuario `super_admin`
```
✅ shared/Dashboard.vue
✅ contador/ContadorArea.vue
✅ contador/Gastos.vue
✅ contador/Compras.vue
✅ contador/Clientes.vue
✅ contador/Facturacion.vue
✅ contador/Contabilidad.vue
✅ contador/Auditoria.vue
✅ contador/Archivo.vue
✅ admin/Usuarios.vue (con acceso a todas las organizaciones)
❌ cliente/* (no tiene acceso)
```

---

## 🚀 Agregar Nuevas Vistas

Para agregar una nueva vista:

1. **Determinar el rol que puede acceder:**
   - ¿Es compartida? → `shared/`
   - ¿Solo para cliente? → `cliente/`
   - ¿Para contador y admin? → `contador/`
   - ¿Solo para admin y super_admin? → `admin/`

2. **Crear el archivo en la carpeta correspondiente:**
   ```bash
   # Ejemplo: crear vista para contador
   touch src/views/contador/MiNuevaVista.vue
   ```

3. **Actualizar el router** (`src/router/index.js`):
   ```javascript
   // Importar la vista
   const MiNuevaVista = () => import('../views/contador/MiNuevaVista.vue')
   
   // Agregar la ruta
   {
     path: '/mi-nueva-vista',
     name: 'MiNuevaVista',
     component: MiNuevaVista,
     meta: { 
       requiresAuth: true, 
       title: 'Mi Nueva Vista', 
       roles: ['admin', 'contador'] 
     }
   }
   ```

4. **Actualizar el Sidebar** (`src/components/layout/Sidebar.vue`):
   ```vue
   <v-list-item
     :to="{ name: 'MiNuevaVista' }"
     prepend-icon="mdi-icon-name"
     title="Mi Nueva Vista"
     value="mi-nueva-vista"
   ></v-list-item>
   ```

5. **Actualizar AppNavigation** (`src/components/layout/AppNavigation.vue`):
   ```javascript
   const pageTitles = {
     // ... otros títulos
     'MiNuevaVista': 'Mi Nueva Vista'
   }
   ```

---

## 📝 Notas Importantes

1. **Lazy Loading**: Las vistas se cargan de forma diferida (lazy loading) para optimizar el rendimiento, excepto `Dashboard.vue` y `Login.vue` que se cargan de forma inmediata.

2. **Rutas**: Todas las rutas están definidas en `src/router/index.js` con sus respectivos `meta.roles` para control de acceso.

3. **Seguridad**: El control de acceso se realiza a múltiples niveles:
   - Router guards (frontend)
   - Políticas RLS (backend)
   - Filtrado de datos en servicios

4. **Mantenimiento**: La estructura por carpetas facilita el mantenimiento y la comprensión del código, especialmente para desarrolladores junior.

---

## 🔍 Verificación de Estructura

Para verificar que la estructura está correcta:

1. **Verificar que todos los archivos estén en sus carpetas:**
   ```bash
   ls -R src/views/
   ```

2. **Verificar que las importaciones en el router sean correctas:**
   ```bash
   grep -r "import.*views" src/router/index.js
   ```

3. **Verificar que no haya archivos huérfanos:**
   ```bash
   # No debería haber archivos .vue directamente en src/views/
   ls src/views/*.vue
   ```

---

**Última actualización:** 2025-01-01  
**Mantenido por:** Equipo de Desarrollo


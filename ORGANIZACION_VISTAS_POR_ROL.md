# 📁 Organización de Vistas por Rol

## 🎯 Principio de Organización

**Mantener las vistas separadas por rol** para tener código más organizado, simple y mantenible.

---

## 📂 Estructura de Carpetas

```
src/views/
├── admin/              # Vistas exclusivas para ADMIN y SUPER_ADMIN
│   └── Usuarios.vue    # Gestión de usuarios del sistema
│
├── cliente/            # Vistas exclusivas para CLIENTE
│   ├── Dashboard.vue   # Dashboard personalizado del cliente
│   ├── ClienteMiArea.vue  # Área personal del cliente
│   ├── Compras.vue     # Mis compras (facturas recibidas)
│   ├── Gastos.vue      # Mis gastos (facturas emitidas)
│   └── Archivo.vue     # Mis documentos (archivo personal)
│
├── contador/           # Vistas compartidas entre CONTADOR y ADMIN
│   ├── ContadorArea.vue    # Área de trabajo del contador
│   ├── Clientes.vue    # Gestión de empresas cliente
│   ├── Gastos.vue      # Facturas de venta (todos los clientes)
│   ├── Compras.vue     # Facturas de compra (todos los clientes)
│   ├── Facturacion.vue # Vista general de facturación
│   ├── Contabilidad.vue    # Módulo contable
│   ├── Auditoria.vue   # Herramientas de auditoría
│   └── Archivo.vue     # Archivo Digital (Expediente Fiscal 360)
│
└── shared/             # Vistas compartidas por todos los roles
    ├── Dashboard.vue   # Dashboard general (admin/contador/super_admin)
    ├── Login.vue       # Página de inicio de sesión
    └── SingUp.vue      # Página de registro
```

---

## 🔐 Reglas de Acceso por Rol

### **CLIENTE** (`cliente`)
**Carpeta**: `src/views/cliente/`

**Vistas accesibles**:
- ✅ `/cliente/dashboard` → `cliente/Dashboard.vue`
- ✅ `/cliente/mi-area` → `cliente/ClienteMiArea.vue`
- ✅ `/cliente/compras` → `cliente/Compras.vue`
- ✅ `/cliente/gastos` → `cliente/Gastos.vue`
- ✅ `/cliente/archivo` → `cliente/Archivo.vue`

**Restricciones**:
- ❌ No puede acceder a vistas de `contador/` ni `admin/`
- ❌ Solo ve sus propios datos (filtrado por `client_id`)

---

### **CONTADOR** (`contador`)
**Carpeta**: `src/views/contador/`

**Vistas accesibles**:
- ✅ `/dashboard` → `shared/Dashboard.vue`
- ✅ `/contador/area` → `contador/ContadorArea.vue`
- ✅ `/clientes` → `contador/Clientes.vue`
- ✅ `/gastos` → `contador/Gastos.vue`
- ✅ `/compras` → `contador/Compras.vue`
- ✅ `/facturacion` → `contador/Facturacion.vue`
- ✅ `/contabilidad` → `contador/Contabilidad.vue`
- ✅ `/auditoria` → `contador/Auditoria.vue`
- ✅ `/archivo` → `contador/Archivo.vue`

**Restricciones**:
- ❌ No puede acceder a `admin/Usuarios.vue`
- ✅ Puede ver datos de TODAS las empresas cliente de su organización

---

### **ADMIN** (`admin`)
**Carpetas**: `src/views/contador/` + `src/views/admin/`

**Vistas accesibles**:
- ✅ **Todas las vistas de CONTADOR** (misma carpeta `contador/`)
- ✅ `/usuarios` → `admin/Usuarios.vue` (gestión de usuarios)

**Permisos adicionales**:
- ✅ Puede crear, editar y eliminar usuarios
- ✅ Puede gestionar clientes y proveedores
- ✅ Acceso completo a todas las funcionalidades de contador

---

### **SUPER_ADMIN** (`super_admin`)
**Carpetas**: `src/views/shared/` + `src/views/admin/`

**Vistas accesibles**:
- ✅ `/dashboard` → `shared/Dashboard.vue`
- ✅ `/usuarios` → `admin/Usuarios.vue` (usuarios de TODAS las organizaciones)
- ⚠️ `/empresas` → Pendiente de implementación

**Permisos especiales**:
- ✅ Puede gestionar todas las empresas administradoras
- ✅ Puede gestionar usuarios de cualquier organización
- ❌ No tiene acceso a vistas de `contador/` (gestión operativa)

---

## 📝 Convenciones de Nomenclatura

### **Archivos de Vistas**
- **Cliente**: Prefijo `Cliente` cuando sea necesario (ej: `ClienteMiArea.vue`)
- **Contador/Admin**: Sin prefijo especial (ej: `Gastos.vue`, `Compras.vue`)
- **Shared**: Sin prefijo (ej: `Dashboard.vue`, `Login.vue`)

### **Rutas**
- **Cliente**: `/cliente/*` (ej: `/cliente/dashboard`, `/cliente/mi-area`)
- **Contador/Admin**: Sin prefijo `/` (ej: `/gastos`, `/compras`, `/clientes`)
- **Shared**: Sin prefijo `/` (ej: `/dashboard`, `/login`)

---

## 🔧 Imports Correctos

### ✅ **Usar alias `@/` para servicios**
```javascript
// ✅ CORRECTO
import userService from '@/services/userService.js'
import invoiceService from '@/services/invoiceService.js'
import clientService from '@/services/clientService.js'

// ❌ INCORRECTO (rutas relativas)
import userService from '../services/userService.js'
import userService from '../../services/userService.js'
```

### ✅ **Imports entre vistas**
```javascript
// Desde cliente/ hacia shared/
import Dashboard from '@/views/shared/Dashboard.vue'

// Desde contador/ hacia shared/
import Dashboard from '@/views/shared/Dashboard.vue'

// Desde admin/ hacia contador/ (si es necesario)
import Clientes from '@/views/contador/Clientes.vue'
```

---

## 🚨 Reglas Importantes

1. **No duplicar vistas**: Si una vista es compartida entre roles, ponerla en `shared/`
2. **Separar por funcionalidad**: Cada rol tiene su propia carpeta
3. **Usar alias `@/`**: Siempre usar `@/` para imports de servicios y componentes
4. **Router guard**: El router verifica roles y redirige automáticamente
5. **Sidebar condicional**: El sidebar muestra módulos según el rol del usuario

---

## 📊 Mapeo de Rutas a Vistas

| Ruta | Vista | Roles | Carpeta |
|------|-------|-------|---------|
| `/dashboard` | Dashboard | admin, contador, super_admin | `shared/` |
| `/cliente/dashboard` | Dashboard | cliente | `cliente/` |
| `/cliente/mi-area` | ClienteMiArea | cliente | `cliente/` |
| `/cliente/compras` | Compras | cliente | `cliente/` |
| `/cliente/gastos` | Gastos | cliente | `cliente/` |
| `/cliente/archivo` | Archivo | cliente | `cliente/` |
| `/contador/area` | ContadorArea | admin, contador | `contador/` |
| `/clientes` | Clientes | admin, contador | `contador/` |
| `/gastos` | Gastos | admin, contador | `contador/` |
| `/compras` | Compras | admin, contador | `contador/` |
| `/facturacion` | Facturacion | admin, contador | `contador/` |
| `/contabilidad` | Contabilidad | admin, contador | `contador/` |
| `/auditoria` | Auditoria | admin, contador | `contador/` |
| `/archivo` | Archivo | admin, contador | `contador/` |
| `/usuarios` | Usuarios | admin, super_admin | `admin/` |
| `/login` | Login | todos | `shared/` |

---

## ✅ Estado Actual

- ✅ Estructura de carpetas organizada por rol
- ✅ Imports corregidos usando alias `@/`
- ✅ Router configurado con guards de roles
- ✅ Sidebar muestra módulos según rol
- ✅ Vistas separadas correctamente

---

## 🎯 Beneficios de esta Organización

1. **Mantenibilidad**: Fácil encontrar y modificar vistas por rol
2. **Escalabilidad**: Agregar nuevos roles es simple (nueva carpeta)
3. **Claridad**: Estructura clara y predecible
4. **Separación de responsabilidades**: Cada rol tiene sus propias vistas
5. **Reutilización**: Vistas compartidas en `shared/`

---

**Última actualización**: Noviembre 2024


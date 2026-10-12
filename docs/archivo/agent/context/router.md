# 🛣️ Router - Estructura de Rutas

> Documentación del sistema de rutas con Vue Router.

**Archivo**: `src/router/index.js`

---

## Estructura General

```
/                     → Landing Page (público)
/login                → Login (público)
/signup               → Registro (público)
/pricing              → Precios (público)

/dashboard            → Dashboard principal (autenticado)
/profile              → Perfil de usuario (autenticado)

/cliente/*            → Vistas para rol CLIENTE
/contador/*           → Vistas para rol CONTADOR
/admin/*              → Vistas para rol ADMIN
/usuarios             → Gestión de usuarios (admin/super_admin)
```

---

## Rutas por Rol

### Cliente

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/cliente/mi-area` | `ClienteMiArea.vue` | Panel del cliente |
| `/cliente/dashboard` | `ClienteDashboard.vue` | Dashboard del cliente |
| `/cliente/facturacion` | `ClienteFacturacion.vue` | Gestión de facturas |
| `/cliente/archivo` | `ClienteArchivo.vue` | Archivo digital |

### Contador

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/contador/area` | `ContadorArea.vue` | Panel del contador |
| `/contador/facturacion` | `Facturacion.vue` | Gestión completa de facturas |
| `/contador/clientes` | `Clientes.vue` | Gestión de clientes |
| `/contador/compras` | `ComprasOrganizacion.vue` | Libro de compras |
| `/contador/ventas` | `VentasOrganizacion.vue` | Libro de ventas |
| `/contador/gastos` | `GastosOrganizacion.vue` | Control de gastos |
| `/contador/contabilidad` | `Contabilidad.vue` | Módulo contable |
| `/contador/auditoria` | `Auditoria.vue` | Auditoría |
| `/contador/archivo` | `Archivo.vue` | Archivo digital |

### Admin / Super Admin

| Ruta | Componente | Roles |
|------|------------|-------|
| `/usuarios` | `Usuarios.vue` | `admin`, `super_admin` |

---

## Meta Fields

Cada ruta usa `meta` para control de acceso:

```javascript
{
  path: '/contador/facturacion',
  name: 'Facturacion',
  component: Facturacion,
  meta: {
    requiresAuth: true,           // Requiere login
    title: 'Facturación',         // Título de página
    roles: ['admin', 'contador']  // Roles permitidos
  }
}
```

---

## Navigation Guard

El router tiene un guard global que:

1. **Verifica sesión de Supabase**
2. **Verifica organization_id** en localStorage
3. **Valida roles** contra `meta.roles`
4. **Redirige** según el rol del usuario

### Lógica de redirección

```javascript
// Si el usuario no tiene permiso para la ruta
if (!allowedRoles.includes(userRole)) {
  // Redirigir según rol
  if (userRole === 'cliente') {
    next('/cliente/facturacion')
  } else if (userRole === 'contador') {
    next('/contador/facturacion')
  } else {
    next('/dashboard')
  }
}
```

---

## Agregar Nueva Ruta

### 1. Importar componente (lazy loading)

```javascript
const NuevoComponente = () => import('@/views/rol/NuevoComponente.vue')
```

### 2. Agregar ruta

```javascript
{
  path: '/rol/nueva-ruta',
  name: 'NuevoComponente',
  component: NuevoComponente,
  meta: {
    requiresAuth: true,
    title: 'Título de Página',
    roles: ['admin', 'contador'] // Roles permitidos
  }
}
```

### 3. Agregar al menú (Sidebar)

Editar `src/components/layout/Sidebar.vue` para agregar el enlace al menú.

---

## Rutas Públicas

Rutas que **NO** requieren autenticación:

```javascript
meta: { requiresAuth: false }
```

- `/` - Landing page
- `/login` - Login
- `/signup` - Registro
- `/pricing` - Precios
- `/test-form` - Formulario de prueba

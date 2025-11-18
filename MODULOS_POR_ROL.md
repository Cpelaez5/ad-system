# 📋 Módulos del Sidebar por Rol de Usuario

## 🎯 Resumen de Accesos

### **1. Usuario CLIENTE** (`cliente`)
**Email de prueba**: `carlosleonelpelaez@gmail.com`

#### Módulos disponibles:
- ✅ **Dashboard** (ClienteDashboard) - Vista personalizada para cliente
- ✅ **Mi Área** (ClienteMiArea) - Perfil y configuración personal
- ✅ **Facturación** (grupo expandible):
  - **Mis Gastos** (ClienteGastos) - Facturas que el cliente emitió
  - **Mis Compras** (ClienteCompras) - Facturas que el cliente recibió
- ✅ **Mis Documentos** (ClienteArchivo) - Archivo digital personal

#### Restricciones:
- ❌ No puede ver datos de otros clientes
- ❌ No puede gestionar usuarios
- ❌ No puede ver el módulo de Clientes
- ❌ No puede acceder a Contabilidad, Auditoría o Archivo Digital general

---

### **2. Usuario CONTADOR** (`contador`)
**Email de prueba**: `cpelea121@gmail.com`

#### Módulos disponibles:
- ✅ **Dashboard** (Dashboard) - Vista general de la organización
- ✅ **Área de Contador** (ContadorArea) - Herramientas específicas del contador
- ✅ **Clientes** (Clientes) - Gestión de todas las empresas cliente de la organización
- ✅ **Facturación** (grupo expandible):
  - **Gastos** (Gastos) - Facturas de venta de todos los clientes
  - **Ventas** (Ventas) - Facturas de venta de todos los clientes
  - **Compras** (Compras) - Facturas de compra de todos los clientes
- ✅ **Organización** (grupo expandible):
  - **Gastos** (GastosOrganizacion) - Gastos propios de la organización (servicios constantes)
  - **Compras** (ComprasOrganizacion) - Compras propias de la organización (mercancía/productos)
  - **Ventas** (VentasOrganizacion) - Ventas propias de la organización (ingresos)
- ✅ **Contabilidad** (Contabilidad) - Módulo contable general
- ✅ **Auditoría** (Auditoria) - Herramientas de auditoría
- ✅ **Archivo Digital** (Archivo) - Expediente Fiscal 360 completo

#### Restricciones:
- ❌ No puede gestionar usuarios (solo Admin puede)
- ✅ Puede ver y gestionar datos de TODAS las empresas cliente de su organización
- ✅ Puede gestionar los gastos, compras y ventas propios de la organización

---

### **3. Usuario ADMIN** (`admin`)
**Email de prueba**: `cpelaez0811@gmail.com`

#### Módulos disponibles:
- ✅ **Dashboard** (Dashboard) - Vista general de la organización
- ✅ **Área de Contador** (ContadorArea) - Herramientas contables
- ✅ **Clientes** (Clientes) - Gestión de todas las empresas cliente
- ✅ **Facturación** (grupo expandible):
  - **Gastos** (Gastos) - Facturas de venta de todos los clientes
  - **Ventas** (Ventas) - Facturas de venta de todos los clientes
  - **Compras** (Compras) - Facturas de compra de todos los clientes
- ✅ **Organización** (grupo expandible):
  - **Gastos** (GastosOrganizacion) - Gastos propios de la organización (servicios constantes)
  - **Compras** (ComprasOrganizacion) - Compras propias de la organización (mercancía/productos)
  - **Ventas** (VentasOrganizacion) - Ventas propias de la organización (ingresos)
- ✅ **Contabilidad** (Contabilidad) - Módulo contable general
- ✅ **Auditoría** (Auditoria) - Herramientas de auditoría
- ✅ **Archivo Digital** (Archivo) - Expediente Fiscal 360 completo
- ✅ **Usuarios** (Usuarios) - Gestión de usuarios de la organización

#### Permisos adicionales:
- ✅ Puede crear, editar y eliminar usuarios
- ✅ Puede gestionar clientes y proveedores
- ✅ Puede ver y gestionar datos de TODAS las empresas cliente de su organización
- ✅ Puede gestionar los gastos, compras y ventas propios de la organización

---

### **4. Usuario SUPER ADMIN** (`super_admin`)
**Email de prueba**: `carloslpelaez@gmail.com`

#### Módulos disponibles:
- ✅ **Dashboard** (Dashboard) - Vista general del sistema
- ✅ **Usuarios** (Usuarios) - Gestión de usuarios de TODAS las organizaciones
- ✅ **Empresas** (Dashboard - temporal) - Gestión de todas las empresas administradoras

#### Permisos especiales:
- ✅ Puede gestionar todas las empresas administradoras del sistema
- ✅ Puede crear, editar y eliminar usuarios de cualquier organización
- ✅ Acceso completo a todas las funcionalidades del sistema
- ⚠️ **Nota**: Actualmente el módulo "Empresas" redirige al Dashboard (pendiente de implementación)

---

## 🔍 Verificación del Problema

Si los módulos no aparecen en el sidebar, verifica:

1. **El usuario está guardado en localStorage:**
   ```javascript
   // En la consola del navegador
   console.log(JSON.parse(localStorage.getItem("currentUser")));
   ```
   Debe mostrar un objeto con `role` definido (ej: `{ role: 'admin', ... }`)

2. **El rol es correcto:**
   - `cliente` → debe mostrar módulos de cliente
   - `contador` → debe mostrar módulos de contador
   - `admin` → debe mostrar módulos de admin
   - `super_admin` → debe mostrar módulos de super admin

3. **El Sidebar está leyendo el rol:**
   El componente `Sidebar.vue` lee el rol desde:
   ```javascript
   currentUser() {
     return JSON.parse(localStorage.getItem("currentUser") || "{}");
   }
   userRole() {
     return this.currentUser?.role || '';
   }
   ```

---

## 🛠️ Solución si los Módulos No Aparecen

### Problema 1: El usuario no se guarda correctamente
**Solución**: Verificar que `userService.js` guarde el usuario en localStorage después del login:
```javascript
localStorage.setItem("currentUser", JSON.stringify(userProfile));
```

### Problema 2: El rol no coincide
**Solución**: Verificar en la tabla `users` que el campo `role` sea exactamente:
- `cliente` (no `Cliente` ni `CLIENTE`)
- `contador` (no `Contador` ni `CONTADOR`)
- `admin` (no `Admin` ni `ADMIN`)
- `super_admin` (no `SuperAdmin` ni `SUPER_ADMIN`)

### Problema 3: El Sidebar no se actualiza
**Solución**: Forzar recarga del componente o verificar que Vue esté detectando cambios en `currentUser`.

---

## 📊 Tabla Comparativa de Accesos

| Módulo | Cliente | Contador | Admin | Super Admin |
|--------|---------|----------|-------|-------------|
| Dashboard | ✅ (Cliente) | ✅ | ✅ | ✅ |
| Mi Área | ✅ | ❌ | ❌ | ❌ |
| Área de Contador | ❌ | ✅ | ✅ | ❌ |
| Clientes | ❌ | ✅ | ✅ | ❌ |
| Facturación > Gastos | ✅ (Mis) | ✅ (Todos) | ✅ (Todos) | ❌ |
| Facturación > Ventas | ✅ (Mis) | ✅ (Todos) | ✅ (Todos) | ❌ |
| Facturación > Compras | ✅ (Mis) | ✅ (Todos) | ✅ (Todos) | ❌ |
| Organización > Gastos | ❌ | ✅ | ✅ | ❌ |
| Organización > Compras | ❌ | ✅ | ✅ | ❌ |
| Organización > Ventas | ❌ | ✅ | ✅ | ❌ |
| Contabilidad | ❌ | ✅ | ✅ | ❌ |
| Auditoría | ❌ | ✅ | ✅ | ❌ |
| Archivo Digital | ✅ (Mis) | ✅ (Todos) | ✅ (Todos) | ❌ |
| Usuarios | ❌ | ❌ | ✅ | ✅ |
| Empresas | ❌ | ❌ | ❌ | ✅ |

---

## 🎯 Próximos Pasos

1. Verificar que el login guarde correctamente el usuario en localStorage
2. Confirmar que el rol en la base de datos coincida exactamente con los valores esperados
3. Probar cada usuario y verificar que aparezcan los módulos correspondientes
4. Si persiste el problema, revisar la reactividad de Vue en el componente Sidebar


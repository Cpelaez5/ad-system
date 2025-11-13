# 🔐 Configurar Usuarios en Supabase Auth

## 🏢 **Arquitectura de Empresas**

El sistema maneja **2 tipos de empresas**:

### 1. **Empresa Administradora/Contadora** (`organizations`)
- Empresa que presta servicios contables y fiscales
- Puede tener uno o más Contadores y Administradores Contadores
- Puede tener múltiples Empresas Cliente asociadas
- Ejemplo: "TECNOLOGÍA AVANZADA VENEZOLANA C.A."

### 2. **Empresa Cliente o Cliente** (`clients`)
- Empresa o emprendedor que recibe servicios de administración fiscal
- Está asociada a una Empresa Administradora/Contadora (`organization_id`)
- Solo tiene usuarios de tipo "cliente" asociados
- Solo puede ver y gestionar sus propios datos
- Ejemplo: "CLÍNICA ESPECIALIZADA DEL CARIBE"

### Relación entre Empresas
- Una **Empresa Administradora** puede tener múltiples **Empresas Cliente**
- Una **Empresa Cliente** está asociada a una sola **Empresa Administradora**
- Los usuarios `cliente` pertenecen a una **Empresa Cliente** específica (`client_id`)
- Los usuarios `cliente` también tienen `organization_id` (de la empresa administradora)
- Los usuarios `admin` y `contador` solo tienen `organization_id` (de la empresa administradora)

## 📋 **Tipos de Usuarios Disponibles:**

### **1. Usuario Cliente:**
- **Email**: `cliente@sistema.local`
- **Username**: `cliente`
- **Contraseña**: `cliente123`
- **Rol**: `cliente`
- **Empresa Administradora** (`organization_id`): TECNOLOGÍA AVANZADA VENEZOLANA C.A.
- **Empresa Cliente** (`client_id`): Debe estar asociado a un cliente existente en la tabla `clients`
- **Acceso**: Solo ve y gestiona sus propios datos (facturas, documentos, compras, gastos)
- **Restricción**: No puede ver datos de otros clientes

### **2. Usuario Contador:**
- **Email**: `contador@sistema.local`
- **Username**: `contador`
- **Contraseña**: `contador123`
- **Rol**: `contador`
- **Empresa Administradora** (`organization_id`): TECNOLOGÍA AVANZADA VENEZOLANA C.A.
- **Acceso**: Ve y gestiona datos de TODAS las Empresas Cliente de su organización
- **Restricción**: No puede gestionar usuarios (solo admin puede hacerlo)

### **3. Usuario Admin (Contador Administrador):**
- **Email**: `admin@sistema.local`
- **Username**: `admin`
- **Contraseña**: `admin123`
- **Rol**: `admin`
- **Empresa Administradora** (`organization_id`): TECNOLOGÍA AVANZADA VENEZOLANA C.A.
- **Acceso**: 
  - Gestiona usuarios, clientes y datos de su empresa
  - Puede invitar y registrar clientes o contadores a su empresa
  - Ve y gestiona datos de TODAS las Empresas Cliente de su organización

### **4. Usuario Super Admin (Opcional):**
- **Email**: `superadmin@sistema.local`
- **Username**: `superadmin`
- **Contraseña**: `superadmin123`
- **Rol**: `super_admin`
- **Empresa Administradora** (`organization_id`): NULL (no tiene organización)
- **Acceso**: 
  - Gestiona todas las Empresas Administradoras del sistema
  - Puede crear, registrar o invitar empresas al sistema
  - Administra usuarios de cualquier empresa

## 🛠️ **Configurar Contraseñas en Supabase:**

### **Opción 1: Usar Supabase Dashboard**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Users**
4. Busca los usuarios:
   - `cliente@sistema.local`
   - `contador@sistema.local`
   - `admin@sistema.local`
   - `superadmin@sistema.local`
5. Haz clic en **Edit** para cada usuario
6. Establece las contraseñas:
   - Cliente: `cliente123`
   - Contador: `contador123`
   - Admin: `admin123`
   - Super Admin: `superadmin123`

### **Opción 2: Usar SQL (Recomendado)**
Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Configurar contraseñas para usuarios de prueba
-- Nota: Las contraseñas se hashean automáticamente

-- Para el usuario cliente
UPDATE auth.users 
SET encrypted_password = crypt('cliente123', gen_salt('bf'))
WHERE email = 'cliente@sistema.local';

-- Para el usuario contador
UPDATE auth.users 
SET encrypted_password = crypt('contador123', gen_salt('bf'))
WHERE email = 'contador@sistema.local';

-- Para el usuario admin
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@sistema.local';

-- Para el usuario superadmin
UPDATE auth.users 
SET encrypted_password = crypt('superadmin123', gen_salt('bf'))
WHERE email = 'superadmin@sistema.local';

-- Verificar que se actualizaron
SELECT email, encrypted_password IS NOT NULL as has_password
FROM auth.users 
WHERE email LIKE '%@sistema.local';
```

### **Opción 3: Usar la API de Supabase**
```javascript
// En la consola del navegador
import('@/lib/supabaseClient').then(({ supabase }) => {
  // Crear usuario admin
  supabase.auth.admin.createUser({
    email: 'admin@sistema.local',
    password: 'admin123',
    email_confirm: true
  }).then(result => console.log('Admin creado:', result))
  
  // Crear usuario contador
  supabase.auth.admin.createUser({
    email: 'contador@sistema.local',
    password: 'contador123',
    email_confirm: true
  }).then(result => console.log('Contador creado:', result))
})
```

## 🎯 **Credenciales de Prueba:**

### **Para Login:**
- **Usuario Cliente**: `cliente@sistema.local` / `cliente123`
- **Usuario Contador**: `contador@sistema.local` / `contador123`
- **Usuario Admin**: `admin@sistema.local` / `admin123`
- **Usuario Super Admin**: `superadmin@sistema.local` / `superadmin123`

## ✅ **Verificar Configuración:**

### **1. Probar Login:**
```javascript
// En la consola del navegador
import('@/lib/supabaseClient').then(({ supabase }) => {
  supabase.auth.signInWithPassword({
    email: 'admin@sistema.local',
    password: 'admin123'
  }).then(result => {
    console.log('Login exitoso:', result)
  })
})
```

### **2. Verificar Usuarios:**
```sql
-- En Supabase SQL Editor
SELECT 
  u.email,
  u.created_at,
  us.username,
  us.first_name,
  us.last_name,
  us.role,
  o.name as organization_name
FROM auth.users u
LEFT JOIN users us ON u.id = us.id
LEFT JOIN organizations o ON us.organization_id = o.id
WHERE u.email LIKE '%@sistema.local'
ORDER BY u.created_at;
```

## 🚨 **Si Hay Problemas:**

### **Problema 1: Contraseña no funciona**
- Verificar que la contraseña se haya establecido correctamente
- Usar el SQL de configuración de contraseñas

### **Problema 2: Usuario no encontrado**
- Verificar que el usuario esté en `auth.users`
- Verificar que el email sea exacto: `admin@sistema.local`

### **Problema 3: Error de autenticación**
- Verificar que las variables de entorno estén configuradas
- Verificar que Supabase esté conectado

## 🎉 **Estado Esperado:**

Después de configurar las contraseñas:
- **✅ Login con cliente/cliente123**: Funciona (redirige a `/cliente/mi-area`)
- **✅ Login con contador/contador123**: Funciona (redirige a `/contador/area`)
- **✅ Login con admin/admin123**: Funciona (redirige a `/dashboard`)
- **✅ Login con superadmin/superadmin123**: Funciona (redirige a `/dashboard`)
- **✅ Datos de usuario**: Cargados desde Supabase
- **✅ Organización**: Establecida correctamente (NULL para super_admin)
- **✅ Client ID**: Establecido para usuarios `cliente`

**¡Configura las contraseñas y prueba el login!** 🚀

---

## 👤 Configuración de Usuarios por Tipo

### **Usuario Cliente:**

1. **Crear usuario en Supabase Auth:**
   - Email: `cliente@sistema.local`
   - Password: `cliente123`
   - Email Confirm: ✅

2. **Obtener el ID del cliente existente:**
```sql
-- Primero, obtener el ID de un cliente existente
SELECT id, company_name, rif 
FROM clients 
WHERE organization_id = '11111111-1111-1111-1111-111111111111' 
LIMIT 1;
```

3. **Insertar perfil en `users` con `client_id` y `organization_id`:**
```sql
-- Reemplaza <UUID_AUTH_USER> y <UUID_CLIENTE> con los IDs reales
-- IMPORTANTE: El usuario cliente tiene DOS referencias:
--   - client_id: La Empresa Cliente a la que pertenece
--   - organization_id: La Empresa Administradora que le presta servicios
INSERT INTO users (
  id, 
  organization_id,  -- Empresa Administradora que presta servicios
  client_id,        -- OBLIGATORIO: Empresa Cliente a la que pertenece
  username, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  '<UUID_AUTH_USER>',
  '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
  '<UUID_CLIENTE_EN_TABLA_CLIENTS>',       -- ID de la Empresa Cliente obtenido en el paso 2
  'cliente',
  'cliente@sistema.local',
  'Cliente',
  'Ejemplo',
  'cliente',
  true
);
```

4. **Verificación:**
```sql
-- Debe devolver solo su propio cliente
SELECT * FROM clients WHERE id = (SELECT client_id FROM users WHERE role = 'cliente' LIMIT 1);

-- Debe devolver solo sus facturas
SELECT * FROM invoices WHERE client_id = (SELECT client_id FROM users WHERE role = 'cliente' LIMIT 1);
```

### **Usuario Contador:**

1. **Crear usuario en Supabase Auth**
2. **Insertar perfil con `organization_id` (Empresa Administradora):**
```sql
-- IMPORTANTE: El usuario contador solo tiene organization_id (Empresa Administradora)
-- No tiene client_id porque puede ver datos de TODAS las Empresas Cliente
INSERT INTO users (
  id, 
  organization_id,  -- Empresa Administradora/Contadora
  username, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  '<UUID_AUTH_USER>',
  '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
  'contador',
  'contador@sistema.local',
  'María',
  'González',
  'contador',
  true
);
```

### **Usuario Admin:**

1. **Crear usuario en Supabase Auth**
2. **Insertar perfil con `organization_id` (Empresa Administradora):**
```sql
-- IMPORTANTE: El usuario admin solo tiene organization_id (Empresa Administradora)
-- No tiene client_id porque puede ver datos de TODAS las Empresas Cliente
-- Además, puede gestionar usuarios y clientes de su organización
INSERT INTO users (
  id, 
  organization_id,  -- Empresa Administradora/Contadora
  username, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  '<UUID_AUTH_USER>',
  '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
  'admin',
  'admin@sistema.local',
  'Administrador',
  'Sistema',
  'admin',
  true
);
```

### **Usuario Super Admin:**

1. **Crear usuario en Supabase Auth**
2. **Insertar perfil sin `organization_id` (NULL):**
```sql
INSERT INTO users (
  id, 
  organization_id,  -- NULL para super_admin
  username, 
  email, 
  first_name, 
  last_name, 
  role, 
  is_active
) VALUES (
  '<UUID_AUTH_USER>',
  NULL,  -- Super admin no tiene organización
  'superadmin',
  'superadmin@sistema.local',
  'Super',
  'Administrador',
  'super_admin',
  true
);
```

## 📝 Notas Importantes:

- **Asegúrate de aplicar la migración** `migrations/20250101_simplified_rls_policies.sql` antes de crear usuarios
- **Empresa Cliente debe existir primero**: Antes de crear un usuario `cliente`, debe existir un registro en la tabla `clients`
- **Cliente DEBE tener `client_id`**: No puede ser NULL (referencia a la Empresa Cliente)
- **Cliente también tiene `organization_id`**: Debe ser el mismo que el `organization_id` de su Empresa Cliente
- **Super Admin NO debe tener `organization_id`**: Debe ser NULL (no está ligado a ninguna empresa)
- **Admin y Contador DEBEN tener `organization_id`**: No puede ser NULL (referencia a la Empresa Administradora)
- **Admin y Contador NO tienen `client_id`**: Pueden ver datos de TODAS las Empresas Cliente de su organización
- Los roles `admin` y `contador` pueden filtrar por cliente en las vistas Gastos/Compras
- El usuario `cliente` solo ve sus propios datos automáticamente (políticas RLS basadas en `client_id`)
- **Relación de datos**: 
  - `organizations` → Empresas Administradoras/Contadoras
  - `clients` → Empresas Cliente (tienen `organization_id` que las vincula a una Empresa Administradora)
  - `users.cliente` → Tiene `client_id` (Empresa Cliente) + `organization_id` (Empresa Administradora)
  - `users.admin/contador` → Solo tienen `organization_id` (Empresa Administradora)
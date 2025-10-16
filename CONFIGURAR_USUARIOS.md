# 🔐 Configurar Usuarios en Supabase Auth

## 📋 **Usuarios Disponibles:**

### **Usuario Admin:**
- **Email**: `admin@sistema.local`
- **Username**: `admin`
- **Contraseña**: `admin123`
- **Rol**: `admin`
- **Organización**: TECNOLOGÍA AVANZADA VENEZOLANA C.A.

### **Usuario Contador:**
- **Email**: `contador@sistema.local`
- **Username**: `contador`
- **Contraseña**: `contador123`
- **Rol**: `contador`
- **Organización**: TECNOLOGÍA AVANZADA VENEZOLANA C.A.

## 🛠️ **Configurar Contraseñas en Supabase:**

### **Opción 1: Usar Supabase Dashboard**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **Authentication** > **Users**
4. Busca los usuarios:
   - `admin@sistema.local`
   - `contador@sistema.local`
5. Haz clic en **Edit** para cada usuario
6. Establece las contraseñas:
   - Admin: `admin123`
   - Contador: `contador123`

### **Opción 2: Usar SQL (Recomendado)**
Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- Configurar contraseñas para usuarios de prueba
-- Nota: Las contraseñas se hashean automáticamente

-- Para el usuario admin
UPDATE auth.users 
SET encrypted_password = crypt('admin123', gen_salt('bf'))
WHERE email = 'admin@sistema.local';

-- Para el usuario contador
UPDATE auth.users 
SET encrypted_password = crypt('contador123', gen_salt('bf'))
WHERE email = 'contador@sistema.local';

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
- **Usuario**: `admin`
- **Contraseña**: `admin123`

- **Usuario**: `contador`
- **Contraseña**: `contador123`

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
- **✅ Login con admin/admin123**: Funciona
- **✅ Login con contador/contador123**: Funciona
- **✅ Datos de usuario**: Cargados desde Supabase
- **✅ Organización**: Establecida correctamente

**¡Configura las contraseñas y prueba el login!** 🚀

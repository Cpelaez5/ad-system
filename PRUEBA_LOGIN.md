# 🔐 Prueba de Login con Supabase Auth

## 📋 **Estado Actual:**

- **✅ Login funciona**: Con fallback
- **⚠️ Supabase Auth falla**: "Invalid login credentials"
- **✅ Emails confirmados**: En Supabase Auth
- **✅ Contraseñas configuradas**: En Supabase Auth

## 🛠️ **Comandos de Prueba:**

### **1. Probar Login Directo con Supabase Auth:**
```javascript
// En la consola del navegador
import('@/lib/supabaseClient').then(({ supabase }) => {
  supabase.auth.signInWithPassword({
    email: 'admin@sistema.local',
    password: 'admin123'
  }).then(result => {
    console.log('Resultado del login:', result)
  })
})
```

### **2. Verificar Usuario en Supabase Auth:**
```javascript
// En la consola del navegador
import('@/lib/supabaseClient').then(({ supabase }) => {
  supabase.auth.getUser().then(result => {
    console.log('Usuario actual:', result)
  })
})
```

### **3. Probar con Diferentes Contraseñas:**
```javascript
// Probar con contraseña simple
import('@/lib/supabaseClient').then(({ supabase }) => {
  supabase.auth.signInWithPassword({
    email: 'admin@sistema.local',
    password: 'password'
  }).then(result => {
    console.log('Login con password:', result)
  })
})
```

## 🔧 **Posibles Soluciones:**

### **Opción 1: Recrear Usuarios en Supabase Auth**
```sql
-- En Supabase SQL Editor
-- Eliminar usuarios existentes
DELETE FROM auth.users WHERE email LIKE '%@sistema.local';

-- Los usuarios se recrearán automáticamente cuando se ejecute el seed data
```

### **Opción 2: Usar Admin API para Crear Usuarios**
```javascript
// En la consola del navegador (requiere service role key)
import('@/lib/supabaseClient').then(({ supabase }) => {
  // Crear usuario admin
  supabase.auth.admin.createUser({
    email: 'admin@sistema.local',
    password: 'admin123',
    email_confirm: true
  }).then(result => console.log('Admin creado:', result))
})
```

### **Opción 3: Usar Solo Fallback (Temporal)**
El fallback ya está configurado para usar UUIDs reales, por lo que el sistema funcionará correctamente.

## 🎯 **Credenciales de Prueba:**

### **Usuario Admin:**
- **Email**: `admin@sistema.local`
- **Username**: `admin`
- **Contraseña**: `admin123`

### **Usuario Contador:**
- **Email**: `contador@sistema.local`
- **Username**: `contador`
- **Contraseña**: `contador123`

## ✅ **Estado Esperado:**

Después de la corrección:
- **✅ Login con Supabase Auth**: Funciona
- **✅ Datos reales**: 5 clientes, 3 facturas
- **✅ Organization ID**: `11111111-1111-1111-1111-111111111111`
- **✅ Sin errores**: No más "invalid input syntax for type uuid"

## 🚨 **Si Supabase Auth Sigue Fallando:**

### **Solución Temporal:**
El fallback ya está configurado correctamente y funcionará con datos reales.

### **Solución Definitiva:**
Recrear los usuarios en Supabase Auth usando el dashboard o la API.

## 🎉 **Próximos Pasos:**

1. **Probar login** con las credenciales
2. **Verificar datos** en el dashboard
3. **Probar funcionalidades** completas
4. **Configurar Supabase Auth** si es necesario

**¡El sistema ya funciona con el fallback corregido!** 🚀

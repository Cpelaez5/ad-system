# Guía de Configuración de Supabase Multi-Tenant

## 📋 Resumen

Esta guía te ayudará a configurar Supabase para el sistema de contabilidad con arquitectura **multi-tenant**, donde múltiples empresas pueden usar la aplicación con datos completamente aislados.

## 🎯 Objetivo

- **Multi-tenancy**: Cada empresa tiene sus datos aislados
- **Seguridad**: Row Level Security (RLS) garantiza aislamiento
- **Fallback**: Sistema funciona incluso sin Supabase
- **Simplicidad**: Código legible para desarrolladores junior

## 🚀 Pasos de Configuración

### 1. Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Clic en "New Project"
4. Completa los datos:
   - **Name**: `sistema-contabilidad`
   - **Database Password**: Genera una contraseña segura
   - **Region**: Elige la más cercana a tu ubicación
5. Clic en "Create new project"

### 2. Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 3. Configurar Variables de Entorno

Crea el archivo `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANTE**: 
- Nunca subas este archivo a Git
- Las variables deben empezar con `VITE_` para Vite
- Reemplaza los valores con los de tu proyecto

### 4. Ejecutar Schema SQL

1. Ve a **SQL Editor** en Supabase
2. Crea una nueva query
3. Copia y pega todo el contenido de `supabase-schema.sql`
4. Ejecuta el script completo

**✅ Resultado esperado:**
- 6 tablas creadas: `organizations`, `users`, `clients`, `invoices`, `audit_logs`, `documents`
- RLS habilitado en todas las tablas
- Índices optimizados
- Triggers automáticos
- 2 organizaciones de ejemplo

### 5. Crear Usuarios en Supabase Auth

#### Opción A: Desde la Dashboard de Supabase

1. Ve a **Authentication** → **Users**
2. Clic en "Add user"
3. Crea usuarios con estos datos:

**Usuario Admin:**
- Email: `admin@sistema.local`
- Password: `admin123`
- Email Confirm: ✅ (marcar)

**Usuario Contador:**
- Email: `contador@sistema.local`
- Password: `contador123`
- Email Confirm: ✅ (marcar)

**Usuario Auditor:**
- Email: `auditor@sistema.local`
- Password: `auditor123`
- Email Confirm: ✅ (marcar)

#### Opción B: Usando SQL (Recomendado)

Ejecuta este SQL en el **SQL Editor**:

```sql
-- Crear usuarios en Supabase Auth
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  'admin@sistema.local',
  crypt('admin123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
),
(
  '22222222-2222-2222-2222-222222222222',
  'contador@sistema.local',
  crypt('contador123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
),
(
  '33333333-3333-3333-3333-333333333333',
  'auditor@sistema.local',
  crypt('auditor123', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider": "email", "providers": ["email"]}',
  '{}',
  false,
  'authenticated'
);
```

### 6. Insertar Usuarios en la Tabla `users`

Ejecuta este SQL para vincular los usuarios de Auth con la tabla `users`:

```sql
-- Insertar usuarios en la tabla users con organization_id
INSERT INTO users (
  id,
  organization_id,
  username,
  email,
  first_name,
  last_name,
  role,
  is_active
) VALUES 
(
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  'admin',
  'admin@sistema.local',
  'Administrador',
  'Sistema',
  'admin',
  true
),
(
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'contador',
  'contador@sistema.local',
  'María',
  'González',
  'contador',
  true
),
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'auditor',
  'auditor@sistema.local',
  'Carlos',
  'Rodríguez',
  'auditor',
  true
);
```

### 7. Verificar Configuración

#### Verificar RLS Policies

Ejecuta este SQL para verificar que RLS funciona:

```sql
-- Verificar que solo vemos datos de nuestra organización
SELECT * FROM users;
SELECT * FROM clients;
SELECT * FROM invoices;
```

**✅ Resultado esperado**: Solo deberías ver datos de la organización a la que perteneces.

#### Verificar Multi-Tenancy

1. Inicia sesión con `admin@sistema.local` / `admin123`
2. Verifica que ves datos de la organización "TECNOLOGÍA AVANZADA VENEZOLANA C.A."
3. Crea un cliente y verifica que se guarda con el `organization_id` correcto

### 8. Probar la Aplicación

1. Instala dependencias: `npm install`
2. Inicia el servidor: `npm run dev`
3. Ve a `http://localhost:5173`
4. Inicia sesión con las credenciales creadas
5. Verifica que todo funciona correctamente

## 🔧 Troubleshooting

### Error: "No organization ID found"

**Causa**: El usuario no está vinculado a una organización.

**Solución**:
1. Verifica que el usuario existe en la tabla `users`
2. Verifica que tiene un `organization_id` válido
3. Verifica que la organización existe en la tabla `organizations`

### Error: "RLS policy violation"

**Causa**: Las políticas de RLS están bloqueando el acceso.

**Solución**:
1. Verifica que el usuario está autenticado
2. Verifica que el `organization_id` en localStorage coincide con el de la base de datos
3. Verifica que las políticas RLS están correctamente configuradas

### Error: "Invalid JWT"

**Causa**: El token de Supabase ha expirado o es inválido.

**Solución**:
1. Cierra sesión y vuelve a iniciar sesión
2. Verifica que las credenciales de Supabase son correctas
3. Verifica que el proyecto de Supabase está activo

### Error: "Network error"

**Causa**: Problemas de conectividad o configuración.

**Solución**:
1. Verifica que las variables de entorno son correctas
2. Verifica que el proyecto de Supabase está activo
3. Verifica tu conexión a internet
4. El sistema debería funcionar en modo fallback con localStorage

## 📊 Estructura de Datos

### Organizaciones (Empresas)
- Cada organización tiene sus propios usuarios, clientes y facturas
- Los datos están completamente aislados por RLS
- Cada organización puede tener múltiples usuarios con diferentes roles

### Usuarios
- Pertenecen a una organización específica
- Tienen roles: `admin`, `contador`, `auditor`, `facturador`, `operador`, `consultor`
- Solo pueden ver datos de su organización

### Clientes
- Pertenecen a una organización específica
- Cada organización tiene su propia lista de clientes
- No hay cruce de datos entre organizaciones

### Facturas
- Pertenecen a una organización y un cliente específico
- Contienen datos financieros estructurados en JSONB
- Estados: `BORRADOR`, `EMITIDA`, `ENVIADA`, `PAGADA`, `VENCIDA`, `ANULADA`

## 🔒 Seguridad

### Row Level Security (RLS)
- **Garantía**: Imposible acceder a datos de otra organización
- **Automático**: Se aplica en todas las queries
- **Transparente**: No requiere código adicional

### Autenticación
- **Supabase Auth**: Manejo seguro de sesiones
- **JWT**: Tokens seguros con expiración
- **Fallback**: Sistema funciona sin Supabase

### Multi-Tenancy
- **Aislamiento**: Datos completamente separados
- **Escalabilidad**: Soporta múltiples organizaciones
- **Flexibilidad**: Fácil agregar nuevas organizaciones

## 📈 Próximos Pasos

1. **Crear más organizaciones**: Agregar empresas adicionales
2. **Configurar Storage**: Para archivos adjuntos
3. **Implementar Realtime**: Para actualizaciones en tiempo real
4. **Agregar más roles**: Personalizar permisos
5. **Configurar backups**: Respaldo automático de datos

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs**: Abre la consola del navegador
2. **Verifica la configuración**: Variables de entorno y schema
3. **Prueba el fallback**: El sistema debería funcionar sin Supabase
4. **Consulta la documentación**: [docs.supabase.com](https://docs.supabase.com)

## ✅ Checklist de Configuración

- [ ] Proyecto de Supabase creado
- [ ] Variables de entorno configuradas
- [ ] Schema SQL ejecutado
- [ ] Usuarios creados en Auth
- [ ] Usuarios insertados en tabla `users`
- [ ] RLS policies verificadas
- [ ] Multi-tenancy probada
- [ ] Aplicación funcionando
- [ ] Fallback a localStorage probado

---

**🎉 ¡Configuración completada!** Tu sistema de contabilidad multi-tenant está listo para usar.

# Guía de Migración: Políticas RLS Simplificadas

## 📋 Resumen

Esta guía explica cómo aplicar la migración que simplifica las políticas RLS (Row Level Security) del sistema para 4 tipos de usuarios principales, haciéndolas más fáciles de entender para desarrolladores junior.

## 🎯 Objetivo

Simplificar las políticas RLS para que sean más claras y fáciles de mantener, basadas en 4 tipos de usuarios:

1. **Cliente**: Ve solo sus datos (asociado a un `client_id`)
2. **Contador**: Ve datos de todos los clientes de su organización
3. **Admin (Contador Administrador)**: Gestiona usuarios y datos de su organización
4. **Super Admin**: Gestiona todas las empresas del sistema (sin `organization_id`)

## 📝 Cambios Realizados

### 1. Estructura de la Tabla `users`

- **`organization_id`**: Ahora permite NULL (para super_admin)
- **`client_id`**: Nueva columna para usuarios tipo cliente
- **Constraints actualizados**: Solo 4 roles permitidos: `super_admin`, `admin`, `contador`, `cliente`

### 2. Funciones Helper

Se crean 3 funciones helper simples:

- `get_current_user_role()`: Obtiene el rol del usuario actual
- `get_current_organization_id()`: Obtiene el organization_id del usuario actual
- `get_current_user_client_id()`: Obtiene el client_id del usuario actual (si es cliente)

### 3. Políticas RLS Simplificadas

Todas las políticas siguen el mismo patrón simple:

```sql
-- Ejemplo: Política para SELECT en clients
CREATE POLICY "clients_select" ON clients
  FOR SELECT USING (
    -- Super admin ve todos
    get_current_user_role() = 'super_admin'
    OR
    -- Admin y contador ven su organización
    (organization_id = get_current_organization_id() AND get_current_user_role() IN ('admin', 'contador'))
    OR
    -- Cliente ve solo su cliente
    (id = get_current_user_client_id() AND get_current_user_role() = 'cliente')
  );
```

## 🚀 Pasos para Aplicar la Migración

### Paso 1: Ejecutar la Migración SQL

1. Abre el **SQL Editor** en Supabase
2. Crea una nueva query
3. Copia y pega todo el contenido de `migrations/20250101_simplified_rls_policies.sql`
4. Ejecuta el script completo

### Paso 2: Verificar la Migración

Ejecuta estas queries para verificar:

```sql
-- Verificar que organization_id permite NULL
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'organization_id';

-- Verificar que client_id existe
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'client_id';

-- Verificar constraints de roles
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE 'users_%_check';

-- Verificar funciones helper
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name LIKE 'get_current_%';

-- Verificar políticas RLS
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;
```

### Paso 3: Crear Usuarios de Prueba

Sigue la guía en `SUPABASE_SETUP.md` para crear usuarios de cada tipo:

1. **Super Admin**: Sin `organization_id`
2. **Admin**: Con `organization_id` de una organización
3. **Contador**: Con `organization_id` de una organización
4. **Cliente**: Con `organization_id` y `client_id` de un cliente existente

## 📊 Estructura de Datos

### Usuario Cliente
```sql
INSERT INTO users (
  id,
  organization_id,  -- REQUERIDO
  client_id,        -- REQUERIDO para cliente
  username,
  email,
  first_name,
  last_name,
  role,             -- 'cliente'
  is_active
) VALUES (...);
```

### Usuario Contador
```sql
INSERT INTO users (
  id,
  organization_id,  -- REQUERIDO
  client_id,        -- NULL (no aplica)
  username,
  email,
  first_name,
  last_name,
  role,             -- 'contador'
  is_active
) VALUES (...);
```

### Usuario Admin
```sql
INSERT INTO users (
  id,
  organization_id,  -- REQUERIDO
  client_id,        -- NULL (no aplica)
  username,
  email,
  first_name,
  last_name,
  role,             -- 'admin'
  is_active
) VALUES (...);
```

### Usuario Super Admin
```sql
INSERT INTO users (
  id,
  organization_id,  -- NULL (no tiene organización)
  client_id,        -- NULL (no aplica)
  username,
  email,
  first_name,
  last_name,
  role,             -- 'super_admin'
  is_active
) VALUES (...);
```

## 🔒 Políticas RLS por Tabla

### Organizations
- **SELECT**: Super admin ve todas, otros ven solo su organización
- **INSERT**: Solo super_admin
- **UPDATE**: Super admin todas, admin su organización
- **DELETE**: Solo super_admin

### Users
- **SELECT**: Super admin todos, admin/contador su org, cliente su perfil
- **INSERT**: Super admin cualquier org, admin su org
- **UPDATE**: Super admin todos, admin su org, usuario su perfil
- **DELETE**: Super admin y admin

### Clients
- **SELECT**: Super admin todos, admin/contador su org, cliente su cliente
- **INSERT**: Super admin y admin
- **UPDATE**: Super admin y admin
- **DELETE**: Super admin y admin

### Invoices
- **SELECT**: Super admin todas, admin/contador su org, cliente sus facturas
- **INSERT**: Super admin, admin, contador, cliente (sus facturas)
- **UPDATE**: Super admin, admin, contador, cliente (sus facturas)
- **DELETE**: Super admin, admin, contador

### Documents
- **SELECT**: Super admin todos, admin/contador su org, cliente sus documentos
- **INSERT**: Todos en su organización
- **UPDATE**: Super admin, admin/contador, usuario (sus documentos)
- **DELETE**: Super admin, admin/contador, usuario (sus documentos)

### Audit Logs
- **SELECT**: Super admin todos, otros su organización
- **INSERT**: Todos en su organización

## 🧪 Pruebas

### Probar como Cliente
1. Inicia sesión con un usuario tipo `cliente`
2. Verifica que solo ve sus propias facturas
3. Verifica que solo ve su propio cliente
4. Verifica que solo ve sus propios documentos

### Probar como Contador
1. Inicia sesión con un usuario tipo `contador`
2. Verifica que ve todos los clientes de su organización
3. Verifica que ve todas las facturas de su organización
4. Verifica que NO puede crear/editar usuarios

### Probar como Admin
1. Inicia sesión con un usuario tipo `admin`
2. Verifica que ve todos los clientes de su organización
3. Verifica que puede crear/editar usuarios de su organización
4. Verifica que puede crear/editar clientes

### Probar como Super Admin
1. Inicia sesión con un usuario tipo `super_admin`
2. Verifica que ve todas las organizaciones
3. Verifica que puede crear organizaciones
4. Verifica que puede crear usuarios en cualquier organización

## ⚠️ Notas Importantes

1. **Super Admin**: No debe tener `organization_id` (debe ser NULL)
2. **Cliente**: DEBE tener `client_id` (no puede ser NULL)
3. **Admin y Contador**: DEBEN tener `organization_id` (no puede ser NULL)
4. **Políticas RLS**: Se aplican automáticamente en todas las queries
5. **Funciones Helper**: Son SECURITY DEFINER para funcionar con RLS

## 🔧 Troubleshooting

### Error: "organization_id cannot be null"
- Verifica que el constraint `users_organization_id_check` no esté bloqueando NULL
- Ejecuta: `ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;`

### Error: "cliente must have client_id"
- Verifica que el usuario cliente tenga un `client_id` válido
- Verifica que el cliente exista en la tabla `clients`

### Error: "super_admin cannot have organization_id"
- Verifica que el usuario super_admin tenga `organization_id = NULL`
- Verifica que el constraint esté aplicado correctamente

### Políticas RLS no funcionan
- Verifica que RLS esté habilitado: `ALTER TABLE tabla ENABLE ROW LEVEL SECURITY;`
- Verifica que las políticas estén creadas: `SELECT * FROM pg_policies WHERE tablename = 'tabla';`
- Verifica que el usuario esté autenticado: `SELECT auth.uid();`

## 📚 Referencias

- `migrations/20250101_simplified_rls_policies.sql`: Migración completa
- `SUPABASE_SETUP.md`: Guía de configuración de Supabase
- `CONTEXTO_PROYECTO.txt`: Documentación del proyecto
- `README.md`: Documentación principal

## ✅ Checklist

- [ ] Migración SQL ejecutada
- [ ] Estructura de tabla `users` actualizada
- [ ] Funciones helper creadas
- [ ] Políticas RLS aplicadas
- [ ] Constraints actualizados
- [ ] Usuarios de prueba creados
- [ ] Pruebas realizadas para cada tipo de usuario
- [ ] Documentación actualizada

---

**🎉 ¡Migración completada!** Las políticas RLS están simplificadas y listas para uso en producción.


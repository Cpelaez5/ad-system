# Guía para Insertar Usuario en Supabase

## Problema
Cuando un usuario se autentica en Supabase Auth pero no existe en la tabla `users`, el sistema no puede obtener su perfil y rol, lo que causa errores de permisos.

## Solución
Insertar manualmente el usuario en la tabla `users` usando el SQL Editor de Supabase.

## Pasos

### 1. Obtener el ID del Usuario de Supabase Auth

1. Ve a tu proyecto en Supabase
2. Navega a **Authentication** > **Users**
3. Encuentra el usuario (por email: `cpelaez0811@gmail.com`)
4. Copia el **User UID** (ejemplo: `4a05811d-f6b7-43f5-acbb-96d7172105b2`)

### 2. Verificar/Crear la Organización

Si no tienes una organización creada:

1. Ve a **Table Editor** > **organizations**
2. Crea una nueva organización o verifica que existe
3. Copia el **ID** de la organización

O ejecuta este SQL:

```sql
-- Crear organización si no existe
INSERT INTO organizations (name, rif, address, phone, email, status)
VALUES ('Mi Empresa', 'J-12345678-9', 'Dirección', '0212-1234567', 'empresa@example.com', 'ACTIVO')
ON CONFLICT (rif) DO UPDATE SET name = EXCLUDED.name
RETURNING id;
```

### 3. Insertar el Usuario en la Tabla `users`

1. Ve a **SQL Editor** en Supabase
2. Ejecuta el siguiente SQL, reemplazando los valores:

```sql
INSERT INTO users (
  id,
  email,
  username,
  first_name,
  last_name,
  role,
  organization_id,
  client_id,
  is_active,
  created_at,
  updated_at
) VALUES (
  '4a05811d-f6b7-43f5-acbb-96d7172105b2', -- ID del usuario de Auth (PASO 1)
  'cpelaez0811@gmail.com', -- Email del usuario
  'cpelaez0811', -- Username
  'Carlos', -- Nombre
  'Pelaez', -- Apellido
  'admin', -- Rol: 'admin', 'contador', 'cliente', o 'super_admin'
  '11111111-1111-1111-1111-111111111111', -- ID de la organización (PASO 2)
  NULL, -- client_id (solo necesario si role = 'cliente')
  true, -- is_active
  NOW(), -- created_at
  NOW() -- updated_at
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  organization_id = EXCLUDED.organization_id,
  client_id = EXCLUDED.client_id,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
```

### 4. Verificar que el Usuario se Insertó Correctamente

Ejecuta este SQL para verificar:

```sql
SELECT 
  u.id,
  u.email,
  u.username,
  u.role,
  u.organization_id,
  u.client_id,
  u.is_active,
  o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.email = 'cpelaez0811@gmail.com';
```

## Roles Disponibles

- **`admin`**: Contador Administrador (puede gestionar usuarios y datos de su organización)
- **`contador`**: Contador (puede ver y gestionar datos de su organización)
- **`cliente`**: Cliente (solo puede ver sus propios datos)
- **`super_admin`**: Super Administrador (puede gestionar todas las organizaciones)

## Reglas por Rol

### Admin o Contador
- **`organization_id`**: DEBE ser válido y existir
- **`client_id`**: DEBE ser NULL

### Cliente
- **`organization_id`**: DEBE ser válido y existir
- **`client_id`**: DEBE ser válido y existir en la tabla `clients`

### Super Admin
- **`organization_id`**: DEBE ser NULL
- **`client_id`**: DEBE ser NULL

## Ejemplos por Tipo de Usuario

### Usuario Admin
```sql
INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
VALUES (
  'USER_ID_AUTH',
  'admin@empresa.com',
  'admin',
  'Admin',
  'Usuario',
  'admin',
  'ORG_ID',
  NULL,
  true,
  NOW(),
  NOW()
);
```

### Usuario Contador
```sql
INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
VALUES (
  'USER_ID_AUTH',
  'contador@empresa.com',
  'contador',
  'Contador',
  'Usuario',
  'contador',
  'ORG_ID',
  NULL,
  true,
  NOW(),
  NOW()
);
```

### Usuario Cliente
```sql
-- Primero verifica que el cliente existe
SELECT id FROM clients WHERE organization_id = 'ORG_ID' LIMIT 1;

-- Luego inserta el usuario
INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
VALUES (
  'USER_ID_AUTH',
  'cliente@empresa.com',
  'cliente',
  'Cliente',
  'Usuario',
  'cliente',
  'ORG_ID',
  'CLIENT_ID', -- ID del cliente obtenido arriba
  true,
  NOW(),
  NOW()
);
```

### Usuario Super Admin
```sql
INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
VALUES (
  'USER_ID_AUTH',
  'superadmin@sistema.com',
  'superadmin',
  'Super',
  'Admin',
  'super_admin',
  NULL, -- organization_id debe ser NULL para super_admin
  NULL, -- client_id debe ser NULL para super_admin
  true,
  NOW(),
  NOW()
);
```

## Solución de Problemas

### Error: "new row violates row-level security policy"
- **Causa**: Las políticas RLS están bloqueando la inserción
- **Solución**: Asegúrate de ejecutar el SQL como administrador o verifica que las políticas RLS permiten la inserción

### Error: "foreign key constraint violated"
- **Causa**: El `organization_id` o `client_id` no existe
- **Solución**: Verifica que la organización y el cliente existen antes de insertar el usuario

### Error: "duplicate key value violates unique constraint"
- **Causa**: El usuario ya existe en la tabla
- **Solución**: Usa `ON CONFLICT DO UPDATE` o actualiza el usuario existente

## Después de Insertar el Usuario

1. Cierra sesión en la aplicación
2. Inicia sesión nuevamente
3. El sistema debería reconocer tu perfil y rol correctamente
4. Deberías poder acceder a las rutas correspondientes a tu rol

## Archivo SQL Completo

Ver el archivo `migrations/INSERTAR_USUARIO_SUPABASE.sql` para un script completo con todos los ejemplos.


-- ============================================
-- Script para insertar usuario en Supabase
-- ============================================
-- Este script debe ejecutarse en el SQL Editor de Supabase
-- después de crear el usuario en Supabase Auth
-- ============================================

-- PASO 1: Verificar que el usuario existe en auth.users
-- Reemplaza '4a05811d-f6b7-43f5-acbb-96d7172105b2' con el ID real de tu usuario
-- Puedes obtenerlo desde Supabase Auth > Users

-- PASO 2: Verificar que existe una organización
-- Si no existe, crea una primero:
-- INSERT INTO organizations (name, rif, address, phone, email, status)
-- VALUES ('Mi Empresa', 'J-12345678-9', 'Dirección', '0212-1234567', 'empresa@example.com', 'ACTIVO')
-- RETURNING id;

-- PASO 3: Insertar el usuario en la tabla users
-- IMPORTANTE: Reemplaza los valores según tu caso:
-- - user_id: El ID del usuario de Supabase Auth (obtenido en PASO 1)
-- - organization_id: El ID de la organización (obtenido en PASO 2)
-- - email: El email del usuario
-- - role: 'admin', 'contador', 'cliente', o 'super_admin'
-- - client_id: Solo necesario si role = 'cliente' (opcional, puede ser NULL)

-- Ejemplo para un usuario ADMIN:
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
  '4a05811d-f6b7-43f5-acbb-96d7172105b2', -- Reemplaza con el ID real del usuario de Auth
  'cpelaez0811@gmail.com', -- Reemplaza con el email del usuario
  'cpelaez0811', -- Reemplaza con el username deseado
  'Carlos', -- Reemplaza con el nombre real
  'Pelaez', -- Reemplaza con el apellido real
  'admin', -- Rol: 'admin', 'contador', 'cliente', o 'super_admin'
  '11111111-1111-1111-1111-111111111111', -- Reemplaza con el ID real de la organización
  NULL, -- client_id solo necesario si role = 'cliente'
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

-- ============================================
-- Verificar que el usuario se insertó correctamente
-- ============================================
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
WHERE u.id = '4a05811d-f6b7-43f5-acbb-96d7172105b2'; -- Reemplaza con el ID real

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. El usuario DEBE existir primero en Supabase Auth
-- 2. La organización DEBE existir antes de insertar el usuario
-- 3. Si el role es 'cliente', el client_id DEBE ser válido y existir en la tabla clients
-- 4. Si el role es 'super_admin', el organization_id DEBE ser NULL
-- 5. Si el role es 'admin' o 'contador', el organization_id DEBE ser válido
-- 6. Si el role es 'cliente', el client_id DEBE ser válido
-- ============================================

-- ============================================
-- Ejemplos para diferentes tipos de usuarios:
-- ============================================

-- Usuario ADMIN (Contador Administrador):
-- INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
-- VALUES ('USER_ID', 'admin@empresa.com', 'admin', 'Admin', 'Usuario', 'admin', 'ORG_ID', NULL, true, NOW(), NOW());

-- Usuario CONTADOR:
-- INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
-- VALUES ('USER_ID', 'contador@empresa.com', 'contador', 'Contador', 'Usuario', 'contador', 'ORG_ID', NULL, true, NOW(), NOW());

-- Usuario CLIENTE:
-- INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
-- VALUES ('USER_ID', 'cliente@empresa.com', 'cliente', 'Cliente', 'Usuario', 'cliente', 'ORG_ID', 'CLIENT_ID', true, NOW(), NOW());

-- Usuario SUPER ADMIN:
-- INSERT INTO users (id, email, username, first_name, last_name, role, organization_id, client_id, is_active, created_at, updated_at)
-- VALUES ('USER_ID', 'superadmin@sistema.com', 'superadmin', 'Super', 'Admin', 'super_admin', NULL, NULL, true, NOW(), NOW());


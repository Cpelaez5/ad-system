# 📚 Guía del Backend Supabase para Desarrolladores Junior

## 🎯 ¿Qué es este documento?

Esta guía explica de manera **simple y clara** cómo funciona el backend de Supabase en este proyecto. Está diseñada para desarrolladores junior que necesitan entender rápidamente la estructura de la base de datos.

---

## 🏢 Los 2 Tipos de Empresas (MUY IMPORTANTE)

### 1. Empresa Administradora/Contadora (`organizations`)

**¿Qué es?**
- Es la empresa que **presta servicios contables** a otras empresas
- Ejemplo: "TECNOLOGÍA AVANZADA VENEZOLANA C.A."

**¿Qué tiene?**
- Usuarios `admin` y `contador` que trabajan para ella
- Múltiples empresas cliente a las que les presta servicios

**En la base de datos:**
- Tabla: `organizations`
- Ejemplo: Una empresa contadora que gestiona 10 empresas cliente

---

### 2. Empresa Cliente (`clients`)

**¿Qué es?**
- Es la empresa que **recibe servicios contables** de una empresa administradora
- Ejemplo: "CLÍNICA ESPECIALIZADA DEL CARIBE"

**¿Qué tiene?**
- Solo usuarios de tipo `cliente` que pueden ver sus propios datos
- Está asociada a una empresa administradora

**En la base de datos:**
- Tabla: `clients`
- Tiene un `organization_id` que la vincula a su empresa administradora

---

## 👥 Los 4 Tipos de Usuarios

### 1. Usuario Cliente (`cliente`)

**¿Quién es?**
- Usuario que pertenece a una **Empresa Cliente**
- Solo puede ver y gestionar sus propios datos

**¿Qué tiene en la base de datos?**
- `client_id`: ID de su empresa cliente (OBLIGATORIO)
- `organization_id`: ID de la empresa administradora que le presta servicios

**¿Qué puede hacer?**
- ✅ Ver solo sus facturas
- ✅ Ver solo sus documentos
- ✅ Crear sus propias facturas
- ✅ Subir sus propios documentos
- ❌ NO puede ver datos de otros clientes

**Ejemplo:**
```
Usuario: cliente@clinica.com
Empresa Cliente: CLÍNICA ESPECIALIZADA DEL CARIBE
Empresa Administradora: TECNOLOGÍA AVANZADA VENEZOLANA C.A.
```

---

### 2. Usuario Contador (`contador`)

**¿Quién es?**
- Usuario que trabaja para una **Empresa Administradora**
- Puede ver datos de TODAS las empresas cliente de su organización

**¿Qué tiene en la base de datos?**
- `organization_id`: ID de la empresa administradora (OBLIGATORIO)
- `client_id`: NULL (no tiene empresa cliente específica)

**¿Qué puede hacer?**
- ✅ Ver todas las empresas cliente de su organización
- ✅ Ver todas las facturas de todas las empresas cliente
- ✅ Ver todos los documentos de todas las empresas cliente
- ✅ Crear y editar facturas de cualquier cliente
- ❌ NO puede gestionar usuarios (solo admin puede hacerlo)

**Ejemplo:**
```
Usuario: contador@sistema.local
Empresa Administradora: TECNOLOGÍA AVANZADA VENEZOLANA C.A.
Puede ver: Todas las empresas cliente de esta organización
```

---

### 3. Usuario Admin (`admin`)

**¿Quién es?**
- Usuario que trabaja para una **Empresa Administradora**
- Puede gestionar usuarios, clientes y datos de su organización

**¿Qué tiene en la base de datos?**
- `organization_id`: ID de la empresa administradora (OBLIGATORIO)
- `client_id`: NULL (no tiene empresa cliente específica)

**¿Qué puede hacer?**
- ✅ Todo lo que puede hacer un contador
- ✅ Gestionar usuarios (crear, editar, eliminar)
- ✅ Gestionar empresas cliente (crear, editar, eliminar)
- ✅ Invitar y registrar clientes o contadores

**Ejemplo:**
```
Usuario: admin@sistema.local
Empresa Administradora: TECNOLOGÍA AVANZADA VENEZOLANA C.A.
Puede hacer: Todo lo que un contador + gestionar usuarios y clientes
```

---

### 4. Usuario Super Admin (`super_admin`)

**¿Quién es?**
- Usuario que **NO está ligado a ninguna empresa**
- Administra todas las empresas administradoras del sistema

**¿Qué tiene en la base de datos?**
- `organization_id`: NULL (no tiene empresa)
- `client_id`: NULL (no tiene empresa cliente)

**¿Qué puede hacer?**
- ✅ Ver y gestionar todas las empresas administradoras
- ✅ Crear nuevas empresas administradoras
- ✅ Gestionar usuarios de cualquier empresa
- ✅ Acceso completo a todo el sistema

**Ejemplo:**
```
Usuario: superadmin@sistema.local
Empresa: Ninguna (administra todas las empresas)
Puede hacer: Todo en el sistema
```

---

## 📊 Estructura de las Tablas

### Tabla `organizations` (Empresas Administradoras)

```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,              -- Nombre de la empresa
    rif TEXT UNIQUE NOT NULL,       -- RIF único
    address TEXT,                   -- Dirección
    phone TEXT,                     -- Teléfono
    email TEXT,                     -- Email
    website TEXT,                   -- Sitio web
    is_active BOOLEAN DEFAULT true, -- Activa o inactiva
    created_at TIMESTAMPTZ,         -- Fecha de creación
    updated_at TIMESTAMPTZ          -- Fecha de actualización
);
```

**¿Qué guarda?**
- Información de las empresas que prestan servicios contables

---

### Tabla `clients` (Empresas Cliente)

```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,  -- FK a organizations (empresa administradora)
    company_name TEXT NOT NULL,      -- Nombre de la empresa cliente
    rif TEXT NOT NULL,               -- RIF de la empresa cliente
    taxpayer_type TEXT,              -- Tipo de contribuyente
    address TEXT,                    -- Dirección
    phone TEXT,                      -- Teléfono
    email TEXT,                      -- Email
    status TEXT DEFAULT 'ACTIVO',    -- Estado (ACTIVO/INACTIVO)
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(organization_id, rif)    -- RIF único por organización
);
```

**¿Qué guarda?**
- Información de las empresas que reciben servicios contables
- Cada empresa cliente está asociada a una empresa administradora

---

### Tabla `users` (Usuarios del Sistema)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,             -- FK a auth.users
    organization_id UUID,            -- FK a organizations (NULL para super_admin)
    client_id UUID,                  -- FK a clients (solo para usuarios cliente)
    username TEXT UNIQUE NOT NULL,   -- Nombre de usuario
    email TEXT NOT NULL,             -- Email
    first_name TEXT NOT NULL,        -- Nombre
    last_name TEXT NOT NULL,         -- Apellido
    role TEXT NOT NULL,              -- Rol: super_admin, admin, contador, cliente
    is_active BOOLEAN DEFAULT true,  -- Activo o inactivo
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    
    -- Constraints (reglas):
    -- 1. Solo 4 roles permitidos
    CHECK (role IN ('super_admin', 'admin', 'contador', 'cliente')),
    
    -- 2. Cliente DEBE tener client_id
    CHECK ((role != 'cliente') OR (role = 'cliente' AND client_id IS NOT NULL)),
    
    -- 3. Super admin NO debe tener organization_id
    CHECK ((role != 'super_admin') OR (role = 'super_admin' AND organization_id IS NULL))
);
```

**¿Qué guarda?**
- Información de todos los usuarios del sistema
- Cada usuario tiene un rol y está asociado a una empresa (o no, si es super_admin)

**Reglas importantes:**
1. **Cliente** DEBE tener `client_id` (no puede ser NULL)
2. **Super Admin** NO debe tener `organization_id` (debe ser NULL)
3. **Admin y Contador** DEBEN tener `organization_id` (no puede ser NULL)

---

### Tabla `invoices` (Facturas)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,  -- FK a organizations
    client_id UUID,                  -- FK a clients (puede ser NULL)
    invoice_number TEXT NOT NULL,    -- Número de factura
    flow TEXT DEFAULT 'VENTA',       -- 'VENTA' o 'COMPRA'
    issue_date DATE NOT NULL,        -- Fecha de emisión
    status TEXT DEFAULT 'BORRADOR',  -- Estado de la factura
    issuer JSONB,                    -- Datos del emisor (JSON)
    client_info JSONB,               -- Datos del cliente (JSON)
    financial JSONB,                 -- Datos financieros (JSON)
    items JSONB,                     -- Items de la factura (JSON)
    created_by UUID NOT NULL,        -- FK a users (quien creó la factura)
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(organization_id, invoice_number)  -- Número único por organización
);
```

**¿Qué guarda?**
- Facturas de las empresas cliente
- Cada factura está asociada a una empresa cliente y a una organización

---

## 🔒 Políticas RLS (Row Level Security)

### ¿Qué son las Políticas RLS?

Las políticas RLS son **reglas de seguridad** que determinan qué datos puede ver cada usuario. Son como "filtros automáticos" que se aplican a cada consulta.

### ¿Cómo funcionan?

Cada vez que un usuario hace una consulta, Supabase automáticamente aplica las políticas RLS para mostrarle solo los datos que tiene permiso de ver.

### Ejemplo Simple:

**Usuario Cliente:**
```sql
-- El usuario cliente hace esta consulta:
SELECT * FROM invoices;

-- Pero Supabase automáticamente aplica la política RLS:
-- Solo muestra facturas donde client_id = su client_id
SELECT * FROM invoices WHERE client_id = 'su-client-id';
```

**Usuario Contador:**
```sql
-- El usuario contador hace esta consulta:
SELECT * FROM invoices;

-- Pero Supabase automáticamente aplica la política RLS:
-- Solo muestra facturas de su organización
SELECT * FROM invoices WHERE organization_id = 'su-organization-id';
```

---

## 🛠️ Funciones Helper (Funciones de Ayuda)

### ¿Qué son las Funciones Helper?

Son funciones SQL que **simplifican** las políticas RLS. En lugar de escribir código complejo en cada política, usamos estas funciones.

### Las 3 Funciones Principales:

#### 1. `get_current_user_role()`

**¿Qué hace?**
- Obtiene el rol del usuario que está haciendo la consulta

**Ejemplo:**
```sql
-- Si el usuario actual es 'cliente', retorna 'cliente'
-- Si el usuario actual es 'admin', retorna 'admin'
SELECT get_current_user_role();
-- Resultado: 'cliente' o 'admin' o 'contador' o 'super_admin'
```

**¿Dónde se usa?**
- En todas las políticas RLS para verificar el rol del usuario

---

#### 2. `get_current_organization_id()`

**¿Qué hace?**
- Obtiene el `organization_id` del usuario que está haciendo la consulta
- Si el usuario es `super_admin`, retorna NULL (porque no tiene organización)

**Ejemplo:**
```sql
-- Si el usuario actual es 'admin' con organization_id = '1111...'
-- Retorna: '1111-1111-1111-1111-111111111111'
-- Si el usuario actual es 'super_admin'
-- Retorna: NULL
SELECT get_current_organization_id();
```

**¿Dónde se usa?**
- En políticas RLS para filtrar por organización

---

#### 3. `get_current_user_client_id()`

**¿Qué hace?**
- Obtiene el `client_id` del usuario si es de tipo `cliente`
- Si el usuario NO es `cliente`, retorna NULL

**Ejemplo:**
```sql
-- Si el usuario actual es 'cliente' con client_id = '2222...'
-- Retorna: '2222-2222-2222-2222-222222222222'
-- Si el usuario actual NO es 'cliente'
-- Retorna: NULL
SELECT get_current_user_client_id();
```

**¿Dónde se usa?**
- En políticas RLS para que usuarios `cliente` solo vean sus datos

---

## 📋 Políticas RLS por Tabla

### Tabla `organizations`

**¿Quién puede ver qué?**
- `super_admin`: Ve todas las organizaciones
- `admin`, `contador`, `cliente`: Ven solo su organización

**Políticas:**
- `organizations_select`: Ver organizaciones
- `organizations_insert`: Crear organizaciones (solo super_admin)
- `organizations_update`: Actualizar organizaciones (super_admin o admin de su org)
- `organizations_delete`: Eliminar organizaciones (solo super_admin)

---

### Tabla `users`

**¿Quién puede ver qué?**
- `super_admin`: Ve todos los usuarios
- `admin`, `contador`: Ven usuarios de su organización
- `cliente`: Ve solo su propio perfil

**Políticas:**
- `users_select`: Ver usuarios
- `users_insert`: Crear usuarios (super_admin o admin de su org)
- `users_update`: Actualizar usuarios (super_admin, admin de su org, o el propio usuario)
- `users_delete`: Eliminar usuarios (solo super_admin o admin de su org)

---

### Tabla `clients`

**¿Quién puede ver qué?**
- `super_admin`: Ve todos los clientes
- `admin`, `contador`: Ven clientes de su organización
- `cliente`: Ve solo su propio cliente (el asociado a su `client_id`)

**Políticas:**
- `clients_select`: Ver clientes
- `clients_insert`: Crear clientes (super_admin o admin de su org)
- `clients_update`: Actualizar clientes (super_admin o admin de su org)
- `clients_delete`: Eliminar clientes (solo super_admin o admin de su org)

---

### Tabla `invoices`

**¿Quién puede ver qué?**
- `super_admin`: Ve todas las facturas
- `admin`, `contador`: Ven facturas de su organización
- `cliente`: Ve solo sus facturas (las que tienen su `client_id`)

**Políticas:**
- `invoices_select`: Ver facturas
- `invoices_insert`: Crear facturas (super_admin, admin, contador, o cliente para su client_id)
- `invoices_update`: Actualizar facturas (super_admin, admin, contador, o cliente para sus facturas)
- `invoices_delete`: Eliminar facturas (solo super_admin, admin o contador)

---

### Tabla `documents`

**¿Quién puede ver qué?**
- `super_admin`: Ve todos los documentos
- `admin`, `contador`: Ven documentos de su organización
- `cliente`: Ve solo sus documentos (los que subió él mismo)

**Políticas:**
- `documents_select`: Ver documentos
- `documents_insert`: Subir documentos (cualquier usuario autenticado de su organización)
- `documents_update`: Actualizar documentos (quien subió el documento o admin/contador)
- `documents_delete`: Eliminar documentos (quien subió el documento o admin/contador)

---

## 🔍 Cómo Verificar que Todo Está Correcto

### 1. Verificar Estructura de Tablas

```sql
-- Ver todas las tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Resultado esperado:**
- organizations
- users
- clients
- invoices
- documents
- audit_logs

---

### 2. Verificar Funciones Helper

```sql
-- Ver funciones helper
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('get_current_user_role', 'get_current_organization_id', 'get_current_user_client_id')
ORDER BY routine_name;
```

**Resultado esperado:**
- get_current_organization_id
- get_current_user_client_id
- get_current_user_role

---

### 3. Verificar Políticas RLS

```sql
-- Ver políticas RLS
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Resultado esperado:**
- 22 políticas RLS (una por cada operación en cada tabla)

---

### 4. Verificar Constraints

```sql
-- Ver constraints de la tabla users
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass
AND contype = 'c';
```

**Resultado esperado:**
- `users_role_check`: Solo permite 4 roles
- `users_cliente_client_id_check`: Cliente debe tener client_id
- `users_super_admin_org_check`: Super admin no debe tener organization_id

---

## 🎯 Resumen para Desarrolladores Junior

### Conceptos Clave:

1. **2 Tipos de Empresas:**
   - `organizations`: Empresas que prestan servicios contables
   - `clients`: Empresas que reciben servicios contables

2. **4 Tipos de Usuarios:**
   - `cliente`: Ve solo sus datos (tiene `client_id`)
   - `contador`: Ve todos los clientes de su organización
   - `admin`: Gestiona usuarios y clientes de su organización
   - `super_admin`: Administra todas las empresas (no tiene `organization_id`)

3. **Políticas RLS:**
   - Filtros automáticos que determinan qué datos puede ver cada usuario
   - Usan funciones helper para simplificar el código

4. **Funciones Helper:**
   - `get_current_user_role()`: Obtiene el rol del usuario actual
   - `get_current_organization_id()`: Obtiene la organización del usuario actual
   - `get_current_user_client_id()`: Obtiene el cliente del usuario actual (si es cliente)

### Reglas Importantes:

1. **Cliente DEBE tener `client_id`** (no puede ser NULL)
2. **Super Admin NO debe tener `organization_id`** (debe ser NULL)
3. **Admin y Contador DEBEN tener `organization_id`** (no puede ser NULL)
4. **Solo 4 roles permitidos**: `super_admin`, `admin`, `contador`, `cliente`

---

## 📚 Documentación Relacionada

- **ARQUITECTURA_EMPRESAS.md**: Arquitectura completa de empresas y usuarios
- **ESTADO_BACKEND_SUPABASE.md**: Estado actual del backend
- **VERIFICACION_BACKEND_SUPABASE.md**: Verificación detallada del backend
- **CONFIGURAR_USUARIOS.md**: Cómo configurar usuarios en Supabase
- **SUPABASE_SETUP.md**: Guía de configuración de Supabase

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si un usuario cliente intenta ver datos de otro cliente?

**Respuesta:** Las políticas RLS automáticamente filtran los datos. El usuario cliente solo verá sus propias facturas y documentos, aunque intente hacer una consulta que incluya otros clientes.

### ¿Puede un usuario contador ver datos de otra organización?

**Respuesta:** No. Las políticas RLS filtran automáticamente por `organization_id`. Un contador solo puede ver datos de su propia organización.

### ¿Qué pasa si un usuario cliente intenta crear una factura para otro cliente?

**Respuesta:** Las políticas RLS lo previenen. Un usuario cliente solo puede crear facturas para su propio `client_id`.

### ¿Cómo funciona `get_current_organization_id()` para un super_admin?

**Respuesta:** Retorna NULL porque un super_admin no tiene `organization_id`. Las políticas RLS verifican si el usuario es `super_admin` y, si lo es, le permiten ver todo sin filtrar por organización.

---

**Última actualización:** 2025-01-01  
**Nivel:** Para Desarrolladores Junior  
**Estado:** ✅ Documentación completa y verificada


# 🏢 Arquitectura de Empresas - Sistema de Contabilidad

## 📋 Resumen

Este documento explica la arquitectura de empresas en el sistema de contabilidad, detallando los dos tipos de empresas y cómo se relacionan entre sí y con los usuarios del sistema.

## 🏢 Tipos de Empresas

El sistema maneja **2 tipos de empresas** principales:

### 1. Empresa Administradora/Contadora (`organizations`)

**Definición:**
- Empresa que presta servicios contables y fiscales
- Puede tener uno o más usuarios: Contadores, Administradores Contadores
- Puede tener múltiples Empresas Cliente asociadas (tabla `clients`)
- Representada en la tabla `organizations`

**Características:**
- Presta servicios contables a otras empresas
- Gestiona múltiples clientes
- Tiene usuarios `admin` y `contador` asociados
- Ejemplo: "TECNOLOGÍA AVANZADA VENEZOLANA C.A."

**Usuarios asociados:**
- `admin` (Contador Administrador): Gestiona usuarios, clientes y datos
- `contador`: Ve y gestiona datos de todos los clientes

**Estructura en base de datos:**
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    rif TEXT UNIQUE NOT NULL,
    -- ... otros campos
);
```

### 2. Empresa Cliente o Cliente (`clients`)

**Definición:**
- Empresa o emprendedor que recibe servicios de administración fiscal
- Está asociada a una Empresa Administradora/Contadora (`organization_id`)
- Solo tiene usuarios de tipo "cliente" asociados
- Representada en la tabla `clients`

**Características:**
- Recibe servicios contables de una empresa administradora
- Solo puede ver y gestionar sus propios datos
- Tiene usuarios `cliente` asociados
- Ejemplo: "CLÍNICA ESPECIALIZADA DEL CARIBE"

**Usuarios asociados:**
- `cliente`: Ve y gestiona solo sus propios datos (facturas, documentos, compras, gastos)

**Estructura en base de datos:**
```sql
CREATE TABLE clients (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    company_name TEXT NOT NULL,
    rif TEXT NOT NULL,
    -- ... otros campos
    UNIQUE(organization_id, rif)
);
```

## 🔗 Relación entre Empresas

### Jerarquía de Datos

```
EMPRESA ADMINISTRADORA/CONTADORA (organizations)
  ├── USUARIOS ADMIN/CONTADOR (admin, contador)
  │   └── organization_id → Empresa Administradora
  └── EMPRESAS CLIENTE (clients)
      ├── organization_id → Empresa Administradora
      ├── USUARIOS CLIENTE (cliente)
      │   ├── client_id → Empresa Cliente
      │   └── organization_id → Empresa Administradora
      ├── FACTURAS (invoices)
      │   ├── client_id → Empresa Cliente
      │   └── organization_id → Empresa Administradora
      └── DOCUMENTOS (documents)
          ├── organization_id → Empresa Administradora
          └── uploaded_by → Usuario Cliente
```

### Reglas de Relación

1. **Una Empresa Administradora puede tener múltiples Empresas Cliente**
   - Una empresa contadora puede gestionar múltiples clientes
   - Cada cliente está asociado a una sola empresa administradora

2. **Una Empresa Cliente está asociada a una sola Empresa Administradora**
   - Un cliente solo puede recibir servicios de una empresa contadora
   - El `organization_id` en `clients` vincula al cliente con su empresa administradora

3. **Los usuarios `cliente` pertenecen a una Empresa Cliente específica**
   - Tienen `client_id` (la empresa cliente a la que pertenecen)
   - También tienen `organization_id` (la empresa administradora que les presta servicios)

4. **Los usuarios `admin` y `contador` solo tienen `organization_id`**
   - Pertenecen directamente a la Empresa Administradora
   - No tienen `client_id` porque pueden ver datos de todas las Empresas Cliente

## 👥 Tipos de Usuarios y su Relación con las Empresas

### 1. Usuario Cliente (`cliente`)

**Relación con empresas:**
- `client_id`: Empresa Cliente a la que pertenece (OBLIGATORIO)
- `organization_id`: Empresa Administradora que le presta servicios (OBLIGATORIO)

**Acceso:**
- Solo puede ver y gestionar sus propios datos
- Ve solo facturas, documentos, compras y gastos de su empresa cliente
- No puede ver datos de otros clientes

**Ejemplo:**
```sql
INSERT INTO users (
    id,
    organization_id,  -- Empresa Administradora
    client_id,        -- Empresa Cliente
    role,
    -- ... otros campos
) VALUES (
    '<user_id>',
    '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
    '22222222-2222-2222-2222-222222222222',  -- ID de la Empresa Cliente
    'cliente',
    -- ... otros campos
);
```

### 2. Usuario Contador (`contador`)

**Relación con empresas:**
- `organization_id`: Empresa Administradora a la que pertenece (OBLIGATORIO)
- `client_id`: NULL (no tiene empresa cliente específica)

**Acceso:**
- Ve datos de TODAS las Empresas Cliente de su organización
- Puede gestionar facturas, documentos, compras y gastos de todos los clientes
- No puede gestionar usuarios (solo admin puede hacerlo)

**Ejemplo:**
```sql
INSERT INTO users (
    id,
    organization_id,  -- Empresa Administradora
    client_id,        -- NULL (no tiene empresa cliente)
    role,
    -- ... otros campos
) VALUES (
    '<user_id>',
    '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
    NULL,  -- No tiene empresa cliente
    'contador',
    -- ... otros campos
);
```

### 3. Usuario Admin (`admin`)

**Relación con empresas:**
- `organization_id`: Empresa Administradora a la que pertenece (OBLIGATORIO)
- `client_id`: NULL (no tiene empresa cliente específica)

**Acceso:**
- Ve y gestiona datos de TODAS las Empresas Cliente de su organización
- Puede invitar y registrar clientes o contadores a su empresa
- Gestiona usuarios, clientes, facturas y documentos de su organización

**Ejemplo:**
```sql
INSERT INTO users (
    id,
    organization_id,  -- Empresa Administradora
    client_id,        -- NULL (no tiene empresa cliente)
    role,
    -- ... otros campos
) VALUES (
    '<user_id>',
    '11111111-1111-1111-1111-111111111111',  -- ID de la Empresa Administradora
    NULL,  -- No tiene empresa cliente
    'admin',
    -- ... otros campos
);
```

### 4. Usuario Super Admin (`super_admin`)

**Relación con empresas:**
- `organization_id`: NULL (no está ligado a ninguna empresa)
- `client_id`: NULL (no tiene empresa cliente)

**Acceso:**
- Gestiona todas las Empresas Administradoras del sistema
- Puede crear, registrar o invitar empresas al sistema
- Administra usuarios de cualquier empresa

**Ejemplo:**
```sql
INSERT INTO users (
    id,
    organization_id,  -- NULL (no tiene empresa)
    client_id,        -- NULL (no tiene empresa cliente)
    role,
    -- ... otros campos
) VALUES (
    '<user_id>',
    NULL,  -- No está ligado a ninguna empresa
    NULL,  -- No tiene empresa cliente
    'super_admin',
    -- ... otros campos
);
```

## 🔒 Seguridad y Aislamiento de Datos

### Políticas RLS (Row Level Security)

Las políticas RLS garantizan que:

1. **Usuarios `cliente`** solo ven datos de su empresa cliente:
   - Facturas: `client_id = user.client_id`
   - Documentos: `uploaded_by = user.id`
   - Clientes: Solo su propio cliente

2. **Usuarios `contador` y `admin`** ven datos de todas las empresas cliente de su organización:
   - Facturas: `organization_id = user.organization_id`
   - Documentos: `organization_id = user.organization_id`
   - Clientes: `organization_id = user.organization_id`

3. **Usuarios `super_admin`** ven todos los datos:
   - Sin restricciones de `organization_id`
   - Acceso completo a todas las empresas

### Constraints de Base de Datos

```sql
-- Cliente debe tener client_id
ALTER TABLE users ADD CONSTRAINT users_cliente_client_id_check CHECK (
    (role != 'cliente') OR (role = 'cliente' AND client_id IS NOT NULL)
);

-- Super admin no debe tener organization_id
ALTER TABLE users ADD CONSTRAINT users_super_admin_org_check CHECK (
    (role != 'super_admin') OR (role = 'super_admin' AND organization_id IS NULL)
);

-- Roles permitidos
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
    role IN ('super_admin', 'admin', 'contador', 'cliente')
);
```

## 📊 Flujo de Datos

### Crear una Empresa Cliente

1. **Crear Empresa Administradora** (si no existe):
   ```sql
   INSERT INTO organizations (id, name, rif, ...) VALUES (...);
   ```

2. **Crear Empresa Cliente** asociada a la administradora:
   ```sql
   INSERT INTO clients (id, organization_id, company_name, rif, ...) 
   VALUES (..., '<org_id>', ...);
   ```

3. **Crear Usuario Cliente** para la empresa cliente:
   ```sql
   INSERT INTO users (id, organization_id, client_id, role, ...) 
   VALUES (..., '<org_id>', '<client_id>', 'cliente', ...);
   ```

### Crear Factura para una Empresa Cliente

1. **Usuario Cliente** crea factura:
   - `client_id`: Su empresa cliente (automático)
   - `organization_id`: Empresa administradora (automático)

2. **Usuario Contador/Admin** crea factura:
   - `client_id`: Selecciona la empresa cliente
   - `organization_id`: Su empresa administradora (automático)

## 🎯 Casos de Uso

### Caso 1: Empresa Contadora con Múltiples Clientes

```
Empresa Administradora: "TECNOLOGÍA AVANZADA VENEZOLANA C.A."
  ├── Usuario Admin: admin@sistema.local
  ├── Usuario Contador: contador@sistema.local
  └── Empresas Cliente:
      ├── "CLÍNICA ESPECIALIZADA DEL CARIBE"
      │   └── Usuario Cliente: cliente1@sistema.local
      ├── "CONSTRUCTORA DEL CARIBE S.A."
      │   └── Usuario Cliente: cliente2@sistema.local
      └── "DISTRIBUIDORA NACIONAL DE ALIMENTOS C.A."
          └── Usuario Cliente: cliente3@sistema.local
```

### Caso 2: Usuario Cliente Ve Solo Sus Datos

- `cliente1@sistema.local` solo ve:
  - Facturas de "CLÍNICA ESPECIALIZADA DEL CARIBE"
  - Documentos subidos por él
  - Compras y gastos de su empresa

- `cliente1@sistema.local` NO ve:
  - Facturas de otros clientes
  - Documentos de otros clientes
  - Datos de otras empresas cliente

### Caso 3: Usuario Contador Ve Todos los Clientes

- `contador@sistema.local` ve:
  - Todas las facturas de todas las empresas cliente
  - Todos los documentos de todas las empresas cliente
  - Todos los clientes de la empresa administradora

- `contador@sistema.local` NO ve:
  - Datos de otras empresas administradoras
  - Usuarios de otras empresas administradoras

## 📝 Notas Importantes

1. **Orden de creación**: Siempre crear la Empresa Administradora antes que las Empresas Cliente
2. **Validación**: El `organization_id` de un `cliente` debe coincidir con el `organization_id` de su `client_id`
3. **Aislamiento**: Las políticas RLS garantizan que los usuarios solo vean los datos que les corresponden
4. **Super Admin**: No está ligado a ninguna empresa, puede ver y gestionar todo
5. **Empresas Cliente**: No pueden tener usuarios `admin` o `contador`, solo `cliente`

## 🔍 Verificación

### Verificar estructura de empresas

```sql
-- Ver todas las empresas administradoras
SELECT * FROM organizations;

-- Ver todas las empresas cliente de una administradora
SELECT * FROM clients WHERE organization_id = '<org_id>';

-- Ver usuarios de una empresa administradora
SELECT * FROM users WHERE organization_id = '<org_id>';

-- Ver usuarios de una empresa cliente
SELECT * FROM users WHERE client_id = '<client_id>';
```

### Verificar relaciones

```sql
-- Ver empresas cliente con su empresa administradora
SELECT 
    c.company_name AS empresa_cliente,
    o.name AS empresa_administradora
FROM clients c
JOIN organizations o ON c.organization_id = o.id;

-- Ver usuarios cliente con su empresa cliente y administradora
SELECT 
    u.email,
    u.role,
    c.company_name AS empresa_cliente,
    o.name AS empresa_administradora
FROM users u
JOIN clients c ON u.client_id = c.id
JOIN organizations o ON u.organization_id = o.id
WHERE u.role = 'cliente';
```


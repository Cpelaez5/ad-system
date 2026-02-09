# 🗄️ Schema de Base de Datos

> Supabase PostgreSQL con Row Level Security (RLS)

---

## Tablas Principales

### organizations
Empresas administradoras/contadoras que prestan servicios.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rif TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### users
Usuarios del sistema vinculados a auth.users.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('super_admin', 'admin', 'contador', 'cliente')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Constraints importantes:
-- cliente DEBE tener client_id
-- super_admin NO debe tener organization_id
```

**Relaciones por rol**:
| Rol | organization_id | client_id |
|-----|-----------------|-----------|
| super_admin | NULL | NULL |
| admin | ✅ Requerido | NULL |
| contador | ✅ Requerido | NULL |
| cliente | ✅ Requerido | ✅ Requerido |

---

### clients
Empresas cliente que reciben servicios contables.

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  company_name TEXT NOT NULL,
  rif TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  contact_name TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, rif)
);
```

---

### invoices
Facturas de compra/venta.

```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id), -- NULL = factura de la org
  
  -- Datos básicos
  invoice_number TEXT NOT NULL,
  invoice_type TEXT CHECK (invoice_type IN ('FACTURA', 'NOTA_CREDITO', 'NOTA_DEBITO')),
  flow TEXT CHECK (flow IN ('VENTA', 'COMPRA')),
  status TEXT DEFAULT 'BORRADOR',
  
  -- Fechas
  issue_date DATE NOT NULL,
  due_date DATE,
  
  -- Montos
  currency TEXT DEFAULT 'VES',
  subtotal DECIMAL(15,2),
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(15,2),
  total DECIMAL(15,2),
  
  -- Retenciones
  iva_retention DECIMAL(15,2),
  islr_retention DECIMAL(15,2),
  municipal_retention DECIMAL(15,2),
  igtf DECIMAL(15,2),
  
  -- Emisor/Cliente info
  issuer_name TEXT,
  issuer_rif TEXT,
  issuer_address TEXT,
  recipient_name TEXT,
  recipient_rif TEXT,
  recipient_address TEXT,
  
  -- Extras
  notes TEXT,
  attachment_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Estados de factura**:
- `BORRADOR` - En edición
- `EMITIDA` - Oficial
- `ENVIADA` - Al cliente
- `PAGADA` - Cobrada/Pagada
- `VENCIDA` - Sin pagar a tiempo
- `ANULADA` - Cancelada (soft delete)

---

### documents
Archivos en Supabase Storage.

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  uploaded_by UUID REFERENCES auth.users(id),
  
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  category TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### fiscal_docs
Expediente Fiscal 360: Metadatos de permisos y documentos legales.

```sql
CREATE TABLE fiscal_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VIGENTE', 'TRAMITE', 'VENCIDO')),
  expiration_date DATE,
  
  document_id UUID REFERENCES documents(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### invitations
Sistema de invitaciones por email.

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  role TEXT CHECK (role IN ('admin', 'contador', 'cliente')),
  organization_id UUID REFERENCES organizations(id),
  client_id UUID REFERENCES clients(id),
  status TEXT DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Políticas RLS

### Principio General
Cada tabla filtra por `organization_id` para aislamiento multi-tenant.

```sql
-- Ejemplo: invoices
CREATE POLICY "invoices_select" ON invoices
FOR SELECT USING (
  organization_id = get_current_organization_id()
);
```

### Funciones Helper
```sql
-- Obtener organization_id del usuario actual
CREATE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users 
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

---

## Storage Buckets

### documents
- Límite: 50MB por archivo
- Tipos: PDF, Excel, Word, Imágenes
- Acceso: Por organization_id

---

## Migraciones

Ubicación: `/migrations/`

```
migrations/
├── 001_initial_schema.sql
├── 002_add_users_table.sql
├── 003_add_invoices_table.sql
└── ...
```

**Convención de nombres**:
```
NNN_descripcion_breve.sql
```

**Estructura de migración**:
```sql
-- migrations/NNN_descripcion.sql
-- Descripción: [qué hace]
-- Autor: [nombre]
-- Fecha: YYYY-MM-DD

[SQL statements]
```

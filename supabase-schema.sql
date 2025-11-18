-- =====================================================
-- SCHEMA MULTI-TENANT PARA SISTEMA DE CONTABILIDAD
-- =====================================================
-- 
-- Este archivo contiene la estructura completa de la base de datos
-- para el sistema de contabilidad con arquitectura multi-tenant.
-- 
-- Características principales:
-- - Multi-tenancy: Cada empresa tiene sus datos aislados
-- - Row Level Security (RLS): Seguridad a nivel de base de datos
-- - Triggers automáticos: updated_at, audit logs
-- - Índices optimizados: Para mejor performance
-- - Seed data: Datos de ejemplo para testing
-- 
-- IMPORTANTE: Ejecutar este script en el SQL Editor de Supabase
-- =====================================================

-- =====================================================
-- 1. EXTENSIONES NECESARIAS
-- =====================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensión para funciones de fecha
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. FUNCIONES AUXILIARES
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para obtener el organization_id del usuario actual
CREATE OR REPLACE FUNCTION get_current_organization_id()
RETURNS UUID AS $$
BEGIN
    -- Intentar obtener desde JWT claims
    IF auth.jwt() ->> 'organization_id' IS NOT NULL THEN
        RETURN (auth.jwt() ->> 'organization_id')::UUID;
    END IF;
    
    -- Fallback: obtener desde la tabla users
    RETURN (
        SELECT organization_id 
        FROM users 
        WHERE id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. TABLAS PRINCIPALES
-- =====================================================

-- Tabla de organizaciones (empresas)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    rif TEXT UNIQUE NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de usuarios del sistema
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'contador', 'auditor', 'facturador', 'operador', 'consultor')),
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de clientes (por organización)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    rif TEXT NOT NULL,
    taxpayer_type TEXT NOT NULL DEFAULT 'JURIDICA',
    address TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    website TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (status IN ('ACTIVO', 'INACTIVO')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice único por organización
    UNIQUE(organization_id, rif)
);

-- Tabla de facturas
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT, -- NULL para facturas de la organización
    invoice_number TEXT NOT NULL,
    control_number TEXT,
    document_type TEXT NOT NULL DEFAULT 'FACTURA',
    issue_date DATE NOT NULL,
    due_date DATE,
    status TEXT NOT NULL DEFAULT 'BORRADOR' CHECK (status IN ('BORRADOR', 'EMITIDA', 'ENVIADA', 'PAGADA', 'VENCIDA', 'ANULADA')),
    
    -- Datos estructurados en JSONB para flexibilidad
    issuer JSONB NOT NULL DEFAULT '{}',
    client_info JSONB NOT NULL DEFAULT '{}',
    financial JSONB NOT NULL DEFAULT '{}',
    items JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Índice único por organización
    UNIQUE(organization_id, invoice_number)
);

-- Tabla de logs de auditoría (para futuro)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de documentos (para futuro)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    category TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Trigger para actualizar updated_at en organizations
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en users
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en clients
CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en invoices
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para organizations
CREATE INDEX idx_organizations_rif ON organizations(rif);
CREATE INDEX idx_organizations_active ON organizations(is_active);

-- Índices para users
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Índices para clients
CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_rif ON clients(organization_id, rif);
CREATE INDEX idx_clients_status ON clients(organization_id, status);
CREATE INDEX idx_clients_company_name ON clients(organization_id, company_name);

-- Índices para invoices
CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_client_id ON invoices(organization_id, client_id);
CREATE INDEX idx_invoices_status ON invoices(organization_id, status);
CREATE INDEX idx_invoices_issue_date ON invoices(organization_id, issue_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(organization_id, invoice_number);
CREATE INDEX idx_invoices_created_by ON invoices(organization_id, created_by);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(organization_id, user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(organization_id, entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(organization_id, created_at);

-- Índices para documents
CREATE INDEX idx_documents_organization_id ON documents(organization_id);
CREATE INDEX idx_documents_category ON documents(organization_id, category);
CREATE INDEX idx_documents_uploaded_by ON documents(organization_id, uploaded_by);

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLICIES DE SEGURIDAD
-- =====================================================

-- Policies para organizations
CREATE POLICY "organizations_select_own" ON organizations
    FOR SELECT USING (
        id = get_current_organization_id()
    );

CREATE POLICY "organizations_update_own" ON organizations
    FOR UPDATE USING (
        id = get_current_organization_id()
    );

-- Policies para users
CREATE POLICY "users_select_own_org" ON users
    FOR SELECT USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "users_insert_own_org" ON users
    FOR INSERT WITH CHECK (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "users_update_own_org" ON users
    FOR UPDATE USING (
        organization_id = get_current_organization_id()
    );

-- Policies para clients
CREATE POLICY "clients_select_own_org" ON clients
    FOR SELECT USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "clients_insert_own_org" ON clients
    FOR INSERT WITH CHECK (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "clients_update_own_org" ON clients
    FOR UPDATE USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "clients_delete_own_org" ON clients
    FOR DELETE USING (
        organization_id = get_current_organization_id()
    );

-- Policies para invoices
CREATE POLICY "invoices_select_own_org" ON invoices
    FOR SELECT USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "invoices_insert_own_org" ON invoices
    FOR INSERT WITH CHECK (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "invoices_update_own_org" ON invoices
    FOR UPDATE USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "invoices_delete_own_org" ON invoices
    FOR DELETE USING (
        organization_id = get_current_organization_id()
    );

-- Policies para audit_logs
CREATE POLICY "audit_logs_select_own_org" ON audit_logs
    FOR SELECT USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "audit_logs_insert_own_org" ON audit_logs
    FOR INSERT WITH CHECK (
        organization_id = get_current_organization_id()
    );

-- Policies para documents
CREATE POLICY "documents_select_own_org" ON documents
    FOR SELECT USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "documents_insert_own_org" ON documents
    FOR INSERT WITH CHECK (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "documents_update_own_org" ON documents
    FOR UPDATE USING (
        organization_id = get_current_organization_id()
    );

CREATE POLICY "documents_delete_own_org" ON documents
    FOR DELETE USING (
        organization_id = get_current_organization_id()
    );

-- =====================================================
-- 8. SEED DATA (DATOS DE EJEMPLO)
-- =====================================================

-- Insertar organizaciones de ejemplo
INSERT INTO organizations (id, name, rif, address, phone, email, website, is_active) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'TECNOLOGÍA AVANZADA VENEZOLANA C.A.',
    'J-41234567-8',
    'Av. Francisco de Miranda, Torre Parque Cristal, Piso 15, Caracas',
    '+58 212 555-0100',
    'ventas@tav.com.ve',
    'www.tav.com.ve',
    true
),
(
    '22222222-2222-2222-2222-222222222222',
    'CONSULTORÍA EMPRESARIAL DEL CARIBE C.A.',
    'J-30123456-9',
    'Av. Libertador, Edificio Empresarial, Piso 8, Caracas',
    '+58 212 555-0200',
    'info@consultoriacaribe.com',
    'www.consultoriacaribe.com',
    true
);

-- =====================================================
-- 9. FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener estadísticas de facturas por organización
CREATE OR REPLACE FUNCTION get_invoice_stats(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', jsonb_object_agg(status, count_by_status),
        'total_amount', COALESCE(SUM((financial->>'totalSales')::numeric), 0),
        'paid_amount', COALESCE(SUM(CASE WHEN status = 'PAGADA' THEN (financial->>'totalSales')::numeric ELSE 0 END), 0)
    ) INTO result
    FROM (
        SELECT 
            status,
            COUNT(*) as count_by_status
        FROM invoices 
        WHERE organization_id = org_id
        GROUP BY status
    ) status_counts
    CROSS JOIN (
        SELECT 
            COALESCE(SUM((financial->>'totalSales')::numeric), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status = 'PAGADA' THEN (financial->>'totalSales')::numeric ELSE 0 END), 0) as paid_amount
        FROM invoices 
        WHERE organization_id = org_id
    ) amount_stats;
    
    RETURN COALESCE(result, '{"total": 0, "by_status": {}, "total_amount": 0, "paid_amount": 0}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de clientes por organización
CREATE OR REPLACE FUNCTION get_client_stats(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', jsonb_object_agg(status, count_by_status),
        'by_type', jsonb_object_agg(taxpayer_type, count_by_type)
    ) INTO result
    FROM (
        SELECT 
            status,
            taxpayer_type,
            COUNT(*) as count_by_status,
            COUNT(*) as count_by_type
        FROM clients 
        WHERE organization_id = org_id
        GROUP BY status, taxpayer_type
    ) stats;
    
    RETURN COALESCE(result, '{"total": 0, "by_status": {}, "by_type": {}}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

-- Comentarios en las tablas
COMMENT ON TABLE organizations IS 'Tabla de organizaciones (empresas) que usan el sistema';
COMMENT ON TABLE users IS 'Usuarios del sistema, cada uno pertenece a una organización';
COMMENT ON TABLE clients IS 'Clientes de cada organización, datos completamente aislados';
COMMENT ON TABLE invoices IS 'Facturas de cada organización, relacionadas con sus clientes';
COMMENT ON TABLE audit_logs IS 'Logs de auditoría para trazabilidad de acciones';
COMMENT ON TABLE documents IS 'Documentos y archivos de cada organización';

-- Comentarios en columnas importantes
COMMENT ON COLUMN users.organization_id IS 'ID de la organización a la que pertenece el usuario';
COMMENT ON COLUMN clients.organization_id IS 'ID de la organización propietaria del cliente';
COMMENT ON COLUMN invoices.organization_id IS 'ID de la organización propietaria de la factura';
COMMENT ON COLUMN invoices.client_id IS 'ID del cliente al que pertenece la factura';

-- =====================================================
-- FIN DEL SCHEMA
-- =====================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Schema multi-tenant creado exitosamente';
    RAISE NOTICE '📊 Tablas creadas: organizations, users, clients, invoices, audit_logs, documents';
    RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
    RAISE NOTICE '⚡ Índices optimizados para performance';
    RAISE NOTICE '🔄 Triggers automáticos configurados';
    RAISE NOTICE '📝 Seed data insertado';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Próximos pasos:';
    RAISE NOTICE '1. Crear usuarios en Supabase Auth';
    RAISE NOTICE '2. Insertar usuarios en la tabla users con organization_id';
    RAISE NOTICE '3. Probar las policies de RLS';
    RAISE NOTICE '4. Configurar el frontend con las credenciales';
END $$;

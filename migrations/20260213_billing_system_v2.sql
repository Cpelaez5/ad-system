-- migrations/20260213_billing_system_v2.sql
-- Descripción: Rediseñar payment_methods (global), crear payment_reports, actualizar RLS
-- Autor: Antigravity
-- Fecha: 2026-02-13

-- =====================================================
-- 1. Eliminar tabla payment_methods anterior y recrear
-- (era placeholder con FK a clients, ahora es global)
-- =====================================================
DROP TABLE IF EXISTS payment_methods CASCADE;

CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  name TEXT NOT NULL,                     -- Nombre visible al cliente (ej: "Pago Móvil Venezuela")
  type TEXT NOT NULL
    CHECK (type IN ('mobile_payment', 'bank_transfer', 'zelle', 'binance')),
  description TEXT,                       -- Instrucciones/descripción opcional para el cliente

  -- Configuración
  is_enabled BOOLEAN DEFAULT true,        -- Si está activo para recibir pagos
  charge_igtf BOOLEAN DEFAULT false,      -- Cobrar 3% IGTF adicional

  -- Datos específicos del método (estructura varía por tipo)
  details JSONB NOT NULL DEFAULT '{}',

  -- Soporte: datos de contacto visibles al cliente
  support_phone_prefix TEXT,              -- 0412, 0414, 0416, 0422, 0424, 0426
  support_phone TEXT,                     -- Teléfono de asistencia

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payment_methods IS 'Métodos de pago configurados por super_admin (global del sistema)';
COMMENT ON COLUMN payment_methods.details IS 'JSONB con datos específicos del tipo: mobile_payment={phone,document,bank}, bank_transfer={bank,account_number,beneficiary_name,beneficiary_document,email}, zelle/binance={email,full_name}';
COMMENT ON COLUMN payment_methods.charge_igtf IS 'Si es true, se cobrará al cliente un 3.00% adicional sobre el total del pedido (IGTF)';

-- =====================================================
-- 2. Tabla: payment_reports
-- Reportes de pago enviados por los clientes
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES system_invoices(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),

  -- Datos del pago
  reference TEXT NOT NULL,                -- Número de referencia del pago
  amount DECIMAL(15,2) NOT NULL,          -- Monto reportado
  proof_url TEXT,                         -- URL del comprobante (imagen/PDF en Storage)

  -- Datos del emisor (varía según método de pago)
  sender_details JSONB DEFAULT '{}',
  -- mobile_payment: {sender_phone, sender_document, sender_bank}
  -- bank_transfer/zelle/binance: {} (solo referencia + comprobante)

  -- Estado de validación
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,                  -- Motivo del rechazo (si aplica)

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payment_reports IS 'Reportes de pago enviados por clientes para validación del super_admin';

-- =====================================================
-- 3. RLS: payment_methods (lectura global, gestión super_admin)
-- =====================================================
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede ver métodos habilitados
CREATE POLICY "payment_methods_select_enabled"
  ON payment_methods FOR SELECT
  USING (
    is_enabled = true
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Solo super_admin puede crear, actualizar y eliminar
CREATE POLICY "payment_methods_insert_superadmin"
  ON payment_methods FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "payment_methods_update_superadmin"
  ON payment_methods FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

CREATE POLICY "payment_methods_delete_superadmin"
  ON payment_methods FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- =====================================================
-- 4. RLS: payment_reports
-- =====================================================
ALTER TABLE payment_reports ENABLE ROW LEVEL SECURITY;

-- Cliente puede ver sus propios reportes
CREATE POLICY "payment_reports_select_own"
  ON payment_reports FOR SELECT
  USING (
    client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Cliente puede crear reportes para sus propias facturas
CREATE POLICY "payment_reports_insert_own"
  ON payment_reports FOR INSERT
  WITH CHECK (
    client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
  );

-- Super admin puede actualizar reportes (aprobar/rechazar)
CREATE POLICY "payment_reports_update_superadmin"
  ON payment_reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- =====================================================
-- 5. RLS actualizada: system_invoices (agregar super_admin)
-- =====================================================

-- Super admin puede hacer todo en system_invoices
CREATE POLICY "system_invoices_superadmin_all"
  ON system_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- =====================================================
-- 6. Storage bucket para comprobantes de pago
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-proofs', 'payment-proofs', false, 10485760)  -- 10MB
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage: cliente puede subir, super_admin puede ver
CREATE POLICY "payment_proofs_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "payment_proofs_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

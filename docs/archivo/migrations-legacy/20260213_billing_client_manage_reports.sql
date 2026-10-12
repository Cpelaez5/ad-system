-- migrations/20260213_billing_client_manage_reports.sql
-- Descripción: Permitir al cliente editar/eliminar sus reportes de pago en revisión
--              + agregar require_proof a payment_methods
-- Autor: Antigravity
-- Fecha: 2026-02-13

-- =====================================================
-- 1. Agregar require_proof a payment_methods
-- =====================================================
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS require_proof BOOLEAN DEFAULT false;

COMMENT ON COLUMN payment_methods.require_proof IS 'Si es true, el cliente DEBE adjuntar comprobante de pago (imagen/PDF) al reportar un pago con este método';

-- =====================================================
-- 2. Cliente puede ACTUALIZAR sus propios reportes solo si están en pending_review
-- =====================================================
CREATE POLICY "payment_reports_update_own_pending"
  ON payment_reports FOR UPDATE
  USING (
    client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    AND status = 'pending_review'
  )
  WITH CHECK (
    client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    AND status = 'pending_review'
  );

-- =====================================================
-- 3. Cliente puede ELIMINAR sus propios reportes solo si están en pending_review
-- =====================================================
CREATE POLICY "payment_reports_delete_own_pending"
  ON payment_reports FOR DELETE
  USING (
    client_id IN (SELECT client_id FROM users WHERE id = auth.uid())
    AND status = 'pending_review'
  );

-- =====================================================
-- 4. Super admin puede eliminar cualquier reporte
-- =====================================================
CREATE POLICY "payment_reports_delete_superadmin"
  ON payment_reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- =====================================================
-- 5. Storage: permitir eliminar/reemplazar comprobantes
-- =====================================================
CREATE POLICY "payment_proofs_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "payment_proofs_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-proofs'
    AND auth.role() = 'authenticated'
  );

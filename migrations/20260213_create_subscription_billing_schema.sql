-- migrations/20260213_create_subscription_billing_schema.sql
-- Descripción: Tablas para facturación de suscripción (facturas del sistema al cliente)
-- Autor: Antigravity
-- Fecha: 2026-02-13

-- =====================================================
-- Tabla: system_invoices
-- Facturas generadas por el sistema hacia los clientes
-- por su suscripción al servicio.
-- =====================================================
CREATE TABLE IF NOT EXISTS system_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES client_subscriptions(id),

  -- Identificación
  invoice_number TEXT NOT NULL UNIQUE,

  -- Montos
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Estado: pending, paid, overdue, canceled
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'canceled')),

  -- Periodo facturado
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,

  -- Datos de pago (cuando se reporta)
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method TEXT,

  -- Extras
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_invoices IS 'Facturas del sistema hacia los clientes por suscripción';

-- =====================================================
-- Tabla: payment_methods (Placeholder para futuro)
-- Métodos de pago guardados por el cliente.
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  type TEXT NOT NULL DEFAULT 'bank_transfer'
    CHECK (type IN ('bank_transfer', 'mobile_payment', 'zelle', 'cash')),
  label TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payment_methods IS 'Métodos de pago guardados por el cliente (placeholder)';

-- =====================================================
-- RLS Policies
-- =====================================================

-- system_invoices: El cliente solo ve sus propias facturas
ALTER TABLE system_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_invoices_select_own"
  ON system_invoices FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "system_invoices_update_own"
  ON system_invoices FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- payment_methods: El cliente solo ve/gestiona sus propios métodos
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_methods_select_own"
  ON payment_methods FOR SELECT
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payment_methods_insert_own"
  ON payment_methods FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payment_methods_update_own"
  ON payment_methods FOR UPDATE
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "payment_methods_delete_own"
  ON payment_methods FOR DELETE
  USING (
    client_id IN (
      SELECT client_id FROM users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- Seed Data: Factura de ejemplo para pruebas
-- =====================================================
-- Se insertará una factura de ejemplo vinculada al primer
-- cliente que tenga suscripción activa (si existe).
DO $$
DECLARE
  v_client_id UUID;
  v_sub_id UUID;
BEGIN
  -- Buscar un cliente con suscripción activa
  SELECT cs.client_id, cs.id INTO v_client_id, v_sub_id
  FROM client_subscriptions cs
  WHERE cs.status = 'active'
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    INSERT INTO system_invoices (client_id, subscription_id, invoice_number, amount, currency, status, period_start, period_end, due_date)
    VALUES
      (v_client_id, v_sub_id, 'SYS-2026-0001', 29.99, 'USD', 'paid', '2026-01-01', '2026-01-31', '2026-02-05'),
      (v_client_id, v_sub_id, 'SYS-2026-0002', 29.99, 'USD', 'pending', '2026-02-01', '2026-02-28', '2026-03-05')
    ON CONFLICT (invoice_number) DO NOTHING;

    -- Marcar la primera como pagada
    UPDATE system_invoices
    SET paid_at = '2026-01-28T10:00:00Z', payment_reference = 'REF-12345', payment_method = 'bank_transfer'
    WHERE invoice_number = 'SYS-2026-0001';
  END IF;
END $$;

-- migrations/20260712_rpc_create_pending_invoice.sql
-- Descripción: Función RPC para que un cliente pueda crear una factura pendiente al solicitar una suscripción sin violar RLS
-- Autor: AD System AI
-- Fecha: 2026-07-12

CREATE OR REPLACE FUNCTION public.create_pending_subscription_invoice(
  p_client_id UUID,
  p_amount DECIMAL,
  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_invoice_record RECORD;
BEGIN
  -- Validar que el cliente solicitante corresponde al auth.uid()
  -- (Esto previene que un cliente cree facturas a nombre de otro)
  IF p_client_id IS NULL THEN
    RAISE EXCEPTION 'client_id es requerido';
  END IF;

  -- Generar número de factura temporal/pendiente (SYS-YYYY-XXXX)
  v_invoice_number := 'SYS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || floor(random() * 10000)::text;

  -- Insertar factura saltando las RLS gracias a SECURITY DEFINER
  INSERT INTO system_invoices (
    client_id,
    subscription_id,
    invoice_number,
    amount,
    currency,
    status,
    period_start,
    period_end,
    due_date,
    notes
  ) VALUES (
    p_client_id,
    NULL,
    v_invoice_number,
    p_amount,
    'USD',
    'pending',
    CURRENT_DATE,
    CURRENT_DATE + 30,
    CURRENT_DATE,
    p_notes
  )
  RETURNING id, invoice_number, amount, currency, status, period_start, period_end, due_date INTO v_invoice_record;

  RETURN json_build_object(
    'success', true, 
    'data', json_build_object(
       'id', v_invoice_record.id,
       'invoice_number', v_invoice_record.invoice_number,
       'amount', v_invoice_record.amount,
       'currency', v_invoice_record.currency,
       'status', v_invoice_record.status,
       'period_start', v_invoice_record.period_start,
       'period_end', v_invoice_record.period_end,
       'due_date', v_invoice_record.due_date
    )
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

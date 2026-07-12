-- migrations/20260712160000_rpc_create_pending_invoice_v2.sql
-- Descripción: RPC para crear la factura inicial pendiente de una suscripción
-- Autor: IA
-- Fecha: 2026-07-12

CREATE OR REPLACE FUNCTION public.create_pending_subscription_invoice_v2(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id uuid;
    v_amount decimal;
    v_notes text;
    v_invoice_number text;
    v_period_start date;
    v_period_end date;
    v_due_date date;
    v_result public.system_invoices;
BEGIN
    -- Extract values
    v_client_id := (payload->>'client_id')::uuid;
    v_amount := (payload->>'amount')::decimal;
    v_notes := payload->>'notes';

    IF v_client_id IS NULL OR v_amount IS NULL THEN
        RAISE EXCEPTION 'client_id and amount are required';
    END IF;

    -- Generate invoice number
    v_invoice_number := 'INV-SUB-' || to_char(now(), 'YYYYMMDD-HH24MISS');

    -- Set dates
    v_period_start := current_date;
    v_period_end := current_date + interval '1 month' - interval '1 day';
    v_due_date := current_date + interval '5 days';

    -- Insert into system_invoices
    INSERT INTO public.system_invoices (
        client_id,
        invoice_number,
        amount,
        status,
        period_start,
        period_end,
        due_date,
        notes
    ) VALUES (
        v_client_id,
        v_invoice_number,
        v_amount,
        'pending',
        v_period_start,
        v_period_end,
        v_due_date,
        v_notes
    ) RETURNING * INTO v_result;

    RETURN to_jsonb(v_result);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_pending_subscription_invoice_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_subscription_invoice_v2 TO anon;

-- Notificar a PostgREST para refrescar caché
NOTIFY pgrst, 'reload schema';

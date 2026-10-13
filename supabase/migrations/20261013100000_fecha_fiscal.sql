-- ==============================================================================
-- Migración: 20261013100000_fecha_fiscal.sql
-- Tarea: C1 — Agente Fiscal Venezuela (docs/mvp/manuales/04-agente-fiscal-venezuela.md)
-- Pedido de la contadora (docs/mvp/backlog-contadora-2026-10-12.md, punto 1):
--   "El Libro de Compras suele exportarse según la fecha de emisión de las
--   facturas, pero hay excepciones. Por ejemplo, si una factura emitida en
--   agosto se registra durante la primera quincena de septiembre y su
--   comprobante de retención de IVA se genera con fecha de septiembre, esa
--   operación debe reflejarse en el Libro de Compras de septiembre [...].
--   Se requiere un ítem adicional de fecha usado como referencia para el
--   libro, que podría llamarse «Fecha Fiscal»."
--
-- Regla de backfill / default (confirmada contra el código, no inventada):
--   1. Si la factura tiene retención de IVA, la fecha fiscal es la fecha del
--      comprobante de esa retención:
--        a. financial->>'retentionDate' de la factura (campo que ya existe y
--           alimenta el formulario, ver SimpleInvoiceForm.vue
--           `formData.financial.retentionDate`), o si no está presente/vacío
--        b. retenciones.fecha_comprobante de la fila tipo = 'IVA' asociada
--           (columna agregada en
--           docs/archivo/migrations-legacy/20260831_fix_retention_base_imponible_and_date.sql
--           y usada por retention-pdf-service.js / registrar_compra_con_retenciones).
--   2. Si no hay retención de IVA, la fecha fiscal es la fecha de emisión real
--      de la factura: columna invoices.issue_date (expuesta en el cliente como
--      `issueDate`; ver registrar_compra_con_retenciones, que inserta
--      `issue_date` a partir de `issueDate`).
--
-- NO SE APLICA en este commit (regla 5.0 de 00-REGLAS-COMUNES.md: solo el
-- orquestador aplica migraciones, y siempre después de verificarlas). No se
-- ejecutó ningún SQL de escritura contra la base real para redactar esto; los
-- nombres de columnas se verificaron leyendo el código y las migraciones ya
-- versionadas en el repo (ver referencias arriba).
-- ==============================================================================

-- 1. Columna fecha_fiscal en invoices (nullable: el trigger de abajo la rellena
--    cuando venga NULL; también se puede fijar manualmente desde el formulario,
--    ver SimpleInvoiceForm.vue -> formData.fecha_fiscal, solo en flujo COMPRA).
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS fecha_fiscal DATE;

-- 2. Regla única (corregida por el orquestador tras verificar datos reales:
--    11 compras tienen financial.retentionDate SIN retención de IVA, porque el
--    formulario la prellena con "hoy"; no deben moverse de mes):
--    - VENTA  -> siempre la fecha de emisión.
--    - COMPRA -> si tiene retención de IVA (financial.ivaRetention > 0 o fila en
--               retenciones tipo IVA): fecha del comprobante (retentionDate o
--               retenciones.fecha_comprobante); si no, fecha de emisión.
CREATE OR REPLACE FUNCTION public.calcular_fecha_fiscal(p_invoice_id uuid, p_flow text, p_financial jsonb, p_issue_date date)
RETURNS date
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_ret_iva  numeric := COALESCE(NULLIF(p_financial->>'ivaRetention', '')::numeric, 0);
  v_fecha_ret date;
BEGIN
  IF p_flow IS DISTINCT FROM 'COMPRA' THEN
    RETURN p_issue_date;
  END IF;

  SELECT r.fecha_comprobante INTO v_fecha_ret
    FROM public.retenciones r
   WHERE r.invoice_id = p_invoice_id AND r.tipo = 'IVA' AND r.deleted_at IS NULL
   ORDER BY r.created_at DESC
   LIMIT 1;

  IF v_ret_iva > 0 OR v_fecha_ret IS NOT NULL THEN
    RETURN COALESCE(NULLIF(p_financial->>'retentionDate', '')::date, v_fecha_ret, p_issue_date);
  END IF;

  RETURN p_issue_date;
END;
$$;

-- 3. Backfill histórico (una sola vez).
UPDATE public.invoices i
   SET fecha_fiscal = public.calcular_fecha_fiscal(i.id, i.flow, i.financial, i.issue_date)
 WHERE i.fecha_fiscal IS NULL;

-- 4. Trigger: ventas siempre con la fecha de emisión; compras respetan un valor
--    manual y, si viene NULL, se calcula con la regla.
CREATE OR REPLACE FUNCTION public.set_fecha_fiscal_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.flow IS DISTINCT FROM 'COMPRA' THEN
    NEW.fecha_fiscal := NEW.issue_date;
  ELSIF NEW.fecha_fiscal IS NULL THEN
    NEW.fecha_fiscal := public.calcular_fecha_fiscal(NEW.id, NEW.flow, NEW.financial, NEW.issue_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_fecha_fiscal ON public.invoices;
CREATE TRIGGER trg_set_fecha_fiscal
BEFORE INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_fecha_fiscal_default();

REVOKE EXECUTE ON FUNCTION public.set_fecha_fiscal_default() FROM PUBLIC, anon, authenticated;

COMMENT ON COLUMN public.invoices.fecha_fiscal IS
  'Mes en que la operación se declara en el Libro de Compras: fecha del comprobante de retención de IVA si existe; si no, la de emisión. Ventas: siempre la de emisión. Ver docs/mvp/backlog-contadora-2026-10-12.md punto 1.';

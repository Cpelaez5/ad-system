-- ============================================================================
-- Reproceso SUPERVISADO: compras de mercancía vigentes sin movimiento de inventario
-- ----------------------------------------------------------------------------
-- Contexto: antes del arreglo de 2026-10-14, las compras guardadas por el RPC
-- registrar_compra_con_retenciones no sumaban stock. Este script:
--   PASO 1 (SELECT): lista las compras afectadas y sus líneas.
--   PASO 2 (SELECT): líneas que NO se pueden reprocesar (sin product_id).
--   PASO 3 (comentado): crea los IN_PURCHASE faltantes y suma el stock, en una
--                       transacción. Revisa PASO 1 y 2 antes de descomentar.
-- NO se ejecuta solo. Revisar, descomentar el PASO 3 y correrlo a mano.
--
-- Criterio de "compra afectada":
--   flow = 'COMPRA', expense_type = 'COMPRA', deleted_at IS NULL,
--   status NOT IN ('BORRADOR','ANULADA') y SIN ningún movimiento con reference_id = factura.
-- Las líneas con quantity <= 0 o sin product_id se ignoran (ver PASO 2).
-- ============================================================================

-- PASO 1: compras de mercancía vigentes sin movimiento, con sus líneas reprocesables
SELECT
  i.id                       AS invoice_id,
  i.invoice_number,
  i.status,
  i.issue_date,
  i.client_id,
  (it.value ->> 'product_id')::uuid            AS product_id,
  p.name                                       AS producto,
  p.stock                                      AS stock_actual,
  (it.value ->> 'quantity')::numeric           AS cantidad,
  (it.value ->> 'unitPrice')::numeric          AS costo_unitario
FROM invoices i
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.items, '[]'::jsonb)) AS it(value)
LEFT JOIN inventory_products p ON p.id = (it.value ->> 'product_id')::uuid
WHERE i.flow = 'COMPRA'
  AND i.expense_type = 'COMPRA'
  AND i.deleted_at IS NULL
  AND i.status NOT IN ('BORRADOR', 'ANULADA')
  AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.reference_id = i.id)
  AND COALESCE(it.value ->> 'product_id', '') <> ''
  AND COALESCE((it.value ->> 'quantity')::numeric, 0) > 0
  AND COALESCE(p.tipo, 'producto') <> 'servicio'
ORDER BY i.issue_date, i.invoice_number;

-- PASO 2: líneas de esas mismas compras que NO se pueden reprocesar solas
-- (texto libre sin product_id: hay que crear/elegir el producto a mano)
SELECT
  i.id AS invoice_id,
  i.invoice_number,
  i.status,
  it.value ->> 'description'              AS descripcion,
  (it.value ->> 'quantity')::numeric      AS cantidad,
  (it.value ->> 'unitPrice')::numeric     AS costo_unitario
FROM invoices i
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.items, '[]'::jsonb)) AS it(value)
WHERE i.flow = 'COMPRA'
  AND i.expense_type = 'COMPRA'
  AND i.deleted_at IS NULL
  AND i.status NOT IN ('BORRADOR', 'ANULADA')
  AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.reference_id = i.id)
  AND COALESCE(it.value ->> 'product_id', '') = ''
  AND COALESCE((it.value ->> 'isInventory')::boolean, false) = true
ORDER BY i.issue_date, i.invoice_number;

-- PASO 3: aplicar (DESCOMENTAR SOLO TRAS REVISAR LOS PASOS 1 Y 2)
--
-- BEGIN;
--
-- -- 3a. Líneas a reprocesar, agrupadas por factura y producto
-- CREATE TEMP TABLE _reproceso ON COMMIT DROP AS
-- SELECT
--   i.id                          AS invoice_id,
--   i.invoice_number,
--   i.organization_id,
--   p.client_id                   AS client_id,
--   p.id                          AS product_id,
--   SUM((it.value ->> 'quantity')::numeric)        AS cantidad,
--   -- costo: el de la última línea de ese producto en la factura
--   (array_agg((it.value ->> 'unitPrice')::numeric ORDER BY it.ord DESC))[1] AS costo
-- FROM invoices i
-- CROSS JOIN LATERAL jsonb_array_elements(COALESCE(i.items, '[]'::jsonb)) WITH ORDINALITY AS it(value, ord)
-- JOIN inventory_products p ON p.id = (it.value ->> 'product_id')::uuid
-- WHERE i.flow = 'COMPRA'
--   AND i.expense_type = 'COMPRA'
--   AND i.deleted_at IS NULL
--   AND i.status NOT IN ('BORRADOR', 'ANULADA')
--   AND NOT EXISTS (SELECT 1 FROM inventory_movements m WHERE m.reference_id = i.id)
--   AND COALESCE(it.value ->> 'product_id', '') <> ''
--   AND COALESCE((it.value ->> 'quantity')::numeric, 0) > 0
--   AND COALESCE(p.tipo, 'producto') <> 'servicio'
-- GROUP BY i.id, i.invoice_number, i.organization_id, p.client_id, p.id;
--
-- -- 3b. Movimientos IN_PURCHASE que faltan
-- INSERT INTO inventory_movements
--   (organization_id, client_id, product_id, movement_type, quantity, cost_price, reference_id, description)
-- SELECT organization_id, client_id, product_id, 'IN_PURCHASE', cantidad, costo, invoice_id,
--        'Reproceso supervisado: Compra Ref: ' || invoice_number
-- FROM _reproceso;
--
-- -- 3c. Sumar al stock del producto (y costo, como hace registerMovement en IN_PURCHASE)
-- UPDATE inventory_products p
-- SET stock = COALESCE(p.stock, 0) + r.total,
--     cost_price = CASE WHEN r.costo_ultimo > 0 THEN r.costo_ultimo ELSE p.cost_price END
-- FROM (
--   SELECT product_id, SUM(cantidad) AS total,
--          (array_agg(costo ORDER BY invoice_id DESC))[1] AS costo_ultimo
--   FROM _reproceso GROUP BY product_id
-- ) r
-- WHERE p.id = r.product_id;
--
-- -- 3d. Verificación antes de confirmar: debe listar los mismos productos y cantidades del PASO 1
-- SELECT invoice_number, product_id, cantidad FROM _reproceso ORDER BY invoice_number;
--
-- -- Si todo cuadra: COMMIT;   si no: ROLLBACK;
-- ROLLBACK;

-- migrations/20260213_add_balance_to_clients.sql
-- Descripción: Agregar columna balance a la tabla clients para manejar créditos y saldos a favor
-- Autor: Antigravity
-- Fecha: 2026-02-13

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'balance') THEN
        ALTER TABLE clients ADD COLUMN balance DECIMAL(15,2) DEFAULT 0.00;
        COMMENT ON COLUMN clients.balance IS 'Saldo a favor del cliente (créditos por sobrepago)';
    END IF;
END $$;

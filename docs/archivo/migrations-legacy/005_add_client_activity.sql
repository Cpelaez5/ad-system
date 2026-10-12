ALTER TABLE clients ADD COLUMN IF NOT EXISTS activity_type TEXT CHECK (activity_type IN ('goods', 'manufacturing', 'services'));

COMMENT ON COLUMN clients.activity_type IS 'Tipo de actividad: goods (Compra/Venta), manufacturing (Fabricación), services (Servicios)';

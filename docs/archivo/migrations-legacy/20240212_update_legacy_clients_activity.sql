-- Actualizar clientes existentes sin tipo de actividad definido
-- Se asume 'goods' (Bienes) para habilitar el módulo de inventario por defecto
UPDATE clients 
SET activity_type = 'goods' 
WHERE activity_type IS NULL OR activity_type = '';

-- Asegurar que la columna tenga un default para futuros registros
ALTER TABLE clients 
ALTER COLUMN activity_type SET DEFAULT 'goods';

-- migrations/011_conceptos_islr_seniat_catalog.sql
-- Descripción: Catálogo completo oficial del SENIAT para conceptos de Retención de ISLR (Decreto 1808).
--              Garantiza disponibilidad de opciones tributarias tanto para personas naturales como jurídicas.
-- Autor: AD System
-- Fecha: 2026-08-19

-- 1. Ampliación de columnas en tabla conceptos_islr
ALTER TABLE conceptos_islr
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS aplica_persona TEXT DEFAULT 'AMBOS' CHECK (aplica_persona IN ('NATURAL', 'JURIDICA', 'AMBOS'));

CREATE INDEX IF NOT EXISTS idx_conceptos_islr_codigo ON conceptos_islr (codigo);
CREATE INDEX IF NOT EXISTS idx_conceptos_islr_aplica ON conceptos_islr (aplica_persona);

-- 2. Poblar catálogo oficial SENIAT (Decreto 1808)
INSERT INTO conceptos_islr (codigo, nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, aplica_persona, is_active)
VALUES
  ('001', 'Honorarios Profesionales a Personas Naturales Residentes', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('002', 'Honorarios Profesionales pagados a Personas Jurídicas Domiciliadas', 100, 5.00, 0, 0, 'JURIDICA', true),
  ('003', 'Servicios Generales y Mantenimiento a Personas Jurídicas', 100, 2.00, 0, 0, 'JURIDICA', true),
  ('004', 'Servicios Generales y Mantenimiento a Personas Naturales', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('005', 'Servicios de Publicidad y Propaganda a Personas Jurídicas', 100, 5.00, 0, 0, 'JURIDICA', true),
  ('006', 'Servicios de Publicidad y Propaganda a Personas Naturales', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('007', 'Comisiones Mercantiles a Personas Jurídicas', 100, 5.00, 0, 0, 'JURIDICA', true),
  ('008', 'Comisiones Mercantiles a Personas Naturales', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('009', 'Fletes y Transporte de Carga a Personas Jurídicas', 100, 3.00, 0, 0, 'JURIDICA', true),
  ('010', 'Fletes y Transporte de Carga a Personas Naturales', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('011', 'Arrendamiento de Bienes Inmuebles a Personas Jurídicas', 100, 5.00, 0, 0, 'JURIDICA', true),
  ('012', 'Arrendamiento de Bienes Inmuebles a Personas Naturales', 100, 3.00, 83.33, 0, 'NATURAL', true),
  ('013', 'Ejecución de Obras y Construcciones (Contratistas)', 100, 2.00, 0, 0, 'AMBOS', true)
ON CONFLICT DO NOTHING;

-- 3. Habilitar lectura pública de catálogos para todos los usuarios autenticados
ALTER TABLE conceptos_islr ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conceptos_islr_read_all" ON conceptos_islr;
CREATE POLICY "conceptos_islr_read_all" ON conceptos_islr
  FOR SELECT TO authenticated USING (true);

ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "municipios_read_all" ON municipios;
CREATE POLICY "municipios_read_all" ON municipios
  FOR SELECT TO authenticated USING (true);

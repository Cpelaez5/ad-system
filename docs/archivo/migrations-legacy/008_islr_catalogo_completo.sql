-- migrations/008_islr_catalogo_completo.sql
-- Descripción: Enriquecer catálogo de conceptos ISLR con códigos SENIAT oficiales,
--              filtro por tipo de persona (Natural/Jurídica) y conceptos del Decreto 1.808.
-- Autor: AD System
-- Fecha: 2026-08-19

-- ════════════════════════════════════════════════════════════════════════
-- 1. Agregar campos faltantes a conceptos_islr
-- ════════════════════════════════════════════════════════════════════════

ALTER TABLE conceptos_islr
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS aplica_persona TEXT DEFAULT 'AMBAS'
    CHECK (aplica_persona IN ('NATURAL', 'JURIDICA', 'AMBAS')),
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- ════════════════════════════════════════════════════════════════════════
-- 2. Actualizar los 2 registros existentes con sus códigos
-- ════════════════════════════════════════════════════════════════════════

UPDATE conceptos_islr
  SET codigo = '054',
      aplica_persona = 'NATURAL',
      descripcion = 'Retención por honorarios profesionales a personas naturales residentes (Art. 9 Decreto 1.808)'
  WHERE nombre = 'Honorarios Profesionales (Natural Residentes)';

UPDATE conceptos_islr
  SET codigo = '055',
      aplica_persona = 'JURIDICA',
      descripcion = 'Retención por servicios generales prestados por personas jurídicas (Art. 9 Decreto 1.808)'
  WHERE nombre = 'Servicios Generales (Jurídico)';

-- ════════════════════════════════════════════════════════════════════════
-- 3. Insertar conceptos adicionales del Decreto 1.808
--    Formato: (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut,
--              monto_minimo_ut, codigo, aplica_persona, descripcion)
-- ════════════════════════════════════════════════════════════════════════

-- Honorarios Profesionales — Jurídica (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Honorarios Profesionales (Jurídica)', 100, 5, 0, 0, '053', 'JURIDICA',
       'Retención por honorarios profesionales a personas jurídicas (Art. 9 Decreto 1.808)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '053');

-- Honorarios Profesionales No Mercantiles — Natural (3% sobre 90%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Honorarios Prof. No Mercantiles (Natural)', 90, 3, 83.33, 0, '046', 'NATURAL',
       'Retención por honorarios profesionales no mercantiles a personas naturales (Art. 9 Decreto 1.808)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '046');

-- Comisiones Mercantiles — Jurídica (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Comisiones Mercantiles (Jurídica)', 100, 5, 0, 0, '012', 'JURIDICA',
       'Retención por comisiones mercantiles a personas jurídicas (Art. 9 Decreto 1.808)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '012');

-- Comisiones Mercantiles — Natural (3%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Comisiones Mercantiles (Natural)', 100, 3, 83.33, 0, '011', 'NATURAL',
       'Retención por comisiones mercantiles a personas naturales (Art. 9 Decreto 1.808)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '011');

-- Transporte / Flete — Ambas (2%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Transporte / Flete', 100, 2, 0, 0, '060', 'AMBAS',
       'Retención por servicios de transporte de bienes, flete terrestre o marítimo (Art. 9 Decreto 1.808)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '060');

-- Telecomunicaciones — Ambas (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Servicios de Telecomunicaciones', 100, 5, 0, 0, '061', 'AMBAS',
       'Retención por servicios de telecomunicaciones (teléfono, internet, etc.)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '061');

-- Alquiler de Bienes Muebles — Ambas (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Alquiler de Bienes Muebles', 100, 5, 0, 0, '066', 'AMBAS',
       'Retención por alquiler o arrendamiento de bienes muebles'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '066');

-- Alquiler de Bienes Inmuebles — Natural (5%, sustraendo)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Alquiler de Bienes Inmuebles (Natural)', 100, 5, 83.33, 0, '065', 'NATURAL',
       'Retención por arrendamiento de bienes inmuebles a personas naturales'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '065');

-- Alquiler de Bienes Inmuebles — Jurídica (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Alquiler de Bienes Inmuebles (Jurídica)', 100, 5, 0, 0, '064', 'JURIDICA',
       'Retención por arrendamiento de bienes inmuebles a personas jurídicas'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '064');

-- Aseo Urbano / Limpieza — Ambas (2%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Aseo Urbano / Limpieza', 100, 2, 0, 0, '059', 'AMBAS',
       'Retención por servicios de aseo urbano, limpieza, mantenimiento y saneamiento'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '059');

-- Servicios Técnicos / Asistencia Técnica — Jurídica (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Servicios Técnicos / Asistencia Técnica (Jurídica)', 100, 5, 0, 0, '062', 'JURIDICA',
       'Retención por servicios técnicos y asistencia técnica prestados por personas jurídicas'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '062');

-- Servicios Técnicos / Asistencia Técnica — Natural (3%, sustraendo)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Servicios Técnicos / Asistencia Técnica (Natural)', 100, 3, 83.33, 0, '063', 'NATURAL',
       'Retención por servicios técnicos y asistencia técnica prestados por personas naturales'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '063');

-- Publicidad y Propaganda — Jurídica (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Publicidad y Propaganda (Jurídica)', 100, 5, 0, 0, '048', 'JURIDICA',
       'Retención por servicios de publicidad y propaganda prestados por personas jurídicas'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '048');

-- Publicidad y Propaganda — Natural (3%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Publicidad y Propaganda (Natural)', 100, 3, 83.33, 0, '047', 'NATURAL',
       'Retención por servicios de publicidad y propaganda prestados por personas naturales'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '047');

-- Seguros y Reaseguros — Ambas (5%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Seguros y Reaseguros', 100, 5, 0, 0, '068', 'AMBAS',
       'Retención por primas de seguro y reaseguro'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '068');

-- Contratistas de Obras — Jurídica (2%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Contratistas de Obras (Jurídica)', 100, 2, 0, 0, '056', 'JURIDICA',
       'Retención por ejecución de obras y servicios de construcción (persona jurídica)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '056');

-- Contratistas de Obras — Natural (2%, sustraendo)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Contratistas de Obras (Natural)', 100, 2, 83.33, 0, '057', 'NATURAL',
       'Retención por ejecución de obras y servicios de construcción (persona natural)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '057');

-- Servicios No Domiciliados en Venezuela (No residentes) — Ambas (34%)
INSERT INTO conceptos_islr (nombre, porcentaje_base, porcentaje_retencion, sustraendo_ut, monto_minimo_ut, codigo, aplica_persona, descripcion)
SELECT 'Servicios a No Domiciliados (No Residentes)', 100, 34, 0, 0, '069', 'AMBAS',
       'Retención por pagos a beneficiarios no domiciliados ni residentes en Venezuela (Art. 52 LISLR)'
WHERE NOT EXISTS (SELECT 1 FROM conceptos_islr WHERE codigo = '069');

-- Habilitar extensión de cifrado
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla de configuración del proveedor IA
CREATE TABLE ai_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL DEFAULT 'gemini',
  -- Siempre usar el string de preview hasta que exista versión stable
  model             TEXT NOT NULL DEFAULT 'gemini-3.1-pro-preview',
  -- La llave NUNCA se guarda en texto plano.
  -- Cifrada con pgcrypto. Si Vault está habilitado, usar vault.secrets directamente.
  encrypted_api_key BYTEA NOT NULL,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  -- Últimos 4 caracteres para mostrar en UI sin exponer la llave completa
  key_suffix        TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: solo superadmin puede leer/escribir configuración de IA
ALTER TABLE ai_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "superadmin_only" ON ai_settings
  USING (auth.jwt() ->> 'role' = 'superadmin');

-- -------------------------------------------------------
-- Auditoría de uso: registra éxitos Y errores
-- -------------------------------------------------------
CREATE TABLE ai_usage_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id),
  provider          TEXT NOT NULL,
  model             TEXT NOT NULL,
  -- Estado de la operación — SIEMPRE se registra, haya éxito o error
  status            TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_code        TEXT,        -- 'TIMEOUT' | 'QUOTA_EXCEEDED' | 'INVALID_KEY' | 'PARSE_ERROR' | etc.
  error_message     TEXT,        -- Mensaje técnico para debugging
  -- Solo se pueblan cuando status = 'success'
  tokens_prompt     INTEGER,
  tokens_completion INTEGER,
  costo_estimado    NUMERIC(10, 6),
  -- Vínculo con el sistema contable
  comprobante_id    UUID,        -- FK a la tabla de comprobantes del sistema contable
  moneda_detectada  TEXT,        -- 'USD' | 'Bs' | NULL si no pudo detectarse
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para consultas del dashboard de superadmin
CREATE INDEX ON ai_usage_logs (user_id, created_at DESC);
CREATE INDEX ON ai_usage_logs (status, created_at DESC);

-- -------------------------------------------------------
-- Lock de concurrencia: 1 OCR activo por usuario a la vez
-- -------------------------------------------------------
CREATE TABLE ai_ocr_locks (
  user_id   UUID PRIMARY KEY REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_path TEXT NOT NULL
);

-- Auto-cleanup de locks huérfanos (por si la Edge Function murió sin liberar)
-- Un lock de más de 5 minutos se considera huérfano
CREATE INDEX ON ai_ocr_locks (locked_at);

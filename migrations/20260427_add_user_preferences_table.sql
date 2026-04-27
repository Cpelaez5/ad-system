-- migrations/20260427_add_user_preferences_table.sql
-- Descripción: Tabla para preferencias de usuario, incluyendo layout del dashboard (Swapy)
-- Autor: AI Assistant
-- Fecha: 2026-04-27

-- Tabla de preferencias de usuario (genérica, extensible)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un usuario solo puede tener UNA preferencia por clave dentro de una org
  UNIQUE(user_id, organization_id, preference_key)
);

-- Comentario descriptivo
COMMENT ON TABLE user_preferences IS 'Preferencias personalizadas por usuario: dashboard layout (Swapy), temas, filtros guardados, etc.';
COMMENT ON COLUMN user_preferences.preference_key IS 'Clave de la preferencia, ej: dashboard_layout, theme, default_filters';
COMMENT ON COLUMN user_preferences.preference_value IS 'Valor JSON de la preferencia. Para dashboard_layout: { "insights": "insights", "actividad": "actividad", ... }';

-- Índice para búsquedas rápidas por usuario + clave
CREATE INDEX idx_user_preferences_lookup ON user_preferences(user_id, preference_key);

-- Habilitar RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Cada usuario solo ve sus propias preferencias
CREATE POLICY "user_preferences_select" ON user_preferences
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- Política INSERT: Cada usuario solo puede insertar sus propias preferencias
CREATE POLICY "user_preferences_insert" ON user_preferences
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- Política UPDATE: Cada usuario solo puede actualizar sus propias preferencias
CREATE POLICY "user_preferences_update" ON user_preferences
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- Política DELETE: Cada usuario solo puede eliminar sus propias preferencias
CREATE POLICY "user_preferences_delete" ON user_preferences
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_timestamp();

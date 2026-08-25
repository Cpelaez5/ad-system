-- Migración: Convertir ai_settings en ai_provider_profiles y permitir múltiples perfiles
-- Soporta el patrón de adaptador para usar Gemini, DeepSeek, etc.

-- 1. Renombrar la tabla principal creada en la migración anterior
ALTER TABLE ai_settings RENAME TO ai_provider_profiles;

-- 2. Añadir nombre descriptivo para el perfil (ej. "Gemini Producción", "Deepseek Respaldo")
ALTER TABLE ai_provider_profiles 
ADD COLUMN profile_name TEXT NOT NULL DEFAULT 'Perfil Principal';

-- 3. Crear índice parcial único para garantizar que solo un perfil esté activo
CREATE UNIQUE INDEX idx_only_one_active_profile 
ON ai_provider_profiles (is_active) 
WHERE is_active = true;

-- (Opcional) Actualizar políticas RLS si dependían del nombre de la tabla (no en este caso ya que la sintaxis de alter table actualiza dependencias simples, pero por seguridad)
DROP POLICY IF EXISTS "superadmin_only" ON ai_provider_profiles;

CREATE POLICY "superadmin_only" ON ai_provider_profiles
  USING (auth.jwt() ->> 'role' = 'superadmin');

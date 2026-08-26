-- 20260825_update_ai_model_to_flash.sql
-- Optimización: Cambiar el modelo de Gemini por defecto a gemini-3.7-flash para 
-- acelerar enormemente el OCR (el backend desactiva automáticamente el "thinking_level"
-- si el nombre del modelo no incluye "pro").

UPDATE ai_provider_profiles 
SET model = 'gemini-3.7-flash' 
WHERE provider = 'gemini';

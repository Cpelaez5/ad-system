-- Crear bucket privado temp_ocr
INSERT INTO storage.buckets (id, name, public) 
VALUES ('temp_ocr', 'temp_ocr', false)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en storage.objects si no lo está (usualmente ya lo está en Supabase)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuarios autenticados solo pueden subir archivos a una carpeta con su user_id
CREATE POLICY "Usuarios pueden subir a su propia carpeta en temp_ocr" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'temp_ocr' 
  AND (auth.uid())::text = (string_to_array(name, '/'))[1]
);

-- Política 2: El rol de servicio (Edge Functions) puede leer y borrar todo
CREATE POLICY "Service role tiene acceso total a temp_ocr" 
ON storage.objects FOR ALL 
TO service_role 
USING (bucket_id = 'temp_ocr') 
WITH CHECK (bucket_id = 'temp_ocr');

-- =====================================================================
-- Fase 0 · Storage paso 2: buckets documents e invoices privados.
-- Aplicar SOLO después de publicar el frontend que usa URLs firmadas
-- (commit dc32c11). Las URLs públicas antiguas dejan de funcionar; el
-- frontend extrae la ruta de ellas y firma una URL nueva al mostrarlas.
-- =====================================================================
UPDATE storage.buckets SET public = false WHERE id IN ('documents', 'invoices');

ALTER TABLE public.clients ALTER COLUMN municipio_id TYPE text USING municipio_id::text;
ALTER TABLE public.proveedores ALTER COLUMN municipio_id TYPE text USING municipio_id::text;

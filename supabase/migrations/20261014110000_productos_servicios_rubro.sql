-- Productos y SERVICIOS en el mismo catálogo, con datos esenciales comunes y datos
-- propios del rubro del negocio (ver docs/mvp/diseno/productos-y-servicios.md).
-- Aditivo: los registros existentes quedan como 'producto'. Sin FK nuevas.

alter table public.inventory_products
  add column if not exists tipo text not null default 'producto',
  add column if not exists categoria text,
  add column if not exists marca text,
  add column if not exists codigo_barras text,
  add column if not exists atributos jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'inventory_products_tipo_check') then
    alter table public.inventory_products
      add constraint inventory_products_tipo_check check (tipo in ('producto', 'servicio'));
  end if;
end $$;

comment on column public.inventory_products.tipo is 'producto (lleva stock) o servicio (no lleva stock).';
comment on column public.inventory_products.atributos is 'Datos propios del rubro: talla, color, vencimiento, principio activo, duración… (src/constants/rubros.js).';

create index if not exists inventory_products_client_tipo_idx on public.inventory_products (client_id, tipo) where deleted_at is null;

-- Rubro del negocio: decide qué campos extra pide el formulario de productos.
alter table public.clients add column if not exists rubro text;
comment on column public.clients.rubro is 'Rubro comercial (bodega, farmacia, moda, ferreteria, electronica, comida, papeleria, mascotas, belleza, servicios, otro).';

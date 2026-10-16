-- Advisor de seguridad: función con search_path mutable.
create or replace function public.soporte_numero_ticket(p_n bigint)
returns text language sql immutable set search_path = public as $$
  select case when p_n is null then '' else 'AD-' || lpad(p_n::text, 4, '0') end;
$$;

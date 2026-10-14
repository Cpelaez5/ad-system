-- Un mismo RIF no puede repetirse entre los proveedores activos de una empresa
-- (hallazgo de la revisión de la ola F2b: solo el código lo impedía).
-- Se compara el RIF normalizado (sin guiones, espacios ni puntos, en mayúsculas)
-- y solo para RIF con formato SENIAT válido (letra + 9 dígitos): los registros de
-- prueba con RIF inventados quedan fuera y no se modifican.
create unique index if not exists proveedores_client_rif_unico
  on public.proveedores (client_id, upper(regexp_replace(rif, '[^A-Za-z0-9]', '', 'g')))
  where deleted_at is null
    and upper(regexp_replace(rif, '[^A-Za-z0-9]', '', 'g')) ~ '^[VEJPGC][0-9]{9}$';

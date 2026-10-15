-- Tarifa de la acción 'papel' (Mis papeles: leer un permiso/licencia/solvencia con IA).
insert into public.ia_tarifas (accion, creditos, descripcion) values
  ('papel', 1, 'Llenar un papel de Mis papeles con su foto o PDF')
on conflict (accion) do nothing;

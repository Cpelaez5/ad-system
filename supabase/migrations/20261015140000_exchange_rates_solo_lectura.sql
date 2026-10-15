-- SEGURIDAD: exchange_rates es la tabla GLOBAL de tasas que usan todos los negocios.
-- Tenía "Enable all access for authenticated users" (FOR ALL USING true): cualquier
-- usuario con sesión podía escribir, cambiar o borrar tasas de todos. Desde el
-- 2026-10-15 la llena la función tasas-diarias (service_role, no pasa por RLS), así
-- que los usuarios solo leen; el super admin puede corregir.
drop policy if exists "Enable all access for authenticated users" on public.exchange_rates;

drop policy if exists exchange_rates_leer on public.exchange_rates;
create policy exchange_rates_leer on public.exchange_rates for select to authenticated using (true);

drop policy if exists exchange_rates_super_admin on public.exchange_rates;
create policy exchange_rates_super_admin on public.exchange_rates for all to authenticated
  using (public.get_current_user_role() = 'super_admin')
  with check (public.get_current_user_role() = 'super_admin');

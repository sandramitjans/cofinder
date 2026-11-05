-- Cofinder · familia de cada mesa del evento (05/11/2026)
-- Ejecutar una vez DESPUÉS de 2026-11-mesas.sql. Es aditivo: añade una columna y actualiza las funciones.
alter table public.mesa_topics add column if not exists family text not null default ''
  check (family in ('', 'acquisition', 'brand', 'customer', 'data', 'business'));

drop function if exists public.list_mesa_topics();
create function public.list_mesa_topics()
returns table (label text, proposer text, description text, family text)
language sql
stable
security definer
set search_path = public
as $$
  select m.label, m.proposer, m.description, m.family from public.mesa_topics m order by m.created_at
$$;

drop function if exists public.mod_add_mesa_topic(text, text, text, text);
create or replace function public.mod_add_mesa_topic(p_pin text, p_label text, p_proposer text, p_description text, p_family text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  v := public.mod_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  insert into public.mesa_topics (label, proposer, description, family)
  values (btrim(p_label), btrim(coalesce(p_proposer, '')), btrim(coalesce(p_description, '')), coalesce(p_family, ''))
  on conflict (lower(btrim(label))) do update
    set proposer = excluded.proposer, description = excluded.description, family = excluded.family;
  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.list_mesa_topics() from public;
revoke all on function public.mod_add_mesa_topic(text, text, text, text, text) from public;
grant execute on function public.list_mesa_topics() to anon, authenticated;
grant execute on function public.mod_add_mesa_topic(text, text, text, text, text) to anon, authenticated;

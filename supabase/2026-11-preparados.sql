-- Cofinder · «Preparado» y mis mesas de todas las rondas (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-acceso-movil.sql.
-- Se puede ejecutar varias veces sin problema.
--
-- Día del evento: tras entrar con su código, cada persona ve en el móvil las mesas que le tocan en
-- todas las rondas y pulsa «Preparado». El panel del admin cuenta quién está preparado y, cuando
-- lo están todos, empieza la ronda 1.

alter table public.participants add column if not exists ready_at timestamptz;

-- El participante marca (o desmarca) que está preparado
create or replace function public.set_my_ready(p_id uuid, p_ready boolean)
returns jsonb language plpgsql security definer set search_path = public, private as $$
begin
  update public.participants set ready_at = case when p_ready then now() else null end
  where id = p_id and not removed;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- El admin vuelve a poner a todos como «no preparados» (al reiniciar la sesión)
create or replace function public.mod_reset_ready(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  update public.participants set ready_at = null where ready_at is not null;
  return jsonb_build_object('ok', true);
end $$;

-- Su mesa de la ronda en curso y sus compañeros (como antes) + «plan»: su mesa y tema en cada
-- ronda (sin compañeros) + «ready»: si ya pulsó «Preparado»
create or replace function public.get_my_table(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare
  e private.event_state;
  cur jsonb;
  tbl jsonb;
  seated boolean;
  me public.participants;
begin
  select * into me from public.participants where id = p_id and not removed;
  if me.id is null then return null; end if;
  select * into e from private.event_state where id = 1;
  seated := exists (
    select 1 from jsonb_array_elements(e.rounds) r, jsonb_array_elements(coalesce(r -> 'tables', '[]')) t
    where (t -> 'members') ? p_id::text);
  if e.round > 0 then
    cur := e.rounds -> (e.round - 1);
    select t into tbl from jsonb_array_elements(coalesce(cur -> 'tables', '[]')) t
    where (t -> 'members') ? p_id::text limit 1;
  end if;
  return jsonb_build_object(
    'round', e.round,
    'finished', e.finished,
    'startedAt', cur -> 'startedAt',
    'seatedEver', seated,
    'table', tbl,
    'ready', me.ready_at is not null,
    'plan', coalesce((
      select jsonb_agg(jsonb_build_object('round', r.n, 'table', t -> 'id', 'topic', t -> 'topic') order by r.n)
      from jsonb_array_elements(e.rounds) with ordinality r(v, n), jsonb_array_elements(coalesce(r.v -> 'plan', '[]')) t
      where (t -> 'members') ? p_id::text), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(private.public_row(p)) from public.participants p
      where tbl is not null and not p.removed and (tbl -> 'members') ? p.id::text), '[]'::jsonb)
  );
end $$;

do $$
declare f text;
begin
  foreach f in array array['set_my_ready(uuid, boolean)', 'mod_reset_ready(text)', 'get_my_table(uuid)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

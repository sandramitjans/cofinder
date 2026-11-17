-- Cofinder · esperas con progreso en el móvil (05/11/2026)
-- Ejecutar una vez en el SQL Editor de Supabase, después de 2026-11-notas-audio.sql. Se puede repetir.
--
-- get_my_table devuelve además «progress»: cuántas personas están preparadas y cuántas han enviado su
-- nota en la ronda actual (solo números, sin nombres), para mostrar «14 de 20» en las esperas del móvil.

create or replace function public.get_my_table(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare
  e private.event_state;
  cur jsonb;
  tbl jsonb;
  seated boolean;
  me public.participants;
  first_ids uuid[];
  round_ids uuid[];
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
  -- Para las esperas del móvil: cuántas personas reales están preparadas / han enviado su nota (solo números)
  select coalesce(array_agg(distinct m::uuid), '{}') into first_ids
  from jsonb_array_elements(coalesce(e.rounds -> 0 -> 'plan', '[]')) t, jsonb_array_elements_text(t -> 'members') m;
  select coalesce(array_agg(distinct m::uuid), '{}') into round_ids
  from jsonb_array_elements(coalesce(cur -> 'tables', '[]')) t, jsonb_array_elements_text(t -> 'members') m;
  return jsonb_build_object(
    'progress', jsonb_build_object(
      'ready', (select count(*) from public.participants p where p.id = any(first_ids) and not p.demo and not p.removed and p.ready_at is not null),
      'readyTotal', (select count(*) from public.participants p where p.id = any(first_ids) and not p.demo and not p.removed),
      'noted', (select count(*) from public.participants p join public.audio_notes n on n.participant_id = p.id and n.round = e.round
                where p.id = any(round_ids) and not p.demo and not p.removed),
      'notedTotal', (select count(*) from public.participants p where p.id = any(round_ids) and not p.demo and not p.removed)),
    'round', e.round,
    'finished', e.finished,
    'startedAt', cur -> 'startedAt',
    'seatedEver', seated,
    'table', tbl,
    'ready', me.ready_at is not null,
    'notes', coalesce((select jsonb_agg(n.round) from public.audio_notes n where n.participant_id = p_id), '[]'::jsonb),
    'plan', coalesce((
      select jsonb_agg(jsonb_build_object('round', r.n, 'table', t -> 'id', 'topic', t -> 'topic') order by r.n)
      from jsonb_array_elements(e.rounds) with ordinality r(v, n), jsonb_array_elements(coalesce(r.v -> 'plan', '[]')) t
      where (t -> 'members') ? p_id::text), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(private.public_row(p)) from public.participants p
      where tbl is not null and not p.removed and (tbl -> 'members') ? p.id::text), '[]'::jsonb)
  );
end $$;

revoke all on function public.get_my_table(uuid) from public;
grant execute on function public.get_my_table(uuid) to anon, authenticated;

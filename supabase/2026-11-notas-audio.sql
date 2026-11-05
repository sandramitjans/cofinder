-- Cofinder · notas de audio de cada ronda y su transcripción (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-preparados.sql.
-- Se puede ejecutar varias veces sin problema.
--
-- Al acabar cada ronda, cada persona graba un resumen (de qué se ha hablado, aprendizajes, highlight),
-- lo escucha y lo valida. El audio va al bucket `audio-notes` y aquí queda una fila por persona y
-- ronda. El transcriptor (Whisper, en el servidor) rellena `transcript`. Cuando todas las personas
-- de la ronda han enviado su nota, el panel pasa solo a la ronda siguiente.

create table if not exists public.audio_notes (
  participant_id uuid not null references public.participants(id) on delete cascade,
  round          int  not null,
  table_id       int,
  topic          text,
  path           text not null,
  transcript     text,
  transcribed_at timestamptz,
  created_at     timestamptz not null default now(),
  primary key (participant_id, round)
);
alter table public.audio_notes enable row level security;
revoke all on public.audio_notes from anon, authenticated;

-- El participante valida su nota (si la regraba, sustituye a la anterior y se vuelve a transcribir)
create or replace function public.submit_audio_note(p_id uuid, p_round int, p_table int, p_topic text, p_path text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  insert into public.audio_notes (participant_id, round, table_id, topic, path)
  values (p_id, p_round, p_table, p_topic, p_path)
  on conflict (participant_id, round) do update
    set table_id = excluded.table_id, topic = excluded.topic, path = excluded.path,
        transcript = null, transcribed_at = null, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- El admin borra las notas (al volver al principio o borrar el plan, p. ej. tras un ensayo)
create or replace function public.mod_clear_notes(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  delete from public.audio_notes;
  return jsonb_build_object('ok', true);
end $$;

-- Estado del admin: como antes + qué notas se han enviado (sin el texto, que pesa)
create or replace function public.mod_get_state(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object(
    'participants', coalesce((select jsonb_agg(private.public_row(p) || jsonb_build_object('access_code', p.access_code) order by p.created_at)
                              from public.participants p where not p.removed), '[]'::jsonb),
    'event', (select jsonb_build_object('round', round, 'rounds', rounds, 'finished', finished)
              from private.event_state where id = 1),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.participant_id, 'round', n.round, 'transcribed', n.transcript is not null))
                       from public.audio_notes n), '[]'::jsonb)
  );
end $$;

-- Su mesa (como antes) + «notes»: las rondas en las que ya ha enviado su nota
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

do $$
declare f text;
begin
  foreach f in array array['submit_audio_note(uuid, int, int, text, text)', 'mod_clear_notes(text)', 'mod_get_state(text)', 'get_my_table(uuid)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

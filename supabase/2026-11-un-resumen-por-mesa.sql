-- Cofinder · un solo resumen de audio por mesa (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-notas-audio.sql.
-- Se puede ejecutar varias veces sin problema.
--
-- Al acabar la ronda, en cada mesa una sola persona graba el resumen. Cada móvil elige
-- «Je fais le résumé audio» o «Pas moi». Gana quien se apunta primero (bloqueo por mesa); si todas
-- las personas menos una pasan, a esa última le toca obligatoriamente (el servidor no le deja pasar).
-- Quien no tiene a nadie más en la mesa graba directamente. Los demás pueden «tomar el relevo».
-- Solo cuentan las personas reales (no las de demo ni las retiradas).

create table if not exists public.table_reporters (
  round          int  not null,
  table_id       int  not null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  choice         text not null check (choice in ('me', 'pass')),
  updated_at     timestamptz not null default now(),
  primary key (round, table_id, participant_id)
);
-- Como mucho una persona «me» por mesa y ronda
create unique index if not exists table_reporters_one_me on public.table_reporters (round, table_id) where choice = 'me';
alter table public.table_reporters enable row level security;
revoke all on public.table_reporters from anon, authenticated;

-- Mesa de una persona en una ronda: { id, members[] } (null si no tiene)
create or replace function private.table_of(p_id uuid, p_round int)
returns jsonb language sql stable security definer set search_path = public, private as $$
  select t from private.event_state e, jsonb_array_elements(coalesce(e.rounds -> (p_round - 1) -> 'tables', '[]')) t
  where e.id = 1 and p_round > 0 and (t -> 'members') ? p_id::text limit 1
$$;

-- Estado de la mesa: quién ha elegido qué, quién graba, a quién le toca por ser la última y si ya se envió
create or replace function private.reporter_state(p_round int, p_tbl jsonb)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare
  v_table int := (p_tbl ->> 'id')::int;
  v_members jsonb;
  v_reporter uuid;
  v_forced uuid;
  v_undecided int;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'choice', r.choice) order by p.name), '[]'::jsonb)
    into v_members
  from public.participants p
  left join public.table_reporters r on r.participant_id = p.id and r.round = p_round and r.table_id = v_table
  where (p_tbl -> 'members') ? p.id::text and not p.removed and not p.demo;

  select (m ->> 'id')::uuid into v_reporter from jsonb_array_elements(v_members) m where m ->> 'choice' = 'me' limit 1;
  select count(*) into v_undecided from jsonb_array_elements(v_members) m where m ->> 'choice' is null;
  if v_reporter is null and v_undecided = 1 then
    select (m ->> 'id')::uuid into v_forced from jsonb_array_elements(v_members) m where m ->> 'choice' is null;
  end if;

  return jsonb_build_object(
    'round', p_round,
    'table', v_table,
    'members', v_members,
    'reporter', v_reporter,
    'forced', v_forced,
    'sent', exists (select 1 from public.audio_notes n where n.round = p_round
                    and (p_tbl -> 'members') ? n.participant_id::text)
  );
end $$;

create or replace function public.get_reporter_state(p_id uuid, p_round int)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare tbl jsonb;
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  tbl := private.table_of(p_id, p_round);
  if tbl is null then return jsonb_build_object('error', 'no_table'); end if;
  return private.reporter_state(p_round, tbl);
end $$;

-- p_choice: 'me' (me apunto), 'pass' (pas moi), 'relay' (tomo el relevo de quien grababa)
-- Devuelve el estado de la mesa; con 'lost': true si otra persona se apuntó antes.
create or replace function public.choose_reporter(p_id uuid, p_round int, p_choice text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare
  tbl jsonb;
  v_table int;
  st jsonb;
  v_lost boolean := false;
begin
  if p_choice not in ('me', 'pass', 'relay') then return jsonb_build_object('error', 'bad_choice'); end if;
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  tbl := private.table_of(p_id, p_round);
  if tbl is null then return jsonb_build_object('error', 'no_table'); end if;
  v_table := (tbl ->> 'id')::int;
  -- Una elección a la vez por mesa: así dos «me» simultáneos no pueden ganar los dos
  perform pg_advisory_xact_lock(hashtext('cofinder-reporter'), p_round * 1000 + v_table);
  st := private.reporter_state(p_round, tbl);

  if p_choice = 'me' then
    if st ->> 'reporter' is not null and (st ->> 'reporter')::uuid <> p_id then
      v_lost := true;
    else
      insert into public.table_reporters (round, table_id, participant_id, choice)
      values (p_round, v_table, p_id, 'me')
      on conflict (round, table_id, participant_id) do update set choice = 'me', updated_at = now();
    end if;
  elsif p_choice = 'pass' then
    -- Quien graba o a quien le toca por ser la última no puede pasar
    if coalesce((st ->> 'reporter')::uuid = p_id, false) or coalesce((st ->> 'forced')::uuid = p_id, false) then
      return st || jsonb_build_object('error', 'must_record');
    end if;
    insert into public.table_reporters (round, table_id, participant_id, choice)
    values (p_round, v_table, p_id, 'pass')
    on conflict (round, table_id, participant_id) do update set choice = 'pass', updated_at = now();
  else -- relay
    update public.table_reporters set choice = 'pass', updated_at = now()
    where round = p_round and table_id = v_table and choice = 'me' and participant_id <> p_id;
    insert into public.table_reporters (round, table_id, participant_id, choice)
    values (p_round, v_table, p_id, 'me')
    on conflict (round, table_id, participant_id) do update set choice = 'me', updated_at = now();
  end if;

  return private.reporter_state(p_round, tbl) || jsonb_build_object('lost', v_lost);
end $$;

-- Al volver al principio o borrar el plan, se borran también las elecciones
create or replace function public.mod_clear_notes(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  delete from public.audio_notes;
  delete from public.table_reporters;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function private.table_of(uuid, int) from public;
revoke all on function private.reporter_state(int, jsonb) from public;
do $$
declare f text;
begin
  foreach f in array array['get_reporter_state(uuid, int)', 'choose_reporter(uuid, int, text)', 'mod_clear_notes(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

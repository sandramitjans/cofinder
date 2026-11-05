-- Cofinder · esquema base de la base de datos (Supabase)
-- Para montar Cofinder en un proyecto de Supabase VACÍO. Después ejecutar, en este orden:
--   2026-11-prototipo.sql  (notas de audio, propuestas antiguas)
--   2026-11-mesas.sql      (mesas del evento desde el panel)
--   2026-11-mesas-familia.sql
--   2026-11-acceso-movil.sql (código de 4 cifras para entrar desde el móvil)
--   2026-11-preparados.sql   («Preparado» y mis mesas de todas las rondas)
-- PIN inicial de la moderadora: 2026. Cambiarlo con:  select public.mod_set_pin('2026', 'NUEVO');

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. Perfiles -----------------------------------------------------------------------
-- Con la clave pública solo se puede INSERTAR el propio perfil; nadie puede listarlos.
create table if not exists public.participants (
  id            uuid primary key,
  name          text not null check (length(name) between 1 and 120),
  role          text not null default '' check (length(role) <= 120),
  country       text not null default '' check (length(country) <= 120),
  photo         text,
  offers        text[] not null default '{}',
  needs         text[] not null default '{}',
  custom_topics text[] not null default '{}',
  superpowers   text[] not null default '{}',
  lang          text not null default 'es',
  demo          boolean not null default false,
  removed       boolean not null default false,
  edit_secret   text,
  created_at    timestamptz not null default now()
);
alter table public.participants enable row level security;
revoke all on public.participants from anon, authenticated;
grant insert on public.participants to anon, authenticated;
drop policy if exists "participants: registrarse" on public.participants;
create policy "participants: registrarse" on public.participants
  for insert to anon, authenticated
  with check (demo = false and removed = false and length(coalesce(photo, '')) <= 2000000);

-- Fila pública sin la clave de edición
create or replace function private.public_row(p public.participants)
returns jsonb language sql immutable as $$ select to_jsonb(p) - 'edit_secret' $$;

-- 2. Estado del evento ----------------------------------------------------------------
create table if not exists private.event_state (
  id       int primary key default 1 check (id = 1),
  round    int not null default 0,
  rounds   jsonb not null default '[]'::jsonb,
  finished boolean not null default false
);
insert into private.event_state (id) values (1) on conflict do nothing;

-- Señal pública sin datos personales: los móviles la escuchan en tiempo real
create table if not exists public.event_status (
  id         int primary key default 1 check (id = 1),
  round      int not null default 0,
  finished   boolean not null default false,
  version    int not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.event_status (id) values (1) on conflict do nothing;
alter table public.event_status enable row level security;
revoke all on public.event_status from anon, authenticated;
grant select on public.event_status to anon, authenticated;
drop policy if exists "event_status: leer" on public.event_status;
create policy "event_status: leer" on public.event_status for select to anon, authenticated using (true);
do $$ begin
  alter publication supabase_realtime add table public.event_status;
exception when duplicate_object then null; when undefined_object then null; end $$;

-- 3. PIN de la moderadora ----------------------------------------------------------------
create table if not exists private.settings (
  id       int primary key default 1 check (id = 1),
  pin_hash text not null
);
insert into private.settings (id, pin_hash) values (1, extensions.crypt('2026', extensions.gen_salt('bf')))
on conflict do nothing;
create table if not exists private.pin_attempts (at timestamptz not null default now());

-- 'ok' | 'invalid_pin' | 'locked' (10 fallos en 10 minutos bloquean)
create or replace function public.mod_check_pin(p_pin text)
returns text language plpgsql security definer set search_path = public, private, extensions as $$
begin
  delete from private.pin_attempts where at < now() - interval '1 day';
  if (select count(*) from private.pin_attempts where at > now() - interval '10 minutes') >= 10 then
    return 'locked';
  end if;
  if exists (select 1 from private.settings where id = 1 and pin_hash = extensions.crypt(coalesce(p_pin, ''), pin_hash)) then
    return 'ok';
  end if;
  insert into private.pin_attempts default values;
  return 'invalid_pin';
end $$;

create or replace function public.mod_set_pin(p_pin text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = public, private, extensions as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  if length(coalesce(p_new_pin, '')) < 4 then return jsonb_build_object('error', 'pin_too_short'); end if;
  update private.settings set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')) where id = 1;
  return jsonb_build_object('ok', true);
end $$;

-- 4. Participante -----------------------------------------------------------------------
create or replace function public.get_my_profile(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, private as $$
  select private.public_row(p) from public.participants p where p.id = p_id and not p.removed
$$;

create or replace function public.update_my_profile(p_id uuid, p_secret text, p_profile jsonb)
returns jsonb language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.participants where id = p_id and not removed
                 and edit_secret is not null and edit_secret = p_secret) then
    return jsonb_build_object('error', 'forbidden');
  end if;
  update public.participants set
    name          = coalesce(p_profile ->> 'name', name),
    role          = coalesce(p_profile ->> 'role', role),
    country       = coalesce(p_profile ->> 'country', country),
    photo         = case when p_profile ? 'photo' then p_profile ->> 'photo' else photo end,
    offers        = case when p_profile ? 'offers' then array(select jsonb_array_elements_text(p_profile -> 'offers')) else offers end,
    needs         = case when p_profile ? 'needs' then array(select jsonb_array_elements_text(p_profile -> 'needs')) else needs end,
    custom_topics = case when p_profile ? 'custom_topics' then array(select jsonb_array_elements_text(p_profile -> 'custom_topics')) else custom_topics end,
    superpowers   = case when p_profile ? 'superpowers' then array(select jsonb_array_elements_text(p_profile -> 'superpowers')) else superpowers end,
    lang          = coalesce(p_profile ->> 'lang', lang)
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- Su mesa de la ronda en curso (solo las mesas ya anunciadas) y sus compañeros
create or replace function public.get_my_table(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public, private as $$
declare
  e private.event_state;
  cur jsonb;
  tbl jsonb;
  seated boolean;
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then return null; end if;
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
    'people', coalesce((
      select jsonb_agg(private.public_row(p)) from public.participants p
      where tbl is not null and not p.removed and (tbl -> 'members') ? p.id::text), '[]'::jsonb)
  );
end $$;

-- 5. Moderadora ---------------------------------------------------------------------------
create or replace function public.mod_get_state(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object(
    'participants', coalesce((select jsonb_agg(private.public_row(p) order by p.created_at)
                              from public.participants p where not p.removed), '[]'::jsonb),
    'event', (select jsonb_build_object('round', round, 'rounds', rounds, 'finished', finished)
              from private.event_state where id = 1)
  );
end $$;

create or replace function public.mod_set_event(p_pin text, p_round int, p_rounds jsonb, p_finished boolean)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  update private.event_state set round = coalesce(p_round, 0), rounds = coalesce(p_rounds, '[]'), finished = coalesce(p_finished, false) where id = 1;
  update public.event_status set round = coalesce(p_round, 0), finished = coalesce(p_finished, false),
    version = version + 1, updated_at = now() where id = 1;
  return jsonb_build_object('ok', true);
end $$;

-- «Retirar» archiva el perfil (no se borra)
create or replace function public.mod_delete_participant(p_pin text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  update public.participants set removed = true where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mod_add_demo(p_pin text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  insert into public.participants (id, name, role, country, offers, needs, superpowers, demo)
  select (r ->> 'id')::uuid, r ->> 'name', coalesce(r ->> 'role', ''), coalesce(r ->> 'country', ''),
         array(select jsonb_array_elements_text(coalesce(r -> 'offers', '[]'))),
         array(select jsonb_array_elements_text(coalesce(r -> 'needs', '[]'))),
         array(select jsonb_array_elements_text(coalesce(r -> 'superpowers', '[]'))),
         true
  from jsonb_array_elements(coalesce(p_rows, '[]')) r
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.mod_clear_demo(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  delete from public.participants where demo;
  return jsonb_build_object('ok', true);
end $$;

-- 6. Permisos de las funciones --------------------------------------------------------------
revoke all on function private.public_row(public.participants) from public;
do $$
declare f text;
begin
  foreach f in array array[
    'mod_check_pin(text)', 'mod_set_pin(text, text)', 'get_my_profile(uuid)', 'update_my_profile(uuid, text, jsonb)',
    'get_my_table(uuid)', 'mod_get_state(text)', 'mod_set_event(text, int, jsonb, boolean)',
    'mod_delete_participant(text, uuid)', 'mod_add_demo(text, jsonb)', 'mod_clear_demo(text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

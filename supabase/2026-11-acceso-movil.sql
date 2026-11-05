-- Cofinder · acceso desde el móvil el día del evento (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de los otros scripts.
--
-- Cada participante tiene un código de 4 cifras. Para entrar desde otro dispositivo (el móvil, tras
-- escanear el QR del proyector) escribe su nombre y su código. Se puede ejecutar varias veces sin problema.
--  - El código nunca se muestra a los compañeros de mesa: solo a la propia persona y a la moderadora.
--  - 30 intentos fallidos en 10 minutos bloquean el acceso unos minutos (contra quien pruebe códigos al azar).

-- 1. Código de acceso -------------------------------------------------------------------
alter table public.participants add column if not exists access_code text;

create or replace function private.new_access_code()
returns text language plpgsql volatile security definer set search_path = public, private as $$
declare c text;
begin
  loop
    c := lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.participants where access_code = c and not removed);
  end loop;
  return c;
end $$;

-- Siempre lo pone el servidor (aunque el navegador intente mandar uno)
create or replace function private.set_access_code()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  new.access_code := private.new_access_code();
  return new;
end $$;

drop trigger if exists participants_access_code on public.participants;
create trigger participants_access_code before insert on public.participants
  for each row execute function private.set_access_code();

-- Quien ya estaba registrado recibe su código ahora
do $$
declare r record;
begin
  for r in select id from public.participants where access_code is null order by created_at loop
    update public.participants set access_code = private.new_access_code() where id = r.id;
  end loop;
end $$;

-- 2. Lo que ve cada uno -------------------------------------------------------------------
-- La fila «pública» (la que ven los compañeros de mesa) ya no lleva ni la clave de edición ni el código
create or replace function private.public_row(p public.participants)
returns jsonb language sql immutable as $$ select to_jsonb(p) - 'edit_secret' - 'access_code' $$;

-- La propia persona sí ve su código
create or replace function public.get_my_profile(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, private as $$
  select private.public_row(p) || jsonb_build_object('access_code', p.access_code)
  from public.participants p where p.id = p_id and not p.removed
$$;

-- La moderadora ve el código de todos (para repartirlos)
create or replace function public.mod_get_state(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object(
    'participants', coalesce((select jsonb_agg(private.public_row(p) || jsonb_build_object('access_code', p.access_code) order by p.created_at)
                              from public.participants p where not p.removed), '[]'::jsonb),
    'event', (select jsonb_build_object('round', round, 'rounds', rounds, 'finished', finished)
              from private.event_state where id = 1)
  );
end $$;

-- 3. Entrar con nombre + código ---------------------------------------------------------------
create table if not exists private.login_attempts (at timestamptz not null default now());

-- Minúsculas y sin acentos, para que «lucia» encuentre a «Lucía Ferrer»
create or replace function private.norm(t text)
returns text language sql immutable as $$
  select lower(translate(coalesce(t, ''),
    'ÁÀÂÄÃÉÈÊËÍÌÎÏÓÒÔÖÕÚÙÛÜÇÑáàâäãéèêëíìîïóòôöõúùûüçñ',
    'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'))
$$;

-- Devuelve { id, secret } o { error: 'invalid' | 'locked' }
create or replace function public.participant_login(p_name text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, private, extensions as $$
declare
  n text := btrim(private.norm(p_name));
  c text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  p public.participants;
begin
  delete from private.login_attempts where at < now() - interval '1 day';
  if (select count(*) from private.login_attempts where at > now() - interval '10 minutes') >= 30 then
    return jsonb_build_object('error', 'locked');
  end if;
  select * into p from public.participants
  where not removed and access_code = c and length(n) >= 2 and position(n in private.norm(name)) > 0
  limit 1;
  if p.id is null then
    insert into private.login_attempts default values;
    return jsonb_build_object('error', 'invalid');
  end if;
  -- Con la clave de edición, la persona también puede cambiar su perfil desde el móvil
  if p.edit_secret is null then
    update public.participants set edit_secret = gen_random_uuid()::text where id = p.id returning * into p;
  end if;
  return jsonb_build_object('id', p.id, 'secret', p.edit_secret);
end $$;

-- 4. Permisos ---------------------------------------------------------------------------------
revoke all on function private.public_row(public.participants) from public;
revoke all on function private.new_access_code() from public;
revoke all on function private.set_access_code() from public;
do $$
declare f text;
begin
  foreach f in array array['get_my_profile(uuid)', 'mod_get_state(text)', 'participant_login(text, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

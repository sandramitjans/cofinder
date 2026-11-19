-- Cofinder · bloqueo del login por persona (sustituye al bloqueo global)
-- Antes: 30 códigos erróneos en 10 minutos, sumando a TODO el mundo, bloqueaban la entrada a todos.
-- El día del evento, con todos escaneando el QR a la vez, unos cuantos despistes bastaban para dejar
-- a la sala entera sin poder entrar durante un rato.
-- Ahora:
--   · 10 intentos fallidos con el mismo nombre en 10 minutos bloquean solo ese nombre;
--   · y, como freno a quien pruebe códigos al azar, 300 fallos en total en 10 minutos bloquean a todos.
-- Se puede ejecutar varias veces sin problema. Requiere 2026-11-acceso-movil.sql.

alter table private.login_attempts add column if not exists name_key text not null default '';
create index if not exists login_attempts_at on private.login_attempts (at);

create or replace function public.participant_login(p_name text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, private, extensions as $$
declare
  n text := btrim(private.norm(p_name));
  c text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  p public.participants;
begin
  delete from private.login_attempts where at < now() - interval '1 day';
  if (select count(*) from private.login_attempts where at > now() - interval '10 minutes') >= 300
     or (select count(*) from private.login_attempts where at > now() - interval '10 minutes' and name_key = n) >= 10 then
    return jsonb_build_object('error', 'locked');
  end if;
  select * into p from public.participants
  where not removed and access_code = c and length(n) >= 2 and position(n in private.norm(name)) > 0
  limit 1;
  if p.id is null then
    insert into private.login_attempts (name_key) values (left(n, 120));
    return jsonb_build_object('error', 'invalid');
  end if;
  -- Con la clave de edición, la persona también puede cambiar su perfil desde el móvil
  if p.edit_secret is null then
    update public.participants set edit_secret = gen_random_uuid()::text where id = p.id returning * into p;
  end if;
  return jsonb_build_object('id', p.id, 'secret', p.edit_secret);
end $$;

revoke all on function public.participant_login(text, text) from public;
grant execute on function public.participant_login(text, text) to anon, authenticated;

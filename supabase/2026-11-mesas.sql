-- Cofinder · mesas del evento añadidas desde el panel de moderadora (05/11/2026)
-- Ejecutar una vez en el SQL editor de Supabase (proyecto cofinder).
-- Es aditivo: crea una tabla y tres funciones nuevas; no toca nada de lo que ya existe.
-- Las funciones mod_* comprueban el PIN con la función existente public.mod_check_pin
-- (mismo bloqueo tras 10 intentos fallidos).

create table if not exists public.mesa_topics (
  id          uuid primary key default gen_random_uuid(),
  label       text not null check (length(btrim(label)) between 1 and 80),
  proposer    text not null default '' check (length(proposer) <= 60),
  description text not null default '' check (length(description) <= 160),
  created_at  timestamptz not null default now()
);
create unique index if not exists mesa_topics_label_key on public.mesa_topics (lower(btrim(label)));

-- Nadie accede a la tabla directamente: solo a través de las funciones de abajo
alter table public.mesa_topics enable row level security;
revoke all on public.mesa_topics from anon, authenticated;

-- Lista pública: título, quién la propone y descripción (sin datos personales de participantes)
create or replace function public.list_mesa_topics()
returns table (label text, proposer text, description text)
language sql
stable
security definer
set search_path = public
as $$
  select m.label, m.proposer, m.description from public.mesa_topics m order by m.created_at
$$;

create or replace function public.mod_add_mesa_topic(p_pin text, p_label text, p_proposer text, p_description text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  v := public.mod_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  insert into public.mesa_topics (label, proposer, description)
  values (btrim(p_label), btrim(coalesce(p_proposer, '')), btrim(coalesce(p_description, '')))
  on conflict (lower(btrim(label))) do update
    set proposer = excluded.proposer, description = excluded.description;
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.mod_remove_mesa_topic(p_pin text, p_label text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  v := public.mod_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  delete from public.mesa_topics where lower(btrim(label)) = lower(btrim(p_label));
  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.list_mesa_topics() from public;
revoke all on function public.mod_add_mesa_topic(text, text, text, text) from public;
revoke all on function public.mod_remove_mesa_topic(text, text) from public;
grant execute on function public.list_mesa_topics() to anon, authenticated;
grant execute on function public.mod_add_mesa_topic(text, text, text, text) to anon, authenticated;
grant execute on function public.mod_remove_mesa_topic(text, text) to anon, authenticated;

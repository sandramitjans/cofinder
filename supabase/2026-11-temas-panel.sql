-- Cofinder · temas del evento gestionados desde el panel: obligatorios y edición (12/11/2026)
-- Ejecutar una vez DESPUÉS de 2026-11-mesas.sql y 2026-11-mesas-familia.sql.
-- Es aditivo: añade una columna y una función, y amplía la lista pública con esa columna.

alter table public.mesa_topics add column if not exists mandatory boolean not null default false;

-- Lista pública: ahora dice también si el tema es obligatorio
drop function if exists public.list_mesa_topics();
create function public.list_mesa_topics()
returns table (label text, proposer text, description text, family text, mandatory boolean)
language sql
stable
security definer
set search_path = public
as $$
  select m.label, m.proposer, m.description, m.family, m.mandatory from public.mesa_topics m order by m.created_at
$$;

-- Guardar un tema: si `p_old_label` existe, se edita ese tema (también el título, conservando su posición);
-- si no, se añade (o se actualiza el que tenga el mismo título).
create or replace function public.mod_save_mesa_topic(
  p_pin text, p_old_label text, p_label text, p_proposer text, p_description text, p_family text, p_mandatory boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v text;
begin
  v := public.mod_check_pin(p_pin);
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  if coalesce(btrim(p_old_label), '') <> '' and lower(btrim(p_old_label)) <> lower(btrim(p_label))
     and exists (select 1 from public.mesa_topics where lower(btrim(label)) = lower(btrim(p_label))) then
    return jsonb_build_object('error', 'exists');
  end if;
  update public.mesa_topics
     set label = btrim(p_label), proposer = btrim(coalesce(p_proposer, '')), description = btrim(coalesce(p_description, '')),
         family = coalesce(p_family, ''), mandatory = coalesce(p_mandatory, false)
   where coalesce(btrim(p_old_label), '') <> '' and lower(btrim(label)) = lower(btrim(p_old_label));
  if not found then
    insert into public.mesa_topics (label, proposer, description, family, mandatory)
    values (btrim(p_label), btrim(coalesce(p_proposer, '')), btrim(coalesce(p_description, '')), coalesce(p_family, ''), coalesce(p_mandatory, false))
    on conflict (lower(btrim(label))) do update
      set proposer = excluded.proposer, description = excluded.description, family = excluded.family, mandatory = excluded.mandatory;
  end if;
  return jsonb_build_object('ok', true);
end
$$;

revoke all on function public.list_mesa_topics() from public;
revoke all on function public.mod_save_mesa_topic(text, text, text, text, text, text, boolean) from public;
grant execute on function public.list_mesa_topics() to anon, authenticated;
grant execute on function public.mod_save_mesa_topic(text, text, text, text, text, text, boolean) to anon, authenticated;

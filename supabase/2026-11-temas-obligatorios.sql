-- Temas obligatorios + 2 elegidos (noviembre 2026)
--
-- La app ya recorta sola los perfiles antiguos al leerlos (src/lib/topics.js → chosenTopics):
-- quita los temas obligatorios, los que ya no están en la lista y se queda con 2. Este script hace
-- lo mismo en la base de datos, de forma definitiva. Ejecútalo SOLO cuando la lista de temas esté
-- decidida y sea la misma que en src/constants/index.js (MANDATORY_TOPICS y TOPICS).
--
-- Antes de tocar nada guarda una copia en public.participants_backup_temas (para deshacerlo:
-- update public.participants p set offers = b.offers, needs = b.needs, custom_topics = b.custom_topics
--   from public.participants_backup_temas b where b.id = p.id;)
-- Se puede volver a ejecutar: la copia solo se crea la primera vez.

create table if not exists public.participants_backup_temas as
  select id, offers, needs, custom_topics, now() as saved_at from public.participants;
alter table public.participants_backup_temas enable row level security; -- sin políticas: nadie la lee desde la web

with lists as (
  select
    array['ai_guru', 'customer_journey', 'pnl', 'cofidis_ninja']::text[] as mandatory,
    array['paid_performance', 'social_strategy', 'affiliates', 'emailing_loyalty', 'geo', 'b2b', 'analytics',
          'customer_success', 'branding', 'public_relations', 'product_management', 'operational_efficiency',
          'risk_management']::text[] as allowed
),
chosen as (
  select p.id,
    coalesce((
      select array_agg(t order by ord)
      from (
        select t, min(ord) as ord
        from unnest(coalesce(p.offers, '{}') || coalesce(p.needs, '{}')) with ordinality as u(t, ord), lists l
        where not (t = any(l.mandatory)) and (t like 'custom:%' or t = any(l.allowed))
        group by t
        order by min(ord)
        limit 2
      ) x
    ), '{}') as topics
  from public.participants p
)
update public.participants p
   set offers = '{}',
       needs = c.topics,
       custom_topics = array(select t from unnest(c.topics) t where t like 'custom:%')
  from chosen c
 where c.id = p.id;

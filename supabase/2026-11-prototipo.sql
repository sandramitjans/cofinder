-- Cofinder · cambios del prototipo (03/11/2026)
-- Ejecutar una vez en el SQL editor de Supabase (proyecto cofinder, París).
-- Es aditivo: no toca tablas ni funciones existentes.

-- 1. Mesas propuestas por participantes ---------------------------------------
-- Devuelve cada mesa propuesta (tema propio, `custom:<texto>`) con el nombre de pila de quien
-- la propuso primero. No expone perfiles: solo el texto de la mesa y un nombre de pila.
create or replace function public.list_topic_proposals()
returns table (topic text, proposer text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct on (lower(t.topic))
         t.topic,
         split_part(p.name, ' ', 1) as proposer
  from public.participants p
  cross join lateral jsonb_array_elements_text(coalesce(to_jsonb(p.custom_topics), '[]'::jsonb)) as t(topic)
  where t.topic like 'custom:%'
    and coalesce(to_jsonb(p) ->> 'removed', 'false') <> 'true'
    and not coalesce(p.demo, false)
  order by lower(t.topic), p.created_at
$$;

revoke all on function public.list_topic_proposals() from public;
grant execute on function public.list_topic_proposals() to anon, authenticated;

-- 2. Notas de audio -------------------------------------------------------------
-- Bucket privado: los móviles solo pueden SUBIR su nota (no listar ni descargar).
-- Las notas se escuchan/descargan desde el panel de Storage de Supabase.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio-notes', 'audio-notes', false, 5242880, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do nothing;

drop policy if exists "audio-notes: subir" on storage.objects;
create policy "audio-notes: subir"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'audio-notes');

-- 3. Tiempo real ------------------------------------------------------------------
-- Los avisos «nuevo registro / nueva nota» viajan por un canal de difusión (Realtime broadcast),
-- que no necesita tablas. El cambio de ronda sigue llegando por `public.event_status`;
-- si aún no estuviera en la publicación de Realtime:
--   alter publication supabase_realtime add table public.event_status;

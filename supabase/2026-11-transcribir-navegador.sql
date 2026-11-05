-- Cofinder · transcripción en el navegador desde la página #resum (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-resumenes.sql.
-- Se puede ejecutar varias veces sin problema.
--
-- Whisper (código abierto) se ejecuta en el navegador del ordenador que tiene abierta …/#resum:
-- sin servidor propio, sin Python y gratis. Para eso el móvil guarda también una copia del audio
-- aquí (unos 250 KB por nota de 1 minuto), y la página #resum, con el PIN de Admin, la lee,
-- la transcribe y guarda el texto. Nadie sin el PIN puede leer los audios.

alter table public.audio_notes add column if not exists audio bytea;
alter table public.audio_notes add column if not exists mime text;

-- El móvil envía su nota (como antes) + el audio en base64
create or replace function public.submit_audio_note(p_id uuid, p_round int, p_table int, p_topic text, p_path text, p_audio text, p_mime text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare bytes bytea;
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  bytes := decode(p_audio, 'base64');
  if length(bytes) > 5 * 1024 * 1024 then return jsonb_build_object('error', 'too_big'); end if;
  insert into public.audio_notes (participant_id, round, table_id, topic, path, audio, mime)
  values (p_id, p_round, p_table, p_topic, p_path, bytes, left(p_mime, 60))
  on conflict (participant_id, round) do update
    set table_id = excluded.table_id, topic = excluded.topic, path = excluded.path,
        audio = excluded.audio, mime = excluded.mime,
        transcript = null, transcribed_at = null, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- #resum: notas con audio que aún no tienen texto
create or replace function public.mod_pending_audio(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object('notes', coalesce((
    select jsonb_agg(jsonb_build_object('id', participant_id, 'round', round, 'path', path) order by created_at)
    from public.audio_notes where transcript is null and audio is not null), '[]'::jsonb));
end $$;

-- #resum: el audio de una nota (base64)
create or replace function public.mod_get_audio(p_pin text, p_id uuid, p_round int)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin); n public.audio_notes;
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  select * into n from public.audio_notes where participant_id = p_id and round = p_round;
  if n.audio is null then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('path', n.path, 'mime', n.mime, 'audio', encode(n.audio, 'base64'));
end $$;

-- #resum: guarda el texto (solo si la nota no se ha regrabado entretanto: misma `path`)
create or replace function public.mod_save_transcript(p_pin text, p_id uuid, p_round int, p_path text, p_text text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  update public.audio_notes set transcript = coalesce(nullif(btrim(p_text), ''), '(sin voz)'), transcribed_at = now()
  where participant_id = p_id and round = p_round and path = p_path;
  return jsonb_build_object('ok', found);
end $$;

-- mod_check_pin cuenta los PIN erróneos; estas llamadas llevan el PIN ya comprobado, así que no suman intentos
do $$
declare f text;
begin
  foreach f in array array['submit_audio_note(uuid, int, int, text, text, text, text)', 'mod_pending_audio(text)',
                           'mod_get_audio(text, uuid, int)', 'mod_save_transcript(text, uuid, int, text, text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

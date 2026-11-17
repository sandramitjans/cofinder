-- Cofinder · nota escrita en vez de audio («Prefiero escribirla»)
-- Ejecutar después de 2026-11-transcribir-navegador.sql. Se puede ejecutar más de una vez.
-- La nota se guarda en audio_notes sin audio y con el texto ya puesto, así cuenta como enviada
-- y sale en #resum como las transcripciones.

create or replace function public.submit_text_note(p_id uuid, p_round int, p_table int, p_topic text, p_text text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := btrim(coalesce(p_text, ''));
begin
  if not exists (select 1 from public.participants where id = p_id and not removed) then
    return jsonb_build_object('error', 'not_found');
  end if;
  if v = '' then return jsonb_build_object('error', 'empty'); end if;
  insert into public.audio_notes (participant_id, round, table_id, topic, path, audio, mime, transcript, transcribed_at)
  values (p_id, p_round, p_table, p_topic, 'texto', null, null, left(v, 2000), now())
  on conflict (participant_id, round) do update
    set table_id = excluded.table_id, topic = excluded.topic, path = 'texto', audio = null, mime = null,
        transcript = excluded.transcript, transcribed_at = now(), created_at = now();
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.submit_text_note(uuid, int, int, text, text) from public;
grant execute on function public.submit_text_note(uuid, int, int, text, text) to anon, authenticated;

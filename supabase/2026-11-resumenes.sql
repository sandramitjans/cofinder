-- Cofinder · página de resúmenes #resum (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-notas-audio.sql.
-- Se puede ejecutar varias veces sin problema.
--
-- Devuelve las transcripciones de las notas de audio para la página …/#resum.
-- Pide el mismo PIN que el panel de Admin: sin él no se ve nada.

create or replace function public.mod_get_notes(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object('notes', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.participant_id, 'name', p.name, 'role', p.role, 'country', p.country,
      'round', n.round, 'table', n.table_id, 'topic', n.topic,
      'transcript', n.transcript, 'createdAt', n.created_at, 'transcribedAt', n.transcribed_at
    ) order by n.round, n.table_id, p.name)
    from public.audio_notes n join public.participants p on p.id = n.participant_id), '[]'::jsonb));
end $$;

revoke all on function public.mod_get_notes(text) from public;
grant execute on function public.mod_get_notes(text) to anon, authenticated;

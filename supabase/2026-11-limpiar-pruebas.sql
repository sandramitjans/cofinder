-- Cofinder · VACIAR LOS DATOS DE PRUEBA antes de abrir las inscripciones reales
-- ⚠ BORRA DE VERDAD y no se puede deshacer: todas las inscripciones, las notas de audio (con sus
-- audios y transcripciones) y el plan de rondas. Conserva las mesas del evento y el PIN de Admin.
-- Ejecutar en el SQL Editor de Supabase, una sola vez, cuando ya no se necesiten las pruebas.

begin;
delete from public.audio_notes;
delete from public.participants;
update private.event_state set round = 0, rounds = '[]'::jsonb, finished = false where id = 1;
update public.event_status set round = 0, finished = false, version = version + 1, updated_at = now() where id = 1;  -- avisa a las pantallas abiertas
delete from private.login_attempts;
delete from private.pin_attempts;
commit;

-- Los archivos de audio del almacenamiento (bucket «audio-notes») se borran aparte:
-- Supabase → Storage → audio-notes → seleccionar las carpetas «ronda-…» → Delete.

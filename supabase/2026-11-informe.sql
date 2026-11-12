-- Cofinder · pantalla final: e-mail e idioma del informe ejecutivo (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase, después de 2026-11-notas-audio.sql y
-- 2026-11-preparados.sql. Se puede ejecutar varias veces sin problema.
--
-- Al terminar la última ronda, cada participante deja en su móvil el e-mail al que enviaremos el
-- informe y el idioma en el que lo quiere. El informe NO se genera solo: la moderadora descarga las
-- transcripciones y esta lista desde …/#resum y prepara el resumen a mano.
--
-- Privacidad: el e-mail y el idioma solo los ven la propia persona y la moderadora (con el PIN).
-- Los compañeros de mesa reciben la fila «pública», que los quita.

-- 1. Columnas ---------------------------------------------------------------------------------
alter table public.participants add column if not exists report_email text;
alter table public.participants add column if not exists report_lang  text;
alter table public.participants add column if not exists report_at    timestamptz;

-- 2. Lo que ve cada uno -------------------------------------------------------------------------
-- Fila «pública» (compañeros de mesa): sin clave de edición, sin código y sin datos del informe
create or replace function private.public_row(p public.participants)
returns jsonb language sql immutable as $$
  select to_jsonb(p) - 'edit_secret' - 'access_code' - 'report_email' - 'report_lang' - 'report_at'
$$;
revoke all on function private.public_row(public.participants) from public;

-- La propia persona ve su código y lo que eligió para el informe
create or replace function public.get_my_profile(p_id uuid)
returns jsonb language sql stable security definer set search_path = public, private as $$
  select private.public_row(p) || jsonb_build_object(
    'access_code', p.access_code, 'report_email', p.report_email, 'report_lang', p.report_lang, 'report_at', p.report_at)
  from public.participants p where p.id = p_id and not p.removed
$$;

-- La moderadora: como en 2026-11-notas-audio.sql + e-mail e idioma del informe de cada persona
create or replace function public.mod_get_state(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  return jsonb_build_object(
    'participants', coalesce((select jsonb_agg(private.public_row(p) || jsonb_build_object(
                                'access_code', p.access_code, 'report_email', p.report_email,
                                'report_lang', p.report_lang, 'report_at', p.report_at) order by p.created_at)
                              from public.participants p where not p.removed), '[]'::jsonb),
    'event', (select jsonb_build_object('round', round, 'rounds', rounds, 'finished', finished)
              from private.event_state where id = 1),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('id', n.participant_id, 'round', n.round, 'transcribed', n.transcript is not null))
                       from public.audio_notes n), '[]'::jsonb)
  );
end $$;

-- 3. Guardar e-mail e idioma ---------------------------------------------------------------------
-- Devuelve { ok } o { error: 'invalid_email' | 'invalid_lang' | 'not_found' }
create or replace function public.set_my_report(p_id uuid, p_email text, p_lang text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare e text := lower(btrim(coalesce(p_email, '')));
begin
  if length(e) > 200 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('error', 'invalid_email');
  end if;
  if p_lang is null or p_lang not in ('fr', 'en', 'es', 'pt', 'it', 'nl', 'cs', 'sk', 'hu', 'pl') then
    return jsonb_build_object('error', 'invalid_lang');
  end if;
  update public.participants set report_email = e, report_lang = p_lang, report_at = now()
  where id = p_id and not removed;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- 4. Reiniciar la sesión (panel): además de «Préparé», borra lo elegido para el informe,
--    para que tras un ensayo todos vuelvan a ver la pantalla final vacía
create or replace function public.mod_reset_ready(p_pin text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  update public.participants set ready_at = null where ready_at is not null;
  update public.participants set report_email = null, report_lang = null, report_at = null
  where report_at is not null or report_email is not null;
  return jsonb_build_object('ok', true);
end $$;

-- 5. Permisos ----------------------------------------------------------------------------------
do $$
declare f text;
begin
  foreach f in array array['get_my_profile(uuid)', 'mod_get_state(text)', 'set_my_report(uuid, text, text)', 'mod_reset_ready(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end $$;

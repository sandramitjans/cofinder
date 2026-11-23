-- Cofinder · el Admin cambia la foto de un participante desde el panel (noviembre 2026)
-- Ejecutar UNA vez en el SQL Editor de Supabase. Se puede ejecutar varias veces sin problema.
--
-- Solo crea una función nueva: no toca tablas ni datos. La función cambia ÚNICAMENTE la columna
-- `photo` de una persona (nombre, temas, código, mesas… quedan igual) y comprueba el PIN del Admin.

create or replace function public.mod_set_photo(p_pin text, p_id uuid, p_photo text)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v text := public.mod_check_pin(p_pin);
begin
  if v <> 'ok' then return jsonb_build_object('error', v); end if;
  -- La misma regla que al registrarse: imagen en data URL de hasta 2 MB (vacío = sin foto)
  if p_photo is not null and p_photo <> '' and (p_photo not like 'data:image/%' or length(p_photo) > 2000000) then
    return jsonb_build_object('error', 'bad_photo');
  end if;
  update public.participants set photo = nullif(p_photo, '') where id = p_id and not removed;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.mod_set_photo(text, uuid, text) from public;
grant execute on function public.mod_set_photo(text, uuid, text) to anon, authenticated;

import { createClient } from '@supabase/supabase-js'

/**
 * Acceso a Supabase.
 *
 * Seguridad (ver README):
 *  - Con la clave pública NADIE puede listar perfiles: solo insertar el suyo.
 *  - Cada participante lee su propio perfil y, el día del evento, solo a sus compañeros de mesa
 *    (funciones get_my_profile / get_my_table, por identificador).
 *  - Todo lo de la moderadora pasa por funciones mod_* que comprueban el PIN en el servidor
 *    (bcrypt + bloqueo tras 10 intentos fallidos en 10 minutos).
 *
 * Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY la app funciona en modo local (localStorage).
 */
const URL = import.meta.env?.VITE_SUPABASE_URL
const KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY

export const supabase = URL && KEY
  ? createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null
export const isRemote = !!supabase

/* ---------- Conversión fila ↔ objeto de la app ---------- */
export const fromRow = (r) => r && ({
  id: r.id,
  name: r.name,
  role: r.role,
  country: r.country,
  photo: r.photo || null,
  offers: r.offers ?? [],
  needs: r.needs ?? [],
  customTopics: r.custom_topics ?? [],
  superpowers: r.superpowers ?? [],
  demo: !!r.demo,
  createdAt: r.created_at ? Date.parse(r.created_at) : undefined,
})

const toRow = (p, lang) => ({
  id: p.id,
  name: p.name,
  role: p.role,
  country: p.country,
  photo: p.photo || null,
  offers: p.offers,
  needs: p.needs,
  custom_topics: p.customTopics ?? [],
  superpowers: p.superpowers ?? [],
  lang,
})

const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  if (data && typeof data === 'object' && data.error) throw Object.assign(new Error(data.error), { code: data.error })
  return data
}

/* ---------- Participante ---------- */
// Sin .select(): el rol público no puede leer la tabla, así que no pedimos la fila de vuelta
// `secret` = clave de edición generada en este dispositivo; ninguna función la devuelve nunca
export async function insertProfile(profile, lang, secret) {
  const { error } = await supabase.from('participants').insert({ ...toRow(profile, lang), edit_secret: secret })
  if (error) throw error
}

export async function updateProfile(profile, lang, secret) {
  const { id, ...row } = toRow(profile, lang)
  await rpc('update_my_profile', { p_id: id, p_secret: secret, p_profile: row })
}

export const fetchMyProfile = async (id) => fromRow(await rpc('get_my_profile', { p_id: id }))

export async function fetchMyTable(id) {
  const d = await rpc('get_my_table', { p_id: id })
  if (!d) return null
  return {
    round: d.round ?? 0,
    finished: !!d.finished,
    startedAt: d.startedAt ?? null,
    seatedEver: !!d.seatedEver,
    table: d.table ?? null,
    people: (d.people ?? []).map(fromRow),
  }
}

/** Avisa cada vez que la moderadora cambia de ronda (señal sin datos personales) */
export function onEventChange(cb) {
  const channel = supabase
    .channel('event_status')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'event_status' }, cb)
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

/* ---------- Moderadora (todas comprueban el PIN en el servidor) ---------- */
export const checkPin = async (pin) => {
  const { data, error } = await supabase.rpc('mod_check_pin', { p_pin: pin })
  if (error) throw error
  return data // 'ok' | 'invalid_pin' | 'locked'
}

export async function modGetState(pin) {
  const d = await rpc('mod_get_state', { p_pin: pin })
  return {
    participants: (d.participants ?? []).map(fromRow),
    event: { round: d.event?.round ?? 0, rounds: d.event?.rounds ?? [], finished: !!d.event?.finished },
  }
}

export const modSetEvent = (pin, e) =>
  rpc('mod_set_event', { p_pin: pin, p_round: e.round, p_rounds: e.rounds, p_finished: e.finished })

export const modRemove = (pin, id) => rpc('mod_delete_participant', { p_pin: pin, p_id: id })
export const modClearDemo = (pin) => rpc('mod_clear_demo', { p_pin: pin })
export const modAddDemo = (pin, people) => rpc('mod_add_demo', {
  p_pin: pin,
  p_rows: people.map(({ id, name, role, country, offers, needs, superpowers }) => ({ id, name, role, country, offers, needs, superpowers })),
})
export const modSetPin = (pin, newPin) => rpc('mod_set_pin', { p_pin: pin, p_new_pin: newPin })

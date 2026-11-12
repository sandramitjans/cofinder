import { createClient } from '@supabase/supabase-js'
import { CUSTOM_PREFIX as CUSTOM } from './topics'

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
  accessCode: r.access_code ?? null,
  readyAt: r.ready_at ? Date.parse(r.ready_at) : null, // pulsó «Preparado» el día del evento // solo llega para la propia persona y para la moderadora
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
    ready: !!d.ready,
    notes: d.notes ?? [], // rondas en las que ya envió su nota de audio
    plan: d.plan ?? null, // [{ round, table, topic }] · null si falta 2026-11-preparados.sql
    people: (d.people ?? []).map(fromRow),
  }
}

/** «Preparado» el día del evento (supabase/2026-11-preparados.sql) */
export const setMyReady = (id, ready) => rpc('set_my_ready', { p_id: id, p_ready: ready })
export const modResetReady = (pin) => rpc('mod_reset_ready', { p_pin: pin })

/** Nota de audio validada (supabase/2026-11-notas-audio.sql): el audio ya está en Storage en `path` */
const toBase64 = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
  r.onerror = () => reject(r.error)
  r.readAsDataURL(blob)
})
/** Registra la nota. Con `blob`, guarda además una copia del audio para que #resum la transcriba en el
 *  navegador (supabase/2026-11-transcribir-navegador.sql); sin ese SQL, se registra como antes. */
export async function submitAudioNote({ id, round, tableId, topic, path, blob }) {
  const args = { p_id: id, p_round: round, p_table: tableId ?? null, p_topic: topic ?? null, p_path: path }
  if (blob) {
    try {
      return await rpc('submit_audio_note', { ...args, p_audio: await toBase64(blob), p_mime: (blob.type || 'audio/webm').split(';')[0] })
    } catch (err) {
      if (err.code !== 'PGRST202') throw err // PGRST202 = la función con audio aún no existe
    }
  }
  return rpc('submit_audio_note', args)
}

/* ---------- Quién graba el resumen de la mesa (supabase/2026-11-un-resumen-por-mesa.sql) ----------
   Estado: { members: [{ id, choice: 'me' | 'pass' | null }], reporter, forced, sent, lost } */
const toReporter = (d) => ({
  members: (d?.members ?? []).map((m) => ({ id: m.id, choice: m.choice ?? null })),
  reporter: d?.reporter ?? null,
  forced: d?.forced ?? null,
  sent: !!d?.sent,
  lost: !!d?.lost,
})
export const fetchReporter = async (id, round) => toReporter(await rpc('get_reporter_state', { p_id: id, p_round: round }))
/** choice: 'me' (me apunto) · 'pass' (pas moi) · 'relay' (tomo el relevo) */
export const chooseReporter = async (id, round, choice) =>
  toReporter(await rpc('choose_reporter', { p_id: id, p_round: round, p_choice: choice }))

/* ---------- Página #resum: transcripción en el navegador (con el PIN de Admin) ---------- */
export const modPendingAudio = async (pin) => (await rpc('mod_pending_audio', { p_pin: pin }))?.notes ?? []
export async function modGetAudio(pin, id, round) {
  const { audio, mime, path } = await rpc('mod_get_audio', { p_pin: pin, p_id: id, p_round: round })
  const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0))
  return { blob: new Blob([bytes], { type: mime || 'audio/webm' }), path }
}
export const modSaveTranscript = (pin, { id, round, path, text }) =>
  rpc('mod_save_transcript', { p_pin: pin, p_id: id, p_round: round, p_path: path, p_text: text })
export const modClearNotes = (pin) => rpc('mod_clear_notes', { p_pin: pin })
/** Página #resum: transcripciones de todas las notas (con el PIN de Admin) */
export const modGetNotes = async (pin) => (await rpc('mod_get_notes', { p_pin: pin }))?.notes ?? []

/** Entrar desde otro dispositivo (el móvil) con el nombre y el código de 4 cifras.
 *  Devuelve { id, secret }; lanza un error con code 'invalid' | 'locked'. */
export const loginWithCode = (name, code) => rpc('participant_login', { p_name: name, p_code: code })

/** Avisa cada vez que la moderadora cambia de ronda (señal sin datos personales, por websocket).
 *  Un solo canal compartido: si el mismo dispositivo es participante y moderadora, los dos lo escuchan. */
const eventListeners = new Set()
let eventChannel = null
let eventTeardown = null
export function onEventChange(cb) {
  eventListeners.add(cb)
  clearTimeout(eventTeardown)
  if (!eventChannel) {
    eventChannel = supabase
      .channel('event_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_status' }, (msg) => eventListeners.forEach((f) => f(msg)))
      .subscribe()
  }
  return () => {
    eventListeners.delete(cb)
    // Se cierra un poco después: si la pantalla vuelve a suscribirse enseguida, reutiliza el canal abierto
    clearTimeout(eventTeardown)
    eventTeardown = setTimeout(() => {
      if (eventListeners.size || !eventChannel) return
      supabase.removeChannel(eventChannel)
      eventChannel = null
    }, 2000)
  }
}

/* ---------- Tiempo real (Supabase Realtime, websocket) ----------
   Canal de difusión sin datos personales: los móviles avisan «alguien se ha registrado o ha
   cambiado su perfil» y «nueva nota de audio», y el panel y el proyector refrescan al instante
   en lugar de esperar al siguiente sondeo. */
const LIVE = 'cofinder-live'
const listeners = new Set()
let liveChannel = null
const live = () => {
  if (!liveChannel) {
    liveChannel = supabase
      .channel(LIVE, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'ping' }, ({ payload }) => listeners.forEach((cb) => cb(payload?.kind)))
      .subscribe()
  }
  return liveChannel
}

export function ping(kind) {
  try { live().send({ type: 'broadcast', event: 'ping', payload: { kind } }) } catch { /* sin conexión: queda el sondeo */ }
}

export function onPing(cb) {
  listeners.add(cb)
  live()
  return () => { listeners.delete(cb) }
}

/* ---------- Quién está conectado (presencia de Supabase Realtime) ----------
   Cada móvil con sesión abierta se anuncia en el canal con una huella de su identificador (nunca el
   identificador en sí, que es lo que da acceso a su mesa). El proyector compara las huellas con la
   lista de participantes y enciende la foto de quien ya está conectado. */
const PRESENCE = 'cofinder-presence'

// Huella corta y estable (cyrb53): no permite recuperar el identificador
export function presenceKey(id) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57
  for (let i = 0; i < id.length; i++) {
    const ch = id.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

// Un solo canal por dispositivo (Supabase devuelve el mismo canal para el mismo nombre, así que
// antes de abrir uno nuevo hay que esperar a que el anterior se haya cerrado del todo)
let presenceChannel = null
let presenceOwnKey = null      // huella del participante de este dispositivo, si lo hay
const presenceWatchers = new Set()
let presenceQueue = Promise.resolve()
const presenceSnapshot = () => new Set(Object.keys(presenceChannel?.presenceState() ?? {}))

async function applyPresence() {
  const want = !!presenceOwnKey || presenceWatchers.size > 0
  const key = presenceChannel?.params.config.presence?.key
  // Hay que cerrar el canal si ya no hace falta o si se abrió con otra identidad
  const stale = presenceChannel && (!want || (presenceOwnKey ? key !== presenceOwnKey : !key?.startsWith('watch-')))
  if (stale) {
    const old = presenceChannel
    presenceChannel = null
    await supabase.removeChannel(old).catch(() => {})
  }
  if (!want || presenceChannel) return
  const channel = supabase.channel(PRESENCE, {
    config: { presence: { key: presenceOwnKey ?? `watch-${Math.random().toString(36).slice(2)}`, enabled: true } },
  })
  presenceChannel = channel
  const tracking = !!presenceOwnKey
  channel
    .on('presence', { event: 'sync' }, () => {
      const keys = new Set(Object.keys(channel.presenceState()))
      presenceWatchers.forEach((cb) => cb(keys))
    })
    .subscribe((status) => { if (status === 'SUBSCRIBED' && tracking) channel.track({ at: Date.now() }) })
}
const syncPresence = () => { presenceQueue = presenceQueue.then(applyPresence).catch(() => {}) }

/** El móvil se anuncia como conectado mientras la app está abierta */
export function announcePresence(id) {
  presenceOwnKey = presenceKey(id)
  syncPresence()
  return () => { presenceOwnKey = null; syncPresence() }
}

/** El proyector (y la sala de espera del móvil) recibe el conjunto de huellas conectadas cada vez que alguien entra o sale */
export function watchPresence(cb) {
  presenceWatchers.add(cb)
  syncPresence()
  cb(presenceSnapshot())
  return () => { presenceWatchers.delete(cb); syncPresence() }
}

/* ---------- Mesas del evento ----------
   Las añade la moderadora desde el panel (supabase/2026-11-mesas.sql). La lista es pública: solo
   el título de cada mesa, una descripción opcional y el nombre de quien la propone. */
const topicFromRow = (r) => ({ id: CUSTOM + r.label, by: r.proposer ?? '', desc: r.description ?? '', family: r.family ?? '' })

export async function fetchEventTopics() {
  const { data, error } = await supabase.rpc('list_mesa_topics')
  if (error) throw error
  return (data ?? []).map(topicFromRow)
}

export const modAddTopic = (pin, { id, by, desc, family }) =>
  rpc('mod_add_mesa_topic', { p_pin: pin, p_label: id.slice(CUSTOM.length), p_proposer: by, p_description: desc, p_family: family ?? '' })
export const modRemoveTopic = (pin, id) =>
  rpc('mod_remove_mesa_topic', { p_pin: pin, p_label: id.slice(CUSTOM.length) })

/* ---------- Notas de audio ----------
   Bucket privado `audio-notes`: el público solo puede subir (no listar ni descargar). */
export async function uploadAudioNote({ userId, round, tableId, blob }) {
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  const path = `ronda-${round}/mesa-${tableId ?? 'x'}/${userId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('audio-notes').upload(path, blob, { contentType: (blob.type || 'audio/webm').split(';')[0], upsert: false })
  if (error) throw error
  return path
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
    notes: d.notes ?? [], // [{ id, round, transcribed }]
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

import { MANDATORY_TOPICS, MAX_INTERESTS, TOPICS } from '../constants'

/**
 * Temas: los de la lista (`TOPICS`, identificadores estables) más los temas propios
 * que cada persona puede añadir con «Autre». Un tema propio se guarda como
 * `custom:<texto tal como lo escribió>`.
 */
export const CUSTOM_PREFIX = 'custom:'
export const MAX_CUSTOM_TOPICS = 3
export const MAX_CUSTOM_LENGTH = 40

export const isCustom = (id = '') => String(id).startsWith(CUSTOM_PREFIX)
export const customLabel = (id = '') => String(id).slice(CUSTOM_PREFIX.length)
export const makeCustom = (label) => CUSTOM_PREFIX + String(label).trim().replace(/\s+/g, ' ')

/** Texto comparable: sin acentos, minúsculas, sin signos sueltos ni espacios dobles */
export const normalizeText = (s = '') =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9&+/ ]/g, ' ').replace(/\s+/g, ' ').trim()

/**
 * Clave de comparación: los temas de la lista se comparan por identificador; los propios,
 * por su texto normalizado («Retail Média» y «retail media» son el mismo tema).
 */
export const topicKey = (id) => (isCustom(id) ? CUSTOM_PREFIX + normalizeText(customLabel(id)) : id)

/* ---------- Mesas del evento (las añade la moderadora desde el panel) ----------
   Cada mesa: { id: 'custom:<título>', by: 'Quien la propone', desc: 'descripción opcional',
   family: 'acquisition' | 'brand' | 'customer' | 'data' | 'business' | '' }.
   Mientras la moderadora no haya añadido ninguna, el formulario muestra los 20 temas de la lista. */
export const makeEventTopic = ({ label, by = '', desc = '', family = '' }) => ({
  family,
  id: makeCustom(label),
  by: String(by).trim().replace(/\s+/g, ' '),
  desc: String(desc).trim().replace(/\s+/g, ' '),
})

/* ---------- Orden aleatorio estable por persona ----------
   Cada dispositivo guarda una semilla al azar: así cada participante ve las mesas en un orden
   distinto, pero siempre el mismo para él (no se desordenan al volver al paso o al editar). */
const SEED_KEY = 'cofinder:topic-order'
export function topicOrderSeed() {
  try {
    let seed = localStorage.getItem(SEED_KEY)
    if (!seed) { seed = String(Math.floor(Math.random() * 2 ** 31)); localStorage.setItem(SEED_KEY, seed) }
    return seed
  } catch { return 'cofinder' }
}

const hash = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/** Ordena `items` de forma aleatoria pero reproducible: misma semilla → mismo orden */
export function seededOrder(items, seed, keyOf = (x) => x) {
  return [...items]
    .map((x) => ({ x, k: hash(`${seed}|${topicKey(keyOf(x))}`) }))
    .sort((a, b) => a.k - b.k)
    .map(({ x }) => x)
}

/* ---------- Temas de una persona: 4 obligatorios + los que ha elegido ----------
   Los obligatorios (MANDATORY_TOPICS) no se guardan en el perfil: cuentan para todo el mundo.
   Los elegidos están en `needs` (perfiles antiguos: también en `offers`). Ya no hay nivel. */
export const isMandatory = (id) => MANDATORY_TOPICS.some((m) => topicKey(m) === topicKey(id))
/**
 * Temas elegidos por la persona: como mucho MAX_INTERESTS, sin los obligatorios, sin repetir y sin
 * temas que ya no están en la lista. Los perfiles de antes del cambio (hasta 5 temas, con nivel)
 * se recortan aquí al leerlos, sin tocar la base de datos: primero los que marcó con nivel alto/medio.
 */
export const chosenTopics = (person) => {
  const seen = new Set()
  return [...(person?.offers ?? []), ...(person?.needs ?? [])].filter((id) => {
    const key = topicKey(id)
    if (isMandatory(id) || seen.has(key) || (!isCustom(id) && !TOPICS.includes(id))) return false
    seen.add(key)
    return true
  }).slice(0, MAX_INTERESTS)
}
/** Todos los temas de la persona: primero los obligatorios, después los elegidos */
export const myTopics = (person) => [...MANDATORY_TOPICS, ...chosenTopics(person)]
/** ¿La persona tiene este tema (obligatorio o elegido)? */
export const hasTopic = (person, id) => isMandatory(id) || chosenTopics(person).some((x) => topicKey(x) === topicKey(id))

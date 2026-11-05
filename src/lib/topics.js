/**
 * Temas: los 20 de la lista (`TOPICS`, identificadores estables) más los temas propios
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
   Cada mesa: { id: 'custom:<título>', by: 'Quien la propone', desc: 'descripción opcional' }.
   Mientras la moderadora no haya añadido ninguna, el formulario muestra los 20 temas de la lista. */
export const makeEventTopic = ({ label, by = '', desc = '' }) => ({
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

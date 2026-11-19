import { FAMILY_EMOJI, MANDATORY_TOPICS, MAX_INTERESTS, TOPIC_EMOJI } from '../constants'

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
   family: 'acquisition' | 'brand' | 'customer' | 'data' | 'business' | '', mandatory: true | false }.
   Mientras no haya ninguno, el formulario muestra los temas provisionales de constants. */
export const makeEventTopic = ({ label, by = '', desc = '', family = '', mandatory = false }) => ({
  family,
  mandatory: !!mandatory,
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

/* ---------- Lista de temas del evento ----------
   Si el Admin ha añadido temas en el panel, mandan esos: los marcados como obligatorios y los «au choix».
   Si no hay ninguno, solo hay temas obligatorios (MANDATORY_TOPICS) y ningún tema «au choix»:
   el formulario no muestra la pantalla de elegir tema. Si el Admin añade temas no obligatorios
   en el panel, esa pantalla vuelve a salir (ver RegisterView → stepsOrder).
   AppContext (y el worker del plan) llaman a `configureEventTopics` con la lista del panel. */
let EVENT = { mandatory: MANDATORY_TOPICS, optional: [], family: {}, desc: {}, panel: false }
export function configureEventTopics(list = []) {
  EVENT = list.length
    ? {
        mandatory: list.filter((x) => x.mandatory).map((x) => x.id),
        optional: list.filter((x) => !x.mandatory).map((x) => x.id),
        family: Object.fromEntries(list.map((x) => [topicKey(x.id), x.family || ''])),
        desc: Object.fromEntries(list.map((x) => [topicKey(x.id), x.desc || ''])),
        panel: true,
      }
    : { mandatory: MANDATORY_TOPICS, optional: [], family: {}, desc: {}, panel: false }
}
/** Temas obligatorios del evento (ids) */
export const mandatoryTopics = () => EVENT.mandatory
/** Temas «au choix» del evento (ids) */
export const optionalTopics = () => EVENT.optional
/** Familia de un tema del panel ('' si no tiene o no es del panel) */
export const eventFamilyOf = (id) => EVENT.family[topicKey(id)] ?? ''
/* ---------- Temas del panel en inglés ----------
   El panel guarda los temas en francés. Aquí va su traducción, por el título normalizado
   (mayúsculas, acentos y espacios dan igual). Un tema que no está aquí se muestra en francés. */
const PANEL_EN = Object.fromEntries([
  ['Croissance rentable', 'Profitable growth', 'How do we steer and control our growth levers?'],
  ['Valeur client', 'Customer value', 'Which approach? What end goal?'],
  ['Développement de produits non consommateurs de fonds propres', 'Developing capital-light products', 'How do we launch profitable products without tying up our own capital?'],
  ['Développement de produits non consommateurs de fond propre', 'Developing capital-light products', 'How do we launch profitable products without tying up our own capital?'],
  ['Stratégie App', 'App strategy', 'What role for the app in the customer journey, and how do we drive its adoption?'],
].map(([fr, label, desc]) => [CUSTOM_PREFIX + normalizeText(fr), { label, desc }]))
/** Título de un tema del panel en el idioma pedido: en inglés, su traducción si la hay */
export const eventTopicLabel = (id, lang) => (lang === 'en' && PANEL_EN[topicKey(id)]?.label) || customLabel(id)
/** Descripción de un tema del panel en el idioma pedido ('' si no tiene) */
export const eventTopicDesc = (id, lang) => (lang === 'en' && PANEL_EN[topicKey(id)]?.desc) || EVENT.desc[topicKey(id)] || ''
/** Icono de un tema: el suyo si es de la lista; si es del panel, el de su familia */
export const topicEmoji = (id) => TOPIC_EMOJI[id] ?? FAMILY_EMOJI[eventFamilyOf(id)] ?? '💬'

/* ---------- Temas de una persona: los obligatorios + el que ha elegido ----------
   Los obligatorios cuentan para todo el mundo; en el perfil solo se guarda el nivel de cada uno.
   El elegido y los obligatorios están en `offers` y/o `needs` según el nivel (ver más abajo). */
export const isMandatory = (id) => EVENT.mandatory.some((m) => topicKey(m) === topicKey(id))
/**
 * Temas elegidos por la persona: como mucho MAX_INTERESTS, sin los obligatorios, sin repetir y sin
 * temas que ya no están en la lista. Los perfiles de antes del cambio (hasta 5 temas, con nivel)
 * se recortan aquí al leerlos, sin tocar la base de datos: primero los que marcó con nivel alto/medio.
 */
export const chosenTopics = (person) => {
  const seen = new Set()
  const allowed = new Set(EVENT.optional.map(topicKey))
  return [...(person?.offers ?? []), ...(person?.needs ?? [])].filter((id) => {
    const key = topicKey(id)
    if (isMandatory(id) || seen.has(key)) return false
    // Con temas del panel, solo cuentan los del panel; sin ellos, los de la lista y los propios
    if (EVENT.panel ? !allowed.has(key) : (!isCustom(id) && !allowed.has(key))) return false
    seen.add(key)
    return true
  }).slice(0, MAX_INTERESTS)
}
/* ---------- Nivel en cada tema: Avancé / Intermédiaire / Découverte ----------
   Se guarda con las dos listas de siempre, para que el reparto no cambie de lógica:
   Avancé → solo en `offers` (puede compartir) · Découverte → solo en `needs` (viene a aprender) ·
   Intermédiaire → en las dos (comparte y aprende). Avancé e Intermédiaire cuentan como «con experiencia». */
export const LEVELS = ['high', 'medium', 'low']
export const levelOfTopic = (person, id) => {
  const key = topicKey(id)
  const o = (person?.offers ?? []).some((x) => topicKey(x) === key)
  const n = (person?.needs ?? []).some((x) => topicKey(x) === key)
  return o && n ? 'medium' : o ? 'high' : n ? 'low' : null
}
/** Listas `offers` / `needs` a partir de { [tema]: 'high' | 'medium' | 'low' } */
export const listsFromLevels = (topics, levels = {}) => ({
  offers: topics.filter((id) => levels[id] && levels[id] !== 'low'),
  needs: topics.filter((id) => levels[id] !== 'high'),
})

/** Todos los temas de la persona: primero los obligatorios, después los elegidos */
export const myTopics = (person) => [...EVENT.mandatory, ...chosenTopics(person)]
/** ¿La persona tiene este tema (obligatorio o elegido)? */
export const hasTopic = (person, id) => isMandatory(id) || chosenTopics(person).some((x) => topicKey(x) === topicKey(id))

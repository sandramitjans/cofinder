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

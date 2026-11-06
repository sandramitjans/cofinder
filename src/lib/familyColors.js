import { TOPIC_FAMILIES } from '../constants'

/* Familia de cada tema de la lista (las mesas propias traen la suya en `family`) */
export const FAMILY_OF = Object.fromEntries(TOPIC_FAMILIES.flatMap((g) => g.topics.map((id) => [id, g.id])))
export const familyOfTopic = (id, family) => family || FAMILY_OF[id] || ''

/* Pastel de cada familia: `tile` para el cuadradito del emoji, `chip` para etiquetas y filtros.
   Las clases van escritas enteras para que Tailwind las encuentre. */
const TONES = {
  acquisition: { tile: 'bg-fam-acquisition', chip: 'bg-fam-acquisition text-fam-acquisition-ink' },
  brand: { tile: 'bg-fam-brand', chip: 'bg-fam-brand text-fam-brand-ink' },
  customer: { tile: 'bg-fam-customer', chip: 'bg-fam-customer text-fam-customer-ink' },
  data: { tile: 'bg-fam-data', chip: 'bg-fam-data text-fam-data-ink' },
  business: { tile: 'bg-fam-business', chip: 'bg-fam-business text-fam-business-ink' },
}
const NEUTRAL = { tile: 'bg-slate-100', chip: 'bg-slate-100 text-slate-700' }

export const familyTone = (family) => TONES[family] ?? NEUTRAL

/* Familia de un tema buscando también entre las mesas del evento (`eventTopics` del contexto) */
export const familyIn = (id, eventTopics = []) => familyOfTopic(id, eventTopics.find((x) => x.id === id)?.family)

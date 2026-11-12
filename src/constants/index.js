// Vistas de la SPA
export const VIEWS = {
  REGISTER: 'register',   // pública: pre-registro "Opération Secrète"
  HOME: 'home',           // pública: espera con cuenta atrás / tarjeta de ronda / cierre
  EDIT: 'edit',           // pública: el participante modifica su propio perfil
  MOD_PANEL: 'mod-panel', // oculta: panel de moderadora
  PROJECTOR: 'projector', // oculta: pantalla grande
  LOGIN: 'login',         // pública: entrar desde otro dispositivo con nombre + código (QR del proyector)
}

// Vistas que solo se abren con el PIN desbloqueado
export const MODERATOR_VIEWS = [VIEWS.MOD_PANEL, VIEWS.PROJECTOR]

// Acceso oculto: enlace directo .../#moderadora o el candado discreto del pie
export const MOD_HASH = '#admin'
// Enlaces antiguos que siguen funcionando
export const isModHash = (h) => h === MOD_HASH || h === '#moderadora'
// El QR del proyector abre la app con este enlace: …/#entrar → pantalla de acceso
export const JOIN_HASH = '#entrar'
// Página de resúmenes: transcripciones de las notas de audio (pide el PIN de Admin)
export const RESUM_HASH = '#resum'
// Dirección que codifica el QR. Por defecto, la de la propia página; en pruebas en red local
// conviene poner la IP del ordenador (p. ej. VITE_PUBLIC_URL=http://192.168.1.20:5173)
// Si no se indica y la app está abierta en «localhost» (npm run dev), se usa sola la IP del ordenador.
const LAN_IP = typeof __LAN_IP__ === 'string' ? __LAN_IP__ : ''
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
export const PUBLIC_URL = import.meta.env?.VITE_PUBLIC_URL
  || (isLocalhost && LAN_IP ? `${window.location.protocol}//${LAN_IP}:${window.location.port}${window.location.pathname}` : '')
// PIN configurable con VITE_MOD_PIN en un fichero .env
export const MOD_PIN = import.meta.env?.VITE_MOD_PIN || '2026'

// Día del evento: la cuenta atrás termina a las 00:00 (hora de Madrid/París) del 24/11/2026.
// Para contar hasta la hora de inicio, cambia la hora, p. ej. '2026-11-24T09:30:00+01:00'.
// Una variable vacía (p. ej. un secreto de GitHub sin rellenar) cuenta como no indicada
const EVENT_DATE_RAW = new Date(import.meta.env?.VITE_EVENT_DATE || '2026-11-24T00:00:00+01:00').getTime()
export const EVENT_DATE = Number.isNaN(EVENT_DATE_RAW) ? new Date('2026-11-24T00:00:00+01:00').getTime() : EVENT_DATE_RAW

// Lugar del evento (VITE_EVENT_PLACE en el .env); vacío = Cofidis España
export const EVENT_PLACE = import.meta.env?.VITE_EVENT_PLACE || 'Cofidis España'

// Sesión: 4 rondas de 15 minutos, mesas de 3 a 4 personas y como mucho 5 mesas por ronda.
// Un mismo tema puede estar en 2 mesas de la misma ronda (sobre todo los obligatorios).
// Tras la ronda 3 hay una pausa de 10 minutos con su propia pantalla en el proyector.
export const TOTAL_ROUNDS = 4
export const ROUND_MINUTES = 15
export const MIN_TABLE_SIZE = 3
export const MAX_TABLE_SIZE = 4
export const MAX_TABLES = 5
export const MAX_TABLES_PER_TOPIC = 2
export const PAUSE_AFTER_ROUND = 3
export const PAUSE_MINUTES = 10
// Al empezar cada ronda: minutos para encontrar la mesa antes de que arranque la conversación
export const FIND_MINUTES = 2
export const MAX_TAGS = 5
// Paso 3 del formulario: hasta 2 temas elegidos (se guardan en `needs`), además de los obligatorios
export const MAX_INTERESTS = 2

// Identificadores estables: los textos visibles están en lib/i18n.js (FR / EN).
// 4 temas obligatorios: todo el mundo está apuntado de oficio (no se guardan en el perfil,
// se suman siempre). PROVISIONALES: cambiar esta línea cuando estén decididos.
export const MANDATORY_TOPICS = ['ai_guru', 'customer_journey', 'pnl', 'cofidis_ninja']

// Los 13 temas entre los que cada persona elige hasta MAX_INTERESTS. PROVISIONALES.
export const TOPICS = [
  'paid_performance', 'social_strategy', 'affiliates', 'emailing_loyalty',
  'geo', 'b2b', 'analytics', 'customer_success', 'branding',
  'public_relations', 'product_management', 'operational_efficiency', 'risk_management',
]

// Los temas agrupados en familias, para los filtros y colores del formulario.
// Incluye también temas que ya no se ofrecen (guerrilla, mass_media, compliance) por si salen en datos antiguos.
export const TOPIC_FAMILIES = [
  { id: 'acquisition', topics: ['paid_performance', 'affiliates', 'geo', 'social_strategy', 'b2b'] },
  { id: 'brand', topics: ['branding', 'mass_media', 'public_relations', 'guerrilla'] },
  { id: 'customer', topics: ['customer_journey', 'customer_success', 'emailing_loyalty'] },
  { id: 'data', topics: ['ai_guru', 'analytics', 'product_management'] },
  { id: 'business', topics: ['pnl', 'operational_efficiency', 'risk_management', 'compliance', 'cofidis_ninja'] },
]

// Emoji de cada tema en el formulario (los temas propios usan ✨)
export const TOPIC_EMOJI = {
  paid_performance: '🎯', affiliates: '🤝', geo: '🔎', social_strategy: '📱', b2b: '🏢',
  branding: '🎨', mass_media: '📺', public_relations: '📣', guerrilla: '💥',
  customer_journey: '🗺️', customer_success: '🌟', emailing_loyalty: '💌',
  ai_guru: '🤖', analytics: '📊', product_management: '🧩',
  pnl: '💵', operational_efficiency: '⚡', risk_management: '🛡️', compliance: '⚖️', cofidis_ninja: '🥷',
}

// Superpoderes de oficina (la touche fun). No intervienen en el algoritmo de mesas.
export const SUPERPOWERS = [
  { id: 'charisma', emoji: '🎤' },
  { id: 'pop_culture', emoji: '🍿' },
  { id: 'shortcuts', emoji: '⌨️' },
  { id: 'outlook', emoji: '🏺' },
  { id: 'corporate_french', emoji: '🗣️' },
  { id: 'punchlines', emoji: '🎯' },
  { id: 'generations', emoji: '👵' },
  { id: 'crisis', emoji: '🛡️' },
  { id: 'psychologist', emoji: '🧠' },
  { id: 'friday', emoji: '🚒' },
  { id: 'pokerface', emoji: '🃏' },
]
export const MAX_SUPERPOWERS = 1

// Filiales que se sugieren en el formulario (países del grupo Cofidis). Los textos están en lib/i18n.js,
// que guarda también otros países por si algún perfil antiguo los tiene.
export const COUNTRIES = ['fr', 'be', 'es', 'pt', 'it', 'cz', 'sk', 'hu', 'pl']

export const LANGS = ['fr', 'en']
export const DEFAULT_LANG = 'fr'

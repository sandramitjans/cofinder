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
// Dirección que codifica el QR. Por defecto, la de la propia página; en pruebas en red local
// conviene poner la IP del ordenador (p. ej. VITE_PUBLIC_URL=http://192.168.1.20:5173)
// Si no se indica y la app está abierta en «localhost» (npm run dev), se usa sola la IP del ordenador.
const LAN_IP = typeof __LAN_IP__ === 'string' ? __LAN_IP__ : ''
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
export const PUBLIC_URL = import.meta.env?.VITE_PUBLIC_URL
  || (isLocalhost && LAN_IP ? `${window.location.protocol}//${LAN_IP}:${window.location.port}${window.location.pathname}` : '')
// PIN configurable con VITE_MOD_PIN en un fichero .env
export const MOD_PIN = import.meta.env?.VITE_MOD_PIN || '2026'

// Día del evento: la cuenta atrás termina a las 00:00 (hora de Madrid/París) del 25/11/2026.
// Para contar hasta la hora de inicio, cambia la hora, p. ej. '2026-11-25T09:30:00+01:00'.
// Una variable vacía (p. ej. un secreto de GitHub sin rellenar) cuenta como no indicada
const EVENT_DATE_RAW = new Date(import.meta.env?.VITE_EVENT_DATE || '2026-11-25T00:00:00+01:00').getTime()
export const EVENT_DATE = Number.isNaN(EVENT_DATE_RAW) ? new Date('2026-11-25T00:00:00+01:00').getTime() : EVENT_DATE_RAW

// Lugar del evento (VITE_EVENT_PLACE en el .env); vacío = «Lugar por confirmar»
export const EVENT_PLACE = import.meta.env?.VITE_EVENT_PLACE ?? ''

// Sesión: 5 rondas de 15 minutos, mesas de 2 a 5 personas y como mucho 5 mesas por ronda.
// Tras la ronda 3 hay una pausa de 10 minutos con su propia pantalla en el proyector.
export const TOTAL_ROUNDS = 5
export const ROUND_MINUTES = 15
export const MIN_TABLE_SIZE = 2
export const MAX_TABLE_SIZE = 5
export const MAX_TABLES = 5
export const PAUSE_AFTER_ROUND = 3
export const PAUSE_MINUTES = 10
// Al empezar cada ronda: minutos para encontrar la mesa antes de que arranque la conversación
export const FIND_MINUTES = 2
export const MAX_TAGS = 5
// Paso 2 del formulario: una sola selección de temas de interés (se guarda en `needs`)
export const MAX_INTERESTS = 5

// Identificadores estables: los textos visibles están en lib/i18n.js (FR / EN).
// Una única lista de temas: cada persona hace con ella DOS selecciones independientes (Offre / Demande).
export const TOPICS = [
  'ai_guru', 'paid_performance', 'social_strategy', 'affiliates', 'emailing_loyalty',
  'geo', 'b2b', 'analytics', 'customer_success', 'branding',
  'mass_media', 'public_relations', 'guerrilla', 'product_management', 'pnl',
  'customer_journey', 'operational_efficiency', 'risk_management', 'compliance', 'cofidis_ninja',
]

// Los mismos 20 temas agrupados en familias, solo para mostrarlos en el formulario.
// El reparto en mesas sigue trabajando con los identificadores de TOPICS.
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

export const COUNTRIES = ['fr', 'es', 'pt', 'it', 'de', 'uk', 'mx', 'co', 'ar', 'cl', 'br', 'us']

export const LANGS = ['es', 'en']
export const DEFAULT_LANG = 'es'

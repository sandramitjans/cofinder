// Vistas de la SPA
export const VIEWS = {
  REGISTER: 'register',   // pública: pre-registro "Opération Secrète"
  HOME: 'home',           // pública: espera con cuenta atrás / tarjeta de ronda / cierre
  EDIT: 'edit',           // pública: el participante modifica su propio perfil
  MOD_PANEL: 'mod-panel', // oculta: panel de moderadora
  PROJECTOR: 'projector', // oculta: pantalla grande
}

// Vistas que solo se abren con el PIN desbloqueado
export const MODERATOR_VIEWS = [VIEWS.MOD_PANEL, VIEWS.PROJECTOR]

// Acceso oculto: enlace directo .../#moderadora o el candado discreto del pie
export const MOD_HASH = '#moderadora'
// PIN configurable con VITE_MOD_PIN en un fichero .env
export const MOD_PIN = import.meta.env?.VITE_MOD_PIN ?? '2026'

// Día del evento: la cuenta atrás termina a las 00:00 (hora de Madrid/París) del 25/11/2026.
// Para contar hasta la hora de inicio, cambia la hora, p. ej. '2026-11-25T09:30:00+01:00'.
export const EVENT_DATE = new Date(import.meta.env?.VITE_EVENT_DATE ?? '2026-11-25T00:00:00+01:00').getTime()

export const TOTAL_ROUNDS = 3
export const ROUND_MINUTES = 20
export const TABLE_SIZE = 4
export const MAX_TAGS = 5

// Identificadores estables: los textos visibles están en lib/i18n.js (FR / EN).
// Una única lista de temas: cada persona hace con ella DOS selecciones independientes (Offre / Demande).
export const TOPICS = [
  'ai_guru', 'paid_performance', 'social_strategy', 'affiliates', 'emailing_loyalty',
  'geo', 'b2b', 'analytics', 'customer_success', 'branding',
  'mass_media', 'public_relations', 'guerrilla', 'product_management', 'pnl',
  'customer_journey', 'operational_efficiency', 'risk_management', 'compliance', 'cofidis_ninja',
]

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
export const MAX_SUPERPOWERS = 3

export const COUNTRIES = ['fr', 'es', 'pt', 'it', 'de', 'uk', 'mx', 'co', 'ar', 'cl', 'br', 'us']

export const LANGS = ['fr', 'en']
export const DEFAULT_LANG = 'fr'

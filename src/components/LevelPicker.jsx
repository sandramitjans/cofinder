import { Check } from 'lucide-react'
import { isCustom } from '../lib/topics'
import { TOPIC_EMOJI } from '../constants'
import { useI18n } from '../context/I18nContext'
import { useApp } from '../context/AppContext'
import { familyIn, familyTone } from '../lib/familyColors'

/**
 * Paso 3, tras elegir las mesas: para cada mesa elegida, la persona indica su nivel: Alto, Medio o Bajo.
 * Alto se guarda en `offers`, Bajo en `needs` y Medio en las dos (ver lib/topics.js). Así el reparto
 * puede mezclar en cada mesa a quien sabe más con quien viene a aprender.
 * Cada mesa es una tarjeta: arriba el tema; debajo, las tres opciones del mismo ancho.
 * `levels` = { [tema]: 'high' | 'medium' | 'low' }
 */
const OPTIONS = ['high', 'medium', 'low']
export default function LevelPicker({ topics, levels, onChange, error }) {
  const { t, topic } = useI18n()
  const { eventTopics } = useApp()
  if (!topics.length) return null
  const missing = topics.filter((id) => !levels[id]).length
  const choose = (id, level) => onChange({ levels: { ...levels, [id]: level } })

  return (
    <div className="mt-6">
      <ul className="space-y-3">
        {topics.map((id) => {
          const level = { expert: 'high', curious: 'low' }[levels[id]] ?? levels[id] // borradores antiguos
          return (
            <li key={id} className={`rounded-xl border bg-white p-3.5 transition-colors ${level ? 'border-brand/40' : 'border-slate-200'}`}>
              <p className="flex items-center gap-3">
                <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${familyTone(familyIn(id, eventTopics)).tile}`}>{isCustom(id) ? '💬' : TOPIC_EMOJI[id]}</span>
                <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">{topic(id)}</span>
              </p>
              <div role="radiogroup" aria-label={topic(id)} className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                {OPTIONS.map((o) => (
                  <LevelOption key={o} on={level === o} onClick={() => choose(id, o)}
                    label={t(`register.level.${o}`)} hint={t(`register.level.${o}Hint`)} />
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {error
        ? <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{error}</p>
        : missing > 0 && <p className="mt-3 text-sm text-slate-500">{t('register.levelLeft', { n: missing })}</p>}
    </div>
  )
}

function LevelOption({ on, onClick, label, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`flex min-w-0 flex-col items-start rounded-lg border px-2 py-2.5 sm:px-2.5 text-left transition ${
        on ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      {/* La casilla va en su propia línea: «Intermédiaire» o «Intermediate» no caben al lado en un móvil */}
      <span aria-hidden className={`mb-1.5 grid h-4 w-4 place-items-center rounded-full border ${on ? 'border-mint bg-mint text-white' : 'border-slate-300'}`}>
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className={`max-w-full hyphens-auto text-[13px] font-semibold leading-tight sm:text-sm ${on ? 'text-brand-dark' : 'text-ink'}`}>
        {label}
      </span>
      <span className="mt-1 text-xs leading-tight text-slate-500">{hint}</span>
    </button>
  )
}

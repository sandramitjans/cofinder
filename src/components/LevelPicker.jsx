import { Check } from 'lucide-react'
import { LEVELS, topicEmoji } from '../lib/topics'
import { useI18n } from '../context/I18nContext'
import { useApp } from '../context/AppContext'
import { familyOfTopic, familyTone } from '../lib/familyColors'

/**
 * Pasos 3 y 5 del formulario: para cada tema, la persona indica su nivel: Avancé, Intermédiaire o Découverte.
 * Es obligatorio en cada tema. Así el reparto puede poner en cada mesa al menos a alguien con experiencia
 * y mezclar los niveles (ver lib/topics.js → listsFromLevels y lib/matching.js).
 * Cada tema es una tarjeta: arriba el tema; debajo, las tres opciones del mismo ancho.
 * `levels` = { [tema]: 'high' | 'medium' | 'low' }
 */
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
          const level = levels[id]
          const family = familyOfTopic(id, eventTopics.find((x) => x.id === id)?.family)
          return (
            <li key={id} className={`rounded-xl border bg-white p-3.5 transition-colors lg:p-4 ${level ? 'border-brand/40' : 'border-slate-200'}`}>
              <p className="flex items-center gap-3">
                <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${familyTone(family).tile}`}>{topicEmoji(id)}</span>
                <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">{topic(id)}</span>
              </p>
              <div role="radiogroup" aria-label={topic(id)} className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                {LEVELS.map((o) => (
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
        : missing > 0 && topics.length > 1 && <p className="mt-3 text-sm text-slate-500">{t('register.levelLeft', { n: missing })}</p>}
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
      className={`flex min-w-0 flex-col items-start rounded-lg border px-2 py-2.5 text-left transition sm:px-2.5 ${
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

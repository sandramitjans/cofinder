import { Check } from 'lucide-react'
import { LEVELS } from '../lib/topics'
import { useI18n } from '../context/I18nContext'

/**
 * Pasos 3 y 5 del formulario: para cada tema, la persona indica su nivel: Avancé, Intermédiaire o Découverte.
 * Es obligatorio en cada tema. Así el reparto puede poner en cada mesa al menos a alguien con experiencia
 * y mezclar los niveles (ver lib/topics.js → listsFromLevels y lib/matching.js).
 * Cada tema es una tarjeta con el tema bien visible y tres botones pequeños (en PC, a la derecha).
 * Lo que significa cada nivel se explica una sola vez, arriba.
 * `levels` = { [tema]: 'high' | 'medium' | 'low' }
 */
export default function LevelPicker({ topics, levels, onChange, error }) {
  const { t, topic } = useI18n()
  if (!topics.length) return null
  const missing = topics.filter((id) => !levels[id]).length
  const choose = (id, level) => onChange({ levels: { ...levels, [id]: level } })

  return (
    <div className="mt-6">
      {/* Leyenda una sola vez arriba: así las opciones pueden ser botones pequeños */}
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 lg:text-base">
        {LEVELS.map((o) => <span key={o}><strong className="font-semibold text-ink">{t(`register.level.${o}`)}</strong> · {t(`register.level.${o}Hint`)}</span>)}
      </p>
      <ul className="mt-4 space-y-3">
        {topics.map((id) => {
          const level = levels[id]
          return (
            <li key={id} className={`rounded-2xl border-2 bg-white p-4 transition-colors lg:flex lg:items-center lg:gap-6 lg:px-6 lg:py-5 ${level ? 'border-brand/40' : 'border-slate-200'}`}>
              {/* El tema, bien visible: es lo que se valora */}
              <p className="min-w-0 flex-1 text-lg font-semibold leading-snug text-ink lg:text-xl">{topic(id)}</p>
              <div role="radiogroup" aria-label={topic(id)} className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 lg:mt-0 lg:flex lg:shrink-0">
                {LEVELS.map((o) => (
                  <LevelOption key={o} on={level === o} onClick={() => choose(id, o)} label={t(`register.level.${o}`)} hint={t(`register.level.${o}Hint`)} />
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
      title={hint}
      onClick={onClick}
      className={`flex min-h-12 min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-0.5 text-[13.5px] font-semibold transition sm:px-3 sm:text-[15px] lg:w-[172px] lg:rounded-full lg:text-base ${
        on ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-ink hover:border-slate-400'
      }`}
    >
      {on && <Check aria-hidden className="hidden h-4 w-4 shrink-0 sm:block" strokeWidth={3} />}
      <span className="truncate">{label}</span>
    </button>
  )
}

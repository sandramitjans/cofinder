import { Check } from 'lucide-react'
import { isCustom } from '../lib/topics'
import { TOPIC_EMOJI } from '../constants'
import { useI18n } from '../context/I18nContext'

/**
 * Paso 3, tras elegir las mesas: para cada mesa elegida, la persona indica si va «Con experiencia»
 * (se guarda en `offers`) o «Con curiosidad» (en `needs`). Así el reparto puede mezclar en cada
 * mesa a alguien con experiencia y a alguien que viene a aprender.
 * Cada mesa es una tarjeta: arriba el tema; debajo, las dos opciones del mismo ancho con su explicación.
 * `levels` = { [tema]: 'expert' | 'curious' }
 */
export default function LevelPicker({ topics, levels, onChange, error }) {
  const { t, topic } = useI18n()
  if (!topics.length) return null
  const missing = topics.filter((id) => !levels[id]).length
  const choose = (id, level) => onChange({ levels: { ...levels, [id]: level } })

  return (
    <div className="mt-6">
      <ul className="space-y-3">
        {topics.map((id) => {
          const level = levels[id]
          return (
            <li key={id} className={`rounded-xl border bg-white p-3.5 transition-colors ${level ? 'border-brand/40' : 'border-slate-200'}`}>
              <p className="flex items-center gap-3">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-lg">{isCustom(id) ? '💬' : TOPIC_EMOJI[id]}</span>
                <span className="min-w-0 flex-1 font-semibold leading-snug text-ink">{topic(id)}</span>
              </p>
              <div role="radiogroup" aria-label={topic(id)} className="mt-3 grid grid-cols-2 gap-2">
                <LevelOption on={level === 'expert'} onClick={() => choose(id, 'expert')} emoji="🎖️" label={t('register.levelExpert')} hint={t('register.levelExpertHint')} />
                <LevelOption on={level === 'curious'} onClick={() => choose(id, 'curious')} emoji="✨" label={t('register.levelCurious')} hint={t('register.levelCuriousHint')} />
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

function LevelOption({ on, onClick, emoji, label, hint }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={`relative flex flex-col items-start rounded-lg border py-2.5 pl-3 pr-8 text-left transition ${
        on ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className={`flex items-center gap-1.5 text-sm font-semibold leading-tight ${on ? 'text-brand-dark' : 'text-ink'}`}>
        <span aria-hidden>{emoji}</span> {label}
      </span>
      <span className="mt-1 text-xs leading-tight text-slate-500">{hint}</span>
      <span aria-hidden className={`absolute right-2.5 top-2.5 grid h-4 w-4 place-items-center rounded-full border ${on ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}>
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  )
}

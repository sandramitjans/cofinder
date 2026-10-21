import { isCustom } from '../lib/topics'
import { TOPIC_EMOJI } from '../constants'
import { useI18n } from '../context/I18nContext'

/**
 * Paso 2, debajo de la selección de temas: para cada tema elegido, la persona indica si es
 * «Expérimenté·e» (se guarda en `offers`) o «Curieux·se» (en `needs`). Así el reparto en mesas
 * puede mezclar en cada mesa a alguien con experiencia y a alguien que viene a aprender.
 * `levels` = { [tema]: 'expert' | 'curious' }
 */
export default function LevelPicker({ topics, levels, onChange, error }) {
  const { t, topic } = useI18n()
  if (!topics.length) return null
  const missing = topics.filter((id) => !levels[id]).length
  const choose = (id, level) => onChange({ levels: { ...levels, [id]: level } })

  return (
    <div data-field="levels" className="mt-8 border-t border-slate-200 pt-6 lg:mt-10 lg:pt-8">
      <h3 className="font-display text-xl font-medium tracking-tight lg:text-2xl">{t('register.levelTitle')}</h3>
      <p className="mt-1.5 text-[15px] text-slate-600 lg:text-base">{t('register.levelSub')}</p>

      <ul className="mt-5 grid gap-2.5 lg:grid-cols-2">
        {topics.map((id) => {
          const level = levels[id]
          return (
            <li key={id} className={`flex flex-col gap-2.5 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center ${level ? 'border-brand/30 bg-brand-soft/40' : 'border-slate-200 bg-white'}`}>
              <span className="flex min-w-0 flex-1 items-center gap-2.5 text-[15px] font-semibold leading-snug">
                <span aria-hidden className="text-xl leading-none">{isCustom(id) ? '✨' : TOPIC_EMOJI[id]}</span>
                <span className="min-w-0 hyphens-auto">{topic(id)}</span>
              </span>
              <span role="group" aria-label={topic(id)} className="flex shrink-0 rounded-full bg-slate-100 p-1">
                <LevelButton on={level === 'expert'} onClick={() => choose(id, 'expert')} className="bg-brand text-white" label={t('register.levelExpert')} hint={t('register.levelExpertHint')} />
                <LevelButton on={level === 'curious'} onClick={() => choose(id, 'curious')} className="bg-[#F5B83D] text-ink" label={t('register.levelCurious')} hint={t('register.levelCuriousHint')} />
              </span>
            </li>
          )
        })}
      </ul>

      {error
        ? <p role="alert" className="mt-3 text-sm font-semibold text-accent-dark">{error}</p>
        : missing > 0 && <p className="mt-3 text-sm text-slate-500">{t('register.levelLeft', { n: missing })}</p>}
    </div>
  )
}

function LevelButton({ on, onClick, className, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      title={hint}
      className={`flex-1 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition sm:flex-none ${on ? `${className} shadow-sm` : 'text-slate-500 hover:text-ink'}`}
    >
      {label}
    </button>
  )
}

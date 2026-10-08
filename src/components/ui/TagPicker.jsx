import { Check, Plus } from 'lucide-react'
import { MAX_TAGS, TOPICS } from '../../constants'
import { useI18n } from '../../context/I18nContext'

const TONES = {
  offer: { on: 'border-brand bg-brand text-white shadow-sm shadow-brand/20', dot: 'bg-brand', other: 'bg-accent' },
  need: { on: 'border-accent bg-accent text-ink shadow-sm shadow-accent/30', dot: 'bg-accent', other: 'bg-brand' },
}

/**
 * Una selección sobre la lista única de temas. Offre y Demande usan este mismo componente
 * con la misma lista y son independientes: `alsoIn` solo marca con un punto los temas que
 * también están elegidos en la otra selección (no bloquea nada).
 */
export default function TagPicker({ value, onChange, tone = 'offer', alsoIn = [], error, labelledBy }) {
  const { t, topic } = useI18n()
  const full = value.length >= MAX_TAGS
  const toggle = (tag) =>
    onChange(value.includes(tag) ? value.filter((x) => x !== tag) : full ? value : [...value, tag])

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={labelledBy}>
        {TOPICS.map((tag) => {
          const selected = value.includes(tag)
          const disabled = !selected && full
          const inOther = alsoIn.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              data-tag={tag}
              onClick={() => toggle(tag)}
              disabled={disabled}
              aria-pressed={selected}
              title={inOther ? t('register.bothLists') : undefined}
              className={`relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-150 active:scale-95 ${
                selected
                  ? TONES[tone].on
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 opacity-50" />}
              {topic(tag)}
              {inOther && (
                <span aria-hidden className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${TONES[tone].other}`} />
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={error ? 'font-medium text-brand' : 'text-slate-400'}>
          {error ?? t('register.tagHint', { max: MAX_TAGS })}
        </span>
        <span className="flex items-center gap-1.5 font-medium text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${TONES[tone].dot}`} /> {value.length}/{MAX_TAGS}
        </span>
      </div>
    </div>
  )
}

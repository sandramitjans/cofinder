import { Check } from 'lucide-react'
import { MAX_SUPERPOWERS, SUPERPOWERS } from '../../constants'
import { useI18n } from '../../context/I18nContext'

/** Selección de superpoderes de oficina (facultativa, máx. MAX_SUPERPOWERS) */
export default function SuperpowerPicker({ value, onChange, labelledBy }) {
  const { t, superpower } = useI18n()
  const full = value.length >= MAX_SUPERPOWERS
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : full ? value : [...value, id])

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-labelledby={labelledBy}>
        {SUPERPOWERS.map(({ id, emoji }) => {
          const selected = value.includes(id)
          const disabled = !selected && full
          return (
            <button
              key={id}
              type="button"
              data-power={id}
              onClick={() => toggle(id)}
              disabled={disabled}
              aria-pressed={selected}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[15px] font-medium transition-all duration-150 active:scale-[0.98] ${
                selected
                  ? 'border-ink bg-ink text-white shadow-md shadow-ink/20'
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500'
              }`}
            >
              <span
                aria-hidden
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg transition-transform ${
                  selected ? 'scale-110 bg-accent' : disabled ? 'bg-slate-100 grayscale' : 'bg-accent-soft group-hover:rotate-6'
                }`}
              >
                {emoji}
              </span>
              <span className="flex-1 leading-snug">{superpower(id)}</span>
              {selected && <Check className="h-4 w-4 shrink-0 text-accent" />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-right text-sm font-semibold text-slate-700">
        {t('register.superHint', { n: value.length, max: MAX_SUPERPOWERS })}
      </p>
    </div>
  )
}

/** Chips de solo lectura con emoji, para resúmenes y tarjetas */
export function SuperpowerChips({ ids = [], size = 'md', className = '' }) {
  const { superpower } = useI18n()
  if (!ids.length) return null
  const cls = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-sm'
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {ids.map((id) => {
        const sp = SUPERPOWERS.find((s) => s.id === id)
        return sp ? (
          <span key={id} className={`inline-flex items-center gap-1 rounded-full bg-ink font-medium text-white ${cls}`}>
            <span aria-hidden>{sp.emoji}</span> {superpower(id)}
          </span>
        ) : null
      })}
    </div>
  )
}

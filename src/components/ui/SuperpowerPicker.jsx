import { Check } from 'lucide-react'
import { SUPERPOWERS } from '../../constants'
import { useI18n } from '../../context/I18nContext'

/** Selección del arma secreta (facultativa, una sola: elegir otra sustituye a la anterior) */
export default function SuperpowerPicker({ value, onChange, labelledBy }) {
  const { superpower } = useI18n()
  const toggle = (id) => onChange(value.includes(id) ? [] : [id])

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2 lg:gap-3 xl:grid-cols-3" role="group" aria-labelledby={labelledBy}>
        {SUPERPOWERS.map(({ id, emoji }) => {
          const selected = value.includes(id)
          return (
            <button
              key={id}
              type="button"
              data-power={id}
              onClick={() => toggle(id)}
              aria-pressed={selected}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-[15px] font-medium lg:px-4 lg:py-3.5 lg:text-base transition-all duration-150 active:scale-[0.98] ${
                selected
                  ? 'border-brand bg-brand-soft text-ink shadow-md shadow-brand/20'
                  : 'border-slate-300 bg-white text-slate-800 hover:border-slate-500'
              }`}
            >
              <span
                aria-hidden
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg transition-transform lg:h-11 lg:w-11 lg:text-xl ${
                  selected ? 'scale-110 bg-accent' : 'bg-accent-soft group-hover:rotate-6'
                }`}
              >
                {emoji}
              </span>
              <span className="flex-1 leading-snug">{superpower(id)}</span>
              {selected && <Check className="h-4 w-4 shrink-0 text-brand-dark" />}
            </button>
          )
        })}
      </div>
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

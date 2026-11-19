import { Check } from 'lucide-react'
import { SUPERPOWERS } from '../../constants'
import { useI18n } from '../../context/I18nContext'
import Avatar from './Avatar'

/**
 * Selección del arma secreta (facultativa, una sola: elegir otra sustituye a la anterior).
 * Cada arma es una carta: al elegirla se gira y muestra el reverso en violeta.
 * Con `person` (nombre, cargo, foto del formulario), arriba se ve cómo la verán los vecinos de mesa.
 */
export default function SuperpowerPicker({ value, onChange, labelledBy, person }) {
  const { t, superpower } = useI18n()
  const toggle = (id) => onChange(value.includes(id) ? [] : [id])
  const chosen = SUPERPOWERS.find((s) => value.includes(s.id))

  return (
    <div>
      {person && (
        <div className="mb-6">
          <p className="text-sm font-semibold text-slate-600 lg:text-base">{t('register.previewTitle')}</p>
          {/* Vista previa: la mini ficha que aparecerá en la mesa */}
          <div className="mt-2.5 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:p-5">
            <Avatar name={person.name} photo={person.photo} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold text-ink lg:text-xl">{person.name || '…'}</p>
              {person.role && <p className="truncate text-[17px] text-slate-600 lg:text-base">{person.role}</p>}
              {chosen ? (
                <span key={chosen.id} className="animate-pop-in mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-sm font-semibold lg:text-[17px]">
                  <span aria-hidden>{chosen.emoji}</span> {superpower(chosen.id)}
                </span>
              ) : (
                <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-slate-300 px-3 py-0.5 text-sm text-slate-500">
                  {t('register.previewEmpty')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 xl:grid-cols-4" role="group" aria-labelledby={labelledBy}>
        {SUPERPOWERS.map(({ id, emoji }, i) => {
          const selected = value.includes(id)
          return (
            <button
              key={id}
              type="button"
              data-power={id}
              onClick={() => toggle(id)}
              aria-pressed={selected}
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-rise-in group h-32 rounded-2xl perspective-[900px] focus-visible:outline-none lg:h-36"
            >
              <span className={`relative block h-full w-full transition-transform duration-500 transform-3d motion-reduce:transition-none ${selected ? 'rotate-y-180' : 'group-hover:-translate-y-1'}`}>
                {/* Anverso */}
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-2 text-center backface-hidden group-hover:border-accent group-focus-visible:ring-4 group-focus-visible:ring-accent/40">
                  <span aria-hidden className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-2xl transition-transform group-hover:rotate-6 lg:h-14 lg:w-14 lg:text-3xl">{emoji}</span>
                  <span className="text-[17px] font-semibold leading-tight text-ink lg:text-base">{superpower(id)}</span>
                </span>
                {/* Reverso: la carta elegida */}
                <span aria-hidden className="absolute inset-0 flex rotate-y-180 flex-col items-center justify-center gap-1.5 rounded-2xl bg-accent px-2 text-center text-white shadow-lg shadow-accent/30 backface-hidden">
                  <span className="text-3xl lg:text-4xl">{emoji}</span>
                  <span className="text-[17px] font-semibold leading-tight lg:text-base">{superpower(id)}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-sm font-semibold">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> {t('register.yourWeapon')}
                  </span>
                </span>
              </span>
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
  const cls = size === 'sm' ? 'px-2 py-0.5 text-[13px]' : 'px-3 py-1 text-sm'
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {ids.map((id) => {
        const sp = SUPERPOWERS.find((s) => s.id === id)
        return sp ? (
          <span key={id} className={`inline-flex items-center gap-1 rounded-full bg-accent-soft font-medium text-accent-dark ring-1 ring-accent/30 ${cls}`}>
            <span aria-hidden>{sp.emoji}</span> {superpower(id)}
          </span>
        ) : null
      })}
    </div>
  )
}

import { Heart } from 'lucide-react'
import { useI18n } from '../context/I18nContext'

/** % de perfil completado (0–100) */
export function attractivenessScore({ name, role, country, offers, needs, superpowers = [] }) {
  let s = 0
  if (name.trim().length >= 3) s += 15
  else if (name.trim()) s += 6
  if (role.trim()) s += 10
  if (country.trim()) s += 10
  s += Math.min(offers.length + needs.length, 8) * 6.25
  if (superpowers.length) s += 15 // el «Irrésistible !» exige un arma secreta
  return Math.round(s)
}

/** Barra «Indice d'attractivité»: se llena a medida que se completa el perfil */
export default function AttractivenessMeter({ value }) {
  const { t } = useI18n()
  const levels = t('attract.levels')
  const level = value >= 100 ? 4 : value >= 70 ? 3 : value >= 40 ? 2 : value > 0 ? 1 : 0
  const max = value >= 100

  return (
    <div className={`rounded-xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur transition-colors ${max ? 'border-accent/50 shadow-accent/10' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
          <Heart className={`h-3.5 w-3.5 shrink-0 transition-colors ${max ? 'animate-heartbeat fill-accent text-accent' : value ? 'fill-accent/20 text-accent' : ''}`} />
          <span className="truncate">{t('attract.label')}</span>
        </p>
        <p className="flex shrink-0 items-baseline gap-2 text-sm">
          <span key={level} aria-hidden className={`animate-rise-in font-semibold ${max ? 'text-accent-dark' : 'text-slate-600'}`}>{levels[level]}</span>
          <span className="font-bold tabular-nums text-ink">{value} %</span>
        </p>
      </div>

      <div
        role="progressbar"
        aria-label={t('attract.label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% — ${levels[level]}`}
        className="relative mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-accent/50 to-accent transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(value, 2)}%` }}
        >
          {max && <div className="animate-shimmer absolute inset-0 rounded-full" />}
        </div>
        {[25, 50, 75].map((m) => (
          <span key={m} className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: `${m}%` }} />
        ))}
      </div>
    </div>
  )
}

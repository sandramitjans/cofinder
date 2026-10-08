import { Heart } from 'lucide-react'
import { useI18n } from '../context/I18nContext'

/** % de perfil completado (0–100) */
export function attractivenessScore({ name, role, country, offers, needs, superpowers = [] }) {
  let s = 0
  if (name.trim().length >= 3) s += 15
  else if (name.trim()) s += 6
  if (role.trim()) s += 10
  if (country.trim()) s += 10
  s += Math.min(offers.length, 2) * 12.5
  s += Math.min(needs.length, 2) * 12.5
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
    <div className={`rounded-xl border bg-white/90 p-4 shadow-sm backdrop-blur transition-colors ${max ? 'border-brand/40 shadow-brand/10' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-widest text-slate-500">
          <Heart className={`h-3.5 w-3.5 transition-colors ${max ? 'animate-heartbeat fill-brand text-brand' : value ? 'fill-brand/20 text-brand' : ''}`} />
          {t('attract.label')}
        </p>
        <span className="font-mono text-xs font-bold tabular-nums text-slate-400">{value}%</span>
      </div>

      <div
        role="progressbar"
        aria-label={t('attract.label')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% — ${levels[level]}`}
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-accent via-[#f26a1f] to-brand transition-[width] duration-700 ease-out"
          style={{ width: `${Math.max(value, 2)}%` }}
        >
          {max && <div className="animate-shimmer absolute inset-0 rounded-full" />}
        </div>
        {[25, 50, 75].map((m) => (
          <span key={m} className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: `${m}%` }} />
        ))}
      </div>

      <p key={level} aria-hidden className={`animate-rise-in mt-2 font-display text-[15px] italic ${max ? 'font-semibold text-brand' : 'text-slate-600'}`}>
        {levels[level]}
      </p>
    </div>
  )
}

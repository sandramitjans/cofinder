import { Heart } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'

// Número de socio estable a partir del nombre (puro decorado)
const memberNo = (name = '') => {
  const n = [...name].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) % 997, 7)
  return `25·11·${String(100 + (n % 900)).padStart(3, '0')}`
}

/**
 * Tarjeta «VIP Pass» del speed-dating: fondo tinta, toques dorados y rojo corporativo.
 * `animated` la hace entrar girando con un reflejo.
 */
export default function VipCard({ name, role, branch, photo, animated = false, className = '' }) {
  // Durante la animación, el sello «MATCH READY» sustituye a la etiqueta de la tarjeta
  const { t } = useI18n()
  return (
    <div
      className={`relative aspect-[1.586/1] w-full overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-[#24101a] to-[#3a0618] p-5 text-white shadow-2xl shadow-brand/25 ring-1 ring-accent/40 sm:p-6 ${animated ? 'animate-card-flip' : ''} ${className}`}
    >
      {/* Brillos de fondo */}
      <div aria-hidden className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-brand/40 blur-2xl" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
      <Heart aria-hidden className="absolute -bottom-6 right-2 h-40 w-40 rotate-12 fill-brand/25 text-transparent" />
      {animated && (
        <div aria-hidden className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      )}

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1.5 text-sm font-extrabold tracking-tight">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand"><Heart className="h-3.5 w-3.5 fill-white text-white" /></span>
            <span>co<span className="text-accent">finder</span></span>
          </span>
          <span className="font-display text-sm font-semibold italic tracking-wide text-accent sm:text-base">{t('match.pass')}</span>
        </div>

        {/* Chip dorado */}
        <div aria-hidden className="mt-4 grid h-8 w-11 grid-cols-3 gap-px overflow-hidden rounded-md bg-gradient-to-br from-accent to-[#c98f00] p-1 opacity-90">
          {Array.from({ length: 6 }, (_, i) => <span key={i} className="rounded-[1px] bg-black/15" />)}
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-3">
            {photo && <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-accent sm:h-14 sm:w-14" />}
            <div className="min-w-0">
              <p className="truncate font-display text-2xl font-semibold leading-tight sm:text-[1.75rem]">{name || '—'}</p>
              <p className="mt-0.5 truncate text-xs text-white/75 sm:text-sm">{[role, branch].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] tracking-wider text-white/60">{t('match.member')} {memberNo(name)}</span>
            {!animated && <span className="rounded-full bg-brand px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">{t('match.ready')}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

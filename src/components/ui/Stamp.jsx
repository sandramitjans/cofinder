import { useId } from 'react'

/**
 * Sello de tinta en rojo corporativo, a dos líneas: «PROFIL VALIDÉ / ♥ & MATCH READY ! ♥».
 * Borde doble y textura irregular (filtro SVG). `animated` lo hace caer con impacto.
 */
export default function Stamp({ top, bottom, label, size = 'lg', animated = false, className = '' }) {
  const filterId = useId().replace(/:/g, '')
  const sizes = {
    sm: { box: 'px-3 py-1.5 border-[3px] outline-[1.5px] outline-offset-2', top: 'text-xs', bottom: 'text-[9px]' },
    md: { box: 'px-5 py-2.5 border-4 outline-2 outline-offset-[3px]', top: 'text-lg sm:text-xl', bottom: 'text-[11px] sm:text-xs' },
    lg: { box: 'px-7 py-3.5 border-[6px] outline-[3px] outline-offset-4', top: 'text-3xl sm:text-4xl', bottom: 'text-sm sm:text-base' },
  }[size]

  return (
    <span className={`relative inline-block ${className}`}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
          <feComponentTransfer><feFuncA type="discrete" tableValues="0 1 1 1 1 1 0.85 1" /></feComponentTransfer>
        </filter>
      </svg>
      {animated && <span aria-hidden className={`animate-ink-ring absolute inset-0 -rotate-12 rounded-xl border-4 border-brand`} />}
      <span
        role="img"
        aria-label={label}
        style={{ filter: `url(#${filterId})` }}
        className={`inline-flex -rotate-12 flex-col items-center rounded-xl border-brand bg-white/60 text-center font-extrabold uppercase leading-none text-brand outline outline-brand ${sizes.box} ${animated ? 'animate-stamp' : ''}`}
      >
        <span className={`tracking-[0.12em] ${sizes.top}`}>{top}</span>
        <span className={`mt-1 tracking-[0.2em] ${sizes.bottom}`}>♥ {bottom} ♥</span>
      </span>
    </span>
  )
}

import { useEffect, useRef } from 'react'
import { useI18n } from '../context/I18nContext'
import Logo from '../components/ui/Logo'
import Stamp from '../components/ui/Stamp'
import VipCard from '../components/ui/VipCard'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Corazones que salen del sello: desplazamiento horizontal, giro y retardo
const HEARTS = [
  { x: '8%', dx: '-60px', rot: '-25deg', delay: 1350, size: 'text-2xl', color: 'text-brand' },
  { x: '22%', dx: '-20px', rot: '15deg', delay: 1450, size: 'text-lg', color: 'text-accent' },
  { x: '40%', dx: '10px', rot: '-10deg', delay: 1400, size: 'text-3xl', color: 'text-brand' },
  { x: '58%', dx: '30px', rot: '20deg', delay: 1500, size: 'text-xl', color: 'text-accent' },
  { x: '74%', dx: '55px', rot: '-15deg', delay: 1380, size: 'text-2xl', color: 'text-brand' },
  { x: '88%', dx: '80px', rot: '30deg', delay: 1550, size: 'text-lg', color: 'text-brand' },
]

/**
 * Validación del perfil: entra la tarjeta VIP girando, la recorre un reflejo, cae el sello
 * «PROFIL VALIDÉ & MATCH READY !», salen corazones y se pasa a la pantalla de espera.
 * Línea de tiempo: 0 tarjeta · 750 reflejo · 1100 sello · 1350 corazones · 1800 éxito · 4300 salida
 */
export default function MatchScene({ profile, onDone }) {
  const { t, country } = useI18n()
  const done = useRef(onDone)
  done.current = onDone

  useEffect(() => {
    const timer = setTimeout(() => done.current(), reducedMotion() ? 1500 : 4300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="vip-glow flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-white to-brand-soft px-5 py-10" aria-live="polite">
      <div className="mb-10 animate-rise-in"><Logo /></div>

      <div className="relative w-full max-w-sm">
        <VipCard animated photo={profile?.photo} name={profile?.name} role={profile?.role} branch={profile && country(profile.country)} />

        {/* Corazones */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-6">
          {HEARTS.map((h, i) => (
            <span
              key={i}
              className={`animate-heart absolute ${h.size} ${h.color}`}
              style={{ left: h.x, '--dx': h.dx, '--rot': h.rot, animationDelay: `${h.delay}ms` }}
            >
              ♥
            </span>
          ))}
        </div>

        {/* Sello */}
        <div className="pointer-events-none absolute -bottom-10 -right-3 sm:-right-12">
          <Stamp animated size="md" top={t('match.stampTop')} bottom={t('match.stampBottom')} label={t('match.stampLabel')} />
        </div>
      </div>

      <div className="mt-20 flex flex-col items-center text-center">
        <svg viewBox="0 0 48 48" className="h-14 w-14 animate-rise-in [animation-delay:1750ms]" aria-hidden>
          <circle cx="24" cy="24" r="22" className="fill-accent" />
          <path d="M15 24.5l6 6 12-13" fill="none" stroke="#12121a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="animate-draw" />
        </svg>
        <h1 className="mt-4 animate-rise-in font-display text-2xl font-bold italic tracking-tight [animation-delay:1900ms] sm:text-3xl">{t('match.title')}</h1>
        <p className="mt-2 animate-rise-in text-slate-600 [animation-delay:2050ms]">{t('match.text')}</p>
      </div>
    </div>
  )
}

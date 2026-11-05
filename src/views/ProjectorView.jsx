import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Coffee, Expand, MapPin, PartyPopper, Smartphone, TimerOff } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { JOIN_HASH, PAUSE_AFTER_ROUND, PAUSE_MINUTES, PUBLIC_URL, ROUND_MINUTES, VIEWS } from '../constants'
import { roleOf } from '../lib/matching'
import { useCountdown } from '../lib/useCountdown'
import { useConnected } from '../lib/useConnected'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'

const GRID = { 1: 'lg:grid-cols-1 max-w-2xl', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' }
// Teclas para avanzar / retroceder (los mandos de presentación envían PageDown / PageUp)
const NEXT_KEYS = [' ', 'ArrowRight', 'PageDown', 'Enter']
const BACK_KEYS = ['ArrowLeft', 'PageUp']

/**
 * Pantalla grande de la sala. Solo accesible desde el panel de moderadora.
 * Cada tour: portada «Tour n» → anuncio de cada match (tema, mesa y tarjetas con foto) →
 * todas las mesas con la cuenta atrás de 15 min → «Tiempo terminado» (nota de audio). Tras la ronda 3, pausa.
 * La moderadora avanza con un clic, la barra espaciadora, las flechas o un mando de presentación.
 */
export default function ProjectorView() {
  const { navigate, participants, event, currentRound, advance, stepBack } = useApp()
  const { t, topic, country } = useI18n()
  const byId = new Map(participants.map((p) => [p.id, p]))
  const expertMode = participants.some((p) => p.offers?.length)
  const total = event.rounds.length

  const pausing = !!currentRound?.pauseStartedAt && !event.finished
  const talking = !!currentRound?.startedAt && !pausing && !event.finished
  const timer = useCountdown(talking ? currentRound.startedAt : null)
  const pauseTimer = useCountdown(pausing ? currentRound.pauseStartedAt : null, PAUSE_MINUTES)

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('button, input, select, textarea')) return
      if (NEXT_KEYS.includes(e.key)) { e.preventDefault(); advance() }
      else if (BACK_KEYS.includes(e.key)) { e.preventDefault(); stepBack() }
      else if (e.key === 'Escape' && !document.fullscreenElement) navigate(VIEWS.MOD_PANEL)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, advance, stepBack])

  const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {})

  let scene
  if (event.finished) {
    scene = (
      <Center>
        <PartyPopper className="h-20 w-20 text-brand-dark" />
        <h1 className="mt-6 font-display text-6xl font-medium tracking-tight">{t('projector.thanks')}</h1>
        <p className="mt-4 text-2xl text-slate-500">{t('projector.summary', { rounds: event.round, people: participants.length })}</p>
      </Center>
    )
  } else if (!currentRound) {
    scene = <JoinScene participants={participants} />
  } else if (pausing) {
    scene = (
      <Center>
        <Coffee className="h-16 w-16 text-accent-dark" />
        <h1 className="mt-4 font-display text-[9rem] font-medium leading-none tracking-tight">{t('projector.pause')}</h1>
        <p className="mt-4 text-2xl text-slate-500">
          {pauseTimer.done ? t('projector.pauseOver') : t('projector.pauseText', { n: event.round + 1 })}
        </p>
        <p className={`mt-10 rounded-2xl px-8 py-4 font-mono text-7xl font-bold tabular-nums ${pauseTimer.done ? 'animate-pulse bg-brand' : 'bg-white text-ink ring-1 ring-slate-200'}`}>
          {pauseTimer.label}
        </p>
      </Center>
    )
  } else if (talking) {
    const n = currentRound.tables.length
    scene = (
      <div key={`talk-${event.round}`} className="flex flex-1 flex-col gap-8">
        <div className="flex items-center justify-center gap-8">
          <span className={`rounded-2xl px-8 py-3 font-mono text-8xl font-bold tabular-nums transition-colors ${
            timer.done ? 'bg-brand' : timer.remaining <= 60_000 ? 'animate-pulse bg-brand' : 'bg-white text-ink ring-1 ring-slate-200'
          }`}>
            {timer.label}
          </span>
          <div>
            <p className="font-display text-4xl font-medium tracking-tight">{t('projector.inProgress', { n: event.round })}</p>
            <p className="mt-1 text-xl text-slate-500">{event.round < total ? t('projector.nextRound', { n: event.round + 1 }) : t('projector.lastRound')}</p>
          </div>
        </div>
        <div className={`mx-auto grid w-full content-start gap-5 md:grid-cols-2 ${GRID[Math.min(n, 5)]}`}>
          {currentRound.tables.map((tb, i) => (
            <article key={tb.id} className="animate-pop-in overflow-hidden rounded-xl bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-200" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="bg-brand px-5 py-4 text-white">
                <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{t('round.table', { n: tb.id })}</p>
                <h2 className="mt-1 font-display text-2xl font-medium leading-tight tracking-tight xl:text-3xl">{topic(tb.topic)}</h2>
              </div>
              <ul className="space-y-3 p-5">
                {tb.members.map((id) => {
                  const p = byId.get(id)
                  return p ? (
                    <li key={id} className="flex items-center gap-3">
                      <Avatar name={p.name} photo={p.photo} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">{p.name}</p>
                        <p className="truncate text-sm text-slate-500">{country(p.country)}</p>
                      </div>
                    </li>
                  ) : null
                })}
              </ul>
            </article>
          ))}
        </div>

        {/* Al llegar a cero: aviso de cambio de mesa hasta que la moderadora pase al siguiente tour */}
        {timer.done && (
          <div className="fixed inset-0 z-20 grid place-items-center bg-paper/95 text-center text-ink animate-view-in">
            <div className="flex flex-col items-center">
              <TimerOff className="h-16 w-16 text-brand" />
              <p className="mt-4 font-display text-8xl font-medium tracking-tight">{t('projector.timeUp')}</p>
              <p className="mt-4 text-3xl text-slate-600">
                {event.round === total ? t('projector.lastDone') : event.round === currentPauseRound(total) ? t('projector.toPause') : t('projector.changeTables', { n: event.round + 1 })}
              </p>
            </div>
          </div>
        )}
      </div>
    )
  } else if (currentRound.revealed > 0) {
    // Anuncio de un match: tema en grande, número de mesa y las tarjetas de quienes se sientan en ella
    const k = currentRound.revealed
    const tb = currentRound.tables[k - 1]
    const people = tb.members.map((id) => byId.get(id)).filter(Boolean)
    const width = people.length >= 5 ? 'w-[clamp(9rem,15vw,15rem)]' : people.length === 4 ? 'w-[clamp(10rem,18vw,17rem)]' : 'w-[clamp(11rem,21vw,19rem)]'
    scene = (
      <div key={`reveal-${event.round}-${k}`} className="flex flex-1 flex-col items-center">
        <p className="animate-rise-in text-lg font-semibold uppercase tracking-[0.25em] text-slate-500">{t('projector.match', { r: event.round, k })}</p>
        <h1 className="mt-2 animate-rise-in text-balance text-center font-display text-7xl font-medium leading-none tracking-tight [animation-delay:100ms] xl:text-8xl">{topic(tb.topic)}</h1>
        <span className="mt-6 inline-flex animate-rise-in items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-2xl font-semibold text-white [animation-delay:250ms]">
          <MapPin className="h-6 w-6" /> {t('round.table', { n: tb.id })}
        </span>
        <div className="mt-10 flex flex-wrap items-start justify-center gap-6">
          {people.map((p, i) => (
            <div key={p.id} className={`animate-pop-in ${width}`} style={{ animationDelay: `${450 + i * 160}ms` }}>
              <PersonCard person={p} branch={country(p.country)} />
              {expertMode && <div className="mt-3 text-center"><RoleBadge role={roleOf(p, tb.topic)} size="lg" /></div>}
            </div>
          ))}
        </div>
        <div className="mt-auto flex gap-2 pt-8" aria-hidden>
          {currentRound.plan.map((_, i) => <span key={i} className={`h-3 w-3 rounded-full ${i < k ? 'bg-brand' : 'bg-slate-200'}`} />)}
        </div>
      </div>
    )
  } else {
    // Portada del tour
    scene = (
      <Center key={`intro-${event.round}`}>
        <p className="animate-rise-in text-2xl font-semibold uppercase tracking-[0.35em] text-brand-dark">{t('projector.roundLabel')}</p>
        <p className="animate-rise-in font-display text-[16rem] font-bold leading-[0.85] tracking-tighter [animation-delay:120ms]">
          {event.round}<span className="text-7xl font-medium tracking-normal text-slate-400"> / {total}</span>
        </p>
        <p className="mt-6 animate-rise-in text-3xl text-slate-500 [animation-delay:260ms]">{t('projector.tablesInfo', { n: currentRound.plan.length, min: ROUND_MINUTES })}</p>
        <div className="mt-8 flex gap-2" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-2 w-14 rounded-full ${i + 1 < event.round ? 'bg-brand/40' : i + 1 === event.round ? 'bg-brand' : 'bg-slate-200'}`} />
          ))}
        </div>
      </Center>
    )
  }

  return (
    <div className="vip-glow group flex min-h-dvh flex-col bg-paper">
      <header className="flex items-center justify-between gap-4 px-8 py-6">
        <Logo size="lg" />
        {event.round > 0 && !event.finished && (
          <div className="flex items-center gap-3">
            {!talking && !pausing && currentRound.revealed > 0 && (
              <span className="rounded-full bg-white px-5 py-2 text-lg font-semibold ring-1 ring-slate-200">
                {t('projector.matchOf', { k: currentRound.revealed, n: currentRound.plan.length })}
              </span>
            )}
            <span className="rounded-full bg-brand px-5 py-2 text-lg font-bold">{t('projector.roundOf', { n: event.round, total })}</span>
          </div>
        )}
      </header>

      {/* Controles discretos: aparecen al pasar el ratón */}
      <div className="fixed bottom-5 left-1/2 z-30 flex w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center whitespace-nowrap justify-center gap-2 rounded-2xl bg-white/90 px-3 py-2 shadow-lg ring-1 ring-slate-200 backdrop-blur opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <LangSwitch />
        <button onClick={() => navigate(VIEWS.MOD_PANEL)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow ring-1 ring-slate-200"><ArrowLeft className="h-3.5 w-3.5" /> {t('projector.panel')}</button>
        <button onClick={fullscreen} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow ring-1 ring-slate-200"><Expand className="h-3.5 w-3.5" /> {t('projector.fullscreen')}</button>
        <div className="flex gap-2 border-l border-slate-200 pl-2">
          <button onClick={stepBack} aria-label={t('projector.back')} className="rounded-lg bg-white p-2 shadow ring-1 ring-slate-200"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={advance} className="flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-xs font-semibold shadow">{t('projector.nextStep')} <ChevronRight className="h-4 w-4" /></button>
        </div>
        <p className="pl-1 text-[11px] text-slate-500">{t('projector.keysHint')}</p>
      </div>

      <main className="flex flex-1 flex-col px-8 pb-8">{scene}</main>

      {talking && (
        <div className="h-2 bg-slate-200">
          <div className="h-full bg-brand transition-all duration-1000" style={{ width: `${timer.progress * 100}%` }} />
        </div>
      )}
    </div>
  )
}

/**
 * Antes de la ronda 1: QR para conectar el móvil (…/#entrar → nombre + código).
 * Las fotos se encienden a medida que cada persona se conecta.
 */
function JoinScene({ participants }) {
  const { t, country } = useI18n()
  const isOn = useConnected()
  const url = `${(PUBLIC_URL || window.location.origin + window.location.pathname).replace(/#.*$/, '')}${JOIN_HASH}`
  const [qr, setQr] = useState(null)
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 640, errorCorrectionLevel: 'M', color: { dark: '#16161D', light: '#FFFFFF' } })
      .then(setQr).catch(() => setQr(null))
  }, [url])
  const on = isOn ? participants.filter((p) => isOn(p.id)).length : 0
  const steps = [t('join.step1'), t('join.step2'), t('join.step3')]

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 animate-view-in">
      <div className="flex w-full max-w-6xl flex-col items-center gap-12 lg:flex-row lg:justify-center">
        <div className="max-w-xl text-center lg:text-left">
          <p className="text-xl font-semibold uppercase tracking-[0.3em] text-brand-dark">{t('projector.welcome')} Cofinder</p>
          <h1 className="mt-3 font-display text-7xl font-medium leading-none tracking-tight">{t('join.title')}</h1>
          <ol className="mt-10 space-y-5 text-left">
            {steps.map((txt, i) => (
              <li key={i} className="flex items-center gap-4 text-2xl text-slate-700">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand font-display text-2xl font-bold text-white">{i + 1}</span>
                {txt}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-lg text-slate-500">{t('join.orGo')} <span className="font-mono font-semibold text-ink">{url.replace(/^https?:\/\//, '')}</span></p>
        </div>
        <div className="shrink-0 rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10 ring-1 ring-slate-200">
          {qr ? <img src={qr} alt={url} className="h-[min(26rem,42vh)] w-[min(26rem,42vh)]" /> : <div className="h-[min(26rem,42vh)] w-[min(26rem,42vh)]" />}
        </div>
      </div>

      {isOn ? (
        <p className="flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xl font-semibold ring-1 ring-slate-200">
          <Smartphone className="h-5 w-5 text-mint-dark" /> {t('join.connected', { n: on, total: participants.length })}
        </p>
      ) : (
        <p className="text-base text-slate-500">{t('join.localNote')}</p>
      )}

      <div className="flex max-w-6xl flex-wrap justify-center gap-4">
        {participants.map((p) => {
          const lit = !isOn || isOn(p.id)
          return (
            <div key={p.id} className={`relative flex w-24 flex-col items-center gap-1.5 text-center transition duration-500 ${lit ? '' : 'opacity-35 grayscale'}`}>
              <Avatar name={p.name} photo={p.photo} size="lg" />
              {isOn && lit && (
                <span className="animate-pop-in absolute right-3 top-0 grid h-6 w-6 place-items-center rounded-full bg-mint-dark text-white ring-2 ring-paper"><Check className="h-4 w-4" /></span>
              )}
              <span className="text-sm font-semibold leading-tight">{p.name.split(' ')[0]}</span>
              <span className="-mt-1 truncate text-xs text-slate-400">{country(p.country)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Tour tras el que se hace la pausa (si el plan es lo bastante largo)
function currentPauseRound(total) {
  return total > PAUSE_AFTER_ROUND ? PAUSE_AFTER_ROUND : -1
}

/** Tarjeta blanca de una persona en el anuncio de su mesa */
function PersonCard({ person, branch }) {
  return (
    <article className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <Avatar name={person.name} photo={person.photo} size="xl" className="!rounded-full" />
      <p className="mt-4 font-display text-2xl font-medium leading-tight">{person.name}</p>
      {person.role && <p className="mt-1 text-base text-slate-600">{person.role}</p>}
      {branch && <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" /> {branch}</p>}
    </article>
  )
}

function Center({ children }) {
  return <div className="flex flex-1 flex-col items-center justify-center text-center animate-view-in">{children}</div>
}

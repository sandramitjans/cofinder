import { useEffect } from 'react'
import { ArrowLeft, Expand, PartyPopper } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { TOTAL_ROUNDS, VIEWS } from '../constants'
import { roleOf } from '../lib/matching'
import { useCountdown } from '../lib/useCountdown'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'

const GRID = { 1: 'lg:grid-cols-1 max-w-2xl', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-2 2xl:grid-cols-4' }

/** Pantalla grande: mesas de la ronda actual. Solo accesible desde el panel de moderadora. */
export default function ProjectorView() {
  const { navigate, participants, event, currentRound } = useApp()
  const { t, topic, country } = useI18n()
  const timer = useCountdown(event.finished ? null : currentRound?.startedAt)
  const byId = new Map(participants.map((p) => [p.id, p]))

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !document.fullscreenElement && navigate(VIEWS.MOD_PANEL)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const fullscreen = () => document.documentElement.requestFullscreen?.().catch(() => {})

  return (
    <div className="group flex min-h-dvh flex-col bg-slate-50">
      <header className="flex items-center justify-between gap-4 px-8 py-6">
        <Logo size="lg" />
        {event.round > 0 && !event.finished && (
          <div className="flex items-center gap-6">
            <span className="rounded-full bg-accent px-5 py-2 text-lg font-bold text-ink">{t('projector.roundOf', { n: event.round, total: TOTAL_ROUNDS })}</span>
            <span className={`rounded-xl px-5 py-2 font-mono text-4xl font-bold tabular-nums ${timer.done ? 'animate-pulse bg-brand text-white' : 'bg-ink text-white'}`}>
              {timer.label}
            </span>
          </div>
        )}
      </header>

      {/* Controles discretos: aparecen al pasar el ratón */}
      <div className="fixed right-4 top-24 z-10 flex flex-col items-end gap-2 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
        <LangSwitch />
        <button onClick={() => navigate(VIEWS.MOD_PANEL)} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow ring-1 ring-slate-200"><ArrowLeft className="h-3.5 w-3.5" /> {t('projector.panel')}</button>
        <button onClick={fullscreen} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium shadow ring-1 ring-slate-200"><Expand className="h-3.5 w-3.5" /> {t('projector.fullscreen')}</button>
      </div>

      <main className="flex flex-1 flex-col px-8 pb-8">
        {event.finished ? (
          <Center>
            <PartyPopper className="h-20 w-20 text-brand" />
            <h1 className="mt-6 text-6xl font-extrabold tracking-tight">{t('projector.thanks')}</h1>
            <p className="mt-4 text-2xl text-slate-500">{t('projector.summary', { rounds: event.round, people: participants.length })}</p>
          </Center>
        ) : !currentRound ? (
          <Center>
            <h1 className="text-6xl font-extrabold tracking-tight">{t('projector.welcome')} <span className="text-brand">Cofinder</span></h1>
            <p className="mt-4 text-2xl text-slate-500">{t('projector.soon')}</p>
            <div className="mt-12 flex max-w-5xl flex-wrap justify-center gap-4">
              {participants.map((p, i) => (
                <div key={p.id} className="animate-pop-in flex w-28 flex-col items-center gap-2 text-center" style={{ animationDelay: `${i * 60}ms` }}>
                  <Avatar name={p.name} photo={p.photo} size="lg" />
                  <span className="text-sm font-semibold leading-tight">{p.name.split(' ')[0]}</span>
                  <span className="-mt-1 text-xs text-slate-400">{country(p.country)}</span>
                </div>
              ))}
            </div>
          </Center>
        ) : (
          <div key={event.round} className={`mx-auto grid w-full flex-1 content-center gap-6 md:grid-cols-2 ${GRID[Math.min(currentRound.tables.length, 4)]}`}>
            {currentRound.tables.map((tb, i) => (
              <article key={tb.id} className="animate-pop-in overflow-hidden rounded-xl bg-white shadow-lg shadow-slate-900/5 ring-1 ring-slate-200" style={{ animationDelay: `${i * 120}ms` }}>
                <div className="bg-brand px-6 py-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-widest text-white/70">{t('round.table', { n: tb.id })}</p>
                  <h2 className="mt-1 text-3xl font-extrabold leading-tight tracking-tight">{topic(tb.topic)}</h2>
                </div>
                <ul className="space-y-4 p-6">
                  {tb.members.map((id) => {
                    const p = byId.get(id)
                    return p ? (
                      <li key={id} className="flex items-center gap-4">
                        <Avatar name={p.name} photo={p.photo} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-lg font-semibold">{p.name}</p>
                          <p className="truncate text-sm text-slate-500">{country(p.country)}</p>
                        </div>
                        <RoleBadge role={roleOf(p, tb.topic)} className="text-xs" />
                      </li>
                    ) : null
                  })}
                </ul>
              </article>
            ))}
          </div>
        )}
      </main>

      {currentRound && !event.finished && (
        <div className="h-2 bg-slate-200">
          <div className="h-full bg-brand transition-all duration-1000" style={{ width: `${timer.progress * 100}%` }} />
        </div>
      )}
    </div>
  )
}

function Center({ children }) {
  return <div className="flex flex-1 flex-col items-center justify-center text-center animate-view-in">{children}</div>
}

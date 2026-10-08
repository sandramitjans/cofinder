import { useMemo } from 'react'
import {
  AlertTriangle, CheckCircle2, Flag, LayoutGrid, Lock, Monitor, Play, RefreshCcw, RotateCcw, Shuffle, TimerReset,
  Trash2, UserPlus, Users, UsersRound,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { TOTAL_ROUNDS, VIEWS } from '../constants'
import { roleOf, roundStats, tableSizes } from '../lib/matching'
import { useCountdown } from '../lib/useCountdown'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'
import { SUPERPOWERS } from '../constants'

export default function ModeratorPanelView() {
  const {
    navigate, lockModerator, participants, currentUser, event, currentRound,
    startNextRound, regenerateRound, restartTimer, finishEvent, resetEvent,
    removeParticipant, seedDemo, clearDemo,
  } = useApp()
  const { t, topic, country, superpower } = useI18n()
  const timer = useCountdown(event.finished ? null : currentRound?.startedAt)
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const sizes = tableSizes(participants.length)
  const stats = currentRound ? roundStats(currentRound, event.rounds.slice(0, event.round - 1), byId) : null
  const hasDemo = participants.some((p) => p.demo)
  const live = event.round > 0 && !event.finished

  // Personas registradas después de generar la ronda actual (todavía sin mesa)
  const seated = new Set(currentRound?.tables.flatMap((x) => x.members) ?? [])
  const unseated = live ? participants.filter((p) => !seated.has(p.id)) : []

  const confirmThen = (msg, fn) => () => window.confirm(msg) && fn()
  const status = event.finished ? t('panel.statusDone') : event.round ? t('panel.statusLive', { n: event.round }) : t('panel.statusReady')

  return (
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-20 bg-ink text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo inverted />
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">{t('panel.badge')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch dark />
            <Button variant="accent" icon={Monitor} onClick={() => navigate(VIEWS.PROJECTOR)} className="py-2">{t('panel.projector')}</Button>
            <button onClick={lockModerator} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
              <Lock className="h-4 w-4" /> <span className="hidden sm:inline">{t('panel.lock')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Control de rondas */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand">{t('panel.control')}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{status}</h1>
              </div>
              {live && (
                <div className={`rounded-xl px-4 py-2 text-right ${timer.done ? 'bg-accent' : 'bg-ink text-white'}`}>
                  <p className="font-mono text-3xl font-bold tabular-nums">{timer.done ? '00:00' : timer.label}</p>
                  <p className="text-[11px] font-medium opacity-70">{timer.done ? t('panel.timeUp') : t('panel.remaining')}</p>
                </div>
              )}
            </div>

            <ol className="mt-6 grid grid-cols-3 gap-2">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => {
                const n = i + 1
                const done = n < event.round || (event.finished && n <= event.round)
                const current = n === event.round && !event.finished
                return (
                  <li key={n} className={`rounded-xl border-2 px-3 py-2.5 text-sm ${
                    current ? 'border-brand bg-brand-soft' : done ? 'border-transparent bg-slate-100' : 'border-dashed border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between font-semibold">
                      {t('panel.round', { n })}
                      {done && <CheckCircle2 className="h-4 w-4 text-slate-400" />}
                      {current && <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />}
                    </div>
                    {current && (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white">
                        <div className="h-full bg-brand transition-all duration-1000" style={{ width: `${timer.progress * 100}%` }} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>

            <div className="mt-6 flex flex-wrap gap-2">
              {!event.round && (
                <Button icon={Play} onClick={startNextRound} disabled={participants.length < 2}>{t('panel.start', { n: 1 })}</Button>
              )}
              {live && event.round < TOTAL_ROUNDS && (
                <Button icon={Play} onClick={confirmThen(t('panel.confirmNext', { n: event.round + 1 }), startNextRound)}>
                  {t('panel.start', { n: event.round + 1 })}
                </Button>
              )}
              {live && event.round === TOTAL_ROUNDS && (
                <Button icon={Flag} onClick={confirmThen(t('panel.confirmFinish'), finishEvent)}>{t('panel.finish')}</Button>
              )}
              {live && (
                <>
                  <Button variant="outline" icon={Shuffle} onClick={confirmThen(t('panel.confirmRegenerate'), regenerateRound)}>{t('panel.regenerate')}</Button>
                  <Button variant="outline" icon={TimerReset} onClick={restartTimer}>{t('panel.restartTimer')}</Button>
                </>
              )}
              {event.round > 0 && (
                <Button variant="ghost" icon={RotateCcw} onClick={confirmThen(t('panel.confirmReset'), resetEvent)}>{t('panel.reset')}</Button>
              )}
            </div>

            {participants.length > 0 && participants.length < 6 && !event.round && <Notice>{t('panel.fewPeople')}</Notice>}
            {unseated.length > 0 && <Notice>{t('panel.unseated', { n: unseated.length })}</Notice>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat icon={Users} label={t('panel.registered')} value={participants.length} />
            <Stat
              icon={LayoutGrid}
              label={t('panel.tablesPerRound')}
              value={sizes.length || '—'}
              hint={sizes.length ? t('panel.tableSizes', { sizes: [...new Set(sizes)].join(t('panel.and')) }) : null}
            />
            {stats && (
              <div className="col-span-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('panel.quality', { n: event.round })}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <Quality ok={!stats.repeatedPairs} label={t('panel.repeatedPairs')} value={stats.repeatedPairs} />
                  <Quality ok={!stats.repeatedTopics} label={t('panel.repeatedTopics')} value={stats.repeatedTopics} />
                  <Quality ok={!stats.tablesWithoutExpert} label={t('panel.noExpert')} value={stats.tablesWithoutExpert} />
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Mesas de la ronda actual */}
        {currentRound && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><UsersRound className="h-5 w-5 text-brand" /> {t('panel.tablesTitle', { n: event.round })}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentRound.tables.map((tb) => (
                <div key={tb.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                  <p className="text-xs font-semibold text-slate-400">{t('panel.table', { n: tb.id })}</p>
                  <p className="text-lg font-bold text-brand">{topic(tb.topic)}</p>
                  <ul className="mt-3 space-y-2">
                    {tb.members.map((id) => {
                      const p = byId.get(id)
                      return p ? (
                        <li key={id} className="flex items-center gap-2 text-sm">
                          <Avatar name={p.name} size="sm" />
                          <span className="min-w-0 flex-1 truncate">
                            {p.name}{p.id === currentUser?.id && <span className="ml-1 text-xs text-slate-400">({t('panel.you')})</span>}
                          </span>
                          <RoleBadge role={roleOf(p, tb.topic)} />
                        </li>
                      ) : null
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Participantes */}
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-brand" /> {t('panel.participants', { n: participants.length })}</h2>
            {hasDemo
              ? <Button variant="ghost" icon={RefreshCcw} className="py-2" onClick={confirmThen(t('panel.confirmClearDemo'), clearDemo)}>{t('panel.clearDemo')}</Button>
              : <Button variant="outline" icon={UserPlus} className="py-2" onClick={seedDemo}>{t('panel.addDemo')}</Button>}
          </div>

          {participants.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">{t('panel.empty')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {participants.map((p) => (
                <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 items-center gap-3 sm:w-64">
                    <Avatar name={p.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {p.name}
                        {p.id === currentUser?.id && <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold">{t('panel.youBadge')}</span>}
                        {p.demo && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{t('panel.demoBadge')}</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{p.role} · {country(p.country)}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {p.offers.map((x) => <span key={x} className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">{topic(x)}</span>)}
                    {p.needs.map((x) => <span key={x} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-slate-700">{topic(x)}</span>)}
                    {(p.superpowers ?? []).map((x) => (
                      <span key={x} title={superpower(x)} className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-medium text-white">
                        {SUPERPOWERS.find((sp) => sp.id === x)?.emoji} {superpower(x)}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={confirmThen(t('panel.confirmRemove', { name: p.name }), () => removeParticipant(p.id))}
                    className="self-end rounded-lg p-2 text-slate-400 hover:bg-brand-soft hover:text-brand sm:self-auto"
                    aria-label={t('panel.remove', { name: p.name })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="flex items-center gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand" /> {t('panel.legendOffer')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" /> {t('panel.legendNeed')}</span>
          </p>
        </section>
      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400"><Icon className="h-3.5 w-3.5" /> {label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

function Quality({ ok, label, value }) {
  return (
    <li className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        {ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />} {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  )
}

function Notice({ children }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-sm text-slate-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {children}
    </p>
  )
}

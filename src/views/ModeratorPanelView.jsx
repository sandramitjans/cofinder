import { useMemo, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Coffee, Eraser, Flag, LayoutGrid, Loader2, Lock, Monitor,
  MessagesSquare, PencilLine, Plus, RefreshCcw, RotateCcw, Shuffle, Sparkles, TimerReset, Trash2, UserPlus, Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { FAMILY_EMOJI, FIND_MINUTES, MAX_INTERESTS, PAUSE_AFTER_ROUND, PAUSE_MINUTES, TOPIC_FAMILIES, VIEWS } from '../constants'
import { familyTone } from '../lib/familyColors'
import { planStats, tableRange } from '../lib/matching'
import { MAX_CUSTOM_LENGTH, hasTopic, isMandatory, makeEventTopic, myTopics, topicKey } from '../lib/topics'
import { useCountdown } from '../lib/useCountdown'
import { useConnected } from '../lib/useConnected'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'
import { SUPERPOWERS } from '../constants'

// Objetivo de temas del evento (los contadores solo avisan)
const MANDATORY_TARGET = 4
const OPTIONAL_TARGET = 13

export default function ModeratorPanelView() {
  const {
    navigate, lockModerator, participants, currentUser, event, currentRound,
    planning, generatePlan, regeneratePlanRound, swapSeats, moveSeat,
    advance, stepBack, restartTimer, finishEvent, resetEvent, clearPlan,
    removeParticipant, seedDemo, clearDemo, readyCount, readyTotal, notedCount, notedTotal,
    eventTopics, addEventTopic, removeEventTopic,
  } = useApp()
  const { t, topic, country, superpower } = useI18n()
  const isOn = useConnected() // quién tiene la app abierta en el móvil (null en modo local)
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const hasDemo = participants.some((p) => p.demo)
  const hasPlan = event.rounds.length > 0
  const live = event.round > 0 && !event.finished
  const total = event.rounds.length
  const stats = useMemo(() => (hasPlan ? planStats(event.rounds.map((r) => ({ tables: r.plan })), byId) : null), [hasPlan, event.rounds, byId])
  const [kMin, kMax] = tableRange(participants.length)

  // Fase del tour en pantalla
  const r = live ? currentRound : null
  const timer = useCountdown(r?.startedAt && !r.pauseStartedAt ? r.startedAt : null)
  const findTimer = useCountdown(r?.startedAt && !r.pauseStartedAt ? r.startedAt - FIND_MINUTES * 60_000 : null, FIND_MINUTES)
  const phase = !r ? null : r.pauseStartedAt ? 'pause' : r.startedAt ? (findTimer.done ? 'talk' : 'find') : r.revealed ? 'reveal' : 'intro'
  const pauseTimer = useCountdown(phase === 'pause' ? r.pauseStartedAt : null, PAUSE_MINUTES)
  const shownTimer = phase === 'pause' ? pauseTimer : phase === 'find' ? findTimer : timer

  // Qué hará el botón «Suivant»
  let nextLabel = t('panel.launch')
  if (event.finished) nextLabel = null
  else if (r) {
    if (!r.startedAt) nextLabel = t('panel.nextTimer')
    else if (phase === 'find') nextLabel = t('panel.skipFind')
    else if (phase === 'talk' && !timer.done) nextLabel = t('panel.endTalk')
    else if (event.round === PAUSE_AFTER_ROUND && event.round < total && !r.pauseStartedAt) nextLabel = t('panel.nextPause')
    else if (event.round < total) nextLabel = t('panel.nextRound', { n: event.round + 1 })
    else nextLabel = t('panel.finish')
  }

  // Personas inscritas después de generar el plan (sin mesa en los tours que faltan)
  const planned = new Set(event.rounds.slice(Math.max(0, event.round)).flatMap((x) => x.plan.flatMap((tb) => tb.members)))
  const unplanned = hasPlan && !event.finished && event.round < total ? participants.filter((p) => !planned.has(p.id)) : []

  const confirmThen = (msg, fn) => () => window.confirm(msg) && fn()
  const status = event.finished ? t('panel.statusDone')
    : live ? t(`panel.phase.${phase}`, { n: event.round, k: r.revealed, total: r.plan.length })
      : hasPlan ? t('panel.statusPlanned') : t('panel.statusReady')

  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark">{t('panel.badge')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LangSwitch />
            <Button icon={Monitor} onClick={() => navigate(VIEWS.PROJECTOR)} className="py-2">{t('panel.projector')}</Button>
            <button onClick={lockModerator} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">
              <Lock className="h-4 w-4" /> <span className="hidden sm:inline">{t('panel.lock')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        {/* Control de la soirée */}
        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">{t('panel.control')}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{status}</h1>
              </div>
              {(phase === 'talk' || phase === 'pause' || phase === 'find') && (
                <div className={`rounded-xl px-4 py-2 text-right ${shownTimer.done ? 'bg-brand' : 'bg-brand-soft text-brand-dark'}`}>
                  <p className="font-mono text-3xl font-bold tabular-nums">{shownTimer.label}</p>
                  <p className="text-[11px] font-medium opacity-70">{shownTimer.done ? t('panel.timeUp') : phase === 'pause' ? t('panel.pauseLeft') : phase === 'find' ? t('panel.findLeft') : t('panel.remaining')}</p>
                </div>
              )}
            </div>

            {hasPlan && (
              <ol className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-8">
                {event.rounds.map((_, i) => {
                  const n = i + 1
                  const done = n < event.round || (event.finished && n <= event.round)
                  const current = n === event.round && !event.finished
                  return (
                    <li key={n} className={`relative rounded-xl border-2 px-2 py-2 text-center text-sm ${
                      current ? 'border-brand bg-brand-soft' : done ? 'border-transparent bg-slate-100' : 'border-dashed border-slate-200'
                    }`}>
                      <span className="font-semibold">{n}</span>
                      {done && <CheckCircle2 className="absolute right-1 top-1 h-3.5 w-3.5 text-slate-400" />}
                      {current && <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-brand" />}
                      {n === PAUSE_AFTER_ROUND && n < total && <Coffee className="absolute -right-2 top-1/2 z-10 h-4 w-4 -translate-y-1/2 rounded-full bg-white text-accent-dark" aria-label={t('panel.pauseMark')} />}
                    </li>
                  )
                })}
              </ol>
            )}

            {hasPlan && !event.round && !event.finished && readyTotal > 0 && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-mint-soft px-3.5 py-2.5 text-sm font-semibold text-mint-dark">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('panel.readyCount', { n: readyCount, total: readyTotal })}
              </p>
            )}

            {phase === 'talk' && timer.done && notedTotal > 0 && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-mint-soft px-3.5 py-2.5 text-sm font-semibold text-mint-dark">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('panel.notesCount', { n: notedCount, total: notedTotal })}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {!hasPlan && (
                <Button icon={planning ? Loader2 : Sparkles} onClick={generatePlan} disabled={planning || participants.length < 2} className={planning ? '[&>svg]:animate-spin' : ''}>
                  {planning ? t('panel.planning') : t('panel.generate')}
                </Button>
              )}
              {hasPlan && nextLabel && (
                <Button icon={ChevronRight} onClick={event.round === total && phase === 'talk' && timer.done ? confirmThen(t('panel.confirmFinish'), advance) : advance}>{nextLabel}</Button>
              )}
              {event.round > 0 && (
                <Button variant="outline" icon={ChevronLeft} onClick={stepBack}>{t('panel.back')}</Button>
              )}
              {(phase === 'talk' || phase === 'pause') && (
                <Button variant="outline" icon={TimerReset} onClick={restartTimer}>{t('panel.restartTimer')}</Button>
              )}
              {live && event.round < total && (
                <Button variant="ghost" icon={Flag} onClick={confirmThen(t('panel.confirmFinish'), finishEvent)}>{t('panel.finish')}</Button>
              )}
              {event.round > 0 && (
                <Button variant="ghost" icon={RotateCcw} onClick={confirmThen(t('panel.confirmReset'), resetEvent)}>{t('panel.reset')}</Button>
              )}
            </div>
            {hasPlan && !event.finished && <p className="mt-3 text-xs text-slate-500">{t('panel.keysHint')}</p>}

            {!hasPlan && participants.length > 0 && participants.length < 6 && <Notice>{t('panel.fewPeople')}</Notice>}
            {unplanned.length > 0 && <Notice>{t('panel.unplanned', { n: unplanned.length })}</Notice>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <Stat icon={Users} label={t('panel.registered')} value={participants.length} />
            <Stat
              icon={LayoutGrid}
              label={t('panel.tablesPerRound')}
              value={participants.length >= 2 ? (kMin === kMax ? kMin : `${kMin}–${kMax}`) : '—'}
              hint={participants.length >= 2 ? t('panel.tableSizes') : null}
            />
            {stats && (
              <div className="col-span-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 lg:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('panel.quality')}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <Quality ok={stats.chosenPct >= 80} label={t('panel.chosen')} value={`${stats.chosenPct} %`} />
                  <Quality ok={!stats.repeatedTopics} label={t('panel.repeatedTopics')} value={stats.repeatedTopics} />
                  <Quality ok={!stats.overLimitPairs} label={t('panel.overLimit')} value={stats.overLimitPairs} />
                  <Quality ok label={t('panel.contacts')} value={`${stats.avgContacts.toFixed(1)} / ${Math.max(0, participants.length - 1)}`} />
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* Plan de los 8 tours */}
        {hasPlan && (
          <PlanGrid
            rounds={event.rounds}
            current={event.round}
            finished={event.finished}
            byId={byId}
            planning={planning}
            onRegenerate={regeneratePlanRound}
            onSwap={swapSeats}
            onMove={moveSeat}
            onClear={confirmThen(t('panel.confirmClear'), clearPlan)}
            t={t}
            topic={topic}
          />
        )}

        {/* Mesas del evento: los temas propuestos, que los participantes eligen */}
        <EventTopics
          topics={eventTopics}
          participants={participants}
          onAdd={addEventTopic}
          onRemove={(x) => window.confirm(t('panel.confirmRemoveTopic', { label: topic(x.id) })) && removeEventTopic(x.id)}
          t={t}
          topic={topic}
        />

        {/* Participantes */}
        <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-brand-dark" /> {t('panel.participants', { n: participants.length })}</h2>
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
                    <Avatar name={p.name} photo={p.photo} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {p.name}
                        {p.id === currentUser?.id && <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold">{t('panel.youBadge')}</span>}
                        {p.demo && <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{t('panel.demoBadge')}</span>}
                      </p>
                      <p className="truncate text-xs text-slate-500">{p.role} · {country(p.country)}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {/* Elegidos en rojo suave; los obligatorios (de todo el mundo) no se repiten en cada fila */}
                    {myTopics(p).filter((x) => !isMandatory(x)).map((x) => (
                      <span key={x} className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand-dark">{topic(x)}</span>
                    ))}
                    {(p.superpowers ?? []).map((x) => (
                      <span key={x} title={superpower(x)} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                        {SUPERPOWERS.find((sp) => sp.id === x)?.emoji} {superpower(x)}
                      </span>
                    ))}
                  </div>
                  {p.accessCode && (
                    <span title={t('login.panelCode')} className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2 py-1 font-mono text-sm font-bold tracking-widest sm:self-auto ${isOn?.(p.id) ? 'bg-mint-soft text-mint-dark' : 'bg-slate-100 text-slate-700'}`}>
                      {isOn && <span aria-hidden className={`h-2 w-2 rounded-full ${isOn(p.id) ? 'bg-mint-dark' : 'bg-slate-300'}`} />}
                      {p.accessCode}
                    </span>
                  )}
                  <button
                    onClick={confirmThen(t('panel.confirmRemove', { name: p.name }), () => removeParticipant(p.id))}
                    className="self-end rounded-lg p-2 text-slate-400 hover:bg-accent-soft hover:text-accent-dark sm:self-auto"
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
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-200" /> {t('panel.legendMid')}</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-slate-300" /> {t('panel.legendNeed')}</span>
            <span className="ml-auto">🔑 {t('login.panelHint')}{isOn && <> · {t('join.connected', { n: participants.filter((p) => isOn(p.id)).length, total: participants.length })}</>}</span>
          </p>
        </section>
      </main>
    </div>
  )
}

/**
 * Mesas del evento: la moderadora añade cada tema propuesto con el nombre de quien lo propone
 * (y una descripción opcional) y puede quitarlo. Al lado de cada mesa, cuántas personas la han elegido.
 */
/**
 * Temas del evento: el Admin los añade uno a uno (título, familia, resumen, quién lo propone y tipo).
 * Los obligatorios salen en la pantalla informativa del registro; los «au choix», en el selector.
 * Los contadores 4 / 13 solo avisan: no impiden guardar.
 */
function EventTopics({ topics, participants, onAdd, onRemove, t, topic }) {
  const blank = { label: '', by: '', desc: '', family: '', mandatory: false }
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null) // id del tema que se está editando
  const [exists, setExists] = useState(false)
  const [missingFamily, setMissingFamily] = useState(false)
  const votes = (id) => participants.filter((p) => hasTopic(p, id)).length
  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setExists(false); if (k === 'family') setMissingFamily(false) }

  const save = (e) => {
    e.preventDefault()
    if (!form.label.trim()) return
    if (!form.family) return setMissingFamily(true)
    const entry = makeEventTopic(form)
    if (topics.some((x) => x.id !== editing && topicKey(x.id) === topicKey(entry.id))) return setExists(true)
    onAdd(entry, editing)
    // La familia y el tipo se mantienen para el siguiente tema
    setForm({ ...blank, family: form.family, mandatory: form.mandatory })
    setEditing(null)
  }
  const edit = (x) => {
    setForm({ label: topic(x.id), by: x.by ?? '', desc: x.desc ?? '', family: x.family ?? '', mandatory: !!x.mandatory })
    setEditing(x.id)
    setExists(false)
    document.getElementById('topic-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const cancel = () => { setForm(blank); setEditing(null); setExists(false); setMissingFamily(false) }

  const input = 'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15'
  const mandatory = topics.filter((x) => x.mandatory)
  const optional = topics.filter((x) => !x.mandatory)

  const row = (x) => (
    <li key={x.id} className={`flex items-start gap-3 p-4 ${editing === x.id ? 'bg-brand-soft/60' : ''}`}>
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${familyTone(x.family).tile}`}>{FAMILY_EMOJI[x.family] ?? '💬'}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">
          {topic(x.id)}
          {x.family && <span className={`ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-bold ${familyTone(x.family).chip}`}>{t(`register.families.${x.family}`)}</span>}
        </p>
        {x.desc && <p className="text-sm text-slate-500">{x.desc}</p>}
        {x.by && <p className="mt-0.5 text-xs text-slate-500">{t('register.proposedBy')} <strong className="font-semibold text-ink">{x.by}</strong></p>}
      </div>
      {!x.mandatory && <span className="hidden shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:inline-block">{t('panel.topicVotes', { n: votes(x.id) })}</span>}
      <button type="button" onClick={() => edit(x)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-ink" aria-label={t('panel.topicEdit', { label: topic(x.id) })}>
        <PencilLine className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onRemove(x)} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-accent-soft hover:text-accent-dark" aria-label={t('panel.topicRemove', { label: topic(x.id) })}>
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  )
  const group = (title, list, target) => (
    <div>
      <div className="flex items-baseline justify-between gap-3 bg-paper/70 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
        <p className={`shrink-0 text-xs font-bold tabular-nums ${list.length === target ? 'text-mint-dark' : 'text-brand-dark'}`}>
          {list.length} / {target}{list.length === target ? ' ✓' : ''}
        </p>
      </div>
      {list.length
        ? <ul className="divide-y divide-slate-100">{list.map(row)}</ul>
        : <p className="px-4 py-4 text-sm text-slate-400">{t('panel.topicsEmptyGroup')}</p>}
    </div>
  )

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-100 p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><MessagesSquare className="h-5 w-5 text-brand-dark" /> {t('panel.topicsTitle', { n: topics.length })}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('panel.topicsSub')}</p>
      </div>

      <form id="topic-form" onSubmit={save} className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-2">
        {editing && <p className="text-sm font-semibold text-brand-dark lg:col-span-2">{t('panel.topicEditing', { label: topic(editing) })}</p>}
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t('panel.topicLabel')} *</span>
          <input className={input} value={form.label} maxLength={MAX_CUSTOM_LENGTH * 2} onChange={(e) => set('label', e.target.value)} placeholder={t('panel.topicLabelPh')} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t('panel.topicFamily')} *</span>
          <select className={`${input} ${missingFamily ? '!border-brand' : ''}`} value={form.family} onChange={(e) => set('family', e.target.value)}>
            <option value="">{t('panel.topicFamilyPick')}</option>
            {TOPIC_FAMILIES.map((g) => <option key={g.id} value={g.id}>{FAMILY_EMOJI[g.id]}  {t(`register.families.${g.id}`)}</option>)}
          </select>
          {missingFamily && <span role="alert" className="mt-1 block text-xs font-semibold text-brand-dark">{t('panel.topicFamilyMissing')}</span>}
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t('panel.topicDesc')} <span className="font-normal text-slate-400">({form.desc.length}/160)</span></span>
          <textarea rows={2} className={input} value={form.desc} maxLength={160} onChange={(e) => set('desc', e.target.value)} placeholder={t('panel.topicDescPh')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t('panel.topicBy')}</span>
          <input className={input} value={form.by} maxLength={60} onChange={(e) => set('by', e.target.value)} placeholder={t('panel.topicByPh')} />
        </label>
        <div>
          <span className="mb-1 block text-xs font-semibold text-slate-600">{t('panel.topicType')}</span>
          <div role="radiogroup" aria-label={t('panel.topicType')} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {[false, true].map((m) => (
              <button key={String(m)} type="button" role="radio" aria-checked={form.mandatory === m} onClick={() => set('mandatory', m)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${form.mandatory === m ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}>
                {t(m ? 'panel.topicMandatory' : 'panel.topicOptional')}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <p className="text-xs text-slate-500">{t(form.mandatory ? 'panel.topicMandatoryHint' : 'panel.topicOptionalHint', { max: MAX_INTERESTS })}</p>
          <div className="flex gap-2">
            {editing && <button type="button" onClick={cancel} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">{t('panel.topicCancel')}</button>}
            <Button type="submit" icon={editing ? CheckCircle2 : Plus} disabled={!form.label.trim()} className="py-2.5">{t(editing ? 'panel.topicSave' : 'panel.topicAdd')}</Button>
          </div>
        </div>
        {exists && <p role="alert" className="text-sm font-semibold text-brand-dark lg:col-span-2">{t('panel.topicExists')}</p>}
      </form>

      {topics.length === 0 && <p className="border-b border-slate-100 bg-paper/50 px-4 py-3 text-sm text-slate-500">{t('panel.topicsDefault')}</p>}
      {group(t('panel.topicsMandatory'), mandatory, MANDATORY_TARGET)}
      {group(t('panel.topicsOptional', { max: MAX_INTERESTS }), optional, OPTIONAL_TARGET)}
    </section>
  )
}

function PlanGrid({ rounds, current, finished, byId, planning, onRegenerate, onSwap, onMove, onClear, t, topic }) {
  const [selected, setSelected] = useState(null) // { round, id }
  const started = current > 0

  const pick = (round, id) => {
    if (selected?.round === round && selected.id !== id) {
      onSwap(round, selected.id, id)
      setSelected(null)
    } else {
      setSelected(selected?.id === id ? null : { round, id })
    }
  }
  const moveHere = (round, tableId) => {
    if (selected?.round !== round) return
    onMove(round, selected.id, tableId)
    setSelected(null)
  }

  return (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><LayoutGrid className="h-5 w-5 text-brand-dark" /> {t('panel.planTitle', { n: rounds.length })}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{t('panel.planHelp')}</p>
        </div>
        {!started && (
          <Button variant="ghost" icon={Eraser} className="py-2" onClick={onClear} disabled={planning}>{t('panel.clearPlan')}</Button>
        )}
      </div>

      <ol className="divide-y divide-slate-100">
        {rounds.map((round, i) => {
          const locked = finished || i < current
          return (
            <li key={i}>
              <div className={`flex flex-col gap-3 p-4 lg:flex-row ${locked ? 'opacity-60' : ''}`}>
                <div className="flex shrink-0 items-center justify-between gap-2 lg:w-28 lg:flex-col lg:items-start">
                  <p className="font-display text-lg font-medium">{t('panel.round', { n: i + 1 })}</p>
                  {locked ? (
                    <span className="flex items-center gap-1 text-xs text-slate-400"><Lock className="h-3 w-3" /> {t('panel.locked')}</span>
                  ) : (
                    <button onClick={() => onRegenerate(i)} disabled={planning} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-dark hover:bg-brand-soft disabled:opacity-50">
                      <Shuffle className="h-3.5 w-3.5" /> {t('panel.regenerateRound')}
                    </button>
                  )}
                </div>
                <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {round.plan.map((tb) => {
                    const target = !locked && selected?.round === i && !tb.members.includes(selected.id)
                    return (
                      <div key={tb.id} className={`rounded-lg p-2.5 ring-1 ${target ? 'bg-brand-soft ring-brand' : 'bg-slate-50 ring-slate-200'}`}>
                        <button
                          type="button"
                          disabled={!target}
                          onClick={() => moveHere(i, tb.id)}
                          className="block w-full text-left disabled:cursor-default"
                          title={target ? t('panel.moveHere') : undefined}
                        >
                          <span className="block text-[11px] font-semibold text-slate-400">{t('panel.table', { n: tb.id })} · {tb.members.length}</span>
                          <span className="block text-sm font-semibold leading-snug">{topic(tb.topic)}</span>
                        </button>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {tb.members.map((id) => {
                            const p = byId.get(id)
                            if (!p) return null
                            const chosen = hasTopic(p, tb.topic)
                            const isSel = selected?.round === i && selected.id === id
                            return (
                              <button
                                key={id}
                                type="button"
                                disabled={locked}
                                onClick={() => pick(i, id)}
                                title={p.name}
                                className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 transition ${
                                  isSel ? 'bg-brand text-white ring-brand' : chosen ? 'bg-white text-slate-700 ring-slate-200 hover:ring-brand' : 'bg-accent-soft text-accent-dark ring-accent/40 hover:ring-brand'
                                } disabled:cursor-default`}
                              >
                                {shortName(p.name)}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              {i + 1 === PAUSE_AFTER_ROUND && i + 1 < rounds.length && (
                <p className="flex items-center gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">
                  <Coffee className="h-3.5 w-3.5 text-accent-dark" /> {t('panel.pauseRow', { min: PAUSE_MINUTES })}
                </p>
              )}
            </li>
          )
        })}
      </ol>
      <p className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-white ring-1 ring-slate-300" /> {t('panel.legendChosen')}</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-accent-soft ring-1 ring-accent/40" /> {t('panel.legendNotChosen')}</span>
      </p>
    </section>
  )
}

// «Laura Martín» → «Laura M.»
const shortName = (name = '') => {
  const [first, ...rest] = name.trim().split(/\s+/)
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first
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
        {ok ? <CheckCircle2 className="h-4 w-4 text-mint-dark" /> : <AlertTriangle className="h-4 w-4 text-brand-dark" />} {label}
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  )
}

function Notice({ children }) {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-soft p-3 text-sm text-slate-700">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-dark" /> {children}
    </p>
  )
}

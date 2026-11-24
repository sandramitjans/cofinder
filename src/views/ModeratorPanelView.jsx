import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Camera, CheckCircle2, ChevronRight, Coffee, Eraser, Flag, LayoutGrid, Lock, Monitor,
  MessagesSquare, PencilLine, Plus, RefreshCcw, RotateCcw, Search, Shuffle, TimerReset, Trash2, UserPlus, Users,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { FAMILY_EMOJI, FIND_MINUTES, MAX_INTERESTS, PAUSE_AFTER_ROUND, PAUSE_MINUTES, PROJ_HASH, PROJ_SHOW_MSG, PROJ_WIN, TOPIC_FAMILIES, VIEWS } from '../constants'
import { familyTone } from '../lib/familyColors'
import { advancedShortfall, isAdvanced, planStats, tableRange } from '../lib/matching'
import { MAX_CUSTOM_LENGTH, customLabel, hasTopic, isMandatory, makeEventTopic, myTopics, normalizeText, topicKey } from '../lib/topics'
import { useCountdown } from '../lib/useCountdown'
import { useConnected } from '../lib/useConnected'
import { photoToDataUrl } from '../lib/image'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'
import { SUPERPOWERS } from '../constants'

// Objetivo de temas del evento (los contadores solo avisan)
const MANDATORY_TARGET = 4
const OPTIONAL_TARGET = 13
// Pestaña abierta del panel (Jour J / Préparation), recordada en esta pestaña del navegador
const TAB_KEY = 'cofinder:admin-tab'

export default function ModeratorPanelView() {
  const {
    navigate, lockModerator, participants, currentUser, event, currentRound,
    planning, generatePlan, regeneratePlanRound, swapSeats, moveSeat,
    advance, stepBack, restartTimer, finishEvent, resetEvent, clearPlan,
    removeParticipant, setParticipantPhoto, seedDemo, clearDemo, readyCount, readyTotal, notedCount, notedTotal, missingTables,
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
  // Regla del evento: en cada mesa, al menos una persona «Avancé» en el tema. Avisa si no hay bastantes
  const shortAdvanced = useMemo(() => (participants.length >= 6 ? advancedShortfall(participants) : []), [participants])

  // Fase del tour en pantalla
  const r = live ? currentRound : null
  const timer = useCountdown(r?.startedAt && !r.pauseStartedAt ? r.startedAt : null)
  const findTimer = useCountdown(r?.startedAt && !r.pauseStartedAt ? r.startedAt - FIND_MINUTES * 60_000 : null, FIND_MINUTES)
  const phase = !r ? null : r.pauseStartedAt ? 'pause' : r.startedAt ? (findTimer.done ? 'talk' : 'find') : r.revealed ? 'reveal' : 'intro'
  const pauseTimer = useCountdown(phase === 'pause' ? r.pauseStartedAt : null, PAUSE_MINUTES)

  // Personas inscritas después de generar el plan (sin mesa en los tours que faltan)
  const planned = new Set(event.rounds.slice(Math.max(0, event.round)).flatMap((x) => x.plan.flatMap((tb) => tb.members)))
  // Buscador de la lista de participantes (nombre sin acentos, o código)
  const [who, setWho] = useState('')
  const shown = useMemo(() => {
    const q = normalizeText(who)
    if (!q) return participants
    return participants.filter((p) => normalizeText(p.name).includes(q) || (p.accessCode ?? '').includes(q))
  }, [participants, who])

  const unplanned = hasPlan && !event.finished && event.round < total ? participants.filter((p) => !planned.has(p.id)) : []

  const confirmThen = (msg, fn) => () => window.confirm(msg) && fn()
  // Bloques del panel, ordenados por fases más abajo
  const topicsSection = (
    <EventTopics
      topics={eventTopics}
      participants={participants}
      onAdd={addEventTopic}
      onRemove={(x) => window.confirm(t('panel.confirmRemoveTopic', { label: topic(x.id) })) && removeEventTopic(x.id)}
      t={t}
      topic={topic}
    />
  )
  const participantsSection = (
    <section className="rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5 text-brand-dark" /> {t('panel.participants', { n: participants.length })}</h2>
        {participants.length > 0 && (
          // El día del evento: «no encuentro mi código» → se busca por nombre (sin acentos) o por código
          <label className="relative order-last w-full sm:order-none sm:ml-auto sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder={t('panel.searchPh')} aria-label={t('panel.searchPh')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25" />
          </label>
        )}
        {hasDemo
          ? <Button variant="ghost" icon={RefreshCcw} className="py-2" onClick={confirmThen(t('panel.confirmClearDemo'), clearDemo)}>{t('panel.clearDemo')}</Button>
          : <Button variant="outline" icon={UserPlus} className="py-2" onClick={seedDemo}>{t('panel.addDemo')}</Button>}
      </div>

      {participants.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">{t('panel.empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.length === 0 && <li className="p-6 text-center text-sm text-slate-500">{t('panel.searchNone')}</li>}
          {shown.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3 sm:w-64">
                <PhotoButton person={p} onSave={setParticipantPhoto} t={t} />
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
  )
  const planSection = hasPlan && (
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
  )

  // Ventanas de confirmación grandes (en vez del aviso del navegador)
  const [ask, setAsk] = useState(null) // { title, body, yes, onYes }
  const [tab, setTab] = useState(() => { try { return sessionStorage.getItem(TAB_KEY) || 'day' } catch { return 'day' } })
  const pickTab = (x) => { setTab(x); try { sessionStorage.setItem(TAB_KEY, x) } catch { /* noop */ } ; window.scrollTo({ top: 0 }) }

  // El proyector se abre en otra ventana (para llevarla a la pantalla de la sala); el panel sigue aquí
  const [projWin, setProjWin] = useState(null)
  const [projOpen, setProjOpen] = useState(false)
  useEffect(() => {
    if (!projWin) return
    setProjOpen(!projWin.closed)
    const id = setInterval(() => setProjOpen(!projWin.closed), 1500)
    return () => clearInterval(id)
  }, [projWin])
  const openProjector = () => {
    // Estamos DENTRO de la ventana del proyector (se volvió al panel con su botón): basta con volver a mostrarlo.
    // Antes se llamaba a window.open con el mismo nombre, que apuntaba a esta misma ventana y no hacía nada.
    if (window.name === PROJ_WIN || window.location.hash === PROJ_HASH) return navigate(VIEWS.PROJECTOR)
    const w = window.open(`${window.location.pathname}${PROJ_HASH}`, PROJ_WIN, 'popup,width=1280,height=760')
    if (!w) return navigate(VIEWS.PROJECTOR) // ventanas bloqueadas: como antes, en esta pestaña
    // Si la ventana ya estaba abierta pero mostrando el panel, la misma dirección no la recarga: se lo pedimos
    try { w.postMessage({ type: PROJ_SHOW_MSG }, window.location.origin) } catch { /* ventana aún cargando: ya abrirá el proyector */ }
    setProjWin(w)
    w.focus()
  }

  const header = (
    <header className="z-20 border-b border-slate-200 bg-white/95 backdrop-blur sm:sticky sm:top-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-dark sm:inline">{t('panel.badge')}</span>
        </div>
        <div role="tablist" className="order-last flex w-full gap-1 rounded-2xl bg-slate-100 p-1 sm:order-none sm:w-auto">
          {['day', 'prep'].map((x) => (
            <button key={x} role="tab" aria-selected={tab === x} onClick={() => pickTab(x)}
              className={`flex-1 rounded-xl px-5 py-2.5 text-base font-bold transition sm:flex-none ${tab === x ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'}`}>
              {t(x === 'day' ? 'day.tabDay' : 'day.tabPrep')}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <LangSwitch />
          <Button variant="outline" icon={Monitor} onClick={openProjector} className="py-2">{t('panel.projector')}</Button>
          <button onClick={lockModerator} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-ink">
            <Lock className="h-4 w-4" /> <span className="hidden sm:inline">{t('panel.lock')}</span>
          </button>
        </div>
      </div>
    </header>
  )

  return (
    <div className="min-h-dvh bg-paper">
      {header}
      {tab === 'day' ? (
        <DayGuide
          {...{ t, topic, participants, byId, event, r, phase, hasPlan, total, planning, generatePlan, advance, stepBack, restartTimer,
            readyCount, readyTotal, notedCount, notedTotal, missingTables, eventTopics, shortAdvanced, hasDemo, unplanned, isOn,
            timer, findTimer, pauseTimer, projOpen, openProjector, setAsk }}
        />
      ) : (
        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 ring-1 ring-amber-200">⚙️ {t('day.prepNote')}</p>
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat icon={Users} label={t('panel.registered')} value={participants.length} />
            <Stat
              icon={LayoutGrid}
              label={t('panel.tablesPerRound')}
              value={participants.length >= 2 ? (kMin === kMax ? kMin : `${kMin}–${kMax}`) : '—'}
              hint={participants.length >= 2 ? t('panel.tableSizes') : null}
            />
            {stats && (
              <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('panel.quality')}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <Quality ok={stats.chosenPct >= 80} label={t('panel.chosen')} value={`${stats.chosenPct} %`} />
                  <Quality ok={!stats.noExpert} label={t('panel.noExpert')} value={stats.noExpert} />
                  <Quality ok={!stats.repeatedTopics} label={t('panel.repeatedTopics')} value={stats.repeatedTopics} />
                  <Quality ok={!stats.overLimitPairs} label={t('panel.overLimit')} value={stats.overLimitPairs} />
                  <Quality ok label={t('panel.contacts')} value={`${stats.avgContacts.toFixed(1)} / ${Math.max(0, participants.length - 1)}`} />
                </ul>
              </div>
            )}
          </section>
          {topicsSection}
          {participantsSection}
          {planSection}
          {(live || event.round > 0 || event.finished) && (
            <section className="rounded-xl bg-white p-4 shadow-sm ring-2 ring-brand-soft">
              <h2 className="flex items-center gap-2 text-lg font-bold">🛑 {t('day.dangerTitle')}</h2>
              <p className="mt-0.5 text-sm text-slate-500">{t('day.dangerSub')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {live && (
                  <Button variant="outline" icon={Flag} onClick={() => setAsk({ title: t('panel.confirmFinish'), body: t('day.confirmFinishBody'), yes: t('day.finishYes'), onYes: finishEvent })}>{t('panel.finish')}</Button>
                )}
                {(event.round > 0 || event.finished) && (
                  <Button variant="outline" icon={RotateCcw} onClick={() => setAsk({ title: t('panel.reset') + ' ?', body: t('day.confirmResetBody'), yes: t('day.resetYes'), onYes: resetEvent })}>{t('panel.reset')}</Button>
                )}
              </div>
            </section>
          )}
        </main>
      )}
      {ask && <ConfirmDialog {...ask} no={t('day.no')} onClose={() => setAsk(null)} />}
    </div>
  )
}

/**
 * Pestaña «Jour J»: un paso cada vez, con una frase que dice qué pasa, un cronómetro grande
 * y un único botón grande con la siguiente acción. Lo avanzado vive en «Préparation».
 */
function DayGuide({
  t, topic, participants, byId, event, r, phase, hasPlan, total, planning, generatePlan, advance, stepBack, restartTimer,
  readyCount, readyTotal, notedCount, notedTotal, missingTables, eventTopics, shortAdvanced, hasDemo, unplanned, isOn,
  timer, findTimer, pauseTimer, projOpen, openProjector, setAsk,
}) {
  // Barra de pasos: Préparer · Accueil · Tour 1 · Tour 2 · Pause · Tour 3 · … · Fin
  const nRounds = hasPlan ? total : 4
  const steps = [{ key: 'prep', label: t('day.steps.prep') }, { key: 'welcome', label: t('day.steps.welcome') }]
  for (let n = 1; n <= nRounds; n++) {
    steps.push({ key: `r${n}`, label: t('day.steps.round', { n }) })
    if (n === PAUSE_AFTER_ROUND && n < nRounds) steps.push({ key: 'pause', label: `☕ ${t('day.steps.pause')}` })
  }
  steps.push({ key: 'end', label: t('day.steps.end') })
  const cur = !hasPlan ? 'prep' : event.finished ? 'end' : !event.round ? 'welcome' : r?.pauseStartedAt ? 'pause' : `r${event.round}`
  const curIdx = steps.findIndex((s) => s.key === cur)

  const n = event.round
  const talkDone = phase === 'talk' && timer.done
  const mandatoryCount = eventTopics.filter((x) => x.mandatory).length

  // Contenido de la tarjeta principal según el momento
  let title, what, timerBox = null, extra = null, go = null
  const big = (label, onClick, { tone = 'brand', hint, disabled } = {}) => (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`mt-6 flex w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-2xl px-6 py-6 text-center text-xl font-extrabold text-white transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 sm:text-2xl ${
        tone === 'mint' ? 'bg-mint shadow-[0_6px_0_var(--color-mint-dark)] hover:bg-mint-dark' : 'bg-brand shadow-[0_6px_0_var(--color-brand-dark)] hover:bg-brand-hover'}`}>
      {label} {hint ? <span className="text-base font-medium opacity-85">{hint}</span> : <ChevronRight className="h-7 w-7" />}
    </button>
  )
  const clock = (tm, label) => (
    <div className="my-4 text-center">
      <p className={`font-mono text-7xl font-extrabold tabular-nums sm:text-8xl ${tm.done ? 'text-mint-dark' : 'text-brand-dark'}`}>{tm.label}</p>
      <p className="mt-1 text-lg text-slate-500">{tm.done ? t('day.timeUp') : label}</p>
    </div>
  )

  if (cur === 'prep') {
    title = t('day.prepTitle')
    what = t('day.prepWhat')
    const people = participants.length
    extra = (
      <ul className="mt-6 grid gap-3">
        <Check ok={people >= 6} title={t(people >= 6 ? 'day.checkPeople' : 'day.checkPeopleLow', { n: people })} sub={t('day.checkPeopleSub')} />
        <Check ok={mandatoryCount === 4} title={t(mandatoryCount === 4 ? 'day.checkTopics' : 'day.checkTopicsMissing', { n: mandatoryCount })}
          sub={t(mandatoryCount === 4 ? 'day.checkTopicsSub' : 'day.checkTopicsMissingSub')} />
        {shortAdvanced.length
          ? shortAdvanced.map((x) => <Check key={x.topic} ok={false} title={t('day.checkAdvanced', { topic: topic(x.topic), missing: x.needed - x.advanced })} sub={t('day.checkAdvancedSub')} />)
          : people >= 6 && <Check ok title={t('day.checkAdvancedOk')} />}
        {hasDemo && <Check ok={false} title={t('day.checkDemo')} sub={t('day.checkDemoSub')} />}
      </ul>
    )
    go = big(planning ? t('panel.planning') : t('day.prepGo'), generatePlan, { disabled: planning || people < 2 })
  } else if (cur === 'welcome') {
    title = t('day.welcomeTitle')
    what = t('day.welcomeWhat')
    const firstRound = new Set(event.rounds[0]?.plan.flatMap((tb) => tb.members) ?? [])
    const waiting = participants.filter((p) => !p.demo && firstRound.has(p.id) && !p.readyAt).map((p) => shortName(p.name))
    timerBox = (
      <div className={`mb-6 flex flex-col gap-4 rounded-2xl p-5 ring-2 sm:flex-row sm:items-center ${projOpen ? 'bg-mint-soft ring-mint/30' : 'bg-blue-50 ring-blue-200'}`}>
        <Monitor className={`h-10 w-10 shrink-0 ${projOpen ? 'text-mint-dark' : 'text-blue-700'}`} />
        <div className="flex-1">
          <p className="text-xl font-extrabold">{projOpen ? `✓ ${t('day.projOpen')}` : t('day.projTitle')}</p>
          {!projOpen && <p className="mt-1 text-base text-slate-600">{t('day.projWhat')}</p>}
        </div>
        <button type="button" onClick={openProjector}
          className={`shrink-0 rounded-xl px-5 py-4 text-lg font-extrabold transition ${projOpen ? 'bg-white text-mint-dark ring-1 ring-mint/30' : 'bg-blue-700 text-white shadow-[0_5px_0_#1e3a8a] hover:bg-blue-800'}`}>
          {projOpen ? t('day.projAgain') : t('day.openProjector')}
        </button>
      </div>
    )
    extra = (
      <div className="mt-6">
        {readyTotal > 0 && (
          <>
            <p className="text-lg font-bold">{t('day.readyOf', { n: readyCount, total: readyTotal })}</p>
            <Progress value={readyCount} max={readyTotal} />
            {waiting.length > 0 && <p className="text-base text-slate-500">{t('day.notReady', { names: waiting.join(', ') })}</p>}
          </>
        )}
        {unplanned.length > 0 && (
          <div className="mt-5 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-lg font-bold text-amber-900">⚠️ {t('day.lateTitle', { n: unplanned.length })}</p>
            <p className="mt-1 text-base text-amber-900/80">{t('day.lateWhat')} ({unplanned.map((p) => shortName(p.name)).join(', ')})</p>
            <Button variant="outline" icon={Shuffle} className="mt-3" disabled={planning}
              onClick={() => setAsk({ title: t('day.confirmRedo'), body: t('day.confirmRedoBody'), yes: t('day.redoYes'), onYes: generatePlan })}>
              {t('day.lateGo')}
            </Button>
          </div>
        )}
      </div>
    )
    go = big(t('day.welcomeGo'), advance)
  } else if (cur === 'end') {
    title = t('day.endTitle')
    what = t('day.endWhat')
  } else if (phase === 'pause') {
    title = t('day.pauseTitle')
    what = t('day.pauseWhat')
    timerBox = clock(pauseTimer, t('day.pauseLeft'))
    go = big(t('day.pauseGo', { n: n + 1 }), advance)
  } else if (phase === 'talk' && !talkDone) {
    title = t('day.talkTitle', { n })
    what = n >= total ? t('day.talkWhatLast') : n === PAUSE_AFTER_ROUND ? t('day.talkWhatPause') : t('day.talkWhatNext', { next: n + 1 })
    timerBox = clock(timer, t('day.talkLeft'))
    const left = `${Math.ceil(timer.remaining / 60_000)} min`
    go = big(t('day.talkGo'), () => setAsk({ title: t('day.confirmStop', { n }), body: t('day.confirmStopBody', { left }), yes: t('day.stopYes'), onYes: advance }),
      { tone: 'mint', hint: t('day.talkGoHint') })
  } else if (talkDone) {
    title = t('day.notesTitle')
    what = t('day.notesWhat')
    if (notedTotal > 0) {
      extra = (
        <div className="mt-6">
          <p className="text-lg font-bold">{t('day.notesOf', { n: notedCount, total: notedTotal })}</p>
          <Progress value={notedCount} max={notedTotal} />
        </div>
      )
    }
    const nextLabel = n >= total ? t('day.notesGoEnd') : n === PAUSE_AFTER_ROUND ? t('day.notesGoPause') : t('day.notesGoNext', { n: n + 1 })
    const goNext = n >= total
      ? () => setAsk({ title: t('panel.confirmFinish'), body: t('day.endWhat'), yes: t('day.finishYes'), onYes: advance })
      : advance
    if (missingTables.length) {
      // Siempre tiene que haber un resumen por mesa: sin botón grande mientras falte alguno.
      // Solo un enlace de emergencia (móvil sin batería, sin red…), con aviso de qué mesas faltan.
      const tables = missingTables.map((k) => t('day.tableN', { n: k })).join(', ')
      extra = (
        <>
          {extra}
          <div className="mt-6 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <p className="text-lg font-bold text-amber-900">⏳ {t('day.notesMissing', { tables })}</p>
            <p className="mt-1 text-base text-amber-900/80">{t('day.notesMissingSub')}</p>
          </div>
          <button type="button" className="mt-5 text-base text-slate-500 underline underline-offset-4 hover:text-ink"
            onClick={() => setAsk({ title: t('day.skipTitle'), body: t('day.skipBody', { tables }), yes: t('day.skipYes'), onYes: advance })}>
            {t('day.skipLink')}
          </button>
        </>
      )
    } else go = big(nextLabel, goNext)
  } else {
    // Buscando mesa (o pantalla de apertura de la ronda)
    title = t('day.findTitle', { n })
    what = t('day.findWhat')
    if (phase === 'find') timerBox = clock(findTimer, t('day.findLeft'))
    go = big(t('day.findGo'), advance)
  }

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <ol className="flex gap-1.5 overflow-x-auto pb-1">
        {steps.map((s, i) => (
          <li key={s.key} className={`min-w-[4.5rem] flex-1 whitespace-nowrap rounded-xl px-2 py-2.5 text-center text-sm font-semibold ${
            i === curIdx ? 'bg-brand-soft text-brand-dark ring-2 ring-brand' : i < curIdx ? 'bg-slate-200/70 text-slate-500' : 'border-2 border-dashed border-slate-200 bg-white text-slate-400'}`}>
            {i < curIdx && '✓ '}{s.label}
          </li>
        ))}
      </ol>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-10">
        <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-brand-dark">{t('day.step', { n: curIdx + 1, total: steps.length })} · {steps[curIdx]?.label}</p>
        {cur === 'welcome' && <div className="mt-4">{timerBox}</div>}
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-slate-600 sm:text-xl">{what}</p>
        {cur !== 'welcome' && timerBox}
        {extra}
        {go}
        {(event.round > 0 || event.finished || (cur === 'welcome')) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-base text-slate-500">
            {(event.round > 0 || event.finished)
              ? <button type="button" onClick={stepBack} className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-ink" title={t('day.undoHint')}><RotateCcw className="h-4 w-4" /> {t('day.undo')}</button>
              : <span />}
            {((phase === 'talk' && !talkDone) || phase === 'pause') && !event.finished
              ? <button type="button" onClick={restartTimer} className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-ink"><TimerReset className="h-4 w-4" /> {t('day.restartTimer')}</button>
              : cur === 'welcome' && <span>{t('day.onlyButton')}</span>}
          </div>
        )}
      </section>

      {hasPlan && <TablesNow key={event.round} event={event} byId={byId} t={t} topic={topic} />}
      {participants.length > 0 && <LostCode participants={participants} isOn={isOn} t={t} />}
    </main>
  )
}

function Check({ ok, title, sub }) {
  return (
    <li className={`flex items-start gap-3 rounded-2xl p-4 ${ok ? 'bg-mint-soft' : 'bg-amber-50 ring-1 ring-amber-200'}`}>
      <span className="text-2xl leading-none" aria-hidden>{ok ? '✅' : '⚠️'}</span>
      <div>
        <p className="text-lg font-bold">{title}</p>
        {sub && <p className="text-base text-slate-600">{sub}</p>}
      </div>
    </li>
  )
}

function Progress({ value, max }) {
  return (
    <div className="my-2 h-5 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-mint transition-all" style={{ width: `${max ? Math.round((value / max) * 100) : 0}%` }} />
    </div>
  )
}

// Mesas de un tour con nombres completos y ⭐ para quien tiene nivel avanzado en el tema de la mesa
function TablesNow({ event, byId, t, topic }) {
  const now = Math.min(Math.max(event.round, 1), event.rounds.length)
  const [pick, setPick] = useState(null)
  const shownRound = pick ?? now
  const plan = event.rounds[shownRound - 1]?.plan ?? []
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">🗂 {t('day.tablesTitle')} · {t('panel.round', { n: shownRound })}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('day.tablesSub')}</p>
        </div>
        <div className="flex gap-1">
          {event.rounds.map((_, i) => (
            <button key={i} type="button" onClick={() => setPick(i + 1)}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${shownRound === i + 1 ? 'bg-ink text-white' : 'bg-slate-100 text-slate-500 hover:text-ink'}`}>
              {t('panel.round', { n: i + 1 })}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {plan.map((tb) => {
          const key = topicKey(tb.topic)
          const people = tb.members.map((id) => byId.get(id)).filter(Boolean)
          const anyAdv = people.some((p) => isAdvanced(p, key))
          return (
            <div key={tb.id} className="rounded-2xl bg-paper p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{t('panel.table', { n: tb.id })}</p>
              <p className="mt-0.5 text-base font-extrabold leading-snug">{topic(tb.topic)}</p>
              <ul className="mt-2 space-y-1 text-base">
                {people.map((p) => <li key={p.id}>{isAdvanced(p, key) ? '⭐ ' : ''}{p.name}</li>)}
              </ul>
              {!anyAdv && <p className="mt-2 inline-block rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">⚠️ {t('day.noAdvanced')}</p>}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// «Quelqu’un a perdu son code ?»: buscar por nombre y ver el código (sin botones de borrar cerca)
function LostCode({ participants, isOn, t }) {
  const [q, setQ] = useState('')
  const norm = normalizeText(q)
  const found = norm ? participants.filter((p) => normalizeText(p.name).includes(norm)).slice(0, 4) : []
  const online = isOn ? participants.filter((p) => isOn(p.id)).length : null
  return (
    <section className="grid gap-5 sm:grid-cols-2">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="text-lg font-bold">🔑 {t('day.lostTitle')}</h2>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('day.lostPh')} aria-label={t('day.lostTitle')}
            className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 pl-11 pr-3 text-lg focus:border-brand focus:outline-none" />
        </label>
        {norm && !found.length && <p className="mt-3 text-base text-slate-500">{t('day.lostNone')}</p>}
        <ul className="mt-2 divide-y divide-slate-100">
          {found.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-lg">{p.name}</span>
              <span className="rounded-lg bg-mint-soft px-3 py-1 font-mono text-2xl font-extrabold tracking-[0.2em] text-mint-dark">{p.accessCode ?? '—'}</span>
            </li>
          ))}
        </ul>
      </div>
      {online !== null && (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold">📱 {t('day.onlineTitle')}</h2>
          <p className="mt-2 text-4xl font-extrabold">{online} / {participants.length}</p>
          <p className="mt-1 text-base text-slate-500">{t('day.onlineHint')}</p>
        </div>
      )}
    </section>
  )
}

// Ventana de confirmación: «Non, continuer» destacado; «Oui» al lado, en contorno
function ConfirmDialog({ title, body, yes, no, onYes, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold">{title}</h2>
        {body && <p className="mt-3 text-lg leading-relaxed text-slate-600">{body}</p>}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" autoFocus onClick={onClose} className="rounded-2xl bg-ink px-5 py-4 text-lg font-bold text-white hover:bg-black">{no}</button>
          <button type="button" onClick={() => { onClose(); onYes() }} className="rounded-2xl px-5 py-4 text-lg font-bold text-brand-dark ring-2 ring-brand hover:bg-brand-soft">{yes}</button>
        </div>
      </div>
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
    setForm({ label: customLabel(x.id), by: x.by ?? '', desc: x.desc ?? '', family: x.family ?? '', mandatory: !!x.mandatory })
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



// Foto de la lista de participantes: al pulsarla se elige otra imagen y se cambia SOLO la foto
function PhotoButton({ person, onSave, t }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    let photo
    try { photo = await photoToDataUrl(file) } catch { return window.alert(t('panel.photoError')) }
    if (!window.confirm(t('panel.confirmPhoto', { name: person.name }))) return
    setBusy(true)
    try { await onSave(person.id, photo) } finally { setBusy(false) }
  }
  return (
    <>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        title={t('panel.photo', { name: person.name })} aria-label={t('panel.photo', { name: person.name })}
        className={`group relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${busy ? 'opacity-50' : ''}`}>
        <Avatar name={person.name} photo={person.photo} />
        <span aria-hidden className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 group-hover:bg-brand group-hover:text-white">
          <Camera className="h-3 w-3" />
        </span>
      </button>
      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
    </>
  )
}

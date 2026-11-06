import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, Hourglass, Lightbulb, MapPin, Mic, RotateCcw, Send, Sparkles, Square, Timer, TimerOff, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { FIND_MINUTES, TOPIC_EMOJI, TOTAL_ROUNDS } from '../constants'
import { roleOf } from '../lib/matching'
import { isCustom, topicKey } from '../lib/topics'
import { icebreakerFor } from '../lib/icebreakers'
import { useCountdown } from '../lib/useCountdown'
import { MAX_NOTE_SECONDS, canRecord, extensionOf, getNote, recorderMime } from '../lib/audioNotes'
import * as api from '../lib/backend'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'
import LobbyView from './LobbyView'
import PublicFooter from '../components/layout/PublicFooter'

const emojiOf = (id) => (isCustom(id) ? '💬' : TOPIC_EMOJI[id] ?? '💬')
const expertModeOf = (participants) => participants.some((p) => p.offers?.length)

/**
 * El día del evento, en el móvil (pantallas 6 a 10 del prototipo):
 *  - mesa aún sin anunciar → sala de espera
 *  - mesa anunciada, sin chrono → «Ronda n · Ve a la mesa X» con tema y compañeros
 *  - chrono en marcha → ronda activa: cronómetro grande, barra roja, tema y tu mesa
 *  - tiempo terminado → grabar una nota de audio (máx. 1 min) con lo que te llevas
 *  - evento terminado → «Gracias por compartir»: tus conversaciones ronda a ronda
 */
export default function RoundCardView() {
  const { currentUser, currentRound, event, noteSent } = useApp()
  const { t } = useI18n()
  const startedAt = event.finished ? null : currentRound?.startedAt
  const timer = useCountdown(startedAt)
  // Los primeros minutos de cada ronda son para encontrar la mesa (la conversación empieza en `startedAt`)
  const findTimer = useCountdown(startedAt ? startedAt - FIND_MINUTES * 60_000 : null, FIND_MINUTES)
  const table = currentRound?.tables.find((x) => x.members.includes(currentUser?.id))

  let scene, key
  if (event.finished) { scene = <Closing />; key = 'end' }
  else if (!table) { scene = <Waiting />; key = `wait-${event.round}` }
  else if (!startedAt) { scene = <GoToTable table={table} />; key = `go-${event.round}` }
  else if (!findTimer.done) { scene = <FindTable table={table} findTimer={findTimer} />; key = `find-${event.round}` }
  else if (!timer.done) { scene = <ActiveRound table={table} timer={timer} />; key = `talk-${event.round}` }
  else if (noteSent) { scene = <LobbyView embedded badge={t('note.sentBadge')} />; key = `hold-${event.round}` }
  else { scene = <TimeUp table={table} />; key = `up-${event.round}` }

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <LangSwitch />
        </header>
        <main key={key} className="animate-view-in flex flex-1 flex-col py-6">{scene}</main>
        <PublicFooter className="!py-3" />
      </div>
    </div>
  )
}

/* ---------- Escenas ---------- */

function Waiting() {
  const { event } = useApp()
  const { t } = useI18n()
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">{t('round.badge', { n: event.round, total: TOTAL_ROUNDS })}</span>
      <h1 className="mt-5 font-display text-3xl font-medium tracking-tight">{t('round.unseatedTitle')}</h1>
      <p className="mt-2 max-w-sm text-slate-600">{t('round.unseatedText')}</p>
      <div className="mt-8 grid h-40 w-40 place-items-center rounded-full border-[6px] border-brand bg-white shadow-lg shadow-brand/10">
        <Hourglass className="h-12 w-12 animate-pulse text-brand" />
      </div>
    </div>
  )
}

/** «Encuentra tu mesa»: círculo con la cuenta atrás, número de mesa + tema y los compañeros */
function FindTable({ table, findTimer }) {
  const { event } = useApp()
  const { t, topic } = useI18n()
  const desc = useTopicDesc(table.topic)
  return (
    <div className="flex flex-col items-center text-center">
      <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">{t('round.badge', { n: event.round, total: TOTAL_ROUNDS })}</span>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight">{t('find.title')}</h1>
      <div className="mt-6 grid h-48 w-48 place-items-center rounded-full border-[7px] border-brand bg-white shadow-xl shadow-brand/15">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('find.startsIn')}</p>
          <p className="font-display text-5xl font-medium tabular-nums tracking-tight text-ink">{findTimer.label}</p>
        </div>
      </div>
      <section className="mt-7 w-full rounded-2xl bg-brand p-5 text-left text-white shadow-lg shadow-brand/20">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white/80"><MapPin className="h-3.5 w-3.5" /> {t('round.table', { n: table.id })}</p>
        <h2 className="mt-1 font-display text-2xl font-medium leading-tight">
          <span aria-hidden className="mr-1.5">{emojiOf(table.topic)}</span>{topic(table.topic)}
        </h2>
        {desc && <p className="mt-1.5 text-sm text-white/85">{desc}</p>}
      </section>
      <div className="w-full text-left"><Companions table={table} /></div>
    </div>
  )
}

function GoToTable({ table, findTimer }) {
  const { event } = useApp()
  const { t } = useI18n()
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('round.nextRound', { n: event.round, total: TOTAL_ROUNDS })}{findTimer && <> · {t('find.title')}</>}</p>
      <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">{t('round.goTo', { n: table.id })}</h1>
      {findTimer && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Timer className="h-3.5 w-3.5" /> {t('find.left')}</p>
          <p className="font-display text-6xl font-medium tabular-nums tracking-tight text-brand-dark">{findTimer.label}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-brand transition-[width] duration-1000" style={{ width: `${(1 - findTimer.progress) * 100}%` }} />
          </div>
        </section>
      )}
      <TopicCard table={table} />
      <Companions table={table} />
      {!findTimer && (
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
          <Timer className="h-4 w-4" /> {t('round.startsSoon')}
        </p>
      )}
      <IcebreakerFor topicId={table.topic} />
    </>
  )
}

function ActiveRound({ table, timer }) {
  const { event } = useApp()
  const { t, topic } = useI18n()
  const desc = useTopicDesc(table.topic)
  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{t('round.badge', { n: event.round, total: TOTAL_ROUNDS })}</span>
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{t('round.table', { n: table.id })}</span>
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">{t('round.topic')}</p>
        <h1 className="mt-1 font-display text-3xl font-medium leading-tight tracking-tight text-ink">
          <span aria-hidden className="mr-1.5">{emojiOf(table.topic)}</span>{topic(table.topic)}
        </h1>
        {desc && <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{desc}</p>}
        <MyRole table={table} />

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Timer className="h-3.5 w-3.5" /> {t('round.timeLeft')}</p>
        <p className={`text-center font-display text-7xl font-medium tabular-nums tracking-tight ${timer.remaining <= 60_000 ? 'text-brand-dark' : 'text-ink'}`} aria-live="off">{timer.label}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand transition-[width] duration-1000" style={{ width: `${(1 - timer.progress) * 100}%` }} />
        </div>
      </section>
      <Companions table={table} />
      <Icebreaker topicId={table.topic} desc={desc} />
    </>
  )
}

function IcebreakerFor({ topicId }) {
  const desc = useTopicDesc(topicId)
  return <Icebreaker topicId={topicId} desc={desc} />
}

/** Descripción de la mesa (las que añade el admin desde el panel pueden llevarla) */
function useTopicDesc(topicId) {
  const { eventTopics, eventTopicsLoaded, loadEventTopics } = useApp()
  useEffect(() => { if (!eventTopicsLoaded) loadEventTopics() }, [eventTopicsLoaded, loadEventTopics])
  return eventTopics.find((x) => topicKey(x.id) === topicKey(topicId))?.desc ?? ''
}

/** «Tú: experto/a…» cuando el plan tiene en cuenta el nivel de cada persona */
function MyRole({ table }) {
  const { currentUser, participants } = useApp()
  const { t } = useI18n()
  if (!expertModeOf(participants)) return null
  return (
    <span className="mt-3 inline-block rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-dark">
      {t('round.you', { role: t(`roles.${roleOf(currentUser, table.topic)}`) })}
    </span>
  )
}

/** «Para romper el hielo»: contexto del tema, 3 preguntas propuestas por la IA y una pista */
function Icebreaker({ topicId, desc }) {
  const { t, lang } = useI18n()
  const ib = icebreakerFor(topicId, lang, desc)
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-3 font-display text-2xl font-medium tracking-tight text-ink">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500 text-white"><Lightbulb className="h-6 w-6" /></span>
        {t('ice.title')}
      </h2>
      {ib.intro !== desc && <p className="mt-4 text-[15px] leading-relaxed text-slate-600">{ib.intro}</p>}
      <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-dark">
        <Sparkles className="h-3.5 w-3.5" /> {t('ice.byAi')}
      </span>
      <ol className="mt-3 space-y-2.5">
        {ib.q.map((q, i) => (
          <li key={i} className="flex gap-3 rounded-xl bg-paper px-3.5 py-3">
            <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
            <span className="pt-0.5 text-[15px] font-semibold leading-snug text-ink">{q}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex gap-2 rounded-xl bg-brand-soft px-3.5 py-3 text-sm font-semibold text-brand-dark">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {ib.tip}
      </p>
    </section>
  )
}

function TimeUp({ table }) {
  const { event } = useApp()
  const { t } = useI18n()
  return (
    <div className="flex flex-1 flex-col">
      <span className="self-start rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{t('round.roundTable', { n: event.round, k: table.id })}</span>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <NoteRecorder table={table} />
      </div>
    </div>
  )
}

/** «Gracias por compartir»: cada ronda con su tema, compañeros y la nota de audio */
function Closing() {
  const { history, currentUser } = useApp()
  const { t } = useI18n()
  const rounds = Object.keys(history).map(Number).sort((a, b) => a - b)
  const [picked, setOpen] = useState(undefined) // por defecto, abierta la primera ronda
  const open = picked === undefined ? rounds[0] : picked

  return (
    <>
      <h1 className="text-center font-display text-4xl font-medium tracking-tight">{t('round.finishedTitle')}</h1>
      <p className="mt-1 text-center text-slate-600">{t('round.finishedText')}</p>
      {rounds.length ? (
        <ul className="mt-6 space-y-3">
          {rounds.map((r) => (
            <ConversationCard key={r} round={r} entry={history[r]} userId={currentUser.id} open={open === r} onToggle={() => setOpen(open === r ? null : r)} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-center text-slate-600">{t('round.noHistory')}</p>
      )}
    </>
  )
}

function ConversationCard({ round, entry, userId, open, onToggle }) {
  const { t, topic } = useI18n()
  const [note, setNote] = useState(undefined)
  const [copied, setCopied] = useState(false)
  useEffect(() => { getNote(userId, round).then(setNote) }, [userId, round])
  const url = useObjectUrl(note?.blob)
  const names = entry.people.map((p) => p.name.split(' ')[0]).join(', ')

  const copy = async () => {
    const text = `${t('round.roundTable', { n: round, k: entry.table.id })} · ${topic(entry.table.topic)}\n${t('round.with')}: ${entry.people.map((p) => p.name).join(', ')}`
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { /* sin portapapeles */ }
  }

  return (
    <li className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-xl">{emojiOf(entry.table.topic)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('round.roundTable', { n: round, k: entry.table.id })}</span>
          <span className="block font-semibold leading-snug text-ink">{topic(entry.table.topic)}</span>
          {names && <span className="mt-0.5 block truncate text-sm text-slate-500">{names}</span>}
        </span>
        <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          {note === undefined ? null : note ? (
            <>
              <p className="text-sm text-slate-600">{t('round.noteSaved')}</p>
              <audio controls src={url ?? undefined} className="mt-2 w-full" />
            </>
          ) : (
            <p className="text-sm text-slate-500">{t('round.noNote')}</p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {t(copied ? 'round.copied' : 'round.copy')}
            </button>
            {note && url ? (
              <a href={url} download={`${t('round.fileName', { n: round })}.${extensionOf(note.mime)}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                <Download className="h-4 w-4" /> {t('round.download')}
              </a>
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-100 py-2 text-sm font-semibold text-slate-300">
                <Download className="h-4 w-4" /> {t('round.download')}
              </span>
            )}
          </div>
        </div>
      )}
    </li>
  )
}

/* ---------- Piezas ---------- */

/** Tarjeta destacada del tema, en el rojo de marca */
function TopicCard({ table }) {
  const { currentUser, participants } = useApp()
  const { t, topic } = useI18n()
  return (
    <section className="mt-4 rounded-2xl bg-brand p-5 text-white shadow-lg shadow-brand/20">
      <p className="text-xs font-bold uppercase tracking-wider text-white/75">{t('round.topic')}</p>
      <h2 className="mt-1 font-display text-2xl font-medium leading-tight">
        <span aria-hidden className="mr-1.5">{emojiOf(table.topic)}</span>{topic(table.topic)}
      </h2>
      {expertModeOf(participants) && (
        <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
          {t('round.you', { role: t(`roles.${roleOf(currentUser, table.topic)}`) })}
        </span>
      )}
    </section>
  )
}

function Companions({ table }) {
  const { currentUser, participants } = useApp()
  const { t, country } = useI18n()
  const byId = new Map(participants.map((p) => [p.id, p]))
  const people = table.members.filter((id) => id !== currentUser.id).map((id) => byId.get(id)).filter(Boolean)
  return (
    <section className="mt-6">
      <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Users className="h-3.5 w-3.5" /> {t('round.with')}</h2>
      <ul className="mt-2.5 space-y-2">
        {people.map((p) => (
          <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
            <Avatar name={p.name} photo={p.photo} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{p.name}</p>
              <p className="truncate text-xs text-slate-500">{p.role} · {country(p.country)}</p>
            </div>
            {expertModeOf(participants) && <RoleBadge role={roleOf(p, table.topic)} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Grabación de la nota de audio: un toque para empezar, otro para parar (o se para sola al minuto) */
/**
 * Nota de audio al acabar la ronda: grabar (máx. 1 min) → escuchar / regrabar → continuar (se envía).
 * Hasta que todos la han enviado, el móvil se queda en espera y el proyector en «on hold».
 */
function NoteRecorder({ table }) {
  const { event, submitNote } = useApp()
  const { t } = useI18n()
  const [state, setState] = useState(() => (canRecord() ? 'idle' : 'unsupported')) // idle · recording · review · sending · error · unsupported
  const [failed, setFailed] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [blob, setBlob] = useState(null)
  const url = useObjectUrl(blob)
  const rec = useRef(null)

  useEffect(() => () => stopTracks(), [])

  useEffect(() => {
    if (state !== 'recording') return
    const timer = setInterval(() => setSeconds((s) => {
      if (s + 1 >= MAX_NOTE_SECONDS) stop()
      return Math.min(s + 1, MAX_NOTE_SECONDS)
    }), 1000)
    return () => clearInterval(timer)
  }, [state])

  const stopTracks = () => rec.current?.stream.getTracks().forEach((tr) => tr.stop())

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = recorderMime()
      const recorder = new MediaRecorder(stream, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 32_000 }) // voz: ~250 KB por minuto
      const chunks = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      recorder.onstop = () => {
        stopTracks()
        setBlob(new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' }))
        setState('review')
      }
      rec.current = { recorder, stream }
      setSeconds(0)
      setFailed(false)
      recorder.start()
      setState('recording')
    } catch {
      setState('error')
    }
  }

  function stop() {
    if (rec.current?.recorder.state === 'recording') rec.current.recorder.stop()
  }

  const send = async () => {
    setState('sending')
    const res = await submitNote({ round: event.round, tableId: table.id, topic: table.topic, blob })
    if (api.isRemote && !res.uploaded) { setFailed(true); setState('review') }
    // si ha ido bien, la pantalla cambia sola a la espera
  }

  if (state === 'unsupported') return <p className="text-sm text-slate-500">{t('round.noMic')}</p>

  if (state === 'recording') {
    const left = MAX_NOTE_SECONDS - seconds
    return (
      <div className="flex w-full flex-col items-center">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">{t('note.recording')}</p>
        <div className="relative mt-6 grid h-40 w-40 place-items-center">
          <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/20" />
          <span className="relative grid h-32 w-32 place-items-center rounded-full bg-brand text-white shadow-xl shadow-brand/30"><Mic className="h-12 w-12" /></span>
        </div>
        <p className="mt-6 font-display text-5xl font-medium tabular-nums text-ink">0:{String(left).padStart(2, '0')}</p>
        <p className="mt-2 max-w-xs text-sm text-slate-500">{t('note.hint')}</p>
        <Button type="button" onClick={stop} icon={Square} className="mt-8 w-full py-4 text-base">{t('round.stop')}</Button>
      </div>
    )
  }

  if (state === 'review' || state === 'sending') {
    return (
      <div className="flex w-full flex-col items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-mint-soft text-mint-dark"><Check className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-3xl font-medium tracking-tight">{t('note.reviewTitle')}</h1>
        <p className="mt-2 max-w-xs text-slate-600">{t('note.reviewText')}</p>
        <audio controls src={url ?? undefined} className="mt-6 w-full" />
        {failed && <p role="alert" className="mt-4 w-full rounded-xl bg-brand-soft px-3.5 py-3 text-sm font-semibold text-brand-dark">{t('note.sendError')}</p>}
        <Button type="button" onClick={send} disabled={state === 'sending'} icon={Send} className="mt-6 w-full py-4 text-base">
          {state === 'sending' ? t('note.sending') : t('note.continue')}
        </Button>
        <Button type="button" variant="outline" onClick={start} disabled={state === 'sending'} icon={RotateCcw} className="mt-2 w-full py-3.5 text-base">{t('round.recordAgain')}</Button>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-ink text-white"><TimerOff className="h-9 w-9" /></span>
      <h1 className="mt-5 font-display text-4xl font-medium tracking-tight">{t('round.timeUp')}</h1>
      <p className="mt-2 max-w-sm text-slate-600">{t('round.recordPrompt')}</p>
      <Button type="button" onClick={start} icon={Mic} className="mt-8 w-full py-4 text-base">{t('round.record')}</Button>
      {state === 'error' && <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{t('round.micError')}</p>}
    </div>
  )
}

/** URL temporal para reproducir/descargar un Blob (se libera al desmontar) */
function useObjectUrl(blob) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    if (!blob) return setUrl(null)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

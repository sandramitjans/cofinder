import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, Download, Hourglass, Mic, Square, Timer, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { TOPIC_EMOJI, TOTAL_ROUNDS } from '../constants'
import { roleOf } from '../lib/matching'
import { isCustom } from '../lib/topics'
import { useCountdown } from '../lib/useCountdown'
import { MAX_NOTE_SECONDS, canRecord, extensionOf, getNote, recorderMime, saveNote } from '../lib/audioNotes'
import * as api from '../lib/backend'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'
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
  const { currentUser, currentRound, event } = useApp()
  const timer = useCountdown(event.finished ? null : currentRound?.startedAt)
  const table = currentRound?.tables.find((x) => x.members.includes(currentUser?.id))

  let scene, key
  if (event.finished) { scene = <Closing />; key = 'end' }
  else if (!table) { scene = <Waiting />; key = `wait-${event.round}` }
  else if (!currentRound.startedAt) { scene = <GoToTable table={table} />; key = `go-${event.round}` }
  else if (!timer.done) { scene = <ActiveRound table={table} timer={timer} />; key = `talk-${event.round}` }
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

function GoToTable({ table }) {
  const { event } = useApp()
  const { t } = useI18n()
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('round.nextRound', { n: event.round, total: TOTAL_ROUNDS })}</p>
      <h1 className="mt-1 font-display text-4xl font-medium tracking-tight">{t('round.goTo', { n: table.id })}</h1>
      <TopicCard table={table} />
      <Companions table={table} />
      <p className="mt-6 flex items-center justify-center gap-2 text-center text-sm text-slate-500">
        <Timer className="h-4 w-4" /> {t('round.startsSoon')}
      </p>
    </>
  )
}

function ActiveRound({ table, timer }) {
  const { event } = useApp()
  const { t } = useI18n()
  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{t('round.badge', { n: event.round, total: TOTAL_ROUNDS })}</span>
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{t('round.table', { n: table.id })}</span>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Timer className="h-3.5 w-3.5" /> {t('round.timeLeft')}</p>
        <p className={`font-display text-7xl font-medium tabular-nums tracking-tight ${timer.remaining <= 60_000 ? 'text-brand' : 'text-ink'}`} aria-live="off">{timer.label}</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand transition-[width] duration-1000" style={{ width: `${(1 - timer.progress) * 100}%` }} />
        </div>
      </section>
      <TopicCard table={table} />
      <Companions table={table} />
    </>
  )
}

function TimeUp({ table }) {
  const { event, currentUser } = useApp()
  const { t } = useI18n()
  return (
    <div className="flex flex-1 flex-col">
      <span className="self-start rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">{t('round.roundTable', { n: event.round, k: table.id })}</span>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight">{t('round.timeUp')}</h1>
        <p className="mt-2 max-w-sm text-slate-600">{t('round.recordPrompt')}</p>
        <NoteRecorder userId={currentUser.id} round={event.round} tableId={table.id} />
        <p className="mt-8 text-sm text-slate-500">{event.round < TOTAL_ROUNDS ? t('round.nextSoon') : t('round.lastDone')}</p>
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
              <a href={url} download={`cofinder-ronda-${round}.${extensionOf(note.mime)}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
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
function NoteRecorder({ userId, round, tableId }) {
  const { t } = useI18n()
  const [state, setState] = useState('idle') // idle · recording · saving · saved · error · unsupported
  const [uploaded, setUploaded] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const rec = useRef(null)

  useEffect(() => {
    if (!canRecord()) setState('unsupported')
    getNote(userId, round).then((n) => { if (n) { setState('saved'); setUploaded(n.uploaded) } })
    return () => stopTracks()
  }, [userId, round])

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
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      const chunks = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      recorder.onstop = async () => {
        stopTracks()
        setState('saving')
        const blob = new Blob(chunks, { type: recorder.mimeType || mime || 'audio/webm' })
        const res = await saveNote({ userId, round, tableId, blob })
        if (api.isRemote && res.uploaded) api.ping('note')
        setUploaded(res.uploaded)
        setState('saved')
      }
      rec.current = { recorder, stream }
      setSeconds(0)
      recorder.start()
      setState('recording')
    } catch {
      setState('error')
    }
  }

  function stop() {
    if (rec.current?.recorder.state === 'recording') rec.current.recorder.stop()
  }

  if (state === 'unsupported') return <p className="mt-8 text-sm text-slate-500">{t('round.noMic')}</p>
  if (state === 'saved') {
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-mint-soft text-mint-dark"><Check className="h-7 w-7" /></span>
        <p className="font-semibold">{t('round.noteDone')}</p>
        <p className="text-sm text-slate-500">{uploaded || !api.isRemote ? t('round.noteSavedHint') : t('round.noteLocalOnly')}</p>
        <button type="button" onClick={start} className="mt-1 text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">{t('round.recordAgain')}</button>
      </div>
    )
  }
  if (state === 'recording') {
    const left = MAX_NOTE_SECONDS - seconds
    return (
      <div className="mt-8 flex w-full flex-col items-center gap-3">
        <p className="font-display text-5xl font-medium tabular-nums text-brand">0:{String(left).padStart(2, '0')}</p>
        <Button type="button" onClick={stop} icon={Square} className="w-full py-4 text-base">{t('round.stop')}</Button>
      </div>
    )
  }
  return (
    <div className="mt-8 w-full">
      <Button type="button" onClick={start} icon={Mic} disabled={state === 'saving'} className="w-full py-4 text-base">
        {state === 'saving' ? t('register.saving') : t('round.record')}
      </Button>
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Cpu, Download, FileText, KeyRound, Loader2, LogOut, Pause, Play, RefreshCw, Search } from 'lucide-react'
import * as api from '../lib/backend'
import { MOD_PIN } from '../constants'
import { topicKey } from '../lib/topics'
import { useI18n } from '../context/I18nContext'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'

/**
 * Página …/#resum: las transcripciones de las notas de audio, agrupadas por tema de mesa (todas las
 * personas que han hablado de ese tema) o por ronda y mesa.
 * Pide el PIN de Admin (es independiente del panel: se puede abrir en otro ordenador).
 * Se actualiza sola cada 20 s, a medida que el transcriptor del servidor termina cada audio.
 */
const PIN_KEY = 'cofinder:resum-pin'
const BY_KEY = 'cofinder:resum-by'
const AUTO_KEY = 'cofinder:resum-transcribe' // '' = parado · 'small' | 'base' = transcribiendo con ese modelo
const readLs = (k, d) => { try { return localStorage.getItem(k) ?? d } catch { return d } }
const writeLs = (k, v) => { try { localStorage.setItem(k, v) } catch { /* noop */ } }
const REFRESH_MS = 20_000

const readPin = () => { try { return sessionStorage.getItem(PIN_KEY) } catch { return null } }
const savePin = (pin) => { try { pin ? sessionStorage.setItem(PIN_KEY, pin) : sessionStorage.removeItem(PIN_KEY) } catch { /* noop */ } }

export default function ResumView() {
  const [pin, setPin] = useState(readPin)
  const logout = () => { savePin(null); setPin(null) }
  if (!pin) return <PinForm onOk={(p) => { savePin(p); setPin(p) }} />
  return <Summaries pin={pin} onLogout={logout} />
}

function PinForm({ onOk }) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy || !value) return
    setBusy(true)
    let res
    if (api.isRemote) { try { res = await api.checkPin(value.trim()) } catch { res = 'network' } }
    else res = value.trim() === String(MOD_PIN) ? 'ok' : 'invalid_pin'
    setBusy(false)
    if (res === 'ok') onOk(value.trim())
    else { setError(res === 'invalid_pin' ? 'wrong' : res); setValue('') }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className={`w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-xl ${error ? 'animate-shake' : ''}`}>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft"><KeyRound className="h-5 w-5 text-ink" /></div>
        <h1 className="mt-4 text-lg font-bold">{t('resum.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('resum.pinText')}</p>
        <input
          type="password" inputMode="numeric" autoComplete="off" maxLength={8} autoFocus
          value={value} onChange={(e) => { setValue(e.target.value); setError(null) }}
          className={`mt-5 w-full rounded-xl border py-3 text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:ring-4 ${error ? 'border-accent ring-4 ring-accent/20' : 'border-slate-200 focus:border-brand focus:ring-brand/25'}`}
          aria-label={t('gate.pin')}
        />
        <p role="alert" className={`mt-2 min-h-4 text-xs font-medium text-accent-dark ${error ? '' : 'invisible'}`}>{t(`gate.${error ?? 'wrong'}`)}</p>
        <Button type="submit" className="mt-3 w-full" disabled={!value || busy}>{busy ? t('gate.checking') : t('gate.enter')}</Button>
      </form>
    </main>
  )
}

function Summaries({ pin, onLogout }) {
  const { t, topic } = useI18n()
  const [notes, setNotes] = useState(null) // null = cargando
  const [error, setError] = useState(null)
  const [round, setRound] = useState('all')
  const [by, setBy] = useState(() => { try { return localStorage.getItem(BY_KEY) || 'topic' } catch { return 'topic' } })
  useEffect(() => { try { localStorage.setItem(BY_KEY, by) } catch { /* noop */ } }, [by])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const alive = useRef(true)

  const load = useCallback(async () => {
    if (!api.isRemote) { setNotes([]); return }
    setBusy(true)
    try {
      const list = await api.modGetNotes(pin)
      if (alive.current) { setNotes(list); setError(null) }
    } catch (err) {
      if (!alive.current) return
      if (err.code === 'invalid_pin') onLogout()
      else setError(/mod_get_notes|function/i.test(err.message ?? '') ? 'sql' : 'network')
    } finally { if (alive.current) setBusy(false) }
  }, [pin, onLogout])

  useEffect(() => {
    alive.current = true
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => { alive.current = false; clearInterval(id) }
  }, [load])

  const rounds = useMemo(() => [...new Set((notes ?? []).map((n) => n.round))].sort((a, b) => a - b), [notes])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (notes ?? []).filter((n) => (round === 'all' || n.round === round)
      && (!q || [n.name, n.transcript, topic(n.topic ?? '')].some((s) => s?.toLowerCase().includes(q))))
  }, [notes, round, query, topic])

  // Secciones → tarjetas → notas. Por tema: una tarjeta por tema con todas sus notas (de cualquier ronda).
  // Por ronda: una sección por ronda y una tarjeta por mesa.
  const sections = useMemo(() => {
    if (by === 'topic') {
      const cards = new Map()
      for (const n of visible) {
        const k = topicKey(n.topic ?? '')
        if (!cards.has(k)) cards.set(k, { key: k, topic: n.topic, notes: [] })
        cards.get(k).notes.push(n)
      }
      const list = [...cards.values()].sort((a, b) => topic(a.topic ?? '').localeCompare(topic(b.topic ?? '')))
      return [{ key: 'topics', heading: null, cards: list }]
    }
    const byRound = new Map()
    for (const n of visible) {
      if (!byRound.has(n.round)) byRound.set(n.round, new Map())
      const tables = byRound.get(n.round)
      const k = n.table ?? '–'
      if (!tables.has(k)) tables.set(k, { key: k, table: n.table, topic: n.topic, notes: [] })
      tables.get(k).notes.push(n)
    }
    return [...byRound.entries()].map(([r, tables]) => ({ key: r, heading: `${t('resum.round')} ${r}`, cards: [...tables.values()] }))
  }, [visible, by, topic, t])

  const where = (n) => `${t('resum.round')} ${n.round} · ${t('resum.table')} ${n.table ?? '–'}`

  const done = (notes ?? []).filter((n) => n.transcript).length

  const download = (kind) => {
    let body, type
    if (kind === 'csv') {
      const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = [t('resum.round'), t('resum.table'), t('resum.topic'), t('resum.person'), t('resum.role'), t('resum.text')]
      body = '﻿' + [head, ...visible.map((n) => [n.round, n.table, topic(n.topic ?? ''), n.name, n.role, n.transcript])]
        .map((r) => r.map(cell).join(';')).join('\r\n')
      type = 'text/csv'
    } else {
      const title = (c) => (by === 'topic' ? topic(c.topic ?? '') : `${t('resum.table')} ${c.table ?? '–'} · ${topic(c.topic ?? '')}`)
      const line = (n) => `${n.name}${n.role ? ` (${n.role})` : ''}${by === 'topic' ? ` · ${where(n)}` : ''}:\n${n.transcript || t('resum.pending')}\n`
      body = sections.map((sec) => (sec.heading ? `${sec.heading}\n${'='.repeat(30)}\n\n` : '') + sec.cards.map((c) =>
        `${title(c)}\n${'-'.repeat(30)}\n` + c.notes.map(line).join('\n')).join('\n')).join('\n\n')
      type = 'text/plain'
    }
    const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `cofinder-resumenes.${kind}` })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 pb-16 pt-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo />
        <div className="flex items-center gap-2">
          <LangSwitch />
          <button onClick={onLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title={t('resum.logout')} aria-label={t('resum.logout')}><LogOut className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{t('resum.title')}</h1>
          {notes && <p className="mt-1 text-sm text-slate-500">{t('resum.count', { n: notes.length, done })}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" icon={busy ? Loader2 : RefreshCw} onClick={load} disabled={busy} className="!px-3 !py-2">{t('resum.refresh')}</Button>
          <Button variant="outline" icon={FileText} onClick={() => download('txt')} disabled={!visible.length} className="!px-3 !py-2">.txt</Button>
          <Button variant="outline" icon={Download} onClick={() => download('csv')} disabled={!visible.length} className="!px-3 !py-2">Excel (.csv)</Button>
        </div>
      </div>

      {!api.isRemote && <Notice>{t('resum.local')}</Notice>}
      {api.isRemote && notes && <Transcriber pin={pin} pending={notes.filter((n) => !n.transcript).length} onSaved={load} />}
      {error && <Notice>{t(`resum.error.${error}`)}</Notice>}

      {notes?.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="mr-2 inline-flex rounded-full bg-white p-1 ring-1 ring-slate-200" role="group" aria-label={t('resum.groupBy')}>
            {['topic', 'round'].map((k) => (
              <button key={k} onClick={() => setBy(k)} aria-pressed={by === k}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${by === k ? 'bg-brand text-white' : 'text-slate-600 hover:text-ink'}`}>
                {t(`resum.by.${k}`)}
              </button>
            ))}
          </div>
          {['all', ...rounds].map((r) => (
            <button key={r} onClick={() => setRound(r)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${round === r ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-300'}`}>
              {r === 'all' ? t('resum.all') : `${t('resum.round')} ${r}`}
            </button>
          ))}
          <label className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('resum.search')}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/25" />
          </label>
        </div>
      )}

      {notes === null && !error && <p className="mt-10 text-center text-slate-500"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{t('resum.loading')}</p>}
      {notes?.length === 0 && api.isRemote && !error && <p className="mt-10 text-center text-slate-500">{t('resum.empty')}</p>}
      {notes?.length > 0 && visible.length === 0 && <p className="mt-10 text-center text-slate-500">{t('resum.noMatch')}</p>}

      {sections.map((sec) => (
        <section key={sec.key} className="mt-8">
          {sec.heading && <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-brand-dark">{sec.heading}</h2>}
          <div className="space-y-4">
            {sec.cards.map((c) => (
              <article key={c.key} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h3 className="flex flex-wrap items-center gap-2 font-bold">
                  {by === 'round' && <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-sm text-brand-dark">{t('resum.table')} {c.table ?? '–'}</span>}
                  <span className={by === 'topic' ? 'text-lg' : ''}>{topic(c.topic ?? '')}</span>
                  {by === 'topic' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">{c.notes.length === 1 ? t('resum.person1') : t('resum.people', { n: c.notes.length })}</span>}
                </h3>
                <ul className="mt-4 space-y-4">
                  {c.notes.map((n) => (
                    <li key={`${n.id}:${n.round}`} className="border-l-2 border-slate-100 pl-4">
                      <p className="text-sm font-semibold">
                        {n.name}{n.role && <span className="font-normal text-slate-500"> · {n.role}</span>}
                        {by === 'topic' && <span className="ml-2 text-xs font-normal text-slate-400">{where(n)}</span>}
                      </p>
                      {n.transcript
                        ? <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-700">{n.transcript}</p>
                        : <p className="mt-1 text-sm italic text-slate-400"><Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />{t('resum.pending')}</p>}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}

/**
 * Whisper en este navegador: mientras esté en marcha, cada 20 s transcribe las notas pendientes.
 * Queda recordado en este ordenador: al volver a abrir #resum, sigue solo.
 */
function Transcriber({ pin, pending, onSaved }) {
  const { t } = useI18n()
  const [model, setModel] = useState(() => readLs(AUTO_KEY, ''))
  const [st, setSt] = useState(null)
  const [pick, setPick] = useState('small')

  useEffect(() => {
    if (!model) { setSt(null); return }
    let tr
    import('../lib/browserTranscriber').then(({ createTranscriber }) => {
      tr = createTranscriber({ pin, model, onStatus: (x) => { setSt(x); if (x.done) onSaved() } })
      const go = () => tr.tick().then((n) => n && onSaved())
      go()
      tr.timer = setInterval(go, REFRESH_MS)
    })
    return () => { if (tr) { clearInterval(tr.timer); tr.stop() } }
  }, [model, pin, onSaved])

  const start = () => { writeLs(AUTO_KEY, pick); setModel(pick) }
  const stop = () => { writeLs(AUTO_KEY, ''); setModel('') }

  let line
  if (!model) line = pending ? t('resum.tr.offPending', { n: pending }) : t('resum.tr.off')
  else if (!st || st.phase === 'loading') line = t('resum.tr.loading', { p: Math.round((st?.progress ?? 0) * 100) })
  else if (st.phase === 'error') line = t('resum.tr.error')
  else if (st.phase === 'working') line = t('resum.tr.working', { n: st.left ?? pending })
  else line = pending ? t('resum.tr.waiting', { n: pending }) : t('resum.tr.idle')

  return (
    <section className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${model && st?.phase !== 'error' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
        {model && (st?.phase === 'loading' || st?.phase === 'working' || !st) ? <Loader2 className="h-5 w-5 animate-spin" /> : <Cpu className="h-5 w-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">{t('resum.tr.title')}</p>
        <p className="text-sm text-slate-600">{line}</p>
        {model && st?.phase === 'loading' && (
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-brand transition-all" style={{ width: `${Math.round((st.progress ?? 0) * 100)}%` }} /></div>
        )}
        {st?.phase === 'error' && <p className="mt-1 break-words text-xs text-slate-400">{st.error}</p>}
      </div>
      {model ? (
        <Button variant="outline" icon={Pause} onClick={stop} className="!px-3 !py-2">{t('resum.tr.stop')}</Button>
      ) : (
        <div className="flex items-center gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label={t('resum.tr.model')}
            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm">
            <option value="small">{t('resum.tr.small')}</option>
            <option value="base">{t('resum.tr.base')}</option>
          </select>
          <Button icon={Play} onClick={start} className="!px-3 !py-2">{t('resum.tr.start')}</Button>
        </div>
      )}
    </section>
  )
}

const Notice = ({ children }) => <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{children}</p>

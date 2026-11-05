import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileText, KeyRound, Loader2, LogOut, RefreshCw, Search } from 'lucide-react'
import * as api from '../lib/backend'
import { MOD_PIN } from '../constants'
import { useI18n } from '../context/I18nContext'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'

/**
 * Página …/#resum: las transcripciones de las notas de audio de cada ronda, agrupadas por ronda y mesa.
 * Pide el PIN de Admin (es independiente del panel: se puede abrir en otro ordenador).
 * Se actualiza sola cada 20 s, a medida que el transcriptor del servidor termina cada audio.
 */
const PIN_KEY = 'cofinder:resum-pin'
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

  // Ronda → mesa → notas
  const groups = useMemo(() => {
    const byRound = new Map()
    for (const n of visible) {
      if (!byRound.has(n.round)) byRound.set(n.round, new Map())
      const tables = byRound.get(n.round)
      const k = n.table ?? '–'
      if (!tables.has(k)) tables.set(k, { table: n.table, topic: n.topic, notes: [] })
      tables.get(k).notes.push(n)
    }
    return [...byRound.entries()].map(([r, tables]) => ({ round: r, tables: [...tables.values()] }))
  }, [visible])

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
      body = groups.map((g) => `${t('resum.round')} ${g.round}\n${'='.repeat(30)}\n\n` + g.tables.map((tb) =>
        `${t('resum.table')} ${tb.table ?? '–'} · ${topic(tb.topic ?? '')}\n${'-'.repeat(30)}\n` + tb.notes.map((n) =>
          `${n.name}${n.role ? ` (${n.role})` : ''}:\n${n.transcript || t('resum.pending')}\n`).join('\n')).join('\n')).join('\n\n')
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
      {error && <Notice>{t(`resum.error.${error}`)}</Notice>}

      {notes?.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
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

      {groups.map((g) => (
        <section key={g.round} className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-brand-dark">{t('resum.round')} {g.round}</h2>
          <div className="mt-3 space-y-4">
            {g.tables.map((tb) => (
              <article key={tb.table ?? '–'} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h3 className="font-bold">
                  <span className="mr-2 rounded-lg bg-brand-soft px-2 py-0.5 text-sm text-brand-dark">{t('resum.table')} {tb.table ?? '–'}</span>
                  {topic(tb.topic ?? '')}
                </h3>
                <ul className="mt-4 space-y-4">
                  {tb.notes.map((n) => (
                    <li key={n.id} className="border-l-2 border-slate-100 pl-4">
                      <p className="text-sm font-semibold">{n.name}{n.role && <span className="font-normal text-slate-500"> · {n.role}</span>}</p>
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

const Notice = ({ children }) => <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">{children}</p>

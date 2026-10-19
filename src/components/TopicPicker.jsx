import { useEffect, useRef, useState } from 'react'
import { Ban, Check, Plus, X } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_FAMILIES } from '../constants'
import { useI18n } from '../context/I18nContext'
import { DICT } from '../lib/i18n'
import { MAX_CUSTOM_LENGTH, MAX_CUSTOM_TOPICS, isCustom, makeCustom, normalizeText, topicKey } from '../lib/topics'

const COLS = {
  offers: {
    other: 'needs', title: 'waiting.masters', taken: 'register.inSeek', blocked: 'register.blockedSeek', count: 'register.countBring', max: 'register.maxBring',
    on: 'border-brand bg-brand text-ink shadow-sm shadow-brand/25', soft: 'bg-brand-soft text-brand-dark', dot: 'bg-brand',
  },
  needs: {
    other: 'offers', title: 'waiting.explores', taken: 'register.inBring', blocked: 'register.blockedBring', count: 'register.countSeek', max: 'register.maxSeek',
    on: 'border-accent bg-accent text-ink shadow-sm shadow-accent/30', soft: 'bg-accent-soft text-accent-dark', dot: 'bg-accent',
  },
}

// Etiquetas de los temas de la lista en todos los idiomas, para detectar duplicados al escribir «Autre»
const KNOWN = new Map(
  TOPICS.flatMap((id) => Object.values(DICT).map((d) => [normalizeText(d.topics[id]), id])),
)

/**
 * Selección de temas para UNA columna (`col`: «Je maîtrise» = offers, «J’explore» = needs).
 * Arriba, el resumen de las dos columnas (se puede quitar un tema desde ahí). Debajo, las familias,
 * todas abiertas: en escritorio una columna por familia. Un tema ya elegido en la otra columna
 * aparece bloqueado y dice dónde está. «Autre sujet» abre el campo para añadir hasta 3 temas
 * propios, que se marcan directamente en la columna actual.
 */
export default function TopicPicker({ col, offers, needs, customTopics, onChange, error }) {
  const { t, topic } = useI18n()
  const c = COLS[col]
  const lists = { offers, needs }
  const list = lists[col]
  const other = lists[c.other]
  const [notice, setNotice] = useState(null) // { id, kind: 'max' | 'taken' }
  const [otherOpen, setOtherOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [otherMsg, setOtherMsg] = useState(null)
  const [flash, setFlash] = useState(null)
  const otherInput = useRef(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  useEffect(() => { if (otherOpen) otherInput.current?.focus() }, [otherOpen])

  const toggle = (id) => {
    if (list.includes(id)) {
      onChange({ [col]: list.filter((x) => x !== id) })
      setNotice(null)
    } else if (other.includes(id)) {
      setNotice({ id, kind: 'taken' }) // un tema solo puede estar en una columna
    } else if (list.length >= MAX_TAGS) {
      setNotice({ id, kind: 'max' })
    } else {
      onChange({ [col]: [...list, id] })
      setNotice(null)
    }
  }

  const unselect = (key, id) => onChange({ [key]: lists[key].filter((x) => x !== id) })

  const addOther = (e) => {
    e?.preventDefault()
    const label = draft.trim()
    if (!label) return
    const known = KNOWN.get(normalizeText(label))
    const existing = known ?? customTopics.find((x) => topicKey(x) === topicKey(makeCustom(label)))
    if (existing) {
      setOtherMsg({ kind: 'exists' })
      setFlash(existing)
      document.querySelector(`[data-tag="${CSS.escape(existing)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setFlash(null), 2200)
      return
    }
    if (customTopics.length >= MAX_CUSTOM_TOPICS) {
      setOtherMsg({ kind: 'full' })
      return
    }
    const id = makeCustom(label)
    const changes = { customTopics: [...customTopics, id] }
    if (list.length < MAX_TAGS) changes[col] = [...list, id]
    onChange(changes)
    setDraft('')
    setOtherMsg(null)
  }

  const removeOther = (id) => {
    onChange({
      customTopics: customTopics.filter((x) => x !== id),
      offers: offers.filter((x) => x !== id),
      needs: needs.filter((x) => x !== id),
    })
  }

  const chip = (id) => {
    const on = list.includes(id)
    const blocked = !on && other.includes(id)
    return (
      <li key={id} className="flex items-start gap-0.5">
        <button
          type="button"
          data-tag={id}
          onClick={() => toggle(id)}
          aria-pressed={on}
          aria-disabled={blocked || undefined}
          className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-[15px] font-semibold leading-snug lg:text-sm transition-all duration-150 active:scale-[0.98] ${
            on ? c.on
              : blocked ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
              : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
          } ${flash === id ? 'ring-4 ring-accent/40' : ''}`}
        >
          {on ? <Check className="h-4 w-4 shrink-0" /> : blocked ? <Ban className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0 text-slate-500" />}
          <span className="min-w-0">
            {topic(id)}
            {blocked && <span className="block text-xs font-medium">{t(c.blocked)}</span>}
          </span>
        </button>
        {isCustom(id) && (
          <button
            type="button"
            onClick={() => removeOther(id)}
            className="grid h-11 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label={t('register.otherRemove', { label: topic(id) })}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </li>
    )
  }

  const noticeText = notice && (notice.kind === 'taken' ? t(c.taken) : t(c.max, { max: MAX_TAGS }))

  return (
    <div className="mt-5">
      {/* Resumen de las dos columnas: lo elegido siempre a la vista */}
      <div className="grid gap-3 sm:grid-cols-2" aria-live="polite">
        {Object.entries(COLS).map(([key, k]) => {
          const items = lists[key]
          const current = key === col
          return (
            <div key={key} className={`rounded-xl border p-3 ${current ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50'}`}>
              <p className={`flex items-center gap-2 text-sm font-bold ${items.length >= MAX_TAGS && current ? 'text-accent-dark' : 'text-slate-800'}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${k.dot}`} />
                {t(k.count, { n: items.length, max: MAX_TAGS })}
              </p>
              {items.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {items.map((id) => (
                    <li key={id} className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1 text-sm font-medium ${k.soft}`}>
                      {topic(id)}
                      <button
                        type="button"
                        onClick={() => unselect(key, id)}
                        className="grid h-6 w-6 place-items-center rounded-full hover:bg-white/70"
                        aria-label={t('register.otherRemove', { label: topic(id) })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {noticeText && (
        <p role="alert" className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-dark">{noticeText}</p>
      )}

      {/* Familias: una columna por familia en escritorio */}
      <div className="mt-6 grid gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
        {TOPIC_FAMILIES.map((g) => (
          <section key={g.id} aria-labelledby={`family-${g.id}`}>
            <h3 id={`family-${g.id}`} className="border-b border-slate-200 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              {t(`register.families.${g.id}`)}
            </h3>
            <ul className="mt-3 space-y-2">{g.topics.map(chip)}</ul>
          </section>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-semibold text-accent-dark">{error}</p>}

      {/* Temas propios y «Autre sujet» */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        {customTopics.length > 0 && (
          <section aria-labelledby="family-custom" className="mb-4">
            <h3 id="family-custom" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('register.families.custom')}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{customTopics.map(chip)}</ul>
          </section>
        )}

        {!otherOpen ? (
          <button
            type="button"
            onClick={() => setOtherOpen(true)}
            disabled={customTopics.length >= MAX_CUSTOM_TOPICS}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-slate-400 px-4 text-[15px] font-semibold text-slate-700 transition hover:border-slate-600 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> {t('register.otherToggle')}
          </button>
        ) : (
          <div className="max-w-xl">
            <label htmlFor={`other-topic-${col}`} className="block text-base font-semibold text-ink">{t('register.otherTitle')}</label>
            <div className="mt-2 flex gap-2">
              <input
                ref={otherInput}
                id={`other-topic-${col}`}
                type="text"
                value={draft}
                maxLength={MAX_CUSTOM_LENGTH}
                onChange={(e) => { setDraft(e.target.value); setOtherMsg(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addOther(e)
                  if (e.key === 'Escape') { setOtherOpen(false); setDraft('') }
                }}
                placeholder={t('register.otherPh')}
                disabled={customTopics.length >= MAX_CUSTOM_TOPICS}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={addOther}
                disabled={!draft.trim() || customTopics.length >= MAX_CUSTOM_TOPICS}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-4 text-[15px] font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" /> {t('register.otherAdd')}
              </button>
            </div>
            <p className={`mt-2 text-sm ${otherMsg ? 'font-semibold text-accent-dark' : 'text-slate-600'}`} aria-live="polite">
              {otherMsg?.kind === 'exists' && t('register.otherExists')}
              {otherMsg?.kind === 'full' && t('register.otherFull', { max: MAX_CUSTOM_TOPICS })}
              {!otherMsg && (customTopics.length >= MAX_CUSTOM_TOPICS
                ? t('register.otherFull', { max: MAX_CUSTOM_TOPICS })
                : t('register.otherHint', { max: MAX_CUSTOM_TOPICS, len: MAX_CUSTOM_LENGTH }))}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Ban, Check, Plus, X } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_FAMILIES } from '../constants'
import { useI18n } from '../context/I18nContext'
import { DICT } from '../lib/i18n'
import { MAX_CUSTOM_LENGTH, MAX_CUSTOM_TOPICS, isCustom, makeCustom, normalizeText, topicKey } from '../lib/topics'

const COLS = {
  offers: { other: 'needs', taken: 'register.inSeek', count: 'register.countBring', max: 'register.maxBring', on: 'border-brand bg-brand text-ink shadow-sm shadow-brand/25', dot: 'bg-brand' },
  needs: { other: 'offers', taken: 'register.inBring', count: 'register.countSeek', max: 'register.maxSeek', on: 'border-accent bg-accent text-ink shadow-sm shadow-accent/30', dot: 'bg-accent' },
}

// Etiquetas de los temas de la lista en todos los idiomas, para detectar duplicados al escribir «Autre»
const KNOWN = new Map(
  TOPICS.flatMap((id) => Object.values(DICT).map((d) => [normalizeText(d.topics[id]), id])),
)

/**
 * Selección de temas para UNA columna (`col`: «Je maîtrise» = offers, «J’explore» = needs).
 * Los temas se muestran por familias, todas abiertas, como etiquetas. Un tema ya elegido en la
 * otra columna aparece bloqueado. Incluye «Autre» para añadir hasta 3 temas propios, que se
 * marcan directamente en la columna actual.
 */
export default function TopicPicker({ col, offers, needs, customTopics, onChange, error }) {
  const { t, topic } = useI18n()
  const c = COLS[col]
  const lists = { offers, needs }
  const list = lists[col]
  const other = lists[c.other]
  const [notice, setNotice] = useState(null) // { id, kind: 'max' | 'taken' }
  const [draft, setDraft] = useState('')
  const [otherMsg, setOtherMsg] = useState(null)
  const [flash, setFlash] = useState(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

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

  const groups = [
    ...TOPIC_FAMILIES,
    ...(customTopics.length ? [{ id: 'custom', topics: customTopics }] : []),
  ]

  return (
    <div className="mt-5">
      <span
        aria-live="polite"
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
          list.length >= MAX_TAGS ? 'border-accent/40 bg-accent-soft text-accent-dark' : 'border-slate-200 bg-slate-50 text-slate-800'
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
        {t(c.count, { n: list.length, max: MAX_TAGS })}
      </span>

      <div className="mt-5 space-y-5">
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`family-${g.id}`}>
            <h3 id={`family-${g.id}`} className="text-sm font-bold uppercase tracking-wider text-slate-500">
              {t(`register.families.${g.id}`)}
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {g.topics.map((id) => {
                const on = list.includes(id)
                const blocked = !on && other.includes(id)
                return (
                  <span key={id} className="inline-flex items-center">
                    <button
                      type="button"
                      data-tag={id}
                      onClick={() => toggle(id)}
                      aria-pressed={on}
                      aria-disabled={blocked || undefined}
                      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition-all duration-150 active:scale-95 ${
                        on ? c.on
                          : blocked ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                      } ${flash === id ? 'ring-4 ring-accent/40' : ''}`}
                    >
                      {on ? <Check className="h-4 w-4" /> : blocked ? <Ban className="h-4 w-4" /> : <Plus className="h-4 w-4 text-slate-500" />}
                      {topic(id)}
                    </button>
                    {isCustom(id) && (
                      <button
                        type="button"
                        onClick={() => removeOther(id)}
                        className="ml-0.5 grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={t('register.otherRemove', { label: topic(id) })}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                )
              })}
            </div>
            {notice && g.topics.includes(notice.id) && (
              <p role="alert" className="mt-2 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-dark">
                {notice.kind === 'taken' ? t(c.taken) : t(c.max, { max: MAX_TAGS })}
              </p>
            )}
          </section>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-semibold text-accent-dark">{error}</p>}

      {/* Autre */}
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label htmlFor={`other-topic-${col}`} className="block text-base font-semibold text-ink">{t('register.otherTitle')}</label>
        <div className="mt-2 flex gap-2">
          <input
            id={`other-topic-${col}`}
            type="text"
            value={draft}
            maxLength={MAX_CUSTOM_LENGTH}
            onChange={(e) => { setDraft(e.target.value); setOtherMsg(null) }}
            onKeyDown={(e) => e.key === 'Enter' && addOther(e)}
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
    </div>
  )
}

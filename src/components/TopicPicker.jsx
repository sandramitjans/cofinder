import { useEffect, useRef, useState } from 'react'
import { Ban, Plus, X } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_EMOJI, TOPIC_FAMILIES } from '../constants'
import { useI18n } from '../context/I18nContext'
import { DICT } from '../lib/i18n'
import { MAX_CUSTOM_LENGTH, MAX_CUSTOM_TOPICS, isCustom, makeCustom, normalizeText, topicKey } from '../lib/topics'

const COLS = {
  offers: {
    other: 'needs', title: 'waiting.masters', taken: 'register.inSeek', blocked: 'register.blockedSeek', count: 'register.countBring', max: 'register.maxBring',
    dot: 'bg-brand',
  },
  needs: {
    other: 'offers', title: 'waiting.explores', taken: 'register.inBring', blocked: 'register.blockedBring', count: 'register.countSeek', max: 'register.maxSeek',
    dot: 'bg-accent',
  },
}

// Etiquetas de los temas de la lista en todos los idiomas, para detectar duplicados al escribir «Autre»
const KNOWN = new Map(
  TOPICS.flatMap((id) => Object.values(DICT).map((d) => [normalizeText(d.topics[id]), id])),
)

/**
 * Selección de temas para UNA columna (`col`: «Je maîtrise» = offers, «J’explore» = needs).
 * Arriba, las MAX_TAGS casillas de la columna con su progreso: al pulsar un tema pasa a la
 * siguiente casilla libre, y al pulsar una casilla llena se quita. Debajo, los temas disponibles
 * por familias, como píldoras con emoji. Un tema ya elegido en la otra columna aparece bloqueado
 * y dice dónde está. «Autre sujet» abre el campo para añadir hasta 3 temas propios.
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

  const emoji = (id) => (isCustom(id) ? '✨' : TOPIC_EMOJI[id])

  // Tema disponible: los ya elegidos en esta columna están en las casillas, no aquí
  const chip = (id) => {
    if (list.includes(id)) return null
    const blocked = other.includes(id)
    const full = list.length >= MAX_TAGS
    return (
      <li key={id} className="flex items-center">
        <button
          type="button"
          data-tag={id}
          onClick={() => toggle(id)}
          aria-disabled={blocked || full || undefined}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-left text-[15px] font-semibold leading-snug transition-all duration-150 active:scale-[0.97] ${
            blocked ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
              : full ? 'border-slate-200 bg-white text-slate-400'
              : 'border-slate-300 bg-white text-ink hover:border-brand hover:bg-brand-soft'
          } ${flash === id ? 'ring-4 ring-accent/40' : ''}`}
        >
          {blocked ? <Ban className="h-4 w-4 shrink-0" /> : <span aria-hidden className="text-lg leading-none">{emoji(id)}</span>}
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
      {/* Progreso y casillas de esta columna */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: MAX_TAGS }, (_, i) => (
              <span key={i} className={`h-2 w-6 rounded-full transition-colors ${i < list.length ? c.dot : 'bg-slate-200'}`} />
            ))}
          </div>
          <span className="text-sm font-bold tabular-nums text-ink">{list.length}/{MAX_TAGS}</span>
        </div>
        {list.length > 0 && (
          <button type="button" onClick={() => onChange({ [col]: [] })} className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-ink hover:underline">
            {t('register.clearAll')}
          </button>
        )}
      </div>

      <ol className="mt-3 grid grid-cols-5 gap-2 rounded-2xl bg-gradient-to-r from-brand-soft to-accent-soft p-3 sm:gap-3">
        {Array.from({ length: MAX_TAGS }, (_, i) => {
          const id = list[i]
          return (
            <li key={id ?? `empty-${i}`}>
              {id ? (
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  title={t('register.otherRemove', { label: topic(id) })}
                  aria-label={t('register.otherRemove', { label: topic(id) })}
                  className="animate-pop-in group relative flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-xl bg-white p-1.5 text-center shadow-sm transition hover:shadow-md"
                >
                  <span aria-hidden className="text-2xl leading-none sm:text-3xl">{emoji(id)}</span>
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-ink sm:text-xs">{topic(id)}</span>
                  <X aria-hidden className="absolute right-1 top-1 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100" />
                </button>
              ) : (
                <span
                  aria-label={t('register.slotEmpty', { n: i + 1 })}
                  className="grid aspect-square w-full place-items-center rounded-xl border-2 border-dashed border-slate-300 text-lg font-bold text-slate-400"
                >
                  {i + 1}
                </span>
              )}
            </li>
          )
        })}
      </ol>

      {/* Lo elegido en la otra columna, como recordatorio */}
      {other.length > 0 && (
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-700">{t(COLS[c.other].title)} :</span>{' '}
          {other.map((id) => topic(id)).join(' · ')}
        </p>
      )}

      {noticeText && (
        <p role="alert" className="mt-4 rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent-dark">{noticeText}</p>
      )}

      {/* Familias, todas abiertas */}
      <div className="mt-6 space-y-5">
        {TOPIC_FAMILIES.map((g) => (
          <section key={g.id} aria-labelledby={`family-${g.id}`}>
            <h3 id={`family-${g.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t(`register.families.${g.id}`)}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">{g.topics.map(chip)}</ul>
          </section>
        ))}
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-semibold text-accent-dark">{error}</p>}

      {/* Temas propios y «Autre sujet» */}
      <div className="mt-6 border-t border-slate-200 pt-5">
        {customTopics.length > 0 && (
          <section aria-labelledby="family-custom" className="mb-4">
            <h3 id="family-custom" className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('register.families.custom')}</h3>
            <ul className="mt-3 flex flex-wrap gap-2">{customTopics.map(chip)}</ul>
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

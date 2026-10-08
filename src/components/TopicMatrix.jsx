import { useEffect, useRef, useState } from 'react'
import { Ban, Check, Plus, X } from 'lucide-react'
import { MAX_TAGS, TOPICS } from '../constants'
import { useI18n } from '../context/I18nContext'
import { DICT } from '../lib/i18n'
import { MAX_CUSTOM_LENGTH, MAX_CUSTOM_TOPICS, isCustom, makeCustom, normalizeText, topicKey } from '../lib/topics'

const COLS = {
  offers: { other: 'needs', taken: 'register.inSeek', label: 'register.bring', count: 'register.countBring', max: 'register.maxBring', on: 'border-brand bg-brand text-white shadow-sm shadow-brand/25', dot: 'bg-brand' },
  needs: { other: 'offers', taken: 'register.inBring', label: 'register.seek', count: 'register.countSeek', max: 'register.maxSeek', on: 'border-accent bg-accent text-ink shadow-sm shadow-accent/30', dot: 'bg-accent' },
}

// Etiquetas de los temas de la lista en todos los idiomas, para detectar duplicados al escribir «Autre»
const KNOWN = new Map(
  TOPICS.flatMap((id) => Object.values(DICT).map((d) => [normalizeText(d.topics[id]), id])),
)

/**
 * Una sola lista de temas con dos botones por tema: «J’apporte» (Offre) y «Je cherche» (Demande).
 * Incluye el campo «Autre» para añadir hasta 3 temas propios.
 */
export default function TopicMatrix({ offers, needs, customTopics, onChange, errors = {} }) {
  const { t, topic } = useI18n()
  const [notice, setNotice] = useState(null) // { id, col, kind: 'max' | 'taken' } — aviso junto a la fila pulsada
  const [draft, setDraft] = useState('')
  const [otherMsg, setOtherMsg] = useState(null)
  const [flash, setFlash] = useState(null)
  const rows = [...TOPICS, ...customTopics]
  const lists = { offers, needs }

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  const toggle = (id, col) => {
    const list = lists[col]
    if (list.includes(id)) {
      onChange({ [col]: list.filter((x) => x !== id) })
      setNotice(null)
    } else if (lists[COLS[col].other].includes(id)) {
      setNotice({ id, col, kind: 'taken' }) // un tema solo puede estar en una columna
    } else if (list.length >= MAX_TAGS) {
      setNotice({ id, col, kind: 'max' })
    } else {
      onChange({ [col]: [...list, id] })
    }
  }

  const addOther = (e) => {
    e?.preventDefault()
    const label = draft.trim()
    if (!label) return
    const norm = normalizeText(label)
    const known = KNOWN.get(norm)
    if (known || customTopics.some((c) => topicKey(c) === topicKey(makeCustom(label)))) {
      const target = known ?? customTopics.find((c) => topicKey(c) === topicKey(makeCustom(label)))
      setOtherMsg({ kind: 'exists' })
      setFlash(target)
      document.querySelector(`[data-row="${CSS.escape(target)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setFlash(null), 2200)
      return
    }
    if (customTopics.length >= MAX_CUSTOM_TOPICS) {
      setOtherMsg({ kind: 'full' })
      return
    }
    onChange({ customTopics: [...customTopics, makeCustom(label)] })
    setDraft('')
    setOtherMsg(null)
  }

  const removeOther = (id) => {
    onChange({
      customTopics: customTopics.filter((c) => c !== id),
      offers: offers.filter((x) => x !== id),
      needs: needs.filter((x) => x !== id),
    })
  }

  return (
    <div className="mt-5">
      {/* Leyenda y contadores */}
      <p className="text-base text-slate-700">{t('register.listLegend')}</p>
      <div className="mt-3 flex flex-wrap gap-2" aria-live="polite">
        {Object.entries(COLS).map(([col, c]) => (
          <span
            key={col}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
              lists[col].length >= MAX_TAGS ? 'border-brand/40 bg-brand-soft text-brand' : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
            {t(c.count, { n: lists[col].length, max: MAX_TAGS })}
          </span>
        ))}
      </div>

      {/* Lista única */}
      <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
        {rows.map((id) => {
          const custom = isCustom(id)
          const unanswered = custom && !offers.includes(id) && !needs.includes(id)
          return (
            <li
              key={id}
              data-row={id}
              className={`py-3 transition-colors ${flash === id ? 'rounded-lg bg-accent-soft' : ''}`}
            >
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                  <span id={`topic-${id}`} className="text-base font-semibold text-ink">{topic(id)}</span>
                  {custom && (
                    <>
                      <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-semibold text-accent">{t('register.otherBadge')}</span>
                      <button
                        type="button"
                        onClick={() => removeOther(id)}
                        className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label={t('register.otherRemove', { label: topic(id) })}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
                  {Object.entries(COLS).map(([col, c]) => {
                    const on = lists[col].includes(id)
                    const blocked = !on && lists[c.other].includes(id)
                    return (
                      <button
                        key={col}
                        type="button"
                        data-col={col}
                        data-tag={id}
                        onClick={() => toggle(id, col)}
                        aria-pressed={on}
                        aria-disabled={blocked || undefined}
                        aria-describedby={`topic-${id}`}
                        className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition-all duration-150 active:scale-95 sm:min-w-[8.5rem] ${
                          on ? c.on
                            : blocked ? 'border-dashed border-slate-300 bg-slate-50 text-slate-400'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {on ? <Check className="h-4 w-4" /> : blocked ? <Ban className="h-4 w-4" /> : <Plus className="h-4 w-4 text-slate-500" />}
                        {t(c.label)}
                      </button>
                    )
                  })}
                </div>
              </div>
              {notice?.id === id && (
                <p role="alert" className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand">
                  {notice.kind === 'taken' ? t(COLS[notice.col].taken) : t(COLS[notice.col].max, { max: MAX_TAGS })}
                </p>
              )}
              {unanswered && notice?.id !== id && (
                <p className="mt-2 text-sm text-slate-600">{t('register.otherNoChoice', { label: topic(id) })}</p>
              )}
            </li>
          )
        })}
      </ul>

      {/* Errores de validación */}
      {(errors.offers || errors.needs) && (
        <div role="alert" className="mt-3 space-y-1 text-sm font-semibold text-brand">
          {errors.offers && <p>{errors.offers}</p>}
          {errors.needs && <p>{errors.needs}</p>}
        </div>
      )}

      {/* Autre */}
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <label htmlFor="other-topic" className="block text-base font-semibold text-ink">{t('register.otherTitle')}</label>
        <div className="mt-2 flex gap-2">
          <input
            id="other-topic"
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
        <p className={`mt-2 text-sm ${otherMsg ? 'font-semibold text-brand' : 'text-slate-600'}`} aria-live="polite">
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

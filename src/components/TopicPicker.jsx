import { useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_EMOJI, TOPIC_FAMILIES } from '../constants'
import { useI18n } from '../context/I18nContext'
import { DICT } from '../lib/i18n'
import { MAX_CUSTOM_LENGTH, MAX_CUSTOM_TOPICS, isCustom, makeCustom, normalizeText, topicKey } from '../lib/topics'

// Etiquetas de los temas de la lista en todos los idiomas, para detectar duplicados al proponer una mesa
const KNOWN = new Map(
  TOPICS.flatMap((id) => Object.values(DICT).map((d) => [normalizeText(d.topics[id]), id])),
)
const FAMILY_OF = Object.fromEntries(TOPIC_FAMILIES.flatMap((g) => g.topics.map((id) => [id, g.id])))

/**
 * «Apúntate a las mesas»: cada tema es una mesa de conversación y se eligen hasta `max`.
 * Arriba, filtros por familia; debajo, las mesas como tarjetas (emoji, título, descripción,
 * «Propuesta por…» y familia). Las mesas propuestas por participantes (temas propios) salen
 * primero. Al final, el campo para proponer una mesa nueva (hasta MAX_CUSTOM_TOPICS por persona).
 * `proposals` = mesas propuestas por otras personas: [{ id: 'custom:…', by: 'Nombre' }]
 */
export default function TopicPicker({ value, customTopics, proposals = [], onChange, error, max = MAX_TAGS }) {
  const { t, topic } = useI18n()
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(false)
  const [draft, setDraft] = useState('')
  const [otherMsg, setOtherMsg] = useState(null)
  const [flash, setFlash] = useState(null)
  const otherInput = useRef(null)

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(false), 4000)
    return () => clearTimeout(timer)
  }, [notice])

  // Mesas propuestas: las mías y las de los demás (sin repetir la misma mesa escrita de otra forma)
  const mine = customTopics.map((id) => ({ id, by: null }))
  const seen = new Set(mine.map((p) => topicKey(p.id)))
  const others = proposals.filter((p) => isCustom(p.id) && !seen.has(topicKey(p.id)) && seen.add(topicKey(p.id)))
  const proposed = [...mine, ...others]

  const toggle = (id) => {
    if (value.includes(id)) {
      onChange({ needs: value.filter((x) => x !== id) })
      setNotice(false)
    } else if (value.length >= max) {
      setNotice(true)
    } else {
      onChange({ needs: [...value, id] })
      setNotice(false)
    }
  }

  const addOther = (e) => {
    e?.preventDefault()
    const label = draft.trim()
    if (!label) return
    const id = makeCustom(label)
    const existing = KNOWN.get(normalizeText(label)) ?? proposed.find((p) => topicKey(p.id) === topicKey(id))?.id
    if (existing) {
      setOtherMsg({ kind: 'exists' })
      setFilter('all')
      setFlash(existing)
      setTimeout(() => document.querySelector(`[data-tag="${CSS.escape(existing)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      setTimeout(() => setFlash(null), 2200)
      return
    }
    if (customTopics.length >= MAX_CUSTOM_TOPICS) {
      setOtherMsg({ kind: 'full' })
      return
    }
    // Quien propone una mesa se apunta a ella (si aún le quedan plazas)
    const changes = { customTopics: [...customTopics, id] }
    if (value.length < max) changes.needs = [...value, id]
    onChange(changes)
    setDraft('')
    setOtherMsg(null)
  }

  const removeOther = (id) => {
    onChange({ customTopics: customTopics.filter((x) => x !== id), needs: value.filter((x) => x !== id) })
  }

  const filters = [
    { id: 'all', label: t('register.filterAll') },
    ...(proposed.length ? [{ id: 'proposed', label: t('register.families.custom') }] : []),
    ...TOPIC_FAMILIES.map((g) => ({ id: g.id, label: t(`register.families.${g.id}`) })),
  ]
  const visible = [
    ...(filter === 'all' || filter === 'proposed' ? proposed : []),
    ...(filter === 'proposed' ? [] : TOPICS.filter((id) => filter === 'all' || FAMILY_OF[id] === filter).map((id) => ({ id }))),
  ]

  const card = ({ id, by }) => {
    const selected = value.includes(id)
    const full = !selected && value.length >= max
    const custom = isCustom(id)
    const ownProposal = custom && customTopics.includes(id)
    return (
      <li key={id} className="relative">
        <button
          type="button"
          data-tag={id}
          onClick={() => toggle(id)}
          aria-pressed={selected}
          aria-disabled={full || undefined}
          className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 active:scale-[0.99] lg:p-4 ${
            selected ? 'border-brand bg-brand-soft/60 shadow-sm'
              : full ? 'border-slate-200 bg-white opacity-60'
              : 'border-slate-200 bg-white hover:border-brand/50'
          } ${flash === id ? 'ring-4 ring-brand/30' : ''} ${ownProposal ? 'pr-11' : ''}`}
        >
          <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl ${selected ? 'bg-white' : 'bg-brand-soft'}`}>
            {custom ? '💬' : TOPIC_EMOJI[id]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug text-ink">{topic(id)}</span>
            {!custom && <span className="mt-0.5 block text-sm leading-snug text-slate-500">{t(`topicDesc.${id}`)}</span>}
            {custom && (
              <span className="mt-0.5 block text-sm text-slate-500">
                {by ? <>{t('register.proposedBy')} <strong className="font-semibold text-ink">{by}</strong></> : t('register.proposedByYou')}
              </span>
            )}
            <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {custom ? t('register.families.custom') : t(`register.families.${FAMILY_OF[id]}`)}
            </span>
          </span>
          <span aria-hidden className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-brand bg-brand text-white' : 'border-slate-300'} ${ownProposal ? 'hidden' : ''}`}>
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        </button>
        {ownProposal && (
          <button
            type="button"
            onClick={() => removeOther(id)}
            className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-white hover:text-ink"
            aria-label={t('register.otherRemove', { label: topic(id) })}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </li>
    )
  }

  return (
    <div className="mt-5">
      {/* Filtros por familia */}
      <div className="-mx-1 flex flex-wrap gap-2 px-1" role="group" aria-label={t('register.filterLabel')}>
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              filter === f.id ? 'bg-brand text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3" aria-live="polite">
        <p className="text-sm font-semibold text-slate-600">
          <span className="font-bold text-brand">{value.length} / {max}</span> {t('register.tablesChosen')}
        </p>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange({ needs: [] })} className="text-sm font-medium text-slate-500 underline-offset-4 hover:text-ink hover:underline">
            {t('register.clearAll')}
          </button>
        )}
      </div>

      {notice && (
        <p role="alert" className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">{t('register.maxTables', { max })}</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{error}</p>}

      <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">{visible.map(card)}</ul>

      {/* Proponer una mesa */}
      <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 lg:p-5">
        <label htmlFor="other-topic" className="block font-semibold text-ink">{t('register.otherTitle')}</label>
        <p className="mt-0.5 text-sm text-slate-500">{t('register.otherSub')}</p>
        <div className="mt-3 flex gap-2">
          <input
            ref={otherInput}
            id="other-topic"
            type="text"
            value={draft}
            maxLength={MAX_CUSTOM_LENGTH}
            onChange={(e) => { setDraft(e.target.value); setOtherMsg(null) }}
            onKeyDown={(e) => { if (e.key === 'Enter') addOther(e) }}
            placeholder={t('register.otherPh')}
            disabled={customTopics.length >= MAX_CUSTOM_TOPICS}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-slate-100"
          />
          <button
            type="button"
            onClick={addOther}
            disabled={!draft.trim() || customTopics.length >= MAX_CUSTOM_TOPICS}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand px-4 text-[15px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> {t('register.otherAdd')}
          </button>
        </div>
        <p className={`mt-2 text-sm ${otherMsg ? 'font-semibold text-brand-dark' : 'text-slate-500'}`} aria-live="polite">
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

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_EMOJI, TOPIC_FAMILIES } from '../constants'
import { useI18n } from '../context/I18nContext'
import { isCustom, seededOrder, topicOrderSeed } from '../lib/topics'

const FAMILY_OF = Object.fromEntries(TOPIC_FAMILIES.flatMap((g) => g.topics.map((id) => [id, g.id])))

/**
 * «Apúntate a las mesas»: cada tema es una mesa de conversación y se eligen hasta `max`.
 *
 * `topics` = mesas del evento que la moderadora ha añadido desde el panel:
 *   [{ id: 'custom:…', by: 'Quien la propone', desc: '…' }]. Cada tarjeta muestra «Propuesta por…».
 * Si aún no hay ninguna, se muestran los 20 temas de la lista. Arriba, filtros por familia
 * (Adquisición, Marca, Datos/IA…): la de cada mesa la elige la moderadora al añadirla.
 *
 * Las mesas salen en un orden aleatorio distinto para cada persona (estable en su dispositivo),
 * para que las primeras de la lista no se lleven todos los votos.
 */
export default function TopicPicker({ value, topics = [], onChange, error, max = MAX_TAGS }) {
  const { t, topic } = useI18n()
  const [filter, setFilter] = useState('all')
  const [notice, setNotice] = useState(false)
  const seed = useMemo(topicOrderSeed, [])
  const eventMode = topics.length > 0

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(false), 4000)
    return () => clearTimeout(timer)
  }, [notice])

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

  const ordered = useMemo(
    () => (eventMode ? seededOrder(topics, seed, (x) => x.id) : seededOrder(TOPICS, seed).map((id) => ({ id }))),
    [eventMode, topics, seed],
  )
  // Familia de cada mesa: la de la lista por defecto o la que eligió la moderadora al añadirla
  const familyOf = (x) => x.family || FAMILY_OF[x.id] || ''
  const present = new Set(ordered.map(familyOf))
  const families = TOPIC_FAMILIES.filter((g) => present.has(g.id))
  const filters = families.length < 2 ? [] : [
    { id: 'all', label: t('register.filterAll') },
    ...families.map((g) => ({ id: g.id, label: t(`register.families.${g.id}`) })),
  ]
  const visible = filter === 'all' || !filters.length ? ordered : ordered.filter((x) => familyOf(x) === filter)

  const card = (x) => {
    const { id, by, desc } = x
    const family = familyOf(x)
    const selected = value.includes(id)
    const full = !selected && value.length >= max
    const custom = isCustom(id)
    const description = custom ? desc : t(`topicDesc.${id}`)
    return (
      <li key={id}>
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
          }`}
        >
          <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xl ${selected ? 'bg-white' : 'bg-brand-soft'}`}>
            {custom ? '💬' : TOPIC_EMOJI[id]}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug text-ink">{topic(id)}</span>
            {description && <span className="mt-0.5 block text-sm leading-snug text-slate-500">{description}</span>}
            {by && (
              <span className="mt-1.5 block text-sm text-slate-500">
                {t('register.proposedBy')} <strong className="font-semibold text-ink">{by}</strong>
              </span>
            )}
            {family && (
              <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t(`register.families.${family}`)}
              </span>
            )}
          </span>
          <span aria-hidden className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${selected ? 'border-mint bg-mint text-white' : 'border-slate-300'}`}>
            {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="mt-5">
      {/* Filtros por familia (solo con la lista de temas por defecto) */}
      {filters.length > 0 && (
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
      )}

      <p className={`${filters.length ? 'mt-4' : ''} text-sm font-semibold text-slate-600`} aria-live="polite">
        <span className="font-bold text-brand-dark">{value.length} / {max}</span> {t('register.tablesChosen')}
      </p>

      {notice && (
        <p role="alert" className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">{t('register.maxTables', { max })}</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{error}</p>}

      <ul className="mt-4 grid gap-2.5 lg:grid-cols-2">{visible.map(card)}</ul>
    </div>
  )
}

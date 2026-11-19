import { useEffect, useMemo, useState } from 'react'
import { Check, Lightbulb } from 'lucide-react'
import { FAMILY_EMOJI, MAX_TAGS, TOPICS, TOPIC_FAMILIES, TOPIC_PROPOSERS } from '../constants'
import { familyOfTopic, familyTone } from '../lib/familyColors'
import { useI18n } from '../context/I18nContext'
import { eventTopicDesc, isCustom, seededOrder, topicOrderSeed } from '../lib/topics'

/**
 * «Choisissez votre table»: cada tema es una mesa de conversación que propone un colega.
 * La tarjeta se lee como una invitación: arriba quién la propone (iniciales + «X vous propose»),
 * debajo el tema en grande y la descripción. Arriba, filtros por familia con su emoji y un consejo para elegir.
 * Cada tarjeta lleva una franja del color de su familia (sin etiqueta) y las iniciales en ese pastel.
 *
 * Todas las tarjetas miden lo mismo: el título ocupa siempre 2 líneas y la descripción 2 líneas
 * (si es más larga se corta con «…»). Por eso conviene escribir títulos de ~35 caracteres y
 * descripciones de ~70 en el panel.
 *
 * `topics` = mesas del evento que el Admin ha añadido desde el panel: [{ id: 'custom:…', by, desc }].
 * Si aún no hay ninguna, se muestran los temas de la lista, con quien los propone según TOPIC_PROPOSERS.
 * Con `max` = 1 es una elección única: pulsar otra mesa cambia la elegida.
 *
 * Las mesas salen en un orden aleatorio distinto para cada persona (estable en su dispositivo),
 * para que las primeras de la lista no se lleven todos los votos.
 */

// Color fuerte de cada familia para la franja izquierda de la tarjeta
const BAND = {
  acquisition: 'bg-fam-acquisition-ink', brand: 'bg-fam-brand-ink', customer: 'bg-fam-customer-ink',
  data: 'bg-fam-data-ink', business: 'bg-fam-business-ink',
}

/** «Zsófia Nagy» → «ZN» */
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function TopicPicker({ value, topics = [], onChange, error, max = MAX_TAGS }) {
  const { t, topic, lang } = useI18n()
  const [notice, setNotice] = useState(false)
  const [filter, setFilter] = useState('all')
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
    } else if (max === 1) {
      onChange({ needs: [id] })
      setNotice(false)
    } else if (value.length >= max) {
      setNotice(true)
    } else {
      onChange({ needs: [...value, id] })
      setNotice(false)
    }
  }

  const ordered = useMemo(
    () => (eventMode ? seededOrder(topics, seed, (x) => x.id) : seededOrder(TOPICS, seed).map((id) => ({ id, by: TOPIC_PROPOSERS[id] ?? '' }))),
    [eventMode, topics, seed],
  )

  // Familia de cada mesa: la de la lista por defecto o la que eligió el Admin al añadirla
  const familyOf = (x) => familyOfTopic(x.id, x.family)
  const counts = ordered.reduce((m, x) => m.set(familyOf(x), (m.get(familyOf(x)) ?? 0) + 1), new Map())
  const families = TOPIC_FAMILIES.filter((g) => counts.has(g.id))
  const visible = filter === 'all' ? ordered : ordered.filter((x) => familyOf(x) === filter)

  const card = (x) => {
    const { id, by, desc } = x
    const family = familyOf(x)
    const selected = value.includes(id)
    const full = !selected && max > 1 && value.length >= max
    const description = isCustom(id) ? eventTopicDesc(id, lang) || desc : t(`topicDesc.${id}`)
    return (
      <li key={id} className="h-full">
        <button
          type="button"
          data-tag={id}
          onClick={() => toggle(id)}
          aria-pressed={selected}
          aria-disabled={full || undefined}
          className={`relative block h-full w-full overflow-hidden rounded-2xl border-2 p-4 pl-6 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.99] lg:p-5 lg:pl-8 ${
            selected ? 'border-brand bg-brand-soft shadow-lg shadow-brand/15'
              : full ? 'border-slate-200 bg-white opacity-60'
              : 'border-transparent bg-white shadow-sm hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md'
          }`}
        >
          {/* Franja del color de la familia: alegra la lista sin añadir texto */}
          <span aria-hidden className={`absolute inset-y-0 left-0 w-2 lg:w-2.5 ${BAND[family] ?? 'bg-slate-300'}`} />
          {/* Quién lo propone: siempre la misma línea (vacía si no hay nombre), para que todas midan igual */}
          <span className="flex min-h-8 items-center gap-2.5">
            {by ? (
              <>
                <span aria-hidden className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px] font-bold ${selected ? 'bg-brand text-white' : familyTone(family).chip}`}>{initials(by)}</span>
                <span className="min-w-0 flex-1 truncate text-[17px] text-slate-600 lg:text-base"><strong className="font-semibold text-ink">{by}</strong> {t('register.proposes')}</span>
              </>
            ) : <span className="flex-1" />}
            {selected ? (
              <span className="animate-pop-in inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-mint px-1.5 text-sm font-bold text-white sm:px-2.5">
                <Check aria-hidden className="h-4 w-4" strokeWidth={3} /><span className="sr-only sm:not-sr-only">{t('register.yourChoice')}</span>
              </span>
            ) : (
              <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-400" />
            )}
          </span>
          {/* Título y descripción, cada uno en 2 líneas como mucho. El bloque reserva siempre el sitio de las 4
              líneas (el hueco queda abajo): misma altura en todas las tarjetas */}
          <span className="mt-2.5 block min-h-[96px] lg:min-h-[84px]">
            <span className="line-clamp-2 block text-lg font-semibold leading-snug text-ink lg:text-xl">{topic(id)}</span>
            <span title={description} className="mt-1 line-clamp-2 block text-[17px] leading-snug text-slate-600 lg:text-base">{description}</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="mt-5">
      {/* Filtros por familia: grandes, con emoji y cuántos temas hay en cada una */}
      {families.length > 1 && (
        <>
          <p className="text-[17px] font-semibold text-ink lg:text-base">{t('register.filterAsk')}</p>
          <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label={t('register.filterLabel')}>
            {[{ id: 'all', label: t('register.filterAll'), emoji: '', n: ordered.length }, ...families.map((g) => ({ id: g.id, label: t(`register.families.${g.id}`), emoji: FAMILY_EMOJI[g.id], n: counts.get(g.id) }))].map((f) => {
              const on = filter === f.id
              return (
                <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={on}
                  className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 px-3 text-sm font-semibold transition sm:gap-2 sm:px-4 sm:text-[17px] lg:min-h-11 lg:text-base ${
                    on ? 'border-ink bg-ink text-white' : `border-transparent ${f.id === 'all' ? 'bg-white text-ink ring-1 ring-slate-200' : familyTone(f.id).chip} hover:brightness-95`
                  }`}>
                  {f.emoji && <span aria-hidden>{f.emoji}</span>} {f.label} <span className={`text-sm font-medium ${on ? 'text-white/70' : 'opacity-70'}`}>{f.n}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Un consejo para quien no sabe qué elegir */}
      <p className="mt-4 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[17px] text-ink lg:text-base">
        <Lightbulb aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-dark" /> {t('register.pickTip')}
      </p>
      {max > 1 && (
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          <span className="font-bold text-brand-dark">{value.length} / {max}</span> {t('register.tablesChosen')}
        </p>
      )}
      {notice && (
        <p role="alert" className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">{t('register.maxTables', { max })}</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{error}</p>}

      {/* En PC, 2 tarjetas por fila (todas de la misma altura, así quedan alineadas) */}
      <ul className="mt-4 grid gap-3 lg:grid-cols-2 lg:gap-4">{visible.map(card)}</ul>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { MAX_TAGS, TOPICS, TOPIC_PROPOSERS } from '../constants'
import { useI18n } from '../context/I18nContext'
import { isCustom, seededOrder, topicOrderSeed } from '../lib/topics'

/**
 * «Choisissez votre table»: cada tema es una mesa de conversación que propone un colega.
 * La tarjeta se lee como una invitación: arriba quién la propone (iniciales + «X vous propose»),
 * debajo el tema en grande y la descripción. Sin iconos ni filtros: pensado para leerse de un vistazo.
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

/** «Zsófia Nagy» → «ZN» */
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')

export default function TopicPicker({ value, topics = [], onChange, error, max = MAX_TAGS }) {
  const { t, topic } = useI18n()
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

  const card = (x) => {
    const { id, by, desc } = x
    const selected = value.includes(id)
    const full = !selected && max > 1 && value.length >= max
    const description = isCustom(id) ? desc : t(`topicDesc.${id}`)
    return (
      <li key={id}>
        <button
          type="button"
          data-tag={id}
          onClick={() => toggle(id)}
          aria-pressed={selected}
          aria-disabled={full || undefined}
          className={`block w-full rounded-2xl border-2 p-4 text-left transition-all duration-150 active:scale-[0.99] lg:p-5 ${
            selected ? 'border-brand bg-brand-soft shadow-md shadow-brand/10'
              : full ? 'border-slate-200 bg-white opacity-60'
              : 'border-slate-200 bg-white hover:border-brand/50'
          }`}
        >
          {/* Quién lo propone: siempre la misma línea (vacía si no hay nombre), para que todas midan igual */}
          <span className="flex min-h-8 items-center gap-2.5">
            {by ? (
              <>
                <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${selected ? 'bg-brand text-white' : 'bg-ink text-white'}`}>{initials(by)}</span>
                <span className="min-w-0 flex-1 truncate text-[15px] text-slate-600"><strong className="font-semibold text-ink">{by}</strong> {t('register.proposes')}</span>
              </>
            ) : <span className="flex-1" />}
            {selected ? (
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mint text-white">
                <Check aria-hidden className="h-4 w-4" strokeWidth={3} /><span className="sr-only">{t('register.yourChoice')}</span>
              </span>
            ) : (
              <span aria-hidden className="h-6 w-6 shrink-0 rounded-full border-2 border-slate-400" />
            )}
          </span>
          {/* Título y descripción, cada uno en 2 líneas como mucho. El bloque reserva siempre el sitio de las 4
              líneas (el hueco queda abajo): misma altura en todas las tarjetas */}
          <span className="mt-2.5 block min-h-[96px]">
            <span className="line-clamp-2 block text-lg font-semibold leading-snug text-ink">{topic(id)}</span>
            <span title={description} className="mt-1 line-clamp-2 block text-[15px] leading-snug text-slate-600">{description}</span>
          </span>
        </button>
      </li>
    )
  }

  return (
    <div className="mt-5">
      {max > 1 && (
        <p className="text-sm font-semibold text-slate-600" aria-live="polite">
          <span className="font-bold text-brand-dark">{value.length} / {max}</span> {t('register.tablesChosen')}
        </p>
      )}
      {notice && (
        <p role="alert" className="mt-3 rounded-lg bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-dark">{t('register.maxTables', { max })}</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-semibold text-brand-dark">{error}</p>}

      {/* Una sola columna también en PC: se lee de arriba abajo, sin zigzag */}
      <ul className="mt-2 grid gap-3">{ordered.map(card)}</ul>
    </div>
  )
}

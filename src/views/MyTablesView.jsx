import { useState } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { TOPIC_EMOJI } from '../constants'
import { isCustom, topicsWithLevel } from '../lib/topics'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import LangSwitch from '../components/ui/LangSwitch'

const emojiOf = (id) => (isCustom(id) ? '💬' : TOPIC_EMOJI[id] ?? '💬')

/**
 * Tras iniciar sesión el día del evento: las mesas que le tocan en cada ronda (mesa + tema) y el
 * botón «Preparado». Si el plan aún no está hecho, muestra los temas que eligió.
 * Con `onBack` (ya estaba preparado y solo quiere repasarlas) el botón vuelve a la espera.
 */
export default function MyTablesView({ onBack }) {
  const { currentUser, myPlan, setReady } = useApp()
  const { t, topic } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  if (!currentUser) return null

  const ready = async () => {
    if (onBack) return onBack()
    setBusy(true)
    const ok = await setReady(true)
    setBusy(false)
    setError(!ok)
  }

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <h1 className="text-center font-display text-4xl font-medium tracking-tight text-ink">{t('lobby.hello', { name: currentUser.name.split(' ')[0] })}</h1>
          <p className="mx-auto mt-3 max-w-xs text-center text-[15px] leading-relaxed text-slate-600">
            {myPlan.length ? t('tables.sub') : t('tables.subNoPlan')}
          </p>

          <ul className="mt-7 space-y-2.5">
            {myPlan.length
              ? myPlan.map(({ round, table, topic: id }) => (
                <li key={round} className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3">
                  <span aria-hidden className="text-2xl">{emojiOf(id)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-brand-dark">
                      {t('tables.round', { n: round })} · <MapPin className="h-3 w-3" /> {t('round.table', { n: table })}
                    </p>
                    <p className="text-[15px] font-semibold leading-snug text-ink">{topic(id)}</p>
                  </div>
                </li>
              ))
              : topicsWithLevel(currentUser).map(({ id }) => (
                <li key={id} className="flex items-center gap-3 rounded-xl border border-brand/40 bg-brand-soft px-4 py-3">
                  <span aria-hidden className="text-2xl">{emojiOf(id)}</span>
                  <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-ink">{topic(id)}</p>
                </li>
              ))}
          </ul>

          {error && <p role="alert" className="mt-4 rounded-xl bg-brand-soft px-3.5 py-3 text-sm font-semibold text-brand-dark">{t('login.err.network')}</p>}
          <Button type="button" onClick={ready} disabled={busy} iconRight={onBack ? undefined : ArrowRight} className="mt-7 w-full py-4 text-base">
            {onBack ? t('lobby.backToWait') : busy ? t('login.busy') : t('tables.ready')}
          </Button>
        </main>
      </div>
    </div>
  )
}

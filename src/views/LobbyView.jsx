import { useEffect, useState } from 'react'
import { CheckCircle2, MapPin } from 'lucide-react'
import { useI18n } from '../context/I18nContext'
import { TOPIC_EMOJI } from '../constants'
import { isCustom } from '../lib/topics'
import Logo from '../components/ui/Logo'
import LangSwitch from '../components/ui/LangSwitch'

const PHRASE_MS = 4500

/**
 * «On hold»: la persona ya ha pulsado «Preparado» y espera a que lo estén todos. Solo frases con humor
 * que van cambiando. Cuando el admin arranca (o se arranca solo), el móvil pasa a «Encuentra tu mesa».
 * `count` = { n, total } → «14 de 20 …» (`countKey` elige el texto) · `next` = { round, table, topic } → su próxima mesa.
 */
export default function LobbyView({ onTables, badge, embedded = false, count, countKey = 'lobby.readyCount', next, nextLabel }) {
  const { t, topic } = useI18n()
  const phrases = t('lobby.phrases')
  const list = Array.isArray(phrases) ? phrases : [phrases]
  const [i, setI] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setI((k) => (k + 1) % list.length), PHRASE_MS)
    return () => clearInterval(timer)
  }, [list.length])

  const content = (
    <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-sm font-semibold text-mint-dark">
        <CheckCircle2 className="h-4 w-4" /> {badge ?? t('lobby.ready')}
      </span>
      <p key={i} aria-live="polite" className="animate-view-in mt-8 min-h-20 max-w-xs text-xl font-semibold leading-snug text-ink">
        {list[i]}
      </p>
      <div aria-hidden className="mt-6 flex items-center gap-2.5">
        {[0, 1, 2].map((d) => (
          <span key={d} className="h-3 w-3 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d * 160}ms` }} />
        ))}
      </div>
      {count?.total > 0 && (
        <div className="mt-8 w-full max-w-xs">
          <p className="text-sm font-semibold text-slate-600" aria-live="polite">{t(countKey, { n: Math.min(count.n, count.total), total: count.total })}</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${Math.round((Math.min(count.n, count.total) / count.total) * 100)}%` }} />
          </div>
        </div>
      )}
      {next && (
        <div className="mt-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">{nextLabel ?? t('lobby.next', { n: next.round })}</p>
          <div className="mt-2 flex items-center gap-3">
            <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-xl">{isCustom(next.topic) ? '💬' : TOPIC_EMOJI[next.topic] ?? '💬'}</span>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500"><MapPin className="h-3.5 w-3.5" /> {t('lobby.table', { n: next.table })}</p>
              <p className="font-semibold leading-snug text-ink">{topic(next.topic)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  if (embedded) return content

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col">{content}</main>

        {onTables && (
          <button type="button" onClick={onTables} className="mb-6 self-center text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
            {t('lobby.seeTables')}
          </button>
        )}
      </div>
    </div>
  )
}

import { Clock, Hourglass, MapPin, PartyPopper } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { TOTAL_ROUNDS } from '../constants'
import { roleOf } from '../lib/matching'
import { useCountdown } from '../lib/useCountdown'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import RoleBadge from '../components/ui/RoleBadge'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import { SuperpowerChips } from '../components/ui/SuperpowerPicker'

/** Tarjeta de embarque personal (móvil): mesa, tema y compañeros de la ronda actual */
export default function RoundCardView() {
  const { currentUser, currentRound, event, participants } = useApp()
  const { t, topic, country } = useI18n()
  const timer = useCountdown(event.finished ? null : currentRound?.startedAt)
  const byId = new Map(participants.map((p) => [p.id, p]))
  const table = currentRound?.tables.find((x) => x.members.includes(currentUser?.id))

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 px-5">
      <header className="mx-auto flex w-full max-w-md items-center justify-between gap-3 pt-6">
        <Logo />
        <div className="flex items-center gap-2">
          {!event.finished && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink">
              {t('round.badge', { n: event.round, total: TOTAL_ROUNDS })}
            </span>
          )}
          <LangSwitch />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
        {event.finished ? (
          <Message icon={PartyPopper} title={t('round.finishedTitle')} text={t('round.finishedText')} />
        ) : !table ? (
          <Message icon={Hourglass} title={t('round.unseatedTitle')} text={t('round.unseatedText')} />
        ) : (
          <div key={`${event.round}-${table.id}`} className="animate-pop-in overflow-hidden rounded-xl bg-white shadow-xl shadow-slate-900/5 ring-1 ring-slate-200">
            <div className="bg-brand px-6 pb-6 pt-5 text-white">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-white/70">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {t('round.table', { n: table.id })}</span>
                <span className={`flex items-center gap-1.5 font-mono text-sm normal-case tracking-normal ${timer.done ? 'text-accent' : 'text-white'}`}>
                  <Clock className="h-3.5 w-3.5" /> {timer.done ? t('round.timeUp') : timer.label}
                </span>
              </div>
              <p className="mt-4 text-sm text-white/80">{t('round.youAreAt')}</p>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight">{topic(table.topic)}</h1>
              <span className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                {t('round.you', { role: t(`roles.${roleOf(currentUser, table.topic)}`) })}
              </span>
            </div>

            <div className="relative h-0 border-t-2 border-dashed border-slate-200">
              <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
              <span className="absolute -right-3 -top-3 h-6 w-6 rounded-full bg-slate-50" />
            </div>

            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{t('round.with')}</p>
              <ul className="mt-3 space-y-3">
                {table.members.filter((id) => id !== currentUser.id).map((id) => {
                  const p = byId.get(id)
                  if (!p) return null
                  return (
                    <li key={id} className="flex items-start gap-3">
                      <Avatar name={p.name} photo={p.photo} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-slate-500">{p.role} · {country(p.country)}</p>
                        <RoleBadge role={roleOf(p, table.topic)} className="mt-1.5 inline-block" />
                        <SuperpowerChips ids={p.superpowers} size="sm" className="mt-1.5" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  )
}

function Message({ icon: Icon, title, text }) {
  return (
    <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-accent-soft"><Icon className="h-7 w-7 text-ink" /></div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{text}</p>
    </div>
  )
}

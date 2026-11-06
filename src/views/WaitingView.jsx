import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, KeyRound, MapPin, PencilLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE, EVENT_PLACE, TOPIC_EMOJI, VIEWS } from '../constants'
import { useTimeLeft } from '../lib/useTimeLeft'
import { isCustom, topicsWithLevel } from '../lib/topics'
import { familyIn, familyTone } from '../lib/familyColors'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import { SuperpowerChips } from '../components/ui/SuperpowerPicker'

/**
 * Confirmación tras validar el perfil (pantalla 5 del prototipo): tarjeta roja con la persona,
 * sus mesas con su nivel, cuánto falta para la sesión y «Todo listo». Desde aquí se edita el perfil.
 */
export default function WaitingView({ onLobby }) {
  const { currentUser, forgetMe, navigate, canEditProfile, profileUpdatedAt, eventTopics } = useApp()
  const { t, topic, country } = useI18n()
  const [justUpdated, setJustUpdated] = useState(() => Date.now() - profileUpdatedAt < 3000)
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => setJustUpdated(false), 6000)
    return () => clearTimeout(timer)
  }, [justUpdated])
  if (!currentUser) return null

  const tables = topicsWithLevel(currentUser)

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col py-6">
          {onLobby && (
            <button type="button" onClick={onLobby} className="mb-4 self-start text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
              ← {t('lobby.back')}
            </button>
          )}
          {justUpdated && (
            <p role="status" className="animate-pop-in mb-4 flex items-center gap-2 rounded-xl bg-mint-soft px-3 py-2.5 text-[15px] font-semibold text-mint-dark">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> {t('waiting.updated')}
            </p>
          )}

          {/* Tarjeta destacada en el rojo de marca */}
          <section aria-label={t('waiting.yourFile')} className="animate-pop-in rounded-2xl bg-brand p-5 text-white shadow-lg shadow-brand/20">
            <div className="flex items-center gap-4">
              <Avatar name={currentUser.name} photo={currentUser.photo} size="lg" tone="bg-white text-brand-dark" className="!ring-white/40" />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-medium leading-tight">{currentUser.name}</p>
                <p className="truncate text-sm text-white/85">{currentUser.role}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-white/85"><MapPin className="h-3.5 w-3.5" /> {country(currentUser.country)}</p>
              </div>
            </div>
            <SuperpowerChips ids={currentUser.superpowers ?? []} size="sm" className="mt-4 [&>span]:bg-white [&>span]:text-accent-dark [&>span]:ring-accent/30" />
          </section>

          <h2 className="mt-7 text-xs font-bold uppercase tracking-wider text-slate-500">{t('waiting.yourTables')}</h2>
          {tables.length ? (
            <ul className="mt-2.5 space-y-2">
              {tables.map(({ id, level }) => (
                <li key={id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
                  <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${familyTone(familyIn(id, eventTopics)).tile}`}>{isCustom(id) ? '💬' : TOPIC_EMOJI[id]}</span>
                  <span className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{topic(id)}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${level === 'high' ? 'bg-brand-soft text-brand-dark' : level === 'medium' ? 'bg-accent-soft text-accent-dark' : 'bg-slate-100 text-slate-600'}`}>
                    {t(`register.level.${level}Badge`)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 rounded-xl bg-brand-soft px-3.5 py-3 text-sm text-brand-dark">{t('waiting.noTables')}</p>
          )}

          <DateBlock />

          {currentUser.accessCode && <AccessCode name={currentUser.name} code={currentUser.accessCode} />}

          <p className="mt-4 flex items-center gap-2 rounded-xl bg-mint-soft px-3.5 py-3 text-sm font-medium text-mint-dark">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('waiting.allSet')}
          </p>

          {canEditProfile && (
            <button
              type="button"
              onClick={() => navigate(VIEWS.EDIT)}
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-base font-semibold text-ink transition hover:border-slate-300"
            >
              <PencilLine className="h-5 w-5" /> {t('waiting.edit')}
            </button>
          )}
        </main>

        <PublicFooter className="!py-3">
          <button onClick={forgetMe} className="underline-offset-4 hover:text-slate-600 hover:underline">
            {t('waiting.notYou')}
          </button>
        </PublicFooter>
      </div>
    </div>
  )
}

/** Días naturales hasta el evento, contando el día de hoy */
const daysUntil = (left) => left.days + (left.hours || left.minutes || left.seconds ? 1 : 0)

/** Fecha, lugar y cuánto falta */
function DateBlock() {
  const { t, formatDate } = useI18n()
  const left = useTimeLeft(EVENT_DATE)
  const n = daysUntil(left)
  const headline = left.done ? t('waiting.jToday') : n === 1 ? t('waiting.tomorrow') : t('waiting.inDays', { n })

  return (
    <section className="mt-7 flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-center leading-none text-brand-dark">
        <span>
          <span className="block font-display text-2xl font-medium">{formatDate(EVENT_DATE, { day: 'numeric' })}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider">{formatDate(EVENT_DATE, { month: 'short' })}</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> {t('waiting.kicker')}</p>
        <p className="font-display text-xl font-medium text-ink">{headline}</p>
        <p className="truncate text-sm text-slate-500">{EVENT_PLACE || t('register.placeTbc')}</p>
      </div>
    </section>
  )
}

/** Nombre + código de 4 cifras para conectar el móvil el día del evento (QR del proyector) */
function AccessCode({ name, code }) {
  const { t } = useI18n()
  return (
    <section className="mt-4 rounded-xl border border-dashed border-brand/40 bg-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><KeyRound className="h-3.5 w-3.5" /> {t('login.codeTitle')}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{name.split(' ')[0]}</p>
        <p className="font-mono text-3xl font-bold tracking-[0.3em] text-brand-dark">{code}</p>
      </div>
      <p className="mt-1.5 text-sm text-slate-500">{t('login.codeHint')}</p>
    </section>
  )
}

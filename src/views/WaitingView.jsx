import { useEffect, useState } from 'react'
import { CalendarDays, CalendarPlus, Check, CheckCircle2, KeyRound, Lock, Mail, MapPin, PencilLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE, EVENT_PLACE, TOPIC_EMOJI, VIEWS } from '../constants'
import { useTimeLeft } from '../lib/useTimeLeft'
import { isCustom, isMandatory, myTopics } from '../lib/topics'
import { familyIn, familyTone } from '../lib/familyColors'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import { SuperpowerChips } from '../components/ui/SuperpowerPicker'
import Confetti from '../components/ui/Confetti'

/**
 * Pantalla final del registro (y la que ve al volver antes del día del evento):
 * «Profil créé !» con la fecha, el código de acceso para el día J (con calendario y email),
 * fecha y lugar con la cuenta atrás, y la ficha con arma secreta, los 2 temas elegidos y los
 * 4 obligatorios. Desde aquí se edita el perfil.
 */
export default function WaitingView({ onLobby }) {
  const { currentUser, forgetMe, navigate, canEditProfile, profileUpdatedAt, eventTopics } = useApp()
  const { t, topic, country, formatDate } = useI18n()
  const [justUpdated, setJustUpdated] = useState(() => Date.now() - profileUpdatedAt < 3000)
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => setJustUpdated(false), 6000)
    return () => clearTimeout(timer)
  }, [justUpdated])
  if (!currentUser) return null

  const tables = myTopics(currentUser)
  const chosen = tables.filter((id) => !isMandatory(id))
  const mandatory = tables.filter((id) => isMandatory(id))
  // Recién registrado (últimos 30 min) → «Profil créé !»; si vuelve más tarde → «Vous êtes inscrit·e !»
  const fresh = Date.now() - (currentUser.createdAt ?? 0) < 30 * 60 * 1000
  const longDate = formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      {fresh && <Confetti />}
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

          {/* 1. Confirmación */}
          <section className="animate-pop-in text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint-soft ring-8 ring-mint-soft/50">
              <Check aria-hidden className="h-8 w-8 text-mint" strokeWidth={3} />
            </div>
            <h1 className="mt-4 font-display text-[32px] font-medium leading-tight text-ink">{t(fresh ? 'waiting.created' : 'waiting.registered')}</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-[17px] leading-snug text-slate-500">
              {t('waiting.seeYou').split('{date}').map((part, i) => (
                <span key={i}>{i > 0 && <strong className="whitespace-nowrap font-semibold text-ink">{longDate}</strong>}{part}</span>
              ))}
            </p>
          </section>

          {/* 2. Código de acceso: lo único que hay que guardar */}
          {currentUser.accessCode && <AccessCode name={currentUser.name} code={currentUser.accessCode} />}

          {/* 3. Fecha, lugar y cuenta atrás */}
          <DateBlock />

          {/* 4. Ficha: persona, arma secreta y temas */}
          <h2 className="mt-8 text-xs font-bold uppercase tracking-wider text-slate-500">{t('waiting.yourFile')}</h2>
          <section aria-label={t('waiting.yourFile')} className="mt-2.5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4 bg-ink p-5 text-white">
              <Avatar name={currentUser.name} photo={currentUser.photo} size="lg" tone="bg-brand text-white" className="!ring-white/30" />
              <div className="min-w-0">
                <p className="truncate font-display text-2xl font-medium leading-tight">{currentUser.name}</p>
                <p className="truncate text-sm text-white/80">{currentUser.role}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-white/80"><MapPin className="h-3.5 w-3.5" /> {country(currentUser.country)}</p>
              </div>
            </div>

            <div className="p-5">
              {!!currentUser.superpowers?.length && (
                <>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('waiting.superpowers')}</p>
                  <SuperpowerChips ids={currentUser.superpowers} className="mt-2" />
                </>
              )}

              {chosen.length ? (
                <>
                  <p className={`${currentUser.superpowers?.length ? 'mt-5' : ''} text-xs font-bold uppercase tracking-wider text-slate-500`}>{t('waiting.choices', { n: chosen.length })}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chosen.map((id) => (
                      <span key={id} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[15px] font-semibold ${familyTone(familyIn(id, eventTopics)).chip}`}>
                        <span aria-hidden>{isCustom(id) ? '💬' : TOPIC_EMOJI[id]}</span> {topic(id)}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className={`${currentUser.superpowers?.length ? 'mt-5' : ''} rounded-xl bg-brand-soft px-3.5 py-3 text-sm text-brand-dark`}>{t('waiting.noTables')}</p>
              )}

              {!!mandatory.length && (
                <>
                  <p className="mt-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><Lock aria-hidden className="h-3.5 w-3.5" /> {t('waiting.forEveryone')}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mandatory.map((id) => (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-ink">
                        <span aria-hidden>{TOPIC_EMOJI[id]}</span> {topic(id)}
                      </span>
                    ))}
                  </div>
                </>
              )}
              <p className="mt-4 text-sm text-slate-500">{t('waiting.tablesLater')}</p>
            </div>

            {canEditProfile && (
              <button
                type="button"
                onClick={() => navigate(VIEWS.EDIT)}
                className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-slate-200 text-base font-semibold text-ink transition hover:bg-slate-50"
              >
                <PencilLine className="h-5 w-5" /> {t('waiting.edit')}
              </button>
            )}
          </section>
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
    <section className="mt-4 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-soft text-center leading-none text-brand-dark">
        <span>
          <span className="block font-display text-2xl font-medium">{formatDate(EVENT_DATE, { day: 'numeric' })}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wider">{formatDate(EVENT_DATE, { month: 'short' })}</span>
        </span>
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><CalendarDays className="h-3.5 w-3.5" /> {t('waiting.kicker')}</p>
        <p className="font-display text-xl font-medium text-ink">{headline}</p>
        <p className="flex items-center gap-1 truncate text-sm text-slate-500"><MapPin className="h-3.5 w-3.5 shrink-0" /> {EVENT_PLACE || t('register.placeTbc')}</p>
      </div>
    </section>
  )
}

/** Nombre + código de 4 cifras para conectar el móvil el día del evento (QR del proyector),
 *  con dos formas de guardarlo: evento de calendario (.ics) o email a la dirección que quiera */
function AccessCode({ name, code }) {
  const { t, formatDate } = useI18n()
  const firstName = name.split(' ')[0]
  const date = formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long' })
  const place = EVENT_PLACE || t('register.placeTbc')
  const url = window.location.origin + window.location.pathname

  const mailHref = `mailto:?subject=${encodeURIComponent(t('waiting.mailSubject', { date }))}&body=${encodeURIComponent(
    t('waiting.mailBody', { date, place, name: firstName, code, url }),
  )}`

  const downloadIcs = () => {
    const blob = new Blob([icsFor({ title: t('waiting.calTitle'), place, body: t('waiting.calBody', { name: firstName, code }), url })], { type: 'text/calendar;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'cofinder.ics'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(link.href), 1000)
  }

  return (
    <section className="animate-pop-in mt-6 overflow-hidden rounded-2xl border-2 border-dashed border-brand/40 bg-white">
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500"><KeyRound className="h-3.5 w-3.5" /> {t('login.codeTitle')}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{t('waiting.firstName')}</p>
            <p className="truncate text-xl font-semibold text-ink">{firstName}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{t('waiting.code')}</p>
            <p className="font-mono text-4xl font-bold tracking-[0.25em] text-brand-dark">{code}</p>
          </div>
        </div>
        <p className="mt-3 text-[15px] leading-snug text-slate-500">{t('login.codeHint')}</p>
      </div>
      <div className="border-t border-slate-200 bg-brand-soft/40 p-4">
        <p className="text-sm font-semibold text-ink">{t('waiting.keepIt')}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={downloadIcs} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-[15px] font-semibold text-white transition hover:bg-brand-hover">
            <CalendarPlus className="h-5 w-5" /> {t('waiting.calendar')}
          </button>
          <a href={mailHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-semibold text-ink transition hover:border-slate-300">
            <Mail className="h-5 w-5" /> {t('waiting.byEmail')}
          </a>
        </div>
        <p className="mt-2.5 text-center text-sm text-slate-500">{t('waiting.orScreenshot')}</p>
      </div>
    </section>
  )
}

/** Evento de día completo el día del evento (hora de Madrid/París), en formato iCalendar */
function icsFor({ title, place, body, url }) {
  const ymd = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ts).replaceAll('-', '')
  const esc = (v) => String(v).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n')
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cofinder//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:cofinder-${ymd(EVENT_DATE)}@cofinder`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${ymd(EVENT_DATE)}`,
    `DTEND;VALUE=DATE:${ymd(EVENT_DATE + 86400000)}`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(place)}`,
    `DESCRIPTION:${esc(body)}`,
    `URL:${url}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n')
}

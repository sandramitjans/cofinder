import { useEffect, useState } from 'react'
import { CalendarPlus, Check, CheckCircle2, Copy, KeyRound, Mail, PencilLine } from 'lucide-react'
import { levelOfTopic, myTopics, topicEmoji } from '../lib/topics'
import { SuperpowerChips } from '../components/ui/SuperpowerPicker'
import { LEVEL_EMOJI } from '../components/LevelPicker'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE, EVENT_PLACE, VIEWS } from '../constants'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import Confetti from '../components/ui/Confetti'

/**
 * Pantalla final del registro (y la que ve al volver antes del día del evento):
 * misma estructura que los pasos: «Profil créé !» con la fecha y el lugar, el código de acceso para el día J
 * (copiar, email, calendario) y una línea con la persona y el enlace para editar el perfil. Nada más.
 */
export default function WaitingView({ onLobby }) {
  const { currentUser, forgetMe, navigate, canEditProfile, profileUpdatedAt } = useApp()
  const { t, topic, country, formatDate } = useI18n()
  const [justUpdated, setJustUpdated] = useState(() => Date.now() - profileUpdatedAt < 3000)
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => setJustUpdated(false), 6000)
    return () => clearTimeout(timer)
  }, [justUpdated])
  if (!currentUser) return null

  // Recién registrado (últimos 30 min) → «Profil créé !»; si vuelve más tarde → «Vous êtes inscrit·e !»
  const topics = myTopics(currentUser)
  const fresh = Date.now() - (currentUser.createdAt ?? 0) < 30 * 60 * 1000
  const longDate = formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long' })
  const line = EVENT_PLACE ? t('waiting.seeYouPlace', { date: '\u0000', place: '\u0001' }) : t('waiting.seeYou', { date: '\u0000' })

  return (
    <div className="guest-scale vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      {fresh && <Confetti />}
      {/* Mismo ancho y misma estructura que los pasos del formulario: frase de ánimo, título, una línea, un bloque */}
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col lg:max-w-[1024px]">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col pb-8 pt-5">
          {onLobby && (
            <button type="button" onClick={onLobby} className="mb-4 self-start text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
              ← {t('lobby.back')}
            </button>
          )}
          {justUpdated && (
            <p role="status" className="animate-pop-in mb-4 flex items-center gap-2 self-start rounded-xl bg-mint-soft px-3 py-2.5 text-[17px] font-semibold text-mint-dark">
              <CheckCircle2 aria-hidden className="h-5 w-5 shrink-0" /> {t('waiting.updated')}
            </p>
          )}

          <header className="animate-pop-in text-center">
            {/* El check grande: la señal de que ya está */}
            <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-mint-soft ring-8 ring-mint-soft/50">
              <Check aria-hidden className="h-8 w-8 text-mint" strokeWidth={3} />
            </div>
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink lg:text-5xl">{t(fresh ? 'waiting.created' : 'waiting.registered')}</h1>
            <p className="mx-auto mt-1.5 max-w-[60ch] text-[17px] leading-relaxed text-slate-600 [text-wrap:pretty] lg:mt-3 lg:text-lg">
              {line.split(/(\u0000|\u0001)/).map((part, i) =>
                part === '\u0000' ? <strong key={i} className="whitespace-nowrap font-semibold text-ink">{longDate}</strong>
                  : part === '\u0001' ? <strong key={i} className="font-semibold text-ink">{EVENT_PLACE}</strong>
                  : part)}
            </p>
          </header>

          {/* Lo único que hay que guardar */}
          {currentUser.accessCode && <AccessCode name={currentUser.name} code={currentUser.accessCode} />}

          {/* Resumen de lo elegido: quién es, su arma secreta y su nivel en cada tema. Desde aquí se edita */}
          <section aria-label={t('waiting.yourFile')} className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-4 p-4 lg:px-7 lg:py-5">
              <Avatar name={currentUser.name} photo={currentUser.photo} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold leading-tight text-ink">{currentUser.name}</p>
                <p className="truncate text-sm text-slate-600">{[currentUser.role, country(currentUser.country)].filter(Boolean).join(', ')}</p>
              </div>
              {canEditProfile && (
                <button type="button" onClick={() => navigate(VIEWS.EDIT)} aria-label={t('waiting.edit')} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl text-base font-semibold text-brand-dark transition-colors hover:bg-brand-soft sm:px-3">
                  <PencilLine aria-hidden className="h-5 w-5" /> <span className="hidden sm:inline">{t('waiting.edit')}</span>
                </button>
              )}
            </div>
            <div className="grid gap-6 border-t border-slate-200 p-4 lg:grid-cols-[1fr_2fr] lg:gap-10 lg:px-7 lg:py-6">
              {!!currentUser.superpowers?.length && (
                <div>
                  <p className="text-sm font-semibold text-slate-600">{t('waiting.superpowers')}</p>
                  <SuperpowerChips ids={currentUser.superpowers} className="mt-2" />
                </div>
              )}
              {!!topics.length && (
                <div className={currentUser.superpowers?.length ? '' : 'lg:col-span-2'}>
                  <p className="text-sm font-semibold text-slate-600">{t('waiting.levels')}</p>
                  <ul className="mt-1 divide-y divide-slate-100">
                    {topics.map((id) => {
                      const level = levelOfTopic(currentUser, id)
                      return (
                        <li key={id} className="flex items-center justify-between gap-3 py-2.5">
                          <span className="min-w-0 text-[17px] font-medium text-ink"><span aria-hidden>{topicEmoji(id)}</span> {topic(id)}</span>
                          {level && <span className="shrink-0 whitespace-nowrap text-[17px] text-slate-600"><span aria-hidden>{LEVEL_EMOJI[level]}</span> {t(`register.level.${level}`)}</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>

          <p className="mt-4 text-sm text-slate-600">{t('waiting.tablesLater')}</p>
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

/** Código de acceso para el día J: el código grande, copiar, y guardarlo por email o en el calendario */
function AccessCode({ name, code }) {
  const { t, formatDate } = useI18n()
  const firstName = name.split(' ')[0]
  const date = formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long' })
  const place = EVENT_PLACE || t('register.placeTbc')
  const url = window.location.origin + window.location.pathname

  const mailHref = `mailto:?subject=${encodeURIComponent(t('waiting.mailSubject', { date }))}&body=${encodeURIComponent(
    t('waiting.mailBody', { date, place, name: firstName, code, url }),
  )}`

  // Copiar el código (con plan B para navegadores sin API de portapapeles, p. ej. en http local)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2500)
    return () => clearTimeout(timer)
  }, [copied])
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      const area = document.createElement('textarea')
      area.value = code
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      try { document.execCommand('copy') } catch { /* noop */ }
      area.remove()
    }
    setCopied(true)
  }

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

  const secondary = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-[17px] font-semibold text-ink transition-colors hover:border-brand hover:text-brand-dark'
  return (
    <section className="animate-pop-in mt-8 rounded-2xl border-2 border-brand/30 bg-white p-5 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:p-7">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600"><KeyRound aria-hidden className="h-4 w-4" /> {t('login.codeTitle')}</p>
        <p className="mt-1 font-mono text-5xl font-bold tracking-[0.2em] text-brand-dark">{code}</p>
        <p className="mt-2 max-w-[44ch] text-[17px] leading-snug text-slate-600">{t('login.codeHint')}</p>
      </div>
      <div className="mt-5 grid shrink-0 gap-2.5 sm:grid-cols-3 lg:mt-0 lg:grid-cols-1 lg:w-[240px]">
        <button type="button" onClick={copyCode} className={copied ? `${secondary} !border-mint !bg-mint-soft !text-mint-dark` : secondary}>
          {copied ? <Check aria-hidden className="h-5 w-5" strokeWidth={3} /> : <Copy aria-hidden className="h-5 w-5" />}
          <span aria-live="polite">{copied ? t('waiting.copied') : t('waiting.copy')}</span>
        </button>
        <a href={mailHref} className={secondary}><Mail aria-hidden className="h-5 w-5" /> {t('waiting.byEmail')}</a>
        <button type="button" onClick={downloadIcs} className={secondary}><CalendarPlus aria-hidden className="h-5 w-5" /> {t('waiting.calendar')}</button>
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

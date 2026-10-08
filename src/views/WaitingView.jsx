import { useEffect, useState } from 'react'
import { Gem, Heart } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE } from '../constants'
import { useTimeLeft } from '../lib/useTimeLeft'
import Logo from '../components/ui/Logo'
import LangSwitch from '../components/ui/LangSwitch'
import Stamp from '../components/ui/Stamp'
import VipCard from '../components/ui/VipCard'
import PublicFooter from '../components/layout/PublicFooter'
import { SuperpowerChips } from '../components/ui/SuperpowerPicker'

const ROTATE_MS = 5000

/** Pantalla de espera tras validar el perfil: cuenta atrás al 25/11 + frases de Cupidon + tarjeta VIP */
export default function WaitingView() {
  const { currentUser, forgetMe } = useApp()
  const { t, topic, country, formatDate } = useI18n()
  if (!currentUser) return null

  return (
    <div className="vip-glow flex min-h-dvh flex-col bg-gradient-to-b from-brand-soft/60 via-white to-slate-50 px-5">
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between pt-6">
        <Logo />
        <LangSwitch />
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 py-10">
        {/* Encabezado */}
        <div className="text-center">
          <Stamp size="md" top={t('match.stampTop')} bottom={t('match.stampBottom')} label={t('match.stampLabel')} />
          <h1 className="mt-8 font-display text-3xl font-bold italic tracking-tight sm:text-4xl">{t('waiting.saved')}</h1>
          <p className="mt-2 text-lg text-slate-600">{t('waiting.seeYou', { date: formatDate(EVENT_DATE) })}</p>
        </div>

        <Countdown />
        <CupidMessages />

        {/* Tarjeta VIP + resumen del perfil */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
              <Gem className="h-4 w-4 text-accent" /> {t('waiting.yourFile')}
            </p>
            <span className="text-sm font-bold text-brand">{t('waiting.status')}</span>
          </div>
          <div className="mx-auto mt-4 max-w-sm">
            <VipCard photo={currentUser.photo} name={currentUser.name} role={currentUser.role} branch={country(currentUser.country)} />
          </div>
          <TagRow title={t('waiting.masters')} tags={currentUser.offers.map(topic)} className="bg-brand-soft text-brand" />
          <TagRow title={t('waiting.explores')} tags={currentUser.needs.map(topic)} className="bg-accent-soft text-slate-800" />
          {currentUser.superpowers?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">{t('waiting.superpowers')}</p>
              <SuperpowerChips ids={currentUser.superpowers} className="mt-1.5" />
            </div>
          )}
        </section>

        <p className="mt-6 text-center">
          <button onClick={forgetMe} className="text-xs text-slate-400 underline-offset-4 hover:text-slate-600 hover:underline">
            {t('waiting.notYou')}
          </button>
        </p>
      </main>

      <PublicFooter />
    </div>
  )
}

function Countdown() {
  const { t } = useI18n()
  const left = useTimeLeft(EVENT_DATE)
  const units = t('waiting.units')
  const values = [left.days, left.hours, left.minutes, left.seconds]

  return (
    <section className="relative mt-10 overflow-hidden rounded-2xl bg-brand p-6 text-white shadow-xl shadow-brand/20 sm:p-8" aria-labelledby="countdown-title">
      <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-accent/25" />

      <h2 id="countdown-title" className="relative text-center font-display text-xl font-semibold italic text-accent sm:text-2xl">
        {t('waiting.countdown')}
      </h2>

      {left.done ? (
        <p className="relative mt-4 text-center text-2xl font-extrabold">{t('waiting.dday')}</p>
      ) : (
        <div className="relative mt-5 grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
          {values.map((v, i) => (
            <div key={i} className="rounded-xl bg-white/10 px-1 py-3 text-center ring-1 ring-white/15 backdrop-blur sm:py-5">
              <span className="block overflow-hidden">
                <span key={v} className="animate-tick block font-mono text-3xl font-bold tabular-nums sm:text-5xl">
                  {String(v).padStart(2, '0')}
                </span>
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-white/70 sm:text-xs">{units[i]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CupidMessages() {
  const { t, lang } = useI18n()
  const messages = t('waiting.messages')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => setIndex((i) => (i + 1) % messages.length), ROTATE_MS)
    return () => clearInterval(timer)
  }, [paused, messages.length])

  return (
    <section
      className="mt-6 rounded-2xl border-l-4 border-brand bg-white p-5 shadow-sm ring-1 ring-slate-200"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
        <Heart className="animate-heartbeat h-4 w-4 fill-brand text-brand" /> {t('waiting.messagesTitle')}
      </p>
      <p key={`${lang}-${index}`} className="animate-message-in mt-3 min-h-[3.5rem] font-display text-xl italic leading-snug text-ink sm:text-2xl">
        {lang === 'fr' ? `«\u00A0${messages[index]}\u00A0»` : `“${messages[index]}”`}
      </p>
      <div className="mt-3 flex gap-1.5">
        {messages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`${i + 1}/${messages.length}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all ${i === index ? 'w-6 bg-brand' : 'w-1.5 bg-slate-200 hover:bg-slate-300'}`}
          />
        ))}
      </div>
    </section>
  )
}

function TagRow({ title, tags, className }) {
  return (
    <div className="mt-4">
      <p className="text-sm font-semibold uppercase tracking-wider text-slate-600">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((x) => <span key={x} className={`rounded-full px-3 py-1 text-sm font-medium ${className}`}>{x}</span>)}
      </div>
    </div>
  )
}

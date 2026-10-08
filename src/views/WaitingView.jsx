import { useEffect, useState } from 'react'
import { CheckCircle2, PencilLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE, VIEWS } from '../constants'
import { useTimeLeft } from '../lib/useTimeLeft'
import Logo from '../components/ui/Logo'
import LangSwitch from '../components/ui/LangSwitch'
import Stamp from '../components/ui/Stamp'
import VipCard from '../components/ui/VipCard'
import PublicFooter from '../components/layout/PublicFooter'

/** Pantalla de espera tras validar el perfil: cuenta atrás al 25/11 + tarjeta VIP */
export default function WaitingView() {
  const { currentUser, forgetMe, navigate, canEditProfile, profileUpdatedAt } = useApp()
  const { t, topic, country, formatDate } = useI18n()
  const [justUpdated, setJustUpdated] = useState(() => Date.now() - profileUpdatedAt < 3000)
  useEffect(() => {
    if (!justUpdated) return
    const timer = setTimeout(() => setJustUpdated(false), 6000)
    return () => clearTimeout(timer)
  }, [justUpdated])
  if (!currentUser) return null

  const edit = () => navigate(VIEWS.EDIT)

  return (
    <div className="vip-glow flex min-h-dvh flex-col bg-gradient-to-b from-brand-soft/60 via-white to-slate-50 px-4 sm:px-6">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between pt-4 lg:pt-6">
        <Logo />
        <LangSwitch />
      </header>

      {/*
        Móvil: mensaje → cuenta atrás compacta → tarjeta → editar (≈ una pantalla).
        Desktop: tarjeta a la izquierda; mensaje, cuenta atrás grande y editar a la derecha (sin scroll).
      */}
      <main className="mx-auto grid w-full max-w-sm flex-1 content-start gap-4 py-4 lg:max-w-5xl lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:content-center lg:gap-x-16 lg:gap-y-6 lg:py-5">
        <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
          {justUpdated && (
            <p role="status" className="animate-pop-in mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[15px] font-semibold text-emerald-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" /> {t('waiting.updated')}
            </p>
          )}
          <h1 className="flex items-center justify-center gap-2 text-center font-display text-xl font-bold italic tracking-tight lg:block lg:text-left lg:text-5xl lg:leading-tight">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 lg:hidden" />
            {t('waiting.saved')}
          </h1>
          <p className="mt-1 text-center text-base text-slate-600 lg:mt-3 lg:text-left lg:text-xl">
            {t('waiting.seeYou', { date: formatDate(EVENT_DATE) })}
          </p>
          <Countdown />
        </div>

        {/* Tarjeta VIP con el sello como adhesivo en la esquina */}
        <section className="relative lg:col-start-1 lg:row-span-2 lg:row-start-1" aria-label={t('waiting.yourFile')}>
          <VipCard
            photo={currentUser.photo}
            name={currentUser.name}
            role={currentUser.role}
            branch={country(currentUser.country)}
            offers={currentUser.offers.map(topic)}
            needs={currentUser.needs.map(topic)}
            superpowers={currentUser.superpowers ?? []}
            photoClassName="aspect-[5/4] lg:aspect-[4/5]"
            onAddPhoto={canEditProfile ? edit : undefined}
          />
          <div className="pointer-events-none absolute -right-2 top-14 z-10 drop-shadow-sm lg:-right-8 lg:top-12">
            <Stamp size="sm" top={t('match.stampTop')} bottom={t('match.stampBottom')} label={t('match.stampLabel')} />
          </div>
        </section>

        {canEditProfile && (
          <div className="text-center lg:col-start-2 lg:row-start-2 lg:self-start lg:text-left">
            <button
              type="button"
              onClick={edit}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-base font-bold text-brand underline-offset-4 transition hover:bg-brand-soft hover:underline lg:-ml-3"
            >
              <PencilLine className="h-5 w-5" /> {t('waiting.edit')}
            </button>
          </div>
        )}
      </main>

      <PublicFooter className="py-3">
        <button onClick={forgetMe} className="underline-offset-4 hover:text-slate-600 hover:underline">
          {t('waiting.notYou')}
        </button>
      </PublicFooter>
    </div>
  )
}

function Countdown() {
  const { t } = useI18n()
  const left = useTimeLeft(EVENT_DATE)
  const units = t('waiting.units')
  const values = [left.days, left.hours, left.minutes, left.seconds]

  return (
    <section className="relative mt-4 overflow-hidden rounded-2xl bg-brand px-3 py-3 text-white shadow-lg shadow-brand/20 lg:mt-8 lg:p-8" aria-labelledby="countdown-title">
      <div aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-accent/25" />

      <h2 id="countdown-title" className="relative text-center font-display text-base font-semibold italic text-accent lg:text-left lg:text-2xl">
        {t('waiting.countdown')}
      </h2>

      {left.done ? (
        <p className="relative mt-2 text-center text-xl font-extrabold lg:mt-4 lg:text-left lg:text-2xl">{t('waiting.dday')}</p>
      ) : (
        <div className="relative mt-2 grid grid-cols-4 gap-2 lg:mt-5 lg:gap-4" role="timer" aria-live="off">
          {values.map((v, i) => (
            <div key={i} className="rounded-xl bg-white/10 px-1 py-1.5 text-center ring-1 ring-white/15 backdrop-blur lg:py-5">
              <span className="block overflow-hidden">
                <span key={v} className="animate-tick block font-mono text-2xl font-bold tabular-nums lg:text-5xl">
                  {String(v).padStart(2, '0')}
                </span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/75 lg:mt-1 lg:text-xs">{units[i]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

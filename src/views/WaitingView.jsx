import { useEffect, useState } from 'react'
import { CheckCircle2, Heart, PencilLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { EVENT_DATE, VIEWS } from '../constants'
import { useTimeLeft } from '../lib/useTimeLeft'
import LangSwitch from '../components/ui/LangSwitch'
import Stamp from '../components/ui/Stamp'
import VipCard from '../components/ui/VipCard'
import PublicFooter from '../components/layout/PublicFooter'

/**
 * Pantalla de espera «Soirée de gala» tras validar el perfil.
 * Desktop: tarjeta-póster a toda la altura a la izquierda; a la derecha, hoja de calendario,
 * cuenta atrás discreta, lacre «sous scellés» y editar. Móvil: lo mismo en vertical, en ~una pantalla.
 */
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
    <div className="relative isolate flex min-h-dvh flex-col bg-ink text-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Resplandor de gala */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-48 right-0 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
      </div>

      {/* Tarjeta-póster: en desktop ocupa toda la altura de la columna izquierda */}
      <aside className="order-3 px-4 lg:sticky lg:top-0 lg:order-none lg:col-start-1 lg:row-start-1 lg:h-dvh lg:p-6" aria-label={t('waiting.yourFile')}>
        <div className="relative mx-auto h-full max-w-sm lg:max-w-none">
          <VipCard
            variant="poster"
            photo={currentUser.photo}
            name={currentUser.name}
            role={currentUser.role}
            branch={country(currentUser.country)}
            offers={currentUser.offers.map(topic)}
            needs={currentUser.needs.map(topic)}
            superpowers={currentUser.superpowers ?? []}
            onAddPhoto={canEditProfile ? edit : undefined}
            className="aspect-[6/7] lg:aspect-auto lg:h-full"
          />
          <div className="pointer-events-none absolute right-3 top-4 z-10 lg:right-6 lg:top-6">
            <Stamp size="sm" top={t('match.stampTop')} bottom={t('match.stampBottom')} label={t('match.stampLabel')} />
          </div>
        </div>
      </aside>

      {/* Columna derecha (en móvil sus bloques se intercalan con la tarjeta gracias a `contents`) */}
      <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:min-h-dvh lg:flex-col lg:px-12 lg:py-6">
        <header className="order-1 flex items-center justify-end px-4 pt-4 lg:p-0">
          <LangSwitch dark />
        </header>

        <section className="order-2 px-4 pb-4 pt-3 lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:p-0">
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-xl">
            {justUpdated && (
              <p role="status" className="animate-pop-in mb-4 flex items-center gap-2 rounded-xl bg-emerald-400/15 px-3 py-2.5 text-[15px] font-semibold text-emerald-200 ring-1 ring-emerald-300/30">
                <CheckCircle2 className="h-5 w-5 shrink-0" /> {t('waiting.updated')}
              </p>
            )}
            <h1 className="font-display text-xl font-bold italic leading-tight tracking-tight lg:text-5xl">
              {t('waiting.saved')}
            </h1>
            <DateBlock />
            <div className="hidden lg:block">
              <Sealed />
              {canEditProfile && <EditButton onClick={edit} />}
            </div>
          </div>
        </section>

        <div className="order-4 px-4 pt-4 lg:hidden">
          <div className="mx-auto max-w-sm">
            <Sealed />
            {canEditProfile && <EditButton onClick={edit} />}
          </div>
        </div>

        <PublicFooter className="order-5 !py-3 lg:!py-0">
          <button onClick={forgetMe} className="underline-offset-4 hover:text-slate-200 hover:underline">
            {t('waiting.notYou')}
          </button>
        </PublicFooter>
      </div>
    </div>
  )
}

/** Días naturales hasta el evento (J-n), contando el día de hoy como J-n y el 25/11 como Jour J */
const daysUntil = (left) => left.days + (left.hours || left.minutes || left.seconds ? 1 : 0)

/** Hoja de calendario de sobremesa + «Dans 48 jours» + cuenta atrás discreta (sin segundos) */
function DateBlock() {
  const { t, formatDate } = useI18n()
  const left = useTimeLeft(EVENT_DATE)
  const n = daysUntil(left)
  const headline = left.done ? t('waiting.jToday') : n === 1 ? t('waiting.tomorrow') : t('waiting.inDays', { n })
  const weekday = formatDate(EVENT_DATE, { weekday: 'long' })
  const pad = (v) => String(v).padStart(2, '0')

  return (
    <div className="mt-4 flex items-center gap-5 lg:mt-10 lg:gap-8">
      {/* Hoja de calendario */}
      <div className="relative w-24 shrink-0 -rotate-3 lg:w-48" role="img" aria-label={formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}>
        <span aria-hidden className="absolute -top-2 left-[22%] z-10 h-4 w-2 rounded-full bg-slate-300 ring-2 ring-ink lg:-top-3.5 lg:h-7 lg:w-2.5" />
        <span aria-hidden className="absolute -top-2 right-[22%] z-10 h-4 w-2 rounded-full bg-slate-300 ring-2 ring-ink lg:-top-3.5 lg:h-7 lg:w-2.5" />
        <div className="overflow-hidden rounded-xl bg-white text-center text-ink shadow-2xl shadow-black/50 lg:rounded-2xl">
          <div className="bg-brand pb-1 pt-2.5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-white lg:pb-2.5 lg:pt-5 lg:text-base">
            {formatDate(EVENT_DATE, { month: 'long' })}
          </div>
          <div className="font-display text-5xl font-bold leading-none lg:text-[7.5rem]" style={{ paddingTop: '0.08em' }}>
            {formatDate(EVENT_DATE, { day: 'numeric' })}
          </div>
          <div className="pb-1.5 text-xs font-semibold capitalize text-slate-500 lg:pb-4 lg:text-lg">{weekday}</div>
        </div>
      </div>

      {/* Cuánto falta */}
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60 lg:text-sm">{t('waiting.kicker')}</p>
        <p className="mt-1 whitespace-nowrap font-display text-3xl font-bold italic leading-tight text-accent lg:text-5xl xl:text-6xl">{headline}</p>
        {!left.done && (
          <p className="mt-1.5 font-mono text-sm tabular-nums text-white/70 lg:mt-3 lg:text-base" aria-live="off">
            {t('waiting.remaining', { d: left.days, h: pad(left.hours), m: pad(left.minutes) })}
          </p>
        )}
      </div>
    </div>
  )
}

/** Lacre: «Vos rendez-vous sont sous scellés. Le 25 novembre, cette page vous dévoilera tout.» */
function Sealed() {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-4 lg:mt-12">
      <span aria-hidden className="relative grid h-14 w-14 shrink-0 rotate-12 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#ff4d7a,#DF0140_45%,#8a0028)] shadow-lg shadow-black/40 ring-4 ring-brand/30 lg:h-16 lg:w-16">
        <span className="absolute inset-1.5 rounded-full border-2 border-dashed border-white/25" />
        <Heart className="h-6 w-6 fill-white/90 text-white/90" />
      </span>
      <p className="text-[15px] leading-snug text-white/80 lg:text-lg">
        <strong className="block font-semibold text-white">{t('waiting.sealedTitle')}</strong>
        {t('waiting.sealedText')}
      </p>
    </div>
  )
}

function EditButton({ onClick }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-white/30 px-5 text-base font-bold text-white transition hover:border-white/60 hover:bg-white/10 lg:mt-10 lg:w-auto"
    >
      <PencilLine className="h-5 w-5" /> {t('waiting.edit')}
    </button>
  )
}

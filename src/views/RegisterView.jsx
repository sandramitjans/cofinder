import { useEffect, useRef, useState } from 'react'
import { Briefcase, Building2, Gem, Heart, Lightbulb, Sparkles, Sprout, User, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { COUNTRIES, MAX_SUPERPOWERS, VIEWS } from '../constants'
import { DICT } from '../lib/i18n'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import TagPicker from '../components/ui/TagPicker'
import SuperpowerPicker from '../components/ui/SuperpowerPicker'
import LangSwitch from '../components/ui/LangSwitch'
import AttractivenessMeter, { attractivenessScore } from '../components/AttractivenessMeter'
import PublicFooter from '../components/layout/PublicFooter'
import MatchScene from './MatchScene'

// `country` guarda «Filiale / Département» (texto libre, con sugerencias de filiales)
const EMPTY = { name: '', role: '', country: '', offers: [], needs: [], superpowers: [] }

/** Si el texto coincide con una filial conocida (en cualquier idioma), guarda su identificador */
const normalizeBranch = (text) => {
  const clean = text.trim()
  const key = clean.toLowerCase()
  const id = COUNTRIES.find((c) => Object.values(DICT).some((d) => d.countries[c]?.toLowerCase() === key))
  return id ?? clean
}

/**
 * Pre-registro «Cofinder : Le Speed-Dating des Directeurs».
 * El mismo formulario para todo el mundo (moderadora incluida), sin pistas de mesas ni rondas.
 * Al validar: el formulario se desvanece, entra la tarjeta VIP y cae el sello «PROFIL VALIDÉ & MATCH READY !».
 */
export default function RegisterView() {
  const { register, navigate } = useApp()
  const { t, country } = useI18n()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [phase, setPhase] = useState('form') // form → fading → matched
  const saved = useRef(null)

  const set = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (form.name.trim().length < 2) er.name = t('register.errName')
    if (!form.role.trim()) er.role = t('register.errRole')
    if (!form.country.trim()) er.country = t('register.errCountry')
    if (!form.offers.length) er.offers = t('register.errTags')
    if (!form.needs.length) er.needs = t('register.errTags')
    setErrors(er)
    const first = Object.keys(er)[0]
    if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !first
  }

  const submit = (e) => {
    e.preventDefault()
    if (phase !== 'form' || !validate()) return
    const data = { ...form, name: form.name.trim(), role: form.role.trim(), country: normalizeBranch(form.country) }
    saved.current = data
    register(data, { stay: true }) // se guarda ya; la animación es solo escenografía
    setPhase('fading')
  }

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = setTimeout(() => { setPhase('matched'); window.scrollTo({ top: 0 }) }, 550)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'matched') return <MatchScene profile={saved.current} onDone={() => navigate(VIEWS.HOME)} />

  const score = attractivenessScore(form)

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <BrandPanel />

      <section className="vip-glow flex min-h-dvh flex-col px-5 pt-6 sm:px-10 lg:pt-10">
        <div className={`mx-auto w-full max-w-xl flex-1 ${phase === 'fading' ? 'animate-form-out' : ''}`}>
          <div className="flex items-center justify-between gap-4">
            <span className="lg:hidden"><Logo /></span>
            <LangSwitch className="ml-auto" />
          </div>

          {/* Cabecera */}
          <header className="mt-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
              <Gem className="h-3.5 w-3.5" /> {t('register.kicker')}
            </p>
            <h1 className="mt-4 tracking-tight">
              <span className="block text-lg font-bold text-brand">{t('register.titleBrand')}</span>
              <span className="block font-display text-4xl font-bold italic leading-[1.05] sm:text-5xl">{t('register.titleMain')}</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-slate-600 sm:text-lg">{t('register.subtitle')}</p>
          </header>

          {/* Indice d'attractivité, siempre visible */}
          <div className="sticky top-3 z-10 mt-6">
            <AttractivenessMeter value={score} />
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-6">
            {/* 1 · Profil */}
            <Card n={1} icon={UserRound} title={t('register.step1')} subtitle={t('register.step1Sub')}>
              <div className="mt-4 flex items-center gap-4 rounded-xl bg-gradient-to-r from-brand-soft to-accent-soft/60 p-3">
                <Avatar name={form.name || '?'} />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-semibold">{form.name || t('register.previewName')}</p>
                  <p className="truncate text-xs text-slate-600">
                    {[form.role || t('register.previewRole'), form.country ? country(form.country) : t('register.previewCountry')].join(' · ')}
                  </p>
                </div>
                <Heart className={`ml-auto h-5 w-5 shrink-0 transition ${score >= 100 ? 'animate-heartbeat fill-brand text-brand' : 'text-brand/30'}`} />
              </div>
              <div className="mt-4 space-y-4">
                <div data-field="name">
                  <Field label={t('register.name')} name="name" icon={User} placeholder={t('register.namePh')} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div data-field="role">
                    <Field label={t('register.role')} name="role" icon={Briefcase} placeholder={t('register.rolePh')} autoComplete="organization-title" value={form.role} onChange={(e) => set('role', e.target.value)} error={errors.role} />
                  </div>
                  <div data-field="country">
                    <Field label={t('register.country')} name="country" icon={Building2} placeholder={t('register.countryPh')} list="branch-suggestions" autoComplete="off" value={form.country} onChange={(e) => set('country', e.target.value)} error={errors.country} />
                    <datalist id="branch-suggestions">
                      {COUNTRIES.map((c) => <option key={c} value={country(c)} />)}
                    </datalist>
                  </div>
                </div>
              </div>
            </Card>

            {/* 2 · Compétences: una sola lista, dos selecciones independientes */}
            <Card n={2} icon={Lightbulb} tone="brand" title={t('register.step2')} subtitle={t('register.step2Sub')}>
              <SubBlock field="offers" id="pick-offer" icon={Lightbulb} tone="brand" title={t('register.offerTitle')} tag={t('register.offerTag')} subtitle={t('register.offerSub')}>
                <TagPicker tone="offer" labelledBy="pick-offer" value={form.offers} onChange={(v) => set('offers', v)} alsoIn={form.needs} error={errors.offers} />
              </SubBlock>

              <div aria-hidden className="relative my-6 border-t border-dashed border-slate-200">
                <span className="absolute left-1/2 top-0 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white ring-1 ring-slate-200">
                  <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
                </span>
              </div>

              <SubBlock field="needs" id="pick-need" icon={Sprout} tone="accent" title={t('register.needTitle')} tag={t('register.needTag')} subtitle={t('register.needSub')}>
                <TagPicker tone="need" labelledBy="pick-need" value={form.needs} onChange={(v) => set('needs', v)} alsoIn={form.offers} error={errors.needs} />
              </SubBlock>
            </Card>

            {/* 3 · Arme secrète */}
            <Card n={3} icon={Sparkles} tone="ink" title={t('register.step3')} tag={t('register.step3Tag')} subtitle={t('register.step3Sub', { max: MAX_SUPERPOWERS })} field="superpowers" labelId="pick-power">
              <div className="mt-4">
                <SuperpowerPicker labelledBy="pick-power" value={form.superpowers} onChange={(v) => set('superpowers', v)} />
              </div>
            </Card>

            <Button type="submit" icon={Heart} className="w-full py-4 text-base" disabled={phase !== 'form'}>
              {t('register.submit')}
            </Button>
          </form>
        </div>
        <PublicFooter />
      </section>
    </div>
  )
}

/** Panel lateral de marca: dos tarjetas que hacen «match» */
function BrandPanel() {
  const { t } = useI18n()
  return (
    <aside className="relative hidden overflow-hidden bg-brand text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-between lg:p-12">
      <div aria-hidden className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full bg-accent/20" />

      <div className="relative flex items-center justify-between">
        <Logo size="lg" inverted />
        <span className="rounded-full border border-accent/60 px-3 py-1 text-xs font-bold tracking-[0.3em] text-accent">{t('register.vip')}</span>
      </div>

      {/* Ilustración: dos perfiles + corazón */}
      <div aria-hidden className="relative mx-auto mt-6 h-44 w-72">
        <div className="absolute left-0 top-4 w-40 -rotate-6 rounded-2xl bg-white p-4 text-ink shadow-2xl">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent font-bold">A</div>
          <div className="mt-3 h-2 w-24 rounded bg-slate-200" />
          <div className="mt-2 flex gap-1"><span className="h-4 w-12 rounded-full bg-brand-soft" /><span className="h-4 w-9 rounded-full bg-brand-soft" /></div>
        </div>
        <div className="absolute right-0 top-0 w-40 rotate-6 rounded-2xl bg-ink p-4 shadow-2xl">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand font-bold">B</div>
          <div className="mt-3 h-2 w-20 rounded bg-white/20" />
          <div className="mt-2 flex gap-1"><span className="h-4 w-10 rounded-full bg-accent/40" /><span className="h-4 w-12 rounded-full bg-accent/40" /></div>
        </div>
        <span className="absolute left-1/2 top-[62%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-accent shadow-xl ring-4 ring-brand">
          <Heart className="animate-heartbeat h-7 w-7 fill-brand text-brand" />
        </span>
      </div>

      <div className="relative max-w-md">
        <h2 className="font-display text-4xl font-bold italic leading-[1.1] xl:text-5xl">{t('register.panelTitle')}</h2>
        <p className="mt-4 text-lg text-white/85">{t('register.panelText')}</p>
        <p className="mt-6 border-l-2 border-accent pl-4 font-display text-lg italic text-white/90">{t('register.panelQuote')}</p>
      </div>

      <p className="relative flex items-center gap-2 text-sm text-white/70">
        <Gem className="h-4 w-4 text-accent" /> {t('register.panelFooter')}
      </p>
    </aside>
  )
}

const BADGES = { brand: 'bg-brand text-white', accent: 'bg-accent text-ink', ink: 'bg-ink text-accent' }
const TAGS = { brand: 'bg-brand-soft text-brand', accent: 'bg-accent-soft text-ink', ink: 'bg-ink text-accent' }

function Card({ n, icon: Icon, tone = 'ink', title, tag, subtitle, field, labelId, children }) {
  return (
    <fieldset data-field={field} className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <span aria-hidden className="absolute right-5 top-5 font-display text-sm italic text-slate-300">{String(n).padStart(2, '0')}/03</span>
      <div className="flex items-start gap-3 pr-12">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${BADGES[tone]}`}><Icon className="h-4 w-4" /></span>
        <div>
          <h2 id={labelId} className="flex flex-wrap items-center gap-x-2 font-display text-xl font-semibold leading-9">
            {title}
            {tag && <span className={`rounded-full px-2 py-0.5 font-sans text-[11px] font-bold uppercase not-italic leading-none tracking-wide ${TAGS[tone]}`}>{tag}</span>}
          </h2>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </fieldset>
  )
}

function SubBlock({ field, id, icon: Icon, tone, title, tag, subtitle, children }) {
  return (
    <div data-field={field} className="mt-5">
      <h3 id={id} className="flex flex-wrap items-center gap-2 font-semibold">
        <Icon className={`h-4 w-4 ${tone === 'brand' ? 'text-brand' : 'text-amber-500'}`} />
        {title}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase leading-none tracking-wide ${TAGS[tone]}`}>{tag}</span>
      </h3>
      <p className="mb-3 mt-0.5 text-sm text-slate-500">{subtitle}</p>
      {children}
    </div>
  )
}

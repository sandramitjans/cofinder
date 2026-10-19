import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, Building2, Save, Gem, Heart, Lightbulb, RotateCcw, Sparkles, User, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { COUNTRIES, MAX_INTERESTS, MAX_SUPERPOWERS, VIEWS } from '../constants'
import { DICT } from '../lib/i18n'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import TopicPicker from '../components/TopicPicker'
import SuperpowerPicker, { SuperpowerChips } from '../components/ui/SuperpowerPicker'
import PhotoPicker from '../components/ui/PhotoPicker'
import LangSwitch from '../components/ui/LangSwitch'
import AttractivenessMeter, { attractivenessScore } from '../components/AttractivenessMeter'
import PublicFooter from '../components/layout/PublicFooter'
import MatchScene from './MatchScene'
import { isCustom } from '../lib/topics'

// `country` guarda «Filiale / Département» (texto libre, con sugerencias de filiales)
const EMPTY = { name: '', role: '', country: '', photo: '', offers: [], needs: [], customTopics: [], superpowers: [] }

// Borrador automático: se guarda en este dispositivo y se borra al validar el perfil
const DRAFT_KEY = 'cofinder:draft'
const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY))
    return d && typeof d === 'object' ? { ...EMPTY, ...d } : null
  } catch { return null }
}
const isEmpty = (f) => !f.name.trim() && !f.role.trim() && !f.country.trim() && !f.photo
  && !f.offers.length && !f.needs.length && !f.customTopics.length && !f.superpowers.length

/** Si el texto coincide con una filial conocida (en cualquier idioma), guarda su identificador */
const normalizeBranch = (text) => {
  const clean = text.trim()
  const key = clean.toLowerCase()
  const id = COUNTRIES.find((c) => Object.values(DICT).some((d) => d.countries[c]?.toLowerCase() === key))
  return id ?? clean
}

/**
 * Pre-registro «Cofinder : Le Speed-Dating des Directeurs».
 * Landing con un único CTA (a ella llega el email) y formulario en 3 pasos: perfil,
 * competencias (primero «Je maîtrise», luego «J’explore») y arme secrète.
 * El mismo formulario para todo el mundo (moderadora incluida), sin pistas de mesas ni rondas.
 * Al validar: el formulario se desvanece, entra la tarjeta VIP y cae el sello «PROFIL VALIDÉ & MATCH READY !».
 */
export function EditProfileView() {
  return <RegisterView mode="edit" />
}

/** Perfil guardado → valores del formulario (la filial vuelve a texto legible) */
const formFromProfile = (p, countryLabel) => {
  const used = [...(p.offers ?? []), ...(p.needs ?? [])].filter(isCustom)
  return {
    ...EMPTY,
    name: p.name ?? '',
    role: p.role ?? '',
    country: countryLabel(p.country) ?? '',
    photo: p.photo || '',
    offers: [],
    needs: [...new Set([...(p.needs ?? []), ...(p.offers ?? [])])].slice(0, MAX_INTERESTS), // una sola lista de intereses
    customTopics: [...new Set([...(p.customTopics ?? []), ...used])],
    superpowers: [...(p.superpowers ?? [])],
  }
}

// Pantallas del formulario: 0 = landing, 1 = perfil, 2 = temas de interés, 3 = arme secrète.
const LAST = 3

export default function RegisterView({ mode = 'create' }) {
  const editing = mode === 'edit'
  const { register, navigate, currentUser, updateProfile } = useApp()
  const { t, country } = useI18n()
  const [form, setForm] = useState(() => (editing && currentUser ? formFromProfile(currentUser, country) : loadDraft() ?? EMPTY))
  const [restored, setRestored] = useState(() => !editing && !!loadDraft() && !isEmpty(loadDraft()))
  const [screen, setScreen] = useState(editing ? 1 : 0)
  const [errors, setErrors] = useState({})
  const [phase, setPhase] = useState('form') // form → saving → fading → matched
  const [saveError, setSaveError] = useState(false)
  const saved = useRef(null)

  const set = (key, value) => patch({ [key]: value })

  // Aplica varios cambios a la vez y limpia los errores de los campos tocados
  const patch = (changes) => {
    setForm((f) => ({ ...f, ...changes }))
    setErrors((er) => {
      const next = { ...er }
      Object.keys(changes).forEach((k) => { next[k] = undefined })
      return next
    })
  }

  // Guardado automático del borrador (con un pequeño retardo para no escribir en cada tecla)
  useEffect(() => {
    if (phase !== 'form' || editing) return // al modificar un perfil ya validado no hay borrador
    const timer = setTimeout(() => {
      try {
        if (isEmpty(form)) localStorage.removeItem(DRAFT_KEY)
        else localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      } catch { /* sin almacenamiento: el formulario sigue funcionando */ }
    }, 400)
    return () => clearTimeout(timer)
  }, [form, phase, editing])

  const goTo = (n) => {
    setScreen(n)
    window.scrollTo({ top: 0 })
  }

  const resetDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    setForm(EMPTY)
    setErrors({})
    setRestored(false)
    goTo(1)
  }

  // Validación de la pantalla actual: solo se puede avanzar con lo obligatorio de esa pantalla
  const validate = () => {
    const er = {}
    if (screen === 1) {
      if (form.name.trim().length < 2) er.name = t('register.errName')
      if (!form.role.trim()) er.role = t('register.errRole')
      if (!form.country.trim()) er.country = t('register.errCountry')
    }
    if (screen === 2 && form.needs.length !== MAX_INTERESTS) er.needs = t('register.errInterests', { max: MAX_INTERESTS, n: form.needs.length })
    setErrors(er)
    const first = Object.keys(er)[0]
    if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !first
  }

  const submit = async (e) => {
    e.preventDefault()
    if (phase !== 'form' || !validate()) return
    if (screen < LAST) return goTo(screen + 1)
    // Los temas propios sin marcar en ninguna columna no aportan nada: se descartan
    // Los temas elegidos se guardan como `needs`; el reparto en mesas agrupa por interés
    const customTopics = form.customTopics.filter((c) => form.needs.includes(c))
    const data = { ...form, offers: [], customTopics, name: form.name.trim(), role: form.role.trim(), country: normalizeBranch(form.country) }
    saved.current = data
    setSaveError(false)
    setPhase('saving')
    if (editing) {
      if (!(await updateProfile(data))) { setPhase('form'); setSaveError(true) }
      return
    }
    // Se guarda primero en la base de datos; la animación es solo escenografía.
    // Si falla la red, el borrador sigue intacto y se puede volver a intentar.
    const ok = await register(data, { stay: true })
    if (!ok) { setPhase('form'); setSaveError(true); return }
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    setPhase('fading')
  }

  useEffect(() => {
    if (phase !== 'fading') return
    const timer = setTimeout(() => { setPhase('matched'); window.scrollTo({ top: 0 }) }, 550)
    return () => clearTimeout(timer)
  }, [phase])

  if (phase === 'matched') return <MatchScene profile={saved.current} onDone={() => navigate(VIEWS.HOME)} />
  if (screen === 0) return <Landing resume={restored} onStart={() => goTo(1)} />

  const score = attractivenessScore(form)

  return (
    <section className="vip-glow flex min-h-dvh flex-col px-5 pt-6 sm:px-10 lg:pt-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Logo />
        <LangSwitch />
      </div>

      <div className={`mx-auto w-full max-w-4xl flex-1 ${phase === 'fading' ? 'animate-form-out' : ''}`}>
        {editing && (
          <header className="mt-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide text-ink">
              <Gem className="h-3.5 w-3.5" /> {t('register.editKicker')}
            </p>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-700">{t('register.editSubtitle')}</p>
          </header>
        )}

        {/* Solo el índice de atractividad, centrado */}
        <div className="mt-8">
          <AttractivenessMeter value={score} />
        </div>

        {/* Retour, fuera del formulario */}
        {(screen > 1 || !editing) && (
          <button
            type="button"
            onClick={() => goTo(screen - 1)}
            disabled={phase !== 'form'}
            className="mt-6 inline-flex items-center gap-1.5 rounded-lg py-1 text-[15px] font-semibold text-slate-600 transition hover:text-ink disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" /> {t('register.back')}
          </button>
        )}

        <form onSubmit={submit} noValidate className="mt-4 space-y-6">
          {restored && screen === 1 && (
            <div className="flex flex-col gap-2 rounded-xl border border-accent/40 bg-accent-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] font-medium text-ink">{t('register.draftRestored')}</p>
              <button type="button" onClick={resetDraft} className="inline-flex shrink-0 items-center gap-1.5 self-start text-[15px] font-semibold text-brand-dark underline-offset-4 hover:underline sm:self-auto">
                <RotateCcw className="h-4 w-4" /> {t('register.draftReset')}
              </button>
            </div>
          )}

          {/* 1 · Profil */}
          {screen === 1 && (
            <Card key="profile" icon={UserRound} title={t('register.step1')} subtitle={t('register.step1Sub')}>
              <div className="mt-6 grid gap-6 md:grid-cols-[18rem_minmax(0,1fr)] md:items-start md:gap-8">
              <PhotoPicker value={form.photo} name={form.name} onChange={(v) => set('photo', v)} />
              <div className="space-y-4">
                <div data-field="name">
                  <Field label={t('register.name')} name="name" icon={User} placeholder={t('register.namePh')} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
                </div>
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
          )}

          {/* 2 · Temas de interés: una sola selección */}
          {screen === 2 && (
            <Card
              key="interests"
              icon={Lightbulb}
              tone="brand"
              title={t('register.interestsTitle')}
              subtitle={t('register.interestsSub', { max: MAX_INTERESTS })}
              field="needs"
            >
              <TopicPicker
                col="needs"
                max={MAX_INTERESTS}
                offers={[]}
                needs={form.needs}
                customTopics={form.customTopics}
                onChange={patch}
                error={errors.needs}
              />
            </Card>
          )}

          {/* 3 · Arme secrète */}
          {screen === 3 && (
            <Card key="power" icon={Sparkles} tone="ink" title={t('register.step3')} tag={t('register.step3Tag')} subtitle={t('register.step3Sub', { max: MAX_SUPERPOWERS })} field="superpowers" labelId="pick-power">
              <div className="mt-4">
                <SuperpowerPicker labelledBy="pick-power" value={form.superpowers} onChange={(v) => set('superpowers', v)} />
              </div>
            </Card>
          )}
          {screen === 3 && <Recap form={form} onEdit={goTo} />}

          {saveError && (
            <p role="alert" className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-base font-semibold text-accent-dark">
              {t('register.saveError')}
            </p>
          )}

          <div className="flex flex-col">
            {screen < LAST ? (
              <Button type="submit" iconRight={ArrowRight} className="py-4 text-base">{t('register.next')}</Button>
            ) : (
              <Button type="submit" icon={Heart} className="py-4 text-base" disabled={phase !== 'form'}>
                {phase === 'saving' ? t('register.saving') : t(editing ? 'register.editSave' : 'register.submit')}
              </Button>
            )}
          </div>
          {editing ? (
            <button type="button" onClick={() => navigate(VIEWS.HOME)} disabled={phase !== 'form'}
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50">
              {t('register.editCancel')}
            </button>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-sm text-slate-600">
              <Save className="h-4 w-4" /> {t('register.draftSaved')}
            </p>
          )}
        </form>
      </div>
      <PublicFooter />
    </section>
  )
}

const STEPS = ['register.navProfile', 'register.navSkills', 'register.navPower']

/** Landing de entrada (a la que llega el email): invitación, cómo funciona y un único CTA */
function Landing({ resume, onStart }) {
  const { t } = useI18n()
  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-6 sm:px-10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <Logo />
        <LangSwitch />
      </div>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center py-10 text-center">
        <MatchIllustration />
        <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide text-ink">
          <Gem className="h-3.5 w-3.5" /> {t('register.kicker')}
        </p>
        <h1 className="mt-6 tracking-tight">
          <span className="block text-lg font-bold text-brand-dark sm:text-xl">{t('register.titleBrand')}</span>
          <span className="mt-1 block font-display text-5xl font-medium leading-[1.02] sm:text-7xl">{t('register.titleMain')}</span>
        </h1>
        <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-700 sm:text-xl">{t('register.subtitle')}</p>

        <ol className="mt-8 flex flex-wrap justify-center gap-2">
          {STEPS.map((key, i) => (
            <li key={key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[15px] font-semibold text-ink shadow-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
              {t(key)}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onStart}
          className="mt-10 inline-flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-2xl bg-brand px-10 text-lg font-bold text-ink shadow-lg shadow-brand/30 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 active:scale-[0.98] sm:w-auto sm:text-xl"
        >
          {t(resume ? 'register.landingResume' : 'register.landingCta')} <ArrowRight className="h-5 w-5" />
        </button>
        <p className="mt-4 text-sm text-slate-600">{t(resume ? 'register.landingNote' : 'register.landingHow')}</p>
      </main>

      <PublicFooter />
    </div>
  )
}

/** Resumen del perfil antes de validar, con atajos para corregir cada parte */
function Recap({ form, onEdit }) {
  const { t, topic, country } = useI18n()
  const rows = [
    { label: t('register.navProfile'), screen: 1, body: <p className="text-base text-ink">{[form.name, form.role, form.country && country(form.country)].filter(Boolean).join(' · ')}</p> },
    { label: t('register.navSkills'), screen: 2, body: <Tags ids={form.needs} className="bg-brand-soft text-brand-dark" /> },
    {
      label: t('waiting.superpowers'),
      screen: 3,
      body: form.superpowers.length ? <SuperpowerChips ids={form.superpowers} /> : <p className="text-base text-slate-500">{t('register.recapNone')}</p>,
    },
  ]
  function Tags({ ids, className }) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {ids.map((id) => <li key={id} className={`rounded-full px-3 py-1 text-sm font-medium ${className}`}>{topic(id)}</li>)}
      </ul>
    )
  }
  return (
    <section aria-labelledby="recap-title" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 id="recap-title" className="font-display text-xl font-medium text-ink">{t('register.recapTitle')}</h2>
      <dl className="mt-4 divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="grid gap-2 py-3 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
            <dt className="text-sm font-bold uppercase tracking-wider text-slate-500">{r.label}</dt>
            <dd className="min-w-0">{r.body}</dd>
            {r.screen !== 3 && (
              <button type="button" onClick={() => onEdit(r.screen)} className="justify-self-start text-[15px] font-semibold text-brand-dark underline-offset-4 hover:underline">
                {t('register.recapEdit')}
              </button>
            )}
          </div>
        ))}
      </dl>
    </section>
  )
}

/** Ilustración: dos perfiles que hacen «match» */
function MatchIllustration() {
  return (
    <div aria-hidden className="relative mx-auto h-40 w-72 sm:h-44">
      <div className="absolute left-0 top-4 w-40 -rotate-6 rounded-2xl bg-white p-4 text-left text-ink shadow-xl ring-1 ring-slate-200">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent font-bold text-ink">A</div>
        <div className="mt-3 h-2 w-24 rounded bg-slate-200" />
        <div className="mt-2 flex gap-1"><span className="h-4 w-12 rounded-full bg-brand-soft" /><span className="h-4 w-9 rounded-full bg-brand-soft" /></div>
      </div>
      <div className="absolute right-0 top-0 w-40 rotate-6 rounded-2xl bg-brand p-4 text-left text-ink shadow-xl">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink font-bold text-brand">B</div>
        <div className="mt-3 h-2 w-20 rounded bg-ink/20" />
        <div className="mt-2 flex gap-1"><span className="h-4 w-10 rounded-full bg-ink/25" /><span className="h-4 w-12 rounded-full bg-ink/25" /></div>
      </div>
      <span className="absolute left-1/2 top-[62%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl ring-4 ring-accent">
        <Heart className="animate-heartbeat h-7 w-7 fill-accent text-accent" />
      </span>
    </div>
  )
}

const BADGES = { brand: 'bg-brand text-ink', accent: 'bg-accent text-ink', ink: 'bg-ink text-accent' }
const TAGS = { brand: 'bg-brand-soft text-brand-dark', accent: 'bg-accent-soft text-ink', ink: 'bg-ink text-accent' }

function Card({ icon: Icon, tone = 'ink', title, tag, subtitle, field, labelId, children }) {
  return (
    <fieldset data-field={field} className="relative min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${BADGES[tone]}`}><Icon className="h-5 w-5" /></span>
        <h2 id={labelId} className="text-xl font-bold leading-tight text-ink sm:text-2xl">{title}</h2>
      </div>
      {tag && <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${TAGS[tone]}`}>{tag}</span>}
      {subtitle && <p className="mt-2 text-base leading-relaxed text-slate-700">{subtitle}</p>}
      {children}
    </fieldset>
  )
}

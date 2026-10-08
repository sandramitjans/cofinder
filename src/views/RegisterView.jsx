import { useEffect, useRef, useState } from 'react'
import { Briefcase, Building2, CheckCircle2, Save, Gem, Heart, Lightbulb, RotateCcw, Sparkles, User, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { COUNTRIES, MAX_SUPERPOWERS, VIEWS } from '../constants'
import { DICT } from '../lib/i18n'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import TopicMatrix from '../components/TopicMatrix'
import SuperpowerPicker from '../components/ui/SuperpowerPicker'
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
    offers: [...(p.offers ?? [])],
    needs: (p.needs ?? []).filter((x) => !(p.offers ?? []).includes(x)), // un tema, una sola columna
    customTopics: [...new Set([...(p.customTopics ?? []), ...used])],
    superpowers: [...(p.superpowers ?? [])],
  }
}

export default function RegisterView({ mode = 'create' }) {
  const editing = mode === 'edit'
  const { register, navigate, currentUser, updateProfile } = useApp()
  const { t, country } = useI18n()
  const [form, setForm] = useState(() => (editing && currentUser ? formFromProfile(currentUser, country) : loadDraft() ?? EMPTY))
  const [restored, setRestored] = useState(() => !editing && !!loadDraft() && !isEmpty(loadDraft()))
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

  const resetDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
    setForm(EMPTY)
    setErrors({})
    setRestored(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Lo que falta para poder validar, en lenguaje natural
  const missing = [
    form.name.trim().length < 2 && t('register.missName'),
    !form.role.trim() && t('register.missRole'),
    !form.country.trim() && t('register.missCountry'),
    !form.offers.length && t('register.missBring'),
    !form.needs.length && t('register.missSeek'),
  ].filter(Boolean)

  const validate = () => {
    const er = {}
    if (form.name.trim().length < 2) er.name = t('register.errName')
    if (!form.role.trim()) er.role = t('register.errRole')
    if (!form.country.trim()) er.country = t('register.errCountry')
    if (!form.offers.length) er.offers = t('register.errTags')
    if (!form.needs.length) er.needs = t('register.errTags')
    setErrors(er)
    const first = Object.keys(er)[0]
    const target = first === 'offers' || first === 'needs' ? 'topics' : first
    if (first) document.querySelector(`[data-field="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !first
  }

  const submit = async (e) => {
    e.preventDefault()
    if (phase !== 'form' || !validate()) return
    // Los temas propios sin marcar en ninguna columna no aportan nada: se descartan
    const customTopics = form.customTopics.filter((c) => form.offers.includes(c) || form.needs.includes(c))
    const needs = form.needs.filter((x) => !form.offers.includes(x))
    const data = { ...form, needs, customTopics, name: form.name.trim(), role: form.role.trim(), country: normalizeBranch(form.country) }
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
            <p className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-sm font-bold uppercase tracking-wide text-ink">
              <Gem className="h-3.5 w-3.5" /> {t(editing ? 'register.editKicker' : 'register.kicker')}
            </p>
            <h1 className="mt-4 tracking-tight">
              <span className="block text-lg font-bold text-brand">{t('register.titleBrand')}</span>
              <span className="block font-display text-4xl font-bold italic leading-[1.05] sm:text-5xl">{t('register.titleMain')}</span>
            </h1>
            <p className="mt-4 max-w-lg text-lg leading-relaxed text-slate-700">{t(editing ? 'register.editSubtitle' : 'register.subtitle')}</p>
          </header>

          {/* Indice d'attractivité, siempre visible */}
          <div className="sticky top-3 z-10 mt-6">
            <AttractivenessMeter value={score} />
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-6">
            {restored && (
              <div className="flex flex-col gap-2 rounded-xl border border-accent bg-accent-soft p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-base font-medium text-ink">{t('register.draftRestored')}</p>
                <button type="button" onClick={resetDraft} className="inline-flex shrink-0 items-center gap-1.5 self-start text-[15px] font-semibold text-brand underline-offset-4 hover:underline sm:self-auto">
                  <RotateCcw className="h-4 w-4" /> {t('register.draftReset')}
                </button>
              </div>
            )}

            {/* 1 · Profil */}
            <Card n={1} icon={UserRound} title={t('register.step1')} subtitle={t('register.step1Sub')}>
              <div className="mt-5">
                <PhotoPicker
                  value={form.photo}
                  name={form.name}
                  subtitle={[form.role || t('register.previewRole'), form.country ? country(form.country) : t('register.previewCountry')].join(' · ')}
                  onChange={(v) => set('photo', v)}
                />
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

            {/* 2 · Compétences: una sola lista con «J'apporte» / «Je cherche» + temas propios */}
            <Card n={2} icon={Lightbulb} tone="brand" title={t('register.step2')} subtitle={t('register.step2Sub')} field="topics">
              <TopicMatrix
                offers={form.offers}
                needs={form.needs}
                customTopics={form.customTopics}
                onChange={patch}
                errors={{ offers: errors.offers && t('register.missBring'), needs: errors.needs && t('register.missSeek') }}
              />
            </Card>

            {/* 3 · Arme secrète */}
            <Card n={3} icon={Sparkles} tone="ink" title={t('register.step3')} tag={t('register.step3Tag')} subtitle={t('register.step3Sub', { max: MAX_SUPERPOWERS })} field="superpowers" labelId="pick-power">
              <div className="mt-4">
                <SuperpowerPicker labelledBy="pick-power" value={form.superpowers} onChange={(v) => set('superpowers', v)} />
              </div>
            </Card>

            <div aria-live="polite">
              {missing.length ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-base font-bold text-ink">{t('register.missing')}</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-base text-slate-700">
                    {missing.map((m) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-base font-semibold text-emerald-800">
                  <CheckCircle2 className="h-5 w-5 shrink-0" /> {t('register.allReady')}
                </p>
              )}
            </div>

            {saveError && (
              <p role="alert" className="rounded-xl border border-brand/30 bg-brand-soft p-4 text-base font-semibold text-brand-dark">
                {t('register.saveError')}
              </p>
            )}
            <Button type="submit" icon={Heart} className="w-full py-4 text-base" disabled={phase !== 'form'}>
              {phase === 'saving' ? t('register.saving') : t(editing ? 'register.editSave' : 'register.submit')}
            </Button>
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
  const { t } = useI18n()
  return (
    <fieldset data-field={field} className="relative min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <legend className="sr-only">{title}</legend>
      <p className="text-sm font-bold uppercase tracking-wider text-brand">{t('register.stepOf', { n, total: 3 })}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${BADGES[tone]}`}><Icon className="h-5 w-5" /></span>
        <h2 id={labelId} className="text-xl font-bold leading-tight text-ink sm:text-2xl">{title}</h2>
      </div>
      {tag && <span className={`mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${TAGS[tone]}`}>{tag}</span>}
      {subtitle && <p className="mt-2 text-base leading-relaxed text-slate-700">{subtitle}</p>}
      {children}
    </fieldset>
  )
}

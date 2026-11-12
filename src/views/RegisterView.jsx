import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, Building2, CalendarDays, Check, CheckCircle2, Clock, Info, Lock, MapPin, RotateCcw, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { COUNTRIES, MANDATORY_TOPICS, TOPICS, TOPIC_EMOJI, EVENT_DATE, EVENT_PLACE, MAX_INTERESTS, MAX_SUPERPOWERS, ROUND_MINUTES, TOTAL_ROUNDS, VIEWS } from '../constants'
import { DICT } from '../lib/i18n'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import TopicPicker from '../components/TopicPicker'
import SuperpowerPicker from '../components/ui/SuperpowerPicker'
import PhotoPicker from '../components/ui/PhotoPicker'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import { chosenTopics, isCustom, isMandatory } from '../lib/topics'
import { familyOfTopic, familyTone } from '../lib/familyColors'
import { CELEBRATE_KEY } from '../components/ui/Confetti'

// `country` guarda «Filial / Departamento» (texto libre, con sugerencias de filiales)
// `needs` guarda las mesas elegidas (hasta 2); los 4 temas obligatorios no se guardan: cuentan para todo el mundo
const EMPTY = { name: '', role: '', country: '', photo: '', offers: [], needs: [], customTopics: [], superpowers: [] }

// Borrador automático: se guarda en este dispositivo y se borra al validar el perfil
const DRAFT_KEY = 'cofinder:draft'
const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY))
    if (!d || typeof d !== 'object') return null
    // Borradores de antes del cambio: sin nivel y como mucho 2 temas elegidos (sin los obligatorios)
    const { levels: _levels, ...rest } = d
    return { ...EMPTY, ...rest, needs: chosenTopics(rest).slice(0, MAX_INTERESTS), offers: [] }
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
 * Registro «Speed dating de conocimiento», con el estilo del prototipo (cfndr.lovable.app):
 * bienvenida con un único botón y formulario en 4 pasos, cada uno con su barra de progreso:
 * perfil, los 4 temas obligatorios (solo informativo: ya están apuntados), selector de mesas
 * (hasta 2, en orden aleatorio para cada persona) y arma secreta (facultativa).
 * Al validar se pasa a la confirmación.
 */
export function EditProfileView() {
  return <RegisterView mode="edit" />
}

/** Perfil guardado → valores del formulario (la filial vuelve a texto legible) */
const formFromProfile = (p, countryLabel) => {
  const used = chosenTopics(p).filter(isCustom)
  return {
    ...EMPTY,
    name: p.name ?? '',
    role: p.role ?? '',
    country: countryLabel(p.country) ?? '',
    photo: p.photo || '',
    offers: [],
    needs: chosenTopics(p).slice(0, MAX_INTERESTS), // solo las elegidas; las obligatorias se suman siempre
    customTopics: [...new Set([...(p.customTopics ?? []), ...used])],
    superpowers: (p.superpowers ?? []).slice(0, MAX_SUPERPOWERS),
  }
}

// Pantallas: 0 = bienvenida, 1 = perfil, 2 = temas obligatorios (informativa), 3 = mesas elegidas, 4 = arma secreta
const LAST = 4

export default function RegisterView({ mode = 'create' }) {
  const editing = mode === 'edit'
  const { register, navigate, currentUser, updateProfile, eventTopics, eventTopicsLoaded, loadEventTopics } = useApp()
  const { t, country } = useI18n()
  const [form, setForm] = useState(() => (editing && currentUser ? formFromProfile(currentUser, country) : loadDraft() ?? EMPTY))
  const [restored, setRestored] = useState(() => !editing && !!loadDraft() && !isEmpty(loadDraft()))
  const [screen, setScreen] = useState(editing ? 1 : 0)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  // Las mesas que han propuesto otras personas se cargan al llegar al paso de las mesas
  useEffect(() => { if (screen <= 3) loadEventTopics() }, [screen, loadEventTopics])
  // Si la moderadora ha quitado una mesa que estaba elegida, deja de contar como elegida
  useEffect(() => {
    if (!eventTopicsLoaded) return
    const valid = new Set(eventTopics.length ? eventTopics.map((x) => x.id) : TOPICS)
    setForm((f) => {
      const needs = f.needs.filter((id) => valid.has(id) && !isMandatory(id))
      return needs.length === f.needs.length ? f : { ...f, needs }
    })
  }, [eventTopics, eventTopicsLoaded])

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
    if (saving || editing) return // al modificar un perfil ya validado no hay borrador
    const timer = setTimeout(() => {
      try {
        if (isEmpty(form)) localStorage.removeItem(DRAFT_KEY)
        else localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
      } catch { /* sin almacenamiento: el formulario sigue funcionando */ }
    }, 400)
    return () => clearTimeout(timer)
  }, [form, saving, editing])

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
    if (screen === 3 && !form.needs.length) er.needs = t('register.errInterests', { max: MAX_INTERESTS })
    setErrors(er)
    const first = Object.keys(er)[0]
    if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !first
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving || !validate()) return
    if (screen < LAST) return goTo(screen + 1)
    // Las mesas elegidas van en `needs` (sin nivel). Las añadidas desde el panel (`custom:…`) también en `customTopics`
    const needs = form.needs.filter((id) => !isMandatory(id)).slice(0, MAX_INTERESTS)
    const data = {
      ...form,
      offers: [],
      needs,
      customTopics: needs.filter(isCustom), name: form.name.trim(), role: form.role.trim(), country: normalizeBranch(form.country),
    }
    setSaveError(false)
    setSaving(true)
    // Se guarda primero en la base de datos. Si falla la red, el borrador sigue intacto y se puede reintentar.
    // Confeti en la pantalla siguiente: la marca se deja antes, porque al registrarse ya cambia la vista
    if (!editing) try { sessionStorage.setItem(CELEBRATE_KEY, '1') } catch { /* noop */ }
    const ok = editing ? await updateProfile(data) : await register(data)
    setSaving(false)
    if (!ok) {
      try { sessionStorage.removeItem(CELEBRATE_KEY) } catch { /* noop */ }
      setSaveError(true)
      return
    }
    if (!editing) try { localStorage.removeItem(DRAFT_KEY) } catch { /* noop */ }
  }

  if (screen === 0) return <Landing resume={restored} onStart={() => goTo(1)} />

  const steps = {
    1: { title: t('register.step1'), sub: t('register.step1Sub') },
    2: { title: t('register.mandatoryTitle', { n: MANDATORY_TOPICS.length }), sub: t('register.mandatorySub', { n: MANDATORY_TOPICS.length }) },
    3: { title: t('register.interestsTitle', { max: MAX_INTERESTS }), sub: t('register.interestsSub', { max: MAX_INTERESTS, n: MANDATORY_TOPICS.length }) },
    4: { title: t('register.step3'), sub: t('register.step3Sub') },
  }[screen]

  return (
    <main className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className={`mx-auto flex w-full flex-1 flex-col ${WIDTH}`}>
        {/* Volver + progreso «▬▬▬ 2/4», como en el prototipo */}
        <div className="flex min-h-10 items-center justify-between gap-4">
          {(screen > 1 || !editing) ? (
            <button
              type="button"
              onClick={() => (screen === 1 && editing ? navigate(VIEWS.HOME) : goTo(screen - 1))}
              disabled={saving}
              aria-label={t('register.back')}
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:text-ink disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : <span />}
          <div className="flex items-center gap-3">
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: LAST }, (_, i) => (
                <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i < screen ? 'bg-brand' : 'bg-slate-200'}`} />
              ))}
            </div>
            <span className="text-xs font-semibold tabular-nums text-slate-500">{t('register.stepOf', { n: screen, total: LAST })}</span>
            <LangSwitch />
          </div>
        </div>

        <form onSubmit={submit} noValidate className="mt-5 flex flex-1 flex-col">
          <header>
            {editing && screen === 1 && <p className="mb-1 text-sm font-bold uppercase tracking-wider text-brand-dark">{t('register.editKicker')}</p>}
            {/* Ánimo según el paso */}
            {!editing && <p key={screen} className="animate-pop-in mb-1.5 text-sm font-semibold text-brand-dark">{t(`register.cheer${screen}`)}</p>}
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink lg:text-4xl">{steps.title}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 lg:text-base">{steps.sub}</p>
          </header>

          {restored && screen === 1 && (
            <div className="mt-5 flex flex-col gap-2 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] font-medium text-ink">{t('register.draftRestored')}</p>
              <button type="button" onClick={resetDraft} className="inline-flex shrink-0 items-center gap-1.5 self-start text-[15px] font-semibold text-brand-dark underline-offset-4 hover:underline sm:self-auto">
                <RotateCcw className="h-4 w-4" /> {t('register.draftReset')}
              </button>
            </div>
          )}

          {/* 1 · Perfil */}
          {screen === 1 && (
            <div key="profile" className="animate-view-in mt-6 space-y-5">
              <GuestCard form={form} onPhoto={(v) => set('photo', v)} />
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
          )}

          {/* 2 · Temas obligatorios: solo informativo, ya están apuntados */}
          {screen === 2 && <MandatoryTopics />}

          {/* 3 · Mesas elegidas (hasta 2) */}
          {screen === 3 && (
            <div key="interests" data-field="needs" className="animate-view-in">
              <TopicPicker
                max={MAX_INTERESTS}
                value={form.needs}
                topics={eventTopics.filter((x) => !isMandatory(x.id))}
                onChange={patch}
                error={errors.needs}
              />
            </div>
          )}

          {/* 4 · Arma secreta (facultativa, una sola) */}
          {screen === 4 && (
            <div key="power" data-field="superpowers" className="animate-view-in mt-6">
              <SuperpowerPicker value={form.superpowers} onChange={(v) => set('superpowers', v)} />
            </div>
          )}

          {saveError && (
            <p role="alert" className="mt-6 rounded-xl border border-brand/30 bg-brand-soft p-4 text-base font-semibold text-brand-dark">
              {t('register.saveError')}
            </p>
          )}

          {/* Botón siempre a la vista, también con la lista larga de mesas */}
          <div className="sticky bottom-0 z-10 mt-auto pt-6">
            <div className="-mx-5 bg-gradient-to-t from-paper via-paper to-paper/0 px-5 pb-4 pt-4 sm:-mx-8 sm:px-8">
              <Button type="submit" iconRight={ArrowRight} disabled={saving} className="w-full py-4 text-base">
                {saving ? t('register.saving') : screen === 2 ? t('register.continue') : screen < LAST ? t('register.next') : t(editing ? 'register.editSave' : 'register.submit')}
              </Button>
              {editing && (
                <button type="button" onClick={() => navigate(VIEWS.HOME)} disabled={saving}
                  className="mt-2 w-full rounded-xl py-3 text-[15px] font-semibold text-slate-600 hover:bg-white">
                  {t('register.editCancel')}
                </button>
              )}
              {!editing && <p className="mt-2 text-center text-xs text-slate-500">{t('register.draftSaved')}</p>}
            </div>
          </div>
        </form>
      </div>
      <PublicFooter className="!pt-2" />
    </main>
  )
}

/**
 * Paso 1: tarjeta de invitado/a que se va montando mientras se rellena (foto, nombre, cargo, país).
 * Borde discontinuo mientras falta algo; cuando está completa, borde sólido y check verde.
 */
function GuestCard({ form, onPhoto }) {
  const { t } = useI18n()
  const name = form.name.trim()
  const role = form.role.trim()
  const place = form.country.trim()
  const complete = !!(name && role && place)
  return (
    <div className={`flex items-center gap-4 rounded-2xl border-2 bg-white p-4 transition-all duration-300 ${complete ? 'border-brand/30 shadow-md shadow-brand/10' : 'border-dashed border-slate-300'}`}>
      <div className="shrink-0">
        <PhotoPicker compact value={form.photo} name={form.name} onChange={onPhoto} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand-dark">{t('register.guestCard')}</p>
        <p className={`mt-0.5 truncate font-display text-xl font-medium leading-tight ${name ? 'text-ink' : 'text-slate-500'}`}>{name || t('register.guestName')}</p>
        <p className={`truncate text-sm ${role ? 'text-slate-600' : 'text-slate-500'}`}>{role || t('register.guestRole')}</p>
        {place && <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0" /> {place}</p>}
      </div>
      {complete && <CheckCircle2 aria-hidden className="animate-pop-in h-6 w-6 shrink-0 self-start text-mint" />}
    </div>
  )
}

/** Paso 2: los temas obligatorios, ya marcados y bloqueados. Solo para informar. */
function MandatoryTopics() {
  const { t, topic } = useI18n()
  return (
    <div key="mandatory" className="animate-view-in mt-6">
      <ul className="grid gap-2.5 lg:grid-cols-2">
        {MANDATORY_TOPICS.map((id) => {
          const family = familyOfTopic(id)
          const description = isCustom(id) ? '' : t(`topicDesc.${id}`)
          return (
            <li key={id} className="flex items-start gap-3 rounded-xl border border-brand/40 bg-white p-3.5 shadow-sm lg:p-4">
              <span aria-hidden className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${familyTone(family).tile}`}>{isCustom(id) ? '💬' : TOPIC_EMOJI[id]}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug text-ink">{topic(id)}</span>
                {description && <span className="mt-0.5 block text-sm leading-snug text-slate-500">{description}</span>}
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-mint-soft px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-mint-dark">
                  <Lock aria-hidden className="h-3 w-3" /> {t('register.mandatoryBadge')}
                </span>
              </span>
              <span aria-hidden className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-mint bg-mint text-white">
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
            </li>
          )
        })}
      </ul>
      <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-ink">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" /> {t('register.mandatoryNext', { max: MAX_INTERESTS })}
      </p>
    </div>
  )
}

// Ancho del formulario: columna de móvil, algo más ancha en PC para la lista de mesas
const WIDTH = 'max-w-xl lg:max-w-3xl'

/** Bienvenida (a la que llega el email): título, datos del evento y un único botón */
function Landing({ resume, onStart }) {
  const { t, formatDate } = useI18n()
  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <header className={`mx-auto flex w-full ${WIDTH} items-center justify-between gap-4`}>
        <Logo />
        <LangSwitch />
      </header>

      <main className={`mx-auto flex w-full ${WIDTH} flex-1 flex-col justify-center py-10`}>
        <h1 className="font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">{t('register.titleMain')}</h1>
        <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">{t('register.subtitle', { rounds: TOTAL_ROUNDS, min: ROUND_MINUTES })}</p>

        <ul className="mt-8 space-y-2.5 rounded-xl border border-slate-200 bg-white p-4 text-[15px] text-slate-700">
          <li className="flex items-center gap-2.5"><CalendarDays className="h-4 w-4 text-brand" /> {formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</li>
          <li className="flex items-center gap-2.5"><MapPin className="h-4 w-4 text-brand" /> {EVENT_PLACE || t('register.placeTbc')}</li>
          <li className="flex items-center gap-2.5"><Clock className="h-4 w-4 text-brand" /> {t('register.roundsInfo', { n: TOTAL_ROUNDS, min: ROUND_MINUTES })}</li>
        </ul>

        <Button type="button" onClick={onStart} iconRight={ArrowRight} className="mt-10 w-full py-4 text-base">
          {t(resume ? 'register.landingResume' : 'register.landingCta')}
        </Button>
        <p className="mt-3 text-center text-sm text-slate-500">{t(resume ? 'register.landingNote' : 'register.landingHow')}</p>
        <LoginLink />
      </main>

      <PublicFooter />
    </div>
  )
}

/** Quien ya se registró en otro dispositivo entra con su nombre y su código */
function LoginLink() {
  const { navigate } = useApp()
  const { t } = useI18n()
  return (
    <button type="button" onClick={() => navigate(VIEWS.LOGIN)} className="mt-6 text-center text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
      {t('login.landingLink')}
    </button>
  )
}

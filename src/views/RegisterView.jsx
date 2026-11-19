import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Briefcase, CalendarDays, CheckCircle2, Clock, Info, MapPin, RotateCcw, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { COUNTRIES, EVENT_DATE, EVENT_PLACE, MAX_INTERESTS, MAX_SUPERPOWERS, ROUND_MINUTES, TOTAL_ROUNDS, VIEWS } from '../constants'
import { DICT } from '../lib/i18n'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import CountryPicker from '../components/ui/CountryPicker'
import TopicPicker from '../components/TopicPicker'
import LevelPicker from '../components/LevelPicker'
import SuperpowerPicker from '../components/ui/SuperpowerPicker'
import PhotoPicker from '../components/ui/PhotoPicker'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'
import { chosenTopics, isCustom, isMandatory, levelOfTopic, listsFromLevels, mandatoryTopics, myTopics, optionalTopics, topicEmoji } from '../lib/topics'
import { familyOfTopic, familyTone } from '../lib/familyColors'
import { CELEBRATE_KEY } from '../components/ui/Confetti'

// `country` guarda el código de la filial ('fr', 'es'…) o, con «Autre», un texto libre (sede, departamento…)
// En el formulario, `needs` guarda la mesa elegida (1) y `levels` el nivel en cada tema (obligatorios + elegida):
// { [tema]: 'high' | 'medium' | 'low' }. Al guardar se convierten en `offers` / `needs` (ver lib/topics.js).
const EMPTY = { name: '', role: '', country: '', photo: '', offers: [], needs: [], levels: {}, customTopics: [], superpowers: [] }

// Borrador automático: se guarda en este dispositivo y se borra al validar el perfil
const DRAFT_KEY = 'cofinder:draft'
const loadDraft = () => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY))
    if (!d || typeof d !== 'object') return null
    // Borradores de antes del cambio: como mucho 1 tema elegido (sin los obligatorios)
    const levels = d.levels && typeof d.levels === 'object' ? d.levels : {}
    return { ...EMPTY, ...d, levels, country: normalizeBranch(String(d.country ?? '')), needs: chosenTopics(d).slice(0, MAX_INTERESTS), offers: [] }
  } catch { return null }
}
const isEmpty = (f) => !f.name.trim() && !f.role.trim() && !f.country.trim() && !f.photo
  && !f.offers.length && !f.needs.length && !Object.keys(f.levels ?? {}).length && !f.customTopics.length && !f.superpowers.length

/** Si el texto coincide con una filial conocida (en cualquier idioma), guarda su identificador */
const normalizeBranch = (text) => {
  const clean = text.trim()
  const key = clean.toLowerCase()
  const id = COUNTRIES.find((c) => Object.values(DICT).some((d) => d.countries[c]?.toLowerCase() === key))
  return id ?? clean
}

/**
 * Registro «Speed dating de conocimiento», con el estilo del prototipo (cfndr.lovable.app):
 * bienvenida con un único botón y formulario en 6 pasos, cada uno con su barra de progreso:
 *  1. perfil
 *  2. los 4 temas obligatorios (solo informativo: ya están apuntados)
 *  3. nivel en cada uno de los 4 (obligatorio)
 *  4. 1 tema entre los 13, en orden aleatorio para cada persona y con quién lo propone
 *  5. nivel en el tema elegido (obligatorio)
 *  6. arma secreta (facultativa)
 * Al validar se pasa a la pantalla con el código de acceso (la 7.ª).
 */
export function EditProfileView() {
  return <RegisterView mode="edit" />
}

/** Perfil guardado → valores del formulario */
const formFromProfile = (p) => {
  const used = chosenTopics(p).filter(isCustom)
  return {
    ...EMPTY,
    name: p.name ?? '',
    role: p.role ?? '',
    country: normalizeBranch(String(p.country ?? '')),
    photo: p.photo || '',
    offers: [],
    needs: chosenTopics(p).slice(0, MAX_INTERESTS), // solo la elegida; las obligatorias se suman siempre
    levels: Object.fromEntries(myTopics(p).map((id) => [id, levelOfTopic(p, id)]).filter(([, l]) => l)),
    customTopics: [...new Set([...(p.customTopics ?? []), ...used])],
    superpowers: (p.superpowers ?? []).slice(0, MAX_SUPERPOWERS),
  }
}

// Pantallas: 0 = bienvenida, 1 = perfil, 2 = temas obligatorios (informativa), 3 = nivel en los obligatorios,
// 4 = mesa elegida, 5 = nivel en la mesa elegida, 6 = arma secreta
// Pantallas: 1 perfil · 2 temas obligatorios · 3 su nivel · 4 elegir tema · 5 su nivel · 6 arma secreta.
// Sin temas «au choix» (lo normal ahora) no salen la 4 ni la 5; sin obligatorios no salen la 2 ni la 3.
// La gestión de temas «au choix» sigue en el panel #admin: si se añaden, las pantallas 4 y 5 vuelven solas.
const stepsOrder = () => [
  1,
  ...(mandatoryTopics().length ? [2, 3] : []),
  ...(optionalTopics().length ? [4, 5] : []),
  6,
]
const LAST = 6

export default function RegisterView({ mode = 'create' }) {
  const editing = mode === 'edit'
  const { register, navigate, currentUser, updateProfile, eventTopics, eventTopicsLoaded, loadEventTopics } = useApp()
  const { t, country, topic } = useI18n()
  const [form, setForm] = useState(() => (editing && currentUser ? formFromProfile(currentUser) : loadDraft() ?? EMPTY))
  const [restored, setRestored] = useState(() => !editing && !!loadDraft() && !isEmpty(loadDraft()))
  const [screen, setScreen] = useState(editing ? 1 : 0)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(false)

  // Las mesas que han propuesto otras personas se cargan al llegar al paso de las mesas
  useEffect(() => { if (screen <= 4) loadEventTopics() }, [screen, loadEventTopics])
  // Si la moderadora ha quitado una mesa que estaba elegida, deja de contar como elegida
  useEffect(() => {
    if (!eventTopicsLoaded) return
    const valid = new Set(optionalTopics())
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

  const order = stepsOrder()
  const pos = order.indexOf(screen) // posición en el progreso (0 = perfil)
  const goTo = (n) => {
    setScreen(n)
    window.scrollTo({ top: 0 })
  }
  const goNext = () => goTo(order[pos + 1] ?? LAST)
  const goBack = () => goTo(pos > 0 ? order[pos - 1] : 0)

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
    if (screen === 3) {
      const missing = mandatoryTopics().filter((id) => !form.levels[id]).length
      if (missing) er.levels = t('register.errLevels', { n: missing })
    }
    if (screen === 4 && !form.needs.length) er.needs = t('register.errInterests', { max: MAX_INTERESTS })
    if (screen === 5 && form.needs.some((id) => !form.levels[id])) er.levels = t('register.errLevel')
    setErrors(er)
    const first = Object.keys(er)[0]
    if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return !first
  }

  const submit = async (e) => {
    e.preventDefault()
    if (saving || !validate()) return
    if (screen < LAST) return goNext()
    // Nivel de cada tema (obligatorios + elegido) → `offers` / `needs`. Las mesas del panel (`custom:…`) también en `customTopics`
    const chosen = optionalTopics().length ? form.needs.filter((id) => !isMandatory(id)).slice(0, MAX_INTERESTS) : []
    const { levels, ...rest } = form
    const data = {
      ...rest,
      ...listsFromLevels([...mandatoryTopics(), ...chosen], levels),
      customTopics: chosen.filter(isCustom), name: form.name.trim(), role: form.role.trim(), country: normalizeBranch(form.country),
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
    2: { title: t('register.mandatoryTitle', { n: mandatoryTopics().length }), sub: t('register.mandatorySub', { n: mandatoryTopics().length }) },
    3: { title: t('register.levelMandatoryTitle'), sub: t('register.levelMandatorySub') },
    4: { title: t('register.interestsTitle', { max: MAX_INTERESTS }), sub: t('register.interestsSub', { max: MAX_INTERESTS, n: mandatoryTopics().length }) },
    5: { title: t('register.levelChosenTitle'), sub: t('register.levelChosenSub') },
    6: { title: t('register.step3'), sub: t('register.step3Sub') },
  }[screen]

  return (
    <main className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className={`mx-auto flex w-full flex-1 flex-col ${WIDTH}`}>
        {/* Volver + progreso «▬▬▬ 2/4», como en el prototipo */}
        <div className="flex min-h-10 items-center justify-between gap-4">
          {(screen > 1 || !editing) ? (
            <button
              type="button"
              onClick={() => (screen === 1 && editing ? navigate(VIEWS.HOME) : goBack())}
              disabled={saving}
              aria-label={t('register.back')}
              className="-ml-2 grid h-10 w-10 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:text-ink disabled:opacity-50"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : <span />}
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden gap-1 sm:flex" aria-hidden>
              {order.map((_, i) => (
                <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i <= pos ? 'bg-brand' : 'bg-slate-200'}`} />
              ))}
            </div>
            {/* «Étape 3/6 · Votre niveau»: se sabe dónde se está y qué viene */}
            <span key={screen} className="animate-pop-in min-w-0 truncate text-sm font-semibold text-slate-600 lg:text-base">
              <span className="tabular-nums text-brand-dark"><span className="hidden sm:inline">{t('register.stepWord')} </span>{t('register.stepOf', { n: pos + 1, total: order.length })}</span> · {t(`register.stepNames.${screen}`)}
            </span>
            <LangSwitch />
          </div>
        </div>

        <form onSubmit={submit} noValidate className="mt-5 flex flex-1 flex-col">
          <header>
            {editing && screen === 1 && <p className="mb-1 text-sm font-bold uppercase tracking-wider text-brand-dark">{t('register.editKicker')}</p>}
            {/* Ánimo según el paso */}
            {!editing && <p key={screen} className="animate-pop-in mb-1.5 text-sm font-semibold text-brand-dark">{t(`register.cheer${screen}`)}</p>}
            <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink lg:text-5xl">{steps.title}</h1>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 lg:mt-3 lg:text-lg">{steps.sub}</p>
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
                <CountryPicker value={form.country} onChange={(v) => set('country', v)} error={errors.country} />
              </div>
            </div>
          )}

          {/* 2 · Temas obligatorios: solo informativo, ya están apuntados */}
          {screen === 2 && <MandatoryTopics />}

          {/* 3 · Nivel en cada tema obligatorio */}
          {screen === 3 && (
            <div key="levels-mandatory" data-field="levels" className="animate-view-in">
              <LevelPicker topics={mandatoryTopics()} levels={form.levels} onChange={patch} error={errors.levels} />
            </div>
          )}

          {/* 4 · Mesa elegida (1 entre las 13) */}
          {screen === 4 && (
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

          {/* 5 · Nivel en la mesa elegida */}
          {screen === 5 && (
            <div key="levels-chosen" data-field="levels" className="animate-view-in">
              <LevelPicker topics={form.needs} levels={form.levels} onChange={patch} error={errors.levels} />
            </div>
          )}

          {/* 6 · Arma secreta (facultativa, una sola) */}
          {screen === 6 && (
            <div key="power" data-field="superpowers" className="animate-view-in mt-6">
              <SuperpowerPicker value={form.superpowers} onChange={(v) => set('superpowers', v)} person={form} />
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
              <Button type="submit" iconRight={ArrowRight} disabled={saving} className="w-full py-4 text-base lg:py-5 lg:text-xl">
                {saving ? t('register.saving') : screen === 2 ? t('register.continue') : screen === 4 && form.needs.length ? t('register.continueWith', { topic: topic(form.needs[0]) }) : screen < LAST ? t('register.next') : t(editing ? 'register.editSave' : 'register.submit')}
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
  const { t, country } = useI18n()
  const name = form.name.trim()
  const role = form.role.trim()
  const place = country(form.country.trim())
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

/** Paso 2: los temas obligatorios como un programa: tarjetas con el sello «Déjà réservé ✓». Solo para informar. */
function MandatoryTopics() {
  const { t, topic } = useI18n()
  const { eventTopics } = useApp()
  return (
    <div key="mandatory" className="animate-view-in mt-6">
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
        <CalendarDays aria-hidden className="h-4 w-4" /> {t('register.mandatoryList')}
      </p>
      <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:gap-4">
        {mandatoryTopics().map((id, i) => {
          const fromPanel = eventTopics.find((x) => x.id === id)
          const family = familyOfTopic(id, fromPanel?.family)
          const description = isCustom(id) ? fromPanel?.desc ?? '' : t(`topicDesc.${id}`)
          return (
            <li key={id} style={{ animationDelay: `${i * 90}ms` }}
              className="animate-rise-in relative flex flex-col rounded-2xl border-2 border-slate-200 bg-white p-4 lg:p-5">
              <span aria-hidden className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl ${familyTone(family).tile}`}>{topicEmoji(id)}</span>
              <span className="mt-3 block text-lg font-semibold leading-snug text-ink lg:text-xl">{topic(id)}</span>
              {description && <span className="mt-1 block text-[15px] leading-snug text-slate-600 lg:text-base">{description}</span>}
              {/* Sello: ya está reservado para todo el mundo */}
              <span className="absolute right-3 top-3 -rotate-3 rounded-lg border-2 border-mint px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-mint-dark lg:right-4 lg:top-4 lg:text-sm">
                {t('register.mandatoryBadge')} ✓
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-5 flex items-start gap-2.5 rounded-xl bg-accent-soft px-4 py-3 text-[15px] text-ink lg:text-base">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" /> {t('register.mandatoryNext', { max: MAX_INTERESTS })}
      </p>
    </div>
  )
}

// Ancho del formulario: columna de móvil; en PC, una sola columna de hasta 1080 px (casi todos se registran desde el PC).
// Solo el registro: la pantalla del código y el resto de la app vuelven al ancho de móvil
const WIDTH = 'max-w-xl lg:max-w-[1080px]'

/** Bienvenida (a la que llega el email): título, datos del evento y un único botón */
// Bienvenida: como mucho 1024px en PC, para que no se vea tan grande
const LANDING_WIDTH = 'max-w-xl lg:max-w-[1024px]'

function Landing({ resume, onStart }) {
  const { t, formatDate } = useI18n()
  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <header className={`mx-auto flex w-full ${LANDING_WIDTH} items-center justify-between gap-4`}>
        <Logo />
        <LangSwitch />
      </header>

      <main className={`mx-auto flex w-full ${LANDING_WIDTH} flex-1 flex-col justify-center py-10`}>
        <h1 className="text-center font-display text-5xl font-medium leading-[1.05] tracking-tight text-ink sm:text-6xl">{t('register.titleMain')}</h1>
        <p className="mx-auto mt-5 max-w-lg text-center text-lg leading-relaxed text-slate-600">{t('register.subtitle', { rounds: TOTAL_ROUNDS, min: ROUND_MINUTES })}</p>

        {/* Invitación: una entrada de evento con la fecha y el lugar */}
        <div className="animate-rise-in mt-8 flex overflow-hidden rounded-2xl bg-[#FDF4F0] shadow-lg shadow-brand/10 ring-1 ring-brand/15">
          <div className="grid w-28 shrink-0 place-items-center bg-brand px-3 py-5 text-center text-white sm:w-36">
            <span>
              <span className="block text-xs font-bold uppercase tracking-widest text-white/80">{formatDate(EVENT_DATE, { weekday: 'short' })}</span>
              <span className="block font-display text-5xl font-medium leading-none sm:text-6xl">{formatDate(EVENT_DATE, { day: 'numeric' })}</span>
              <span className="block text-sm font-bold uppercase tracking-widest">{formatDate(EVENT_DATE, { month: 'short' })}</span>
            </span>
          </div>
          {/* Borde troquelado, como el de una entrada */}
          <div aria-hidden className="relative w-0 border-l-2 border-dashed border-brand/30">
            <span className="absolute -left-2.5 -top-2.5 h-5 w-5 rounded-full bg-paper" />
            <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 rounded-full bg-paper" />
          </div>
          <div className="min-w-0 flex-1 p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">{t('register.ticketKicker')}</p>
            <p className="mt-1 font-display text-xl font-medium leading-tight text-ink sm:text-2xl">{formatDate(EVENT_DATE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="mt-2 flex items-center gap-2 text-[15px] text-slate-600 sm:text-base"><MapPin className="h-4 w-4 shrink-0 text-brand" /> {EVENT_PLACE || t('register.placeTbc')}</p>
          </div>
        </div>

        <Button type="button" onClick={onStart} iconRight={ArrowRight} className="mt-8 w-full py-4 text-base lg:py-5 lg:text-xl">
          {t(resume ? 'register.landingResume' : 'register.landingCta')}
        </Button>
        <p className="mt-3 text-center text-sm text-slate-500">{t(resume ? 'register.landingNote' : 'register.landingHow', { n: stepsOrder().length, min: stepsOrder().length > 4 ? 3 : 2 })}</p>
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

import { useState } from 'react'
import { ArrowRight, KeyRound, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { VIEWS } from '../constants'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'
import Field from '../components/ui/Field'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'

/**
 * Entrar desde el móvil el día del evento (se llega escaneando el QR del proyector, …/#entrar):
 * usuario = tu nombre, contraseña = tu código de 4 cifras (lo ves en tu perfil y lo tiene la moderadora).
 * Después, el móvil sigue solo: espera → tu mesa con tus compañeros → cuenta atrás.
 */
export default function LoginView() {
  const { login, navigate } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    if (name.trim().length < 2 || code.length !== 4) return setError('incomplete')
    setBusy(true)
    const res = await login(name, code)
    setBusy(false)
    if (res !== 'ok') setError(res)
  }

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col justify-center py-10">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-dark">{t('login.kicker')}</p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight tracking-tight text-ink">{t('login.title')}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{t('login.sub')}</p>

          <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
            <Field
              label={t('login.name')} name="login-name" icon={UserRound} placeholder={t('login.namePh')}
              autoComplete="name" autoCapitalize="words" value={name}
              onChange={(e) => { setName(e.target.value); setError(null) }}
            />
            <Field
              label={t('login.code')} name="login-code" icon={KeyRound} placeholder="0000"
              inputMode="numeric" pattern="[0-9]*" maxLength={4} autoComplete="one-time-code" value={code}
              onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(null) }}
            />
            {error && <p role="alert" className="rounded-xl bg-brand-soft px-3.5 py-3 text-sm font-semibold text-brand-dark">{t(`login.err.${error}`)}</p>}
            <Button type="submit" disabled={busy} iconRight={ArrowRight} className="w-full py-4 text-base">
              {busy ? t('login.busy') : t('login.submit')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">{t('login.where')}</p>
          <button type="button" onClick={() => navigate(VIEWS.REGISTER)} className="mt-3 text-center text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
            {t('login.notRegistered')}
          </button>
        </main>

        <PublicFooter className="!py-3" />
      </div>
    </div>
  )
}

import { KeyRound, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { VIEWS } from '../constants'
import Logo from '../components/ui/Logo'
import LangSwitch from '../components/ui/LangSwitch'
import Button from '../components/ui/Button'

/**
 * La sesión ya empezó y esta persona no está en ninguna mesa: casi siempre porque se volvió a
 * registrar el mismo día (cuenta duplicada) después de preparar las mesas. En vez de dejarla en su
 * perfil esperando, le decimos que entre con su código de siempre o que vaya a ver a la organización.
 */
export default function NoTableView() {
  const { currentUser, forgetMe, navigate } = useApp()
  const { t } = useI18n()
  const toLogin = () => { forgetMe(); navigate(VIEWS.LOGIN) }
  return (
    <div className="guest-scale vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>
        <main className="flex flex-1 flex-col justify-center pb-10 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-brand-soft">
            <Users aria-hidden className="h-8 w-8 text-brand-dark" />
          </div>
          <h1 className="font-display text-3xl font-medium leading-tight tracking-tight text-ink">
            {t('noTable.title', { name: currentUser?.name?.split(' ')[0] ?? '' })}
          </h1>
          <p className="mx-auto mt-3 max-w-[44ch] text-[17px] leading-relaxed text-slate-600 [text-wrap:pretty]">{t('noTable.sub')}</p>
          <Button onClick={toLogin} icon={KeyRound} className="mx-auto mt-7 min-h-12 w-full max-w-sm text-base">
            {t('noTable.login')}
          </Button>
          <p className="mx-auto mt-5 max-w-[44ch] text-base text-slate-600">{t('noTable.ask')}</p>
        </main>
      </div>
    </div>
  )
}

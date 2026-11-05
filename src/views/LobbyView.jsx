import { useEffect, useState } from 'react'
import { CheckCircle2, UserRound, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import { useConnectedCount } from '../lib/useConnected'
import Logo from '../components/ui/Logo'
import Avatar from '../components/ui/Avatar'
import LangSwitch from '../components/ui/LangSwitch'
import PublicFooter from '../components/layout/PublicFooter'

const PHRASE_MS = 4500

/**
 * Sala de espera del móvil el día del evento: la persona ya está conectada y espera a que el admin
 * empiece la ronda 1. Frases con humor que van cambiando solas. En cuanto empieza la ronda y se anuncia
 * su mesa, el móvil pasa solo a la tarjeta de mesa (HomeView).
 */
export default function LobbyView({ onProfile }) {
  const { currentUser } = useApp()
  const { t } = useI18n()
  const phrases = t('lobby.phrases')
  const list = Array.isArray(phrases) ? phrases : [phrases]
  const [i, setI] = useState(() => Math.floor(Math.random() * list.length))
  const connected = useConnectedCount()

  useEffect(() => {
    const timer = setInterval(() => setI((k) => (k + 1) % list.length), PHRASE_MS)
    return () => clearInterval(timer)
  }, [list.length])

  if (!currentUser) return null
  const first = currentUser.name.split(' ')[0]

  return (
    <div className="vip-glow flex min-h-dvh flex-col px-5 pt-5 sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-4">
          <Logo />
          <LangSwitch />
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="animate-pop-in inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-3 py-1.5 text-sm font-semibold text-mint-dark">
            <CheckCircle2 className="h-4 w-4" /> {t('lobby.connected')}
          </span>

          <div className="relative mt-8 grid h-44 w-44 place-items-center">
            <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-brand/15 [animation-duration:2.4s]" />
            <span aria-hidden className="absolute inset-3 rounded-full border-[6px] border-brand/80 bg-white shadow-lg shadow-brand/10" />
            <Avatar name={currentUser.name} photo={currentUser.photo} size="xl" className="relative !rounded-full" />
          </div>

          <h1 className="mt-8 font-display text-4xl font-medium tracking-tight text-ink">{t('lobby.hello', { name: first })}</h1>
          <p className="mt-2 text-[15px] text-slate-600">{t('lobby.sub')}</p>

          {/* Frase que va cambiando */}
          <div className="mt-8 flex min-h-24 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p key={i} aria-live="polite" className="animate-view-in text-lg font-semibold leading-snug text-ink">
              {list[i]}
              <span aria-hidden className="ml-1 inline-flex gap-0.5 align-middle">
                {[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: `${d * 150}ms` }} />)}
              </span>
            </p>
          </div>

          {connected > 0 && (
            <p className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-500">
              <Users className="h-4 w-4 text-brand" /> {t(connected === 1 ? 'lobby.onlyYou' : 'lobby.count', { n: connected })}
            </p>
          )}

          <button type="button" onClick={onProfile} className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-dark underline-offset-4 hover:underline">
            <UserRound className="h-4 w-4" /> {t('lobby.profile')}
          </button>
        </main>

        <PublicFooter className="!py-3" />
      </div>
    </div>
  )
}

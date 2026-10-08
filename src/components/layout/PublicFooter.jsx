import { Lock } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { useI18n } from '../../context/I18nContext'

/**
 * Pie de las vistas públicas. El candado es el acceso discreto al panel de
 * moderadora: casi invisible, sin texto, y además pide PIN.
 */
export default function PublicFooter({ className = '', children }) {
  const { openGate } = useApp()
  const { t } = useI18n()
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-6 text-xs text-slate-400 ${className}`}>
      {children && <>{children}<span aria-hidden>·</span></>}
      <span>© {new Date().getFullYear()} Cofinder</span>
      <button
        type="button"
        onClick={openGate}
        aria-label={t('footer.orgAccess')}
        className="rounded p-1 opacity-25 transition hover:opacity-70 focus-visible:opacity-70 focus-visible:outline-none"
      >
        <Lock className="h-3 w-3" />
      </button>
    </footer>
  )
}

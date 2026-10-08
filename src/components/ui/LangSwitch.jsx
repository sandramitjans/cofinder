import { Languages } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { LANGS } from '../../constants'

/** Selector FR / EN segmentado, accesible por teclado */
export default function LangSwitch({ dark = false, className = '' }) {
  const { lang, setLang, t } = useI18n()
  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex items-center gap-1 rounded-full p-1 text-sm font-bold ${dark ? 'bg-white/10' : 'bg-white ring-1 ring-slate-200'} ${className}`}
    >
      <Languages className={`ml-1.5 h-3.5 w-3.5 ${dark ? 'text-white/60' : 'text-slate-400'}`} aria-hidden />
      {LANGS.map((l) => {
        const active = l === lang
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            lang={l}
            title={t(`lang.${l}`)}
            className={`min-h-9 rounded-full px-3.5 py-1.5 uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              active
                ? 'bg-brand text-white shadow-sm'
                : dark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

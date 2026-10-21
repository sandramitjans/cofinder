import { useI18n } from '../../context/I18nContext'

const STYLES = {
  expert: 'bg-brand-soft text-brand-dark',
  learner: 'bg-accent-soft text-slate-800',
  both: 'bg-slate-900 text-white',
  curious: 'bg-slate-100 text-slate-500',
}

const SIZES = { sm: 'px-2.5 py-1 text-[11px]', lg: 'px-3.5 py-1.5 text-base' }

export default function RoleBadge({ role, size = 'sm', className = '' }) {
  const { t } = useI18n()
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full font-semibold ${SIZES[size]} ${STYLES[role]} ${className}`}>
      {t(`roles.${role}`)}
    </span>
  )
}

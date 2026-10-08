import { useI18n } from '../../context/I18nContext'

const STYLES = {
  expert: 'bg-brand-soft text-brand',
  learner: 'bg-accent-soft text-slate-800',
  both: 'bg-slate-900 text-white',
  curious: 'bg-slate-100 text-slate-500',
}

export default function RoleBadge({ role, className = '' }) {
  const { t } = useI18n()
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STYLES[role]} ${className}`}>
      {t(`roles.${role}`)}
    </span>
  )
}

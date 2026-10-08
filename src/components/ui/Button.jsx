const VARIANTS = {
  primary: 'bg-brand text-white hover:bg-brand-dark focus-visible:ring-brand/40 shadow-sm shadow-brand/20',
  accent: 'bg-accent text-slate-900 hover:brightness-95 focus-visible:ring-accent/50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300',
  outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus-visible:ring-slate-300',
}

export default function Button({ variant = 'primary', icon: Icon, iconRight: IconRight, className = '', children, ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
      {IconRight && <IconRight className="h-4 w-4" />}
    </button>
  )
}

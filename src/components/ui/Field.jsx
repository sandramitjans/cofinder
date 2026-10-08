// Campo de formulario con icono, etiqueta y mensaje de error
export default function Field({ label, icon: Icon, error, as = 'input', children, ...props }) {
  const Control = as
  const id = props.id ?? props.name
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
        <Control
          id={id}
          aria-invalid={!!error}
          className={`w-full appearance-none rounded-xl border bg-white py-3 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-4 ${Icon ? 'pl-10' : 'pl-4'} ${
            error ? 'border-brand focus:ring-brand/15' : 'border-slate-200 focus:border-brand focus:ring-brand/15'
          }`}
          {...props}
        >
          {children}
        </Control>
        {as === 'select' && (
          <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        )}
      </div>
      {error && <p className="text-xs font-medium text-brand">{error}</p>}
    </div>
  )
}

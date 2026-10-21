// Campo de formulario con icono, etiqueta y mensaje de error
export default function Field({ label, icon: Icon, error, as = 'input', children, ...props }) {
  const Control = as
  const id = props.id ?? props.name
  return (
    <div className="space-y-2 lg:space-y-2.5">
      <label htmlFor={id} className="block text-[15px] font-semibold text-slate-800 lg:text-base">{label}</label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 lg:left-4 lg:h-6 lg:w-6" />}
        <Control
          id={id}
          aria-invalid={!!error}
          className={`w-full appearance-none rounded-xl border bg-white py-3.5 pr-4 text-base text-slate-900 placeholder:text-slate-500 transition focus:outline-none focus:ring-4 lg:py-4 lg:text-lg ${Icon ? 'pl-11 lg:pl-13' : 'pl-4'} ${
            error ? 'border-accent focus:ring-accent/20' : 'border-slate-300 focus:border-brand focus:ring-brand/15'
          }`}
          {...props}
        >
          {children}
        </Control>
        {as === 'select' && (
          <svg className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
        )}
      </div>
      {error && <p role="alert" className="text-sm font-semibold text-accent-dark lg:text-[15px]">{error}</p>}
    </div>
  )
}

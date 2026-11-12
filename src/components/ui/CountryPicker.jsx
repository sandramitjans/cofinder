import { useEffect, useRef, useState } from 'react'
import { Check, PenLine } from 'lucide-react'
import { COUNTRIES } from '../../constants'
import { useI18n } from '../../context/I18nContext'

/**
 * Selector de filial: una pastilla por país del grupo (botones de opción reales, así funciona
 * con teclado y lector de pantalla) y «Autre» para quien no es de una filial (sede, departamento…),
 * que abre un campo de texto libre. `value` es el código del país ('fr') o el texto escrito.
 */
export default function CountryPicker({ value, onChange, error }) {
  const { t, country } = useI18n()
  const isCountry = COUNTRIES.includes(value)
  const [other, setOther] = useState(!!value && !isCountry)
  const otherRef = useRef(null)
  const otherOn = other && !isCountry
  const skipFocus = useRef(true)

  // Al elegir «Autre» el cursor va directamente al campo de texto
  useEffect(() => {
    if (skipFocus.current) { skipFocus.current = false; return }
    if (otherOn) otherRef.current?.focus()
  }, [otherOn])

  const pill = (selected) => `relative inline-flex cursor-pointer select-none items-center gap-2 rounded-full border-2 py-2.5 pl-2.5 pr-4 text-[15px] font-semibold transition lg:py-3 lg:text-base
    has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand/25 ${
    selected ? 'border-brand bg-brand text-white shadow-md shadow-brand/20' : `bg-white text-slate-800 hover:border-brand hover:bg-brand/5 ${error ? 'border-brand' : 'border-slate-400'}`
  }`
  const badge = (selected) => `grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-xs font-bold tracking-wide ${selected ? 'bg-white text-brand-dark' : 'bg-paper text-slate-700'}`

  return (
    <fieldset className="space-y-2 lg:space-y-2.5" aria-invalid={!!error} aria-describedby={error ? 'country-error' : 'country-hint'}>
      <legend className="block text-[15px] font-semibold text-slate-800 lg:text-base">{t('register.country')}</legend>
      <p id="country-hint" className="text-sm text-slate-500">{t('register.countryHint')}</p>
      <div className="flex flex-wrap gap-2 pt-1 lg:gap-2.5">
        {COUNTRIES.map((c) => {
          const selected = value === c
          return (
            <label key={c} className={pill(selected)}>
              <input type="radio" name="country" value={c} checked={selected} onChange={() => { setOther(false); onChange(c) }} className="sr-only" />
              <span aria-hidden className={badge(selected)}>{selected ? <Check className="h-4 w-4" strokeWidth={3} /> : c.toUpperCase()}</span>
              {country(c)}
            </label>
          )
        })}
        <label className={pill(otherOn)}>
          <input type="radio" name="country" value="other" checked={otherOn} onChange={() => { setOther(true); onChange('') }} className="sr-only" />
          <span aria-hidden className={badge(otherOn)}>{otherOn ? <Check className="h-4 w-4" strokeWidth={3} /> : <PenLine className="h-3.5 w-3.5" />}</span>
          {t('register.countryOther')}
        </label>
      </div>
      {otherOn && (
        <div className="animate-view-in pt-1">
          <label htmlFor="country-other" className="sr-only">{t('register.countryOtherLabel')}</label>
          <input
            ref={otherRef} id="country-other" type="text" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={t('register.countryPh')} aria-invalid={!!error}
            className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-500 transition focus:outline-none focus:ring-4 lg:py-4 lg:text-lg ${
              error ? 'border-brand focus:ring-brand/20' : 'border-slate-400 focus:border-brand focus:ring-brand/15'
            }`}
          />
        </div>
      )}
      {error && <p id="country-error" role="alert" className="text-sm font-semibold text-brand-dark lg:text-[15px]">{error}</p>}
    </fieldset>
  )
}

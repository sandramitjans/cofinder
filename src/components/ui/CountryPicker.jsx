import { useEffect, useRef, useState } from 'react'
import { Building2, Check, ChevronDown, PenLine } from 'lucide-react'
import { COUNTRIES } from '../../constants'
import { useI18n } from '../../context/I18nContext'

const OTHER = '__other'

/**
 * Selector de filial: un campo que, al pulsarlo, despliega la lista con todos los países del grupo
 * y «Autre» (sede, departamento…), que abre un campo de texto libre. Ocupa lo mismo que un campo normal.
 * Patrón «listbox» accesible: flechas, Inicio/Fin, Intro, Escape y la inicial del país.
 * `value` es el código del país ('fr') o el texto escrito con «Autre».
 */
export default function CountryPicker({ value, onChange, error }) {
  const { t, country } = useI18n()
  const isCountry = COUNTRIES.includes(value)
  const [other, setOther] = useState(!!value && !isCountry)
  const otherOn = other && !isCountry
  const options = [...COUNTRIES, OTHER]
  const selected = isCountry ? value : otherOn ? OTHER : null

  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const listRef = useRef(null)
  const otherRef = useRef(null)
  const focusOther = useRef(false)

  const label = (id) => (id === OTHER ? t('register.countryOther') : country(id))

  const openList = () => {
    setActive(Math.max(0, options.indexOf(selected)))
    setOpen(true)
  }
  const choose = (id) => {
    setOpen(false)
    if (id === OTHER) {
      if (!otherOn) { setOther(true); onChange('') }
      focusOther.current = true
    } else {
      setOther(false); onChange(id)
      buttonRef.current?.focus()
    }
  }

  // Al abrir, la lista entera queda a la vista: sin scroll dentro de la lista
  useEffect(() => {
    if (!open) return
    listRef.current?.focus({ preventScroll: true })
    listRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [open])
  useEffect(() => {
    if (focusOther.current && otherOn) { focusOther.current = false; otherRef.current?.focus() }
  })
  useEffect(() => {
    if (!open) return
    const close = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  const onListKey = (e) => {
    const last = options.length - 1
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(last, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(0) }
    else if (e.key === 'End') { e.preventDefault(); setActive(last) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]) }
    else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); setOpen(false); if (e.key === 'Escape') buttonRef.current?.focus() }
    else if (e.key.length === 1) {
      const k = e.key.toLowerCase()
      const i = options.findIndex((id, n) => n > active && label(id).toLowerCase().startsWith(k))
      const j = i >= 0 ? i : options.findIndex((id) => label(id).toLowerCase().startsWith(k))
      if (j >= 0) setActive(j)
    }
  }

  const border = error ? 'border-brand focus:ring-brand/20' : 'border-slate-400 focus:border-brand focus:ring-brand/15'

  return (
    <div ref={rootRef} className="space-y-2 lg:space-y-2.5">
      <label id="country-label" htmlFor="country" className="block text-[15px] font-semibold text-slate-800 lg:text-base">{t('register.country')}</label>
      <div className="relative">
        <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 lg:left-4 lg:h-6 lg:w-6" />
        <button
          ref={buttonRef} id="country" type="button"
          aria-haspopup="listbox" aria-expanded={open} aria-controls="country-list" aria-invalid={!!error}
          aria-labelledby="country-label country"
          onClick={() => (open ? setOpen(false) : openList())}
          onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openList() } }}
          className={`flex w-full items-center rounded-xl border bg-white py-3.5 pl-11 pr-11 text-left text-base transition focus:outline-none focus:ring-4 lg:py-4 lg:pl-13 lg:text-lg ${border} ${open ? 'border-brand ring-4 ring-brand/15' : ''}`}
        >
          <span className={`truncate ${selected ? 'text-slate-900' : 'text-slate-500'}`}>{selected ? label(selected) : t('register.countryChoose')}</span>
        </button>
        <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />

        {open && (
          <ul
            ref={listRef} id="country-list" role="listbox" tabIndex={-1} aria-labelledby="country-label"
            aria-activedescendant={`country-opt-${options[active]}`} onKeyDown={onListKey}
            className="animate-view-in absolute inset-x-0 top-full z-30 mt-2 rounded-2xl border border-slate-300 bg-white p-1.5 shadow-xl shadow-ink/10 focus:outline-none"
          >
            {options.map((id, i) => {
              const isSel = id === selected
              const isAct = i === active
              return (
                <li
                  key={id} id={`country-opt-${id}`} data-i={i} role="option" aria-selected={isSel}
                  onPointerMove={() => setActive(i)} onClick={() => choose(id)}
                  className={`flex cursor-pointer select-none items-center gap-3 rounded-xl px-3 py-2 text-base lg:py-2.5 lg:text-[17px] ${
                    id === OTHER ? 'mt-1 border-t border-slate-200' : ''} ${isSel ? 'font-semibold text-brand-dark' : 'text-slate-800'} ${isAct ? 'bg-brand/8' : ''}`}
                >
                  <span aria-hidden className={`grid h-7 w-7 shrink-0 lg:h-8 lg:w-8 place-items-center rounded-full text-xs font-bold tracking-wide ${isSel ? 'bg-brand text-white' : 'bg-paper text-slate-700'}`}>
                    {isSel ? <Check className="h-4 w-4" strokeWidth={3} /> : id === OTHER ? <PenLine className="h-3.5 w-3.5" /> : id.toUpperCase()}
                  </span>
                  <span className="flex-1">{label(id)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {otherOn && (
        <div className="animate-view-in">
          <label htmlFor="country-other" className="sr-only">{t('register.countryOtherLabel')}</label>
          <input
            ref={otherRef} id="country-other" type="text" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)}
            placeholder={t('register.countryPh')} aria-invalid={!!error}
            className={`w-full rounded-xl border bg-white px-4 py-3.5 text-base text-slate-900 placeholder:text-slate-500 transition focus:outline-none focus:ring-4 lg:py-4 lg:text-lg ${border}`}
          />
        </div>
      )}
      {error && <p role="alert" className="text-sm font-semibold text-brand-dark lg:text-[15px]">{error}</p>}
    </div>
  )
}

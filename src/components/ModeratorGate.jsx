import { useEffect, useRef, useState } from 'react'
import { KeyRound, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../context/I18nContext'
import Button from './ui/Button'

/** Modal de PIN para desbloquear el panel de moderadora */
export default function ModeratorGate() {
  const { gateOpen, closeGate, unlockModerator } = useApp()
  const { t } = useI18n()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!gateOpen) return
    setPin('')
    setError(false)
    setTimeout(() => inputRef.current?.focus(), 50)
    const onKey = (e) => e.key === 'Escape' && closeGate()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gateOpen, closeGate])

  if (!gateOpen) return null

  const submit = (e) => {
    e.preventDefault()
    if (!unlockModerator(pin)) {
      setError(true)
      setPin('')
      inputRef.current?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm animate-view-in" onClick={closeGate}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-xs rounded-2xl bg-white p-6 text-center shadow-2xl ${error ? 'animate-shake' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gate-title"
      >
        <button type="button" onClick={closeGate} className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label={t('gate.close')}>
          <X className="h-4 w-4" />
        </button>
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent-soft">
          <KeyRound className="h-5 w-5 text-ink" />
        </div>
        <h2 id="gate-title" className="mt-4 text-lg font-bold">{t('gate.title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('gate.text')}</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          value={pin}
          onChange={(e) => { setPin(e.target.value); setError(false) }}
          className={`mt-5 w-full rounded-xl border py-3 text-center font-mono text-2xl tracking-[0.5em] focus:outline-none focus:ring-4 ${
            error ? 'border-brand ring-4 ring-brand/15' : 'border-slate-200 focus:border-brand focus:ring-brand/15'
          }`}
          aria-invalid={error}
          aria-label={t('gate.pin')}
        />
        <p className={`mt-2 h-4 text-xs font-medium text-brand ${error ? '' : 'invisible'}`}>{t('gate.wrong')}</p>
        <Button type="submit" className="mt-3 w-full" disabled={!pin}>{t('gate.enter')}</Button>
      </form>
    </div>
  )
}

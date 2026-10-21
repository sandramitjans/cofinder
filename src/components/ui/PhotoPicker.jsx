import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { photoToDataUrl } from '../../lib/image'
import { initialsOf } from './Avatar'

/**
 * Foto de perfil opcional, en un cuadrado grande. En el móvil, el selector ofrece cámara o galería.
 * La imagen se recorta en cuadrado y se comprime antes de guardarla.
 */
export default function PhotoPicker({ value, name, onChange }) {
  const { t } = useI18n()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const pick = () => input.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setBusy(true)
    setError(false)
    try {
      onChange(await photoToDataUrl(file))
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-center">
      {/* Foto cuadrada grande (o iniciales); toda la superficie abre el selector */}
      <button
        type="button"
        onClick={pick}
        className="group relative mx-auto block aspect-square w-full max-w-72 overflow-hidden lg:max-w-none rounded-3xl bg-gradient-to-br from-[#FF6A3D] via-[#C8290F] to-[#2A0905] shadow-lg shadow-brand/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
        aria-label={value ? t('register.photoChange') : t('register.photoAdd')}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center text-on-color font-display text-7xl font-medium opacity-95 lg:text-8xl">
            {initialsOf(name)}
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent text-on-color pb-4 pt-10 text-[15px] font-semibold lg:pb-5 lg:text-base">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {value ? t('register.photoChange') : t('register.photoAdd')}
        </span>
      </button>

      {value && (
        <button type="button" onClick={() => onChange('')} className="mt-3 inline-flex items-center gap-1 text-[15px] font-medium text-slate-600 hover:text-slate-900">
          <Trash2 className="h-4 w-4" /> {t('register.photoRemove')}
        </button>
      )}
      <p className={`mt-3 text-sm lg:text-[15px] ${error ? 'font-semibold text-accent-dark' : 'text-slate-600'}`}>
        {error ? t('register.photoError') : t('register.photoHint')}
      </p>

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
    </div>
  )
}

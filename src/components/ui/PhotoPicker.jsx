import { useRef, useState } from 'react'
import { Camera, Loader2, Pencil, Trash2 } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { photoToDataUrl } from '../../lib/image'
import { initialsOf } from './Avatar'

/**
 * Foto de perfil opcional, en un círculo. En el móvil, el selector ofrece cámara o galería.
 * La imagen se recorta en cuadrado y se comprime antes de guardarla.
 */
export default function PhotoPicker({ value, name, onChange, compact = false }) {
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
      {/* Círculo con borde discontinuo (o la foto); el lápiz rojo indica que se puede cambiar */}
      <button
        type="button"
        onClick={pick}
        className={`group relative mx-auto block focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 ${compact ? 'h-20 w-20 rounded-2xl' : 'h-28 w-28 rounded-full lg:h-36 lg:w-36'}`}
        aria-label={value ? t('register.photoChange') : t('register.photoAdd')}
      >
        <span className={`absolute inset-0 grid place-items-center overflow-hidden border-2 transition group-hover:border-brand ${compact ? `rounded-2xl ${name?.trim() && !value ? 'border-transparent bg-fam-acquisition' : 'border-dashed border-slate-300 bg-white'}` : 'rounded-full border-dashed border-slate-300 bg-white'}`}>
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : busy ? (
            <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          ) : name?.trim() ? (
            <span aria-hidden className={`font-display font-medium ${compact ? 'text-2xl text-fam-acquisition-ink' : 'text-4xl text-slate-400'}`}>{initialsOf(name)}</span>
          ) : (
            <Camera className="h-7 w-7 text-slate-400" />
          )}
        </span>
        <span aria-hidden className={`absolute grid place-items-center rounded-full bg-brand text-white shadow-md ring-2 ring-white ${compact ? '-bottom-1.5 -right-1.5 h-7 w-7' : 'bottom-1 right-1 h-8 w-8'}`}>
          <Pencil className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </span>
      </button>
      <p className={compact ? 'mt-2.5 text-xs text-slate-500' : 'mt-2 text-sm text-slate-500'}>{value ? t('register.photoChange') : t(compact ? 'register.photoAddShort' : 'register.photoAdd')}</p>

      {value && (
        <button type="button" onClick={() => onChange('')} className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
          <Trash2 className="h-4 w-4" /> {t('register.photoRemove')}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-brand-dark">{t('register.photoError')}</p>}

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
    </div>
  )
}

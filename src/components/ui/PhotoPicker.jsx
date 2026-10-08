import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2 } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { photoToDataUrl } from '../../lib/image'
import Avatar from './Avatar'

/**
 * Foto de perfil opcional. En el móvil, el selector ofrece cámara o galería.
 * La imagen se recorta en cuadrado y se comprime antes de guardarla.
 */
export default function PhotoPicker({ value, name, subtitle, onChange }) {
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
    <div className="rounded-2xl bg-gradient-to-r from-brand-soft to-accent-soft/60 p-4">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={pick}
          className="group relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
          aria-label={value ? t('register.photoChange') : t('register.photoAdd')}
        >
          <Avatar name={name || '?'} photo={value} size="xl" />
          <span className="absolute -bottom-1.5 -right-1.5 grid h-9 w-9 place-items-center rounded-full bg-brand text-white shadow-md ring-2 ring-white transition group-hover:scale-105">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-ink">{name || t('register.previewName')}</p>
          <p className="truncate text-[15px] text-slate-700">{subtitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <button type="button" onClick={pick} className="text-[15px] font-semibold text-brand underline-offset-4 hover:underline">
              {value ? t('register.photoChange') : t('register.photoAdd')}
            </button>
            {value && (
              <button type="button" onClick={() => onChange('')} className="inline-flex items-center gap-1 text-[15px] font-medium text-slate-600 hover:text-slate-900">
                <Trash2 className="h-4 w-4" /> {t('register.photoRemove')}
              </button>
            )}
          </div>
        </div>
      </div>

      <p className={`mt-3 text-sm ${error ? 'font-semibold text-brand' : 'text-slate-600'}`}>
        {error ? t('register.photoError') : t('register.photoHint')}
      </p>

      <input ref={input} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={onFile} />
    </div>
  )
}

import { Camera, Heart, MapPin } from 'lucide-react'
import { useI18n } from '../../context/I18nContext'
import { initialsOf } from './Avatar'
import { SuperpowerChips } from './SuperpowerPicker'

/**
 * Tarjeta VIP con estilo de ficha de app de citas:
 * foto grande (o iniciales), nombre sobre la imagen, «Match ready» como indicador de conexión
 * y, debajo, los temas en etiquetas. `animated` la hace entrar girando con un reflejo.
 */
export default function VipCard({
  name, role, branch, photo, offers = [], needs = [], superpowers = [], animated = false, className = '',
  photoClassName = 'aspect-[4/5]', // alto de la foto (más baja en la pantalla de espera móvil)
  onAddPhoto, // si no hay foto: la zona de iniciales se vuelve un botón «Ajouter une photo»
}) {
  const { t } = useI18n()
  const hasDetails = offers.length > 0 || needs.length > 0 || superpowers.length > 0

  return (
    <article
      className={`relative w-full overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand/20 ring-1 ring-slate-200 ${animated ? 'animate-card-flip' : ''} ${className}`}
      aria-label={name}
    >
      {/* Foto (o iniciales) a sangre */}
      <div className={`relative w-full overflow-hidden bg-gradient-to-br from-brand via-[#c1003a] to-[#6e0021] ${photoClassName}`}>
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            <Heart aria-hidden className="absolute -right-10 -top-6 h-56 w-56 rotate-12 fill-white/10 text-transparent" />
            <Heart aria-hidden className="absolute -bottom-8 -left-12 h-44 w-44 -rotate-12 fill-accent/20 text-transparent" />
            {!onAddPhoto && (
              <span aria-hidden className="absolute inset-0 grid place-items-center pb-20 font-display text-6xl font-bold italic text-white/95 sm:pb-24 sm:text-8xl">
                {initialsOf(name)}
              </span>
            )}
            {onAddPhoto && (
              <button
                type="button"
                onClick={onAddPhoto}
                className="absolute left-4 top-[42%] z-10 inline-flex -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2.5 text-[15px] font-bold text-brand shadow-lg transition hover:scale-105"
              >
                <Camera className="h-4 w-4" /> {t('register.photoAdd')}
              </button>
            )}
          </>
        )}

        {/* Degradado para leer el nombre sobre la foto */}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
        {animated && (
          <div aria-hidden className="animate-shine pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        )}

        {/* Cabecera: marca + VIP */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
          <span className="flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-sm font-extrabold tracking-tight text-ink shadow-sm backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
            <span>co<span className="text-brand">finder</span></span>
          </span>
          <span className="rounded-full bg-accent px-3 py-1 font-display text-sm font-bold italic text-ink shadow-sm">{t('match.pass')}</span>
        </div>

        {/* Nombre, cargo y filial sobre la imagen */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          {!animated && (
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgb(52_211_153/0.3)]" /> {t('match.ready')}
            </span>
          )}
          <p className="font-display text-3xl font-bold leading-tight drop-shadow-sm">{name || '—'}</p>
          {role && <p className="mt-1 text-base font-medium text-white/90">{role}</p>}
          {branch && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-white/80">
              <MapPin className="h-3.5 w-3.5" /> {branch}
            </p>
          )}
        </div>
      </div>

      {/* Temas como etiquetas */}
      {hasDetails && (
        <div className="space-y-2.5 p-4 lg:space-y-3 lg:p-5">
          <TagGroup title={t('waiting.masters')} tags={offers} className="bg-brand-soft text-brand" />
          <TagGroup title={t('waiting.explores')} tags={needs} className="bg-accent-soft text-slate-800" />
          {superpowers.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('waiting.superpowers')}</p>
              <SuperpowerChips ids={superpowers} className="mt-1.5" />
            </div>
          )}
        </div>
      )}
    </article>
  )
}

function TagGroup({ title, tags, className }) {
  if (!tags.length) return null
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((x) => <span key={x} className={`rounded-full px-3 py-1 text-sm font-semibold ${className}`}>{x}</span>)}
      </div>
    </div>
  )
}

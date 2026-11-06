// Identificación visual: foto de perfil si existe; si no, iniciales con la paleta corporativa
export const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

const VARIANTS = [
  'bg-fam-acquisition text-fam-acquisition-ink',
  'bg-fam-brand text-fam-brand-ink',
  'bg-fam-customer text-fam-customer-ink',
  'bg-fam-data text-fam-data-ink',
  'bg-fam-business text-fam-business-ink',
]

const variantFor = (seed = '') =>
  VARIANTS[[...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0) % VARIANTS.length]

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-xl',
  xl: 'h-24 w-24 text-3xl',
}

// `tone` fija el color de fondo (si no, sale del nombre y cambia mientras se escribe)
export default function Avatar({ name, photo, size = 'md', tone, className = '' }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name || ''}
        className={`${SIZES[size]} shrink-0 rounded-xl object-cover ring-2 ring-white ${className}`}
      />
    )
  }
  return (
    <div aria-hidden className={`${SIZES[size]} ${tone ?? variantFor(name)} grid shrink-0 place-items-center rounded-xl font-bold ring-2 ring-white ${className}`}>
      {initialsOf(name)}
    </div>
  )
}

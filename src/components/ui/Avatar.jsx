// Identificación visual por iniciales con la paleta corporativa
export const initialsOf = (name = '') =>
  name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?'

const VARIANTS = [
  'bg-brand text-white',
  'bg-accent text-slate-900',
  'bg-slate-900 text-white',
  'bg-brand-soft text-brand',
]

const variantFor = (seed = '') =>
  VARIANTS[[...seed].reduce((acc, c) => acc + c.charCodeAt(0), 0) % VARIANTS.length]

export default function Avatar({ name, size = 'md', className = '' }) {
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-xl' }
  return (
    <div className={`${sizes[size]} ${variantFor(name)} grid shrink-0 place-items-center rounded-xl font-bold ring-2 ring-white ${className}`}>
      {initialsOf(name)}
    </div>
  )
}

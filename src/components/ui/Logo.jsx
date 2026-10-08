import { Sparkles } from 'lucide-react'

export default function Logo({ size = 'md', inverted = false }) {
  const box = size === 'lg' ? 'h-12 w-12' : 'h-9 w-9'
  const text = size === 'lg' ? 'text-3xl' : 'text-xl'
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${box} relative grid place-items-center rounded-xl shadow-sm ${inverted ? 'bg-white' : 'bg-brand'}`}>
        <Sparkles className={`h-1/2 w-1/2 ${inverted ? 'text-brand' : 'text-white'}`} strokeWidth={2.25} />
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-accent" />
      </div>
      <span className={`${text} font-extrabold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>
        co<span className={inverted ? 'text-accent' : 'text-brand'}>finder</span>
      </span>
    </div>
  )
}

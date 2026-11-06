import { useEffect, useState } from 'react'

/** Marca que deja el registro para celebrarlo una sola vez en la pantalla siguiente */
export const CELEBRATE_KEY = 'cofinder:celebrate'

const COLORS = ['#C9442A', '#6D4AE0', '#F2B705', '#1F8A5B', '#5B9BEF', '#FFB199']
const PIECES = Array.from({ length: 48 }, (_, i) => ({
  left: (i * 37) % 100,
  color: COLORS[i % COLORS.length],
  delay: (i % 12) * 60,
  dur: 1700 + ((i * 53) % 900),
  dx: ((i * 29) % 120) - 60,
  rot: 360 + ((i * 47) % 540),
  round: i % 3 === 0,
}))

/** Confeti discreto que cae una vez (~2,5 s). No se muestra con «reducir movimiento». */
export default function Confetti() {
  // Se lee sin borrar (StrictMode llama dos veces al inicializador); se borra en el efecto
  const [on, setOn] = useState(() => { try { return !!sessionStorage.getItem(CELEBRATE_KEY) } catch { return false } })
  useEffect(() => {
    if (!on) return
    try { sessionStorage.removeItem(CELEBRATE_KEY) } catch { /* noop */ }
    const timer = setTimeout(() => setOn(false), 3200)
    return () => clearTimeout(timer)
  }, [on])
  if (!on) return null
  return (
    <div aria-hidden className="confetti pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`, background: p.color, borderRadius: p.round ? '9999px' : '2px',
            width: p.round ? 9 : 8, height: p.round ? 9 : 14,
            '--dx': `${p.dx}px`, '--rot': `${p.rot}deg`, animationDuration: `${p.dur}ms`, animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
    </div>
  )
}

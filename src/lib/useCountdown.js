import { useEffect, useState } from 'react'
import { ROUND_MINUTES } from '../constants'

/** Cuenta atrás de la ronda a partir de su hora de inicio */
export function useCountdown(startedAt, minutes = ROUND_MINUTES) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!startedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt])

  if (!startedAt) return { label: `${minutes}:00`, remaining: minutes * 60_000, done: false, progress: 0 }
  const total = minutes * 60_000
  const remaining = Math.max(0, startedAt + total - now)
  const s = Math.ceil(remaining / 1000)
  return {
    label: `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`,
    remaining,
    done: remaining === 0,
    progress: 1 - remaining / total,
  }
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { VIEWS, MODERATOR_VIEWS, MOD_HASH, MOD_PIN, TOTAL_ROUNDS } from '../constants'
import { generateRound } from '../lib/matching'
import { demoParticipants } from '../lib/demo'

/**
 * Estado global de Cofinder.
 *
 * - `participants` y `event` son datos compartidos del evento (hoy en localStorage,
 *   sincronizados entre pestañas del mismo navegador; mañana, un backend en tiempo real).
 * - `currentUserId` identifica a la persona registrada en ESTE dispositivo.
 * - `modUnlocked` vive en sessionStorage: el panel se vuelve a bloquear al cerrar la pestaña.
 *
 * La moderadora se registra igual que los demás: es un participante más para el algoritmo.
 * Lo único que la distingue es conocer el PIN del panel.
 */
const AppContext = createContext(null)

const EVENT_KEY = 'cofinder:event:v4' // v4: nueva lista de 20 temas + superpoderes
const ME_KEY = 'cofinder:me'
const MOD_KEY = 'cofinder:mod'
const EMPTY_EVENT = { round: 0, rounds: [], finished: false }

const read = (storage, key, fallback) => {
  try { return JSON.parse(storage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (storage, key, value) => {
  try { value === null ? storage.removeItem(key) : storage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}

export function AppProvider({ children }) {
  const shared = read(localStorage, EVENT_KEY, {})
  const [participants, setParticipants] = useState(shared.participants ?? [])
  const [event, setEvent] = useState(shared.event ?? EMPTY_EVENT)
  const [currentUserId, setCurrentUserId] = useState(() => read(localStorage, ME_KEY, null))
  const [modUnlocked, setModUnlocked] = useState(() => read(sessionStorage, MOD_KEY, false))
  const [gateOpen, setGateOpen] = useState(() => window.location.hash === MOD_HASH)
  const [view, setView] = useState(() => {
    if (read(sessionStorage, MOD_KEY, false)) return VIEWS.MOD_PANEL
    return read(localStorage, ME_KEY, null) ? VIEWS.HOME : VIEWS.REGISTER
  })

  // Persistencia
  useEffect(() => write(localStorage, EVENT_KEY, { participants, event }), [participants, event])
  useEffect(() => write(localStorage, ME_KEY, currentUserId), [currentUserId])
  useEffect(() => write(sessionStorage, MOD_KEY, modUnlocked || null), [modUnlocked])

  // Sincronización entre pestañas (p. ej. panel en el portátil + proyector en otra ventana)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== EVENT_KEY || !e.newValue) return
      const next = JSON.parse(e.newValue)
      setParticipants(next.participants ?? [])
      setEvent(next.event ?? EMPTY_EVENT)
    }
    const onHash = () => window.location.hash === MOD_HASH && setGateOpen(true)
    window.addEventListener('storage', onStorage)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  const currentUser = participants.find((p) => p.id === currentUserId) ?? null

  // Si la persona de este dispositivo fue eliminada desde el panel, vuelve al registro
  useEffect(() => {
    if (currentUserId && !currentUser && view === VIEWS.HOME) {
      setCurrentUserId(null)
      setView(VIEWS.REGISTER)
    }
  }, [currentUserId, currentUser, participants, view])

  /* ---------- Navegación ---------- */
  const navigate = useCallback((next) => {
    if (MODERATOR_VIEWS.includes(next) && !modUnlocked) return setGateOpen(true)
    setView(next)
    window.scrollTo({ top: 0 })
  }, [modUnlocked])

  /* ---------- Acceso de moderadora ---------- */
  const openGate = useCallback(() => setGateOpen(true), [])
  const closeGate = useCallback(() => {
    setGateOpen(false)
    if (window.location.hash === MOD_HASH) history.replaceState(null, '', window.location.pathname)
  }, [])
  const unlockModerator = useCallback((pin) => {
    if (String(pin).trim() !== String(MOD_PIN)) return false
    setModUnlocked(true)
    setGateOpen(false)
    setView(VIEWS.MOD_PANEL)
    if (window.location.hash === MOD_HASH) history.replaceState(null, '', window.location.pathname)
    return true
  }, [])
  const lockModerator = useCallback(() => {
    setModUnlocked(false)
    setView(currentUserId ? VIEWS.HOME : VIEWS.REGISTER)
  }, [currentUserId])

  /* ---------- Participantes ---------- */
  // `stay: true` guarda el perfil al instante pero deja la vista actual
  // (el registro termina su animación de sello y luego navega a HOME)
  const register = useCallback((data, { stay = false } = {}) => {
    const user = { id: crypto.randomUUID(), createdAt: Date.now(), ...data }
    setParticipants((prev) => [...prev, user])
    setCurrentUserId(user.id)
    if (!stay) {
      setView(VIEWS.HOME)
      window.scrollTo({ top: 0 })
    }
  }, [])

  const forgetMe = useCallback(() => {
    setCurrentUserId(null)
    setView(VIEWS.REGISTER)
  }, [])

  const removeParticipant = useCallback((id) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const seedDemo = useCallback(() => {
    setParticipants((prev) => {
      const names = new Set(prev.map((p) => p.name.toLowerCase()))
      return [...prev, ...demoParticipants().filter((p) => !names.has(p.name.toLowerCase()))]
    })
  }, [])

  const clearDemo = useCallback(() => setParticipants((prev) => prev.filter((p) => !p.demo)), [])

  /* ---------- Rondas ---------- */
  const startNextRound = useCallback(() => {
    setEvent((e) => {
      if (e.round >= TOTAL_ROUNDS || participants.length < 2) return e
      const { tables } = generateRound(participants, e.rounds)
      return { ...e, round: e.round + 1, rounds: [...e.rounds, { tables, startedAt: Date.now() }] }
    })
  }, [participants])

  const regenerateRound = useCallback(() => {
    setEvent((e) => {
      if (!e.round) return e
      const previous = e.rounds.slice(0, -1)
      const { tables } = generateRound(participants, previous)
      return { ...e, rounds: [...previous, { tables, startedAt: Date.now() }] }
    })
  }, [participants])

  const restartTimer = useCallback(() => {
    setEvent((e) => (e.round ? { ...e, rounds: e.rounds.map((r, i) => (i === e.round - 1 ? { ...r, startedAt: Date.now() } : r)) } : e))
  }, [])

  const finishEvent = useCallback(() => setEvent((e) => ({ ...e, finished: true })), [])
  const resetEvent = useCallback(() => setEvent(EMPTY_EVENT), [])

  const value = useMemo(() => ({
    view, navigate,
    participants, currentUser, event,
    currentRound: event.round ? event.rounds[event.round - 1] : null,
    register, forgetMe, removeParticipant, seedDemo, clearDemo,
    modUnlocked, gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    startNextRound, regenerateRound, restartTimer, finishEvent, resetEvent,
  }), [view, navigate, participants, currentUser, event, register, forgetMe, removeParticipant, seedDemo, clearDemo,
    modUnlocked, gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    startNextRound, regenerateRound, restartTimer, finishEvent, resetEvent])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

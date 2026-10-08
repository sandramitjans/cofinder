import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { VIEWS, MODERATOR_VIEWS, MOD_HASH, MOD_PIN, TOTAL_ROUNDS } from '../constants'
import { generateRound } from '../lib/matching'
import { demoParticipants } from '../lib/demo'
import * as api from '../lib/backend'

/**
 * Estado global de Cofinder. Dos modos con la misma interfaz para las vistas:
 *
 * ● Remoto (Supabase, producción): VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos.
 *   - Participante: guarda su perfil en la base de datos; luego solo puede leer SU perfil y,
 *     el día del evento, su mesa con sus compañeros. Escucha en tiempo real los cambios de ronda.
 *   - Moderadora: el PIN se comprueba en el servidor; el panel y el proyector refrescan
 *     el estado completo cada pocos segundos.
 *
 * ● Local (sin variables, pruebas): todo en localStorage, sincronizado entre pestañas.
 *
 * La moderadora se registra igual que los demás: es un participante más para el algoritmo.
 */
const AppContext = createContext(null)

const REMOTE = api.isRemote
const EVENT_KEY = 'cofinder:event:v4'
const ME_KEY = 'cofinder:me'
const PROFILE_KEY = 'cofinder:me:profile' // copia local del propio perfil (pantalla al instante, sin red)
const MOD_KEY = REMOTE ? 'cofinder:mod:pin' : 'cofinder:mod'
const EMPTY_EVENT = { round: 0, rounds: [], finished: false }
const MOD_POLL_MS = 4000
const TABLE_POLL_MS = 30000

const read = (storage, key, fallback) => {
  try { return JSON.parse(storage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (storage, key, value) => {
  try { value == null ? storage.removeItem(key) : storage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}
const currentLang = () => { try { return localStorage.getItem('cofinder:lang') === 'en' ? 'en' : 'fr' } catch { return 'fr' } }
const isSeated = (rounds, id) => rounds.some((r) => r.tables.some((t) => t.members.includes(id)))

export function AppProvider({ children }) {
  /* ---------- Estado común ---------- */
  const [currentUserId, setCurrentUserId] = useState(() => read(localStorage, ME_KEY, null))
  const [modPin, setModPin] = useState(() => read(sessionStorage, MOD_KEY, null)) // remoto: PIN; local: true
  const modUnlocked = !!modPin
  const [gateOpen, setGateOpen] = useState(() => window.location.hash === MOD_HASH)
  const [view, setView] = useState(() => {
    if (read(sessionStorage, MOD_KEY, null)) return VIEWS.MOD_PANEL
    return read(localStorage, ME_KEY, null) ? VIEWS.HOME : VIEWS.REGISTER
  })

  /* ---------- Estado local (modo sin servidor) ---------- */
  const shared = REMOTE ? {} : read(localStorage, EVENT_KEY, {})
  const [localParticipants, setLocalParticipants] = useState(shared.participants ?? [])
  const [localEvent, setLocalEvent] = useState(shared.event ?? EMPTY_EVENT)

  /* ---------- Estado remoto ---------- */
  const [me, setMe] = useState(() => (REMOTE ? read(localStorage, PROFILE_KEY, null) : null))
  const [myTable, setMyTable] = useState(null) // { round, finished, startedAt, seatedEver, table, people }
  const [modState, setModState] = useState(null) // { participants, event }
  const modStateRef = useRef(null)
  modStateRef.current = modState

  // Persistencia
  useEffect(() => { if (!REMOTE) write(localStorage, EVENT_KEY, { participants: localParticipants, event: localEvent }) }, [localParticipants, localEvent])
  useEffect(() => write(localStorage, ME_KEY, currentUserId), [currentUserId])
  useEffect(() => { if (REMOTE) write(localStorage, PROFILE_KEY, me) }, [me])
  useEffect(() => write(sessionStorage, MOD_KEY, modPin), [modPin])

  // Enlace secreto #moderadora + sincronización entre pestañas (modo local)
  useEffect(() => {
    const onStorage = (e) => {
      if (REMOTE || e.key !== EVENT_KEY || !e.newValue) return
      const next = JSON.parse(e.newValue)
      setLocalParticipants(next.participants ?? [])
      setLocalEvent(next.event ?? EMPTY_EVENT)
    }
    const onHash = () => window.location.hash === MOD_HASH && setGateOpen(true)
    window.addEventListener('storage', onStorage)
    window.addEventListener('hashchange', onHash)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('hashchange', onHash)
    }
  }, [])

  /* ---------- Remoto: participante ---------- */
  const forgetLocally = useCallback(() => {
    setCurrentUserId(null)
    setMe(null)
    setMyTable(null)
    setView((v) => (v === VIEWS.HOME ? VIEWS.REGISTER : v))
  }, [])

  const refreshMine = useCallback(async () => {
    if (!REMOTE || !currentUserId) return
    try {
      const [profile, table] = await Promise.all([api.fetchMyProfile(currentUserId), api.fetchMyTable(currentUserId)])
      if (!profile) return forgetLocally() // retirado desde el panel → vuelve al registro
      setMe(profile)
      setMyTable(table)
    } catch { /* sin red: se mantiene lo último conocido */ }
  }, [currentUserId, forgetLocally])

  useEffect(() => {
    if (!REMOTE || !currentUserId) return
    refreshMine()
    const off = api.onEventChange(() => refreshMine())
    const onVisible = () => document.visibilityState === 'visible' && refreshMine()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(refreshMine, TABLE_POLL_MS) // por si el tiempo real se corta
    return () => { off(); clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [currentUserId, refreshMine])

  /* ---------- Remoto: moderadora ---------- */
  const lockModerator = useCallback(() => {
    setModPin(null)
    setModState(null)
    setView(currentUserId ? VIEWS.HOME : VIEWS.REGISTER)
  }, [currentUserId])

  const refreshMod = useCallback(async () => {
    if (!REMOTE || !modPin) return
    try {
      setModState(await api.modGetState(modPin))
    } catch (err) {
      if (err.code === 'invalid_pin') lockModerator() // el PIN ha cambiado
    }
  }, [modPin, lockModerator])

  useEffect(() => {
    if (!REMOTE || !modPin) return
    refreshMod()
    const timer = setInterval(refreshMod, MOD_POLL_MS)
    return () => clearInterval(timer)
  }, [modPin, refreshMod])

  /* ---------- Vista unificada para los componentes ---------- */
  let participants, event, currentRound, seatedEver
  if (!REMOTE) {
    participants = localParticipants
    event = localEvent
    currentRound = event.round ? event.rounds[event.round - 1] : null
    seatedEver = isSeated(event.rounds, currentUserId)
  } else if (modPin && modState) {
    participants = modState.participants
    event = modState.event
    currentRound = event.round ? event.rounds[event.round - 1] : null
    seatedEver = myTable?.seatedEver ?? isSeated(event.rounds, currentUserId)
  } else {
    participants = me ? [me, ...(myTable?.people ?? []).filter((p) => p.id !== me.id)] : []
    event = { round: myTable?.round ?? 0, finished: !!myTable?.finished, rounds: [] }
    currentRound = myTable?.table ? { tables: [myTable.table], startedAt: myTable.startedAt } : null
    seatedEver = !!myTable?.seatedEver
  }
  const currentUser = REMOTE ? (me?.id === currentUserId ? me : null) : (participants.find((p) => p.id === currentUserId) ?? null)

  // Modo local: si la persona de este dispositivo fue eliminada desde el panel, vuelve al registro
  useEffect(() => {
    if (!REMOTE && currentUserId && !currentUser && view === VIEWS.HOME) {
      setCurrentUserId(null)
      setView(VIEWS.REGISTER)
    }
  }, [currentUserId, currentUser, view])

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

  // Devuelve 'ok' | 'invalid_pin' | 'locked' | 'network'
  const unlockModerator = useCallback(async (raw) => {
    const pin = String(raw).trim()
    let res
    if (REMOTE) {
      try { res = await api.checkPin(pin) } catch { res = 'network' }
    } else {
      res = pin === String(MOD_PIN) ? 'ok' : 'invalid_pin'
    }
    if (res !== 'ok') return res
    setModPin(REMOTE ? pin : true)
    setGateOpen(false)
    setView(VIEWS.MOD_PANEL)
    if (window.location.hash === MOD_HASH) history.replaceState(null, '', window.location.pathname)
    return 'ok'
  }, [])

  /* ---------- Participantes ---------- */
  // Devuelve true si el perfil quedó guardado. `stay: true` deja la vista actual
  // (el registro termina su animación de sello y luego navega a HOME)
  const register = useCallback(async (data, { stay = false } = {}) => {
    const user = { id: crypto.randomUUID(), createdAt: Date.now(), ...data }
    if (REMOTE) {
      try { await api.insertProfile(user, currentLang()) } catch { return false }
      setMe(user)
    } else {
      setLocalParticipants((prev) => [...prev, user])
    }
    setCurrentUserId(user.id)
    if (!stay) {
      setView(VIEWS.HOME)
      window.scrollTo({ top: 0 })
    }
    return true
  }, [])

  // Solo olvida el perfil en ESTE dispositivo (el registro sigue en la base de datos)
  const forgetMe = useCallback(() => {
    setCurrentUserId(null)
    setMe(null)
    setMyTable(null)
    setView(VIEWS.REGISTER)
  }, [])

  // Acción de moderadora en remoto: llama al servidor y refresca el estado
  const modAction = useCallback(async (fn) => {
    try { await fn(modPin) } catch (err) {
      if (err.code === 'invalid_pin') return lockModerator()
      window.alert(err.code === 'locked' ? 'PIN: trop d’essais / too many attempts' : 'Erreur de connexion / connection error')
    }
    await refreshMod()
  }, [modPin, refreshMod, lockModerator])

  const removeParticipant = useCallback((id) => {
    if (REMOTE) return modAction((pin) => api.modRemove(pin, id))
    setLocalParticipants((prev) => prev.filter((p) => p.id !== id))
  }, [modAction])

  const seedDemo = useCallback(() => {
    const pick = (prev) => {
      const names = new Set(prev.map((p) => p.name.toLowerCase()))
      return demoParticipants().filter((p) => !names.has(p.name.toLowerCase()))
    }
    if (REMOTE) return modAction((pin) => api.modAddDemo(pin, pick(modStateRef.current?.participants ?? [])))
    setLocalParticipants((prev) => [...prev, ...pick(prev)])
  }, [modAction])

  const clearDemo = useCallback(() => {
    if (REMOTE) return modAction((pin) => api.modClearDemo(pin))
    setLocalParticipants((prev) => prev.filter((p) => !p.demo))
  }, [modAction])

  /* ---------- Rondas ---------- */
  // `update(event, participants)` → nuevo evento (o el mismo si no hay cambios)
  const changeEvent = useCallback((update) => {
    if (!REMOTE) {
      setLocalEvent((e) => update(e, localParticipants))
      return
    }
    const s = modStateRef.current
    if (!s) return
    const next = update(s.event, s.participants)
    if (next === s.event) return
    setModState({ ...s, event: next }) // optimista: el proyector cambia al instante
    return modAction((pin) => api.modSetEvent(pin, next))
  }, [localParticipants, modAction])

  const startNextRound = useCallback(() => changeEvent((e, people) => {
    if (e.round >= TOTAL_ROUNDS || people.length < 2) return e
    const { tables } = generateRound(people, e.rounds)
    return { ...e, round: e.round + 1, rounds: [...e.rounds, { tables, startedAt: Date.now() }] }
  }), [changeEvent])

  const regenerateRound = useCallback(() => changeEvent((e, people) => {
    if (!e.round) return e
    const previous = e.rounds.slice(0, -1)
    const { tables } = generateRound(people, previous)
    return { ...e, rounds: [...previous, { tables, startedAt: Date.now() }] }
  }), [changeEvent])

  const restartTimer = useCallback(() => changeEvent((e) => (
    e.round ? { ...e, rounds: e.rounds.map((r, i) => (i === e.round - 1 ? { ...r, startedAt: Date.now() } : r)) } : e
  )), [changeEvent])

  const finishEvent = useCallback(() => changeEvent((e) => ({ ...e, finished: true })), [changeEvent])
  const resetEvent = useCallback(() => changeEvent(() => EMPTY_EVENT), [changeEvent])

  const value = useMemo(() => ({
    remote: REMOTE,
    view, navigate,
    participants, currentUser, event, currentRound, seatedEver,
    modLoading: REMOTE && modUnlocked && !modState,
    register, forgetMe, removeParticipant, seedDemo, clearDemo,
    modUnlocked, gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    startNextRound, regenerateRound, restartTimer, finishEvent, resetEvent,
  }), [view, navigate, participants, currentUser, event, currentRound, seatedEver, modUnlocked, modState,
    register, forgetMe, removeParticipant, seedDemo, clearDemo,
    gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    startNextRound, regenerateRound, restartTimer, finishEvent, resetEvent])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { VIEWS, MODERATOR_VIEWS, MOD_HASH, JOIN_HASH, MOD_PIN, PAUSE_AFTER_ROUND } from '../constants'
import { demoParticipants } from '../lib/demo'
import * as api from '../lib/backend'
import { clearNotes } from '../lib/audioNotes'

/**
 * Estado global de Cofinder. Dos modos con la misma interfaz para las vistas:
 *
 * ● Remoto (Supabase, producción): VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY definidos.
 *   - Participante: guarda su perfil en la base de datos; luego solo puede leer SU perfil y,
 *     el día del evento, su mesa con sus compañeros. Escucha en tiempo real los cambios de ronda.
 *   - Moderadora: el PIN se comprueba en el servidor; el panel y el proyector refrescan el estado
 *     completo al instante cuando llega un aviso por websocket (cambio de ronda, registro, nota de
 *     audio) y, por si el websocket se corta, cada 15 segundos.
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
const SECRET_KEY = 'cofinder:me:secret'   // clave para poder modificar el propio perfil
const MOD_KEY = REMOTE ? 'cofinder:mod:pin' : 'cofinder:mod'
const EMPTY_EVENT = { round: 0, rounds: [], finished: false }
const MOD_POLL_MS = 15000
const historyKey = (id) => `cofinder:history:${id}`
const TABLE_POLL_MS = 30000

const read = (storage, key, fallback) => {
  try { return JSON.parse(storage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (storage, key, value) => {
  try { value == null ? storage.removeItem(key) : storage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}
const currentLang = () => { try { return localStorage.getItem('cofinder:lang') === 'en' ? 'en' : 'es' } catch { return 'es' } }
// Código de acceso de 4 cifras (modo local; en Supabase lo pone el servidor)
const newCode = (taken) => {
  let c
  do { c = String(1000 + Math.floor(Math.random() * 9000)) } while (taken.has(c))
  taken.add(c)
  return c
}
// Minúsculas y sin acentos: «lucia» encuentra a «Lucía Ferrer»
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const isSeated = (rounds, id) => rounds.some((r) => r.tables.some((t) => t.members.includes(id)))

export function AppProvider({ children }) {
  /* ---------- Estado común ---------- */
  const [currentUserId, setCurrentUserId] = useState(() => read(localStorage, ME_KEY, null))
  const [editSecret, setEditSecret] = useState(() => read(localStorage, SECRET_KEY, null))
  const [profileUpdatedAt, setProfileUpdatedAt] = useState(0)
  const [modPin, setModPin] = useState(() => read(sessionStorage, MOD_KEY, null)) // remoto: PIN; local: true
  const modUnlocked = !!modPin
  const [gateOpen, setGateOpen] = useState(() => window.location.hash === MOD_HASH)
  const [view, setView] = useState(() => {
    if (read(sessionStorage, MOD_KEY, null)) return VIEWS.MOD_PANEL
    if (read(localStorage, ME_KEY, null)) return VIEWS.HOME
    return window.location.hash === JOIN_HASH ? VIEWS.LOGIN : VIEWS.REGISTER
  })

  /* ---------- Estado local (modo sin servidor) ---------- */
  const shared = REMOTE ? {} : read(localStorage, EVENT_KEY, {})
  const [localParticipants, setLocalParticipants] = useState(shared.participants ?? [])
  const [localEvent, setLocalEvent] = useState(shared.event ?? EMPTY_EVENT)
  const [localTopics, setLocalTopics] = useState(shared.topics ?? []) // mesas añadidas desde el panel

  /* ---------- Estado remoto ---------- */
  const [me, setMe] = useState(() => (REMOTE ? read(localStorage, PROFILE_KEY, null) : null))
  const [myTable, setMyTable] = useState(null) // { round, finished, startedAt, seatedEver, table, people }
  const [modState, setModState] = useState(null) // { participants, event }
  const modStateRef = useRef(null)
  modStateRef.current = modState

  // Persistencia
  useEffect(() => { if (!REMOTE) write(localStorage, EVENT_KEY, { participants: localParticipants, event: localEvent, topics: localTopics }) }, [localParticipants, localEvent, localTopics])
  useEffect(() => write(localStorage, ME_KEY, currentUserId), [currentUserId])
  useEffect(() => write(localStorage, SECRET_KEY, editSecret), [editSecret])
  useEffect(() => { if (REMOTE) write(localStorage, PROFILE_KEY, me) }, [me])
  useEffect(() => write(sessionStorage, MOD_KEY, modPin), [modPin])

  // Modo local: quien se registró antes de existir los códigos recibe el suyo
  useEffect(() => {
    if (REMOTE || localParticipants.every((p) => p.accessCode)) return
    const taken = new Set(localParticipants.map((p) => p.accessCode).filter(Boolean))
    setLocalParticipants((prev) => prev.map((p) => (p.accessCode ? p : { ...p, accessCode: newCode(taken) })))
  }, [localParticipants])

  // Enlace secreto #moderadora + sincronización entre pestañas (modo local)
  useEffect(() => {
    const onStorage = (e) => {
      if (REMOTE || e.key !== EVENT_KEY || !e.newValue) return
      const next = JSON.parse(e.newValue)
      setLocalParticipants(next.participants ?? [])
      setLocalEvent(next.event ?? EMPTY_EVENT)
      setLocalTopics(next.topics ?? [])
    }
    const onHash = () => {
      if (window.location.hash === MOD_HASH) setGateOpen(true)
      if (window.location.hash === JOIN_HASH) setView((v) => (v === VIEWS.REGISTER ? VIEWS.LOGIN : v))
    }
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
    setEditSecret(null)
    setMe(null)
    setMyTable(null)
    setView((v) => (v === VIEWS.HOME || v === VIEWS.EDIT ? VIEWS.REGISTER : v))
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

  // El móvil se anuncia como «conectado» (el proyector enciende su foto en la pantalla del QR)
  useEffect(() => {
    if (!REMOTE || !currentUserId) return
    return api.announcePresence(currentUserId)
  }, [currentUserId])

  /* ---------- Mesas del evento (las añade la moderadora desde el panel) ---------- */
  const [remoteTopics, setRemoteTopics] = useState([])
  const [remoteTopicsLoaded, setRemoteTopicsLoaded] = useState(false)
  const loadEventTopics = useCallback(async () => {
    if (!REMOTE) return
    try { setRemoteTopics(await api.fetchEventTopics()) } catch { /* función aún no instalada: lista por defecto */ }
    setRemoteTopicsLoaded(true)
  }, [])
  const eventTopics = REMOTE ? remoteTopics : localTopics
  const eventTopicsLoaded = REMOTE ? remoteTopicsLoaded : true

  /* ---------- Remoto: moderadora ---------- */
  const lockModerator = useCallback(() => {
    setModPin(null)
    setModState(null)
    setView(currentUserId ? VIEWS.HOME : VIEWS.REGISTER)
  }, [currentUserId])

  const refreshMod = useCallback(async () => {
    if (!REMOTE || !modPin) return
    try {
      const [state] = await Promise.all([api.modGetState(modPin), loadEventTopics()])
      setModState(state)
    } catch (err) {
      if (err.code === 'invalid_pin') lockModerator() // el PIN ha cambiado
    }
  }, [modPin, lockModerator, loadEventTopics])

  useEffect(() => {
    if (!REMOTE || !modPin) return
    refreshMod()
    const offEvent = api.onEventChange(() => refreshMod())
    const offPing = api.onPing(() => refreshMod())
    const timer = setInterval(refreshMod, MOD_POLL_MS) // por si el websocket se corta
    return () => { offEvent(); offPing(); clearInterval(timer) }
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
    if (!REMOTE && currentUserId && !currentUser && (view === VIEWS.HOME || view === VIEWS.EDIT)) {
      setCurrentUserId(null)
      setView(VIEWS.REGISTER)
    }
  }, [currentUserId, currentUser, view])

  /* ---------- Historial de mis mesas (para el resumen final) ----------
     En remoto el móvil solo recibe la mesa de la ronda en curso, así que se va apuntando aquí
     cada mesa con sus compañeros (sin fotos). Si la sesión vuelve al principio, se borra. */
  const myId = currentUser?.id
  const myTableNow = currentRound?.tables.find((x) => x.members.includes(myId)) ?? null
  const [history, setHistory] = useState({})
  // Solo cambia el estado si el contenido cambia (el almacenamiento puede haberlo escrito otra pestaña)
  const syncHistory = useCallback((next) => setHistory((h) => (JSON.stringify(h) === JSON.stringify(next) ? h : next)), [])
  useEffect(() => { syncHistory(myId ? read(localStorage, historyKey(myId), {}) : {}) }, [myId, syncHistory])
  useEffect(() => {
    if (!myId) return
    if (!event.round && !event.finished) {
      if (Object.keys(read(localStorage, historyKey(myId), {})).length) {
        write(localStorage, historyKey(myId), null)
        clearNotes(myId)
      }
      return syncHistory({})
    }
    if (!myTableNow || event.finished) return syncHistory(read(localStorage, historyKey(myId), {}))
    const people = myTableNow.members.filter((id) => id !== myId).map((id) => participants.find((p) => p.id === id))
      .filter(Boolean).map(({ id, name, role, country }) => ({ id, name, role, country }))
    const entry = { table: { id: myTableNow.id, topic: myTableNow.topic }, people }
    const prev = read(localStorage, historyKey(myId), {})
    const next = { ...prev, [event.round]: entry }
    if (JSON.stringify(prev[event.round]) !== JSON.stringify(entry)) write(localStorage, historyKey(myId), next)
    syncHistory(next)
  }, [myId, event.round, event.finished, myTableNow, participants, syncHistory])

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
    if (window.location.hash === MOD_HASH) window.history.replaceState(null, '', window.location.pathname)
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
    if (window.location.hash === MOD_HASH) window.history.replaceState(null, '', window.location.pathname)
    return 'ok'
  }, [])

  /* ---------- Participantes ---------- */
  // Devuelve true si el perfil quedó guardado. `stay: true` deja la vista actual
  // (el registro termina su animación de sello y luego navega a HOME)
  const register = useCallback(async (data, { stay = false } = {}) => {
    const user = { id: crypto.randomUUID(), createdAt: Date.now(), ...data }
    const secret = crypto.randomUUID()
    if (REMOTE) {
      try { await api.insertProfile(user, currentLang(), secret) } catch { return false }
      setMe(user)
      api.ping('participants')
    } else {
      setLocalParticipants((prev) => [...prev, { ...user, accessCode: newCode(new Set(prev.map((p) => p.accessCode))) }])
    }
    setEditSecret(secret)
    setCurrentUserId(user.id)
    if (!stay) {
      setView(VIEWS.HOME)
      window.scrollTo({ top: 0 })
    }
    return true
  }, [])

  // El participante modifica su propio perfil (solo desde el dispositivo con el que se registró)
  const canEditProfile = !!currentUserId && (!REMOTE || !!editSecret)
  const updateProfile = useCallback(async (data) => {
    if (!currentUserId) return false
    const next = { ...data, id: currentUserId }
    if (REMOTE) {
      try { await api.updateProfile(next, currentLang(), editSecret) } catch { return false }
      setMe((m) => ({ ...m, ...next }))
      api.ping('participants')
    } else {
      setLocalParticipants((prev) => prev.map((p) => (p.id === currentUserId ? { ...p, ...next } : p)))
    }
    setProfileUpdatedAt(Date.now())
    setView(VIEWS.HOME)
    window.scrollTo({ top: 0 })
    return true
  }, [currentUserId, editSecret])

  // Entrar desde otro dispositivo (el móvil, tras escanear el QR) con el nombre y el código de 4 cifras.
  // Devuelve 'ok' | 'invalid' | 'locked' | 'network'
  const login = useCallback(async (name, rawCode) => {
    const code = String(rawCode).replace(/\D/g, '')
    let id, secret
    if (REMOTE) {
      try {
        ({ id, secret } = await api.loginWithCode(name, code))
        const profile = await api.fetchMyProfile(id)
        if (!profile) return 'invalid'
        setMe(profile)
      } catch (err) {
        return err.code === 'invalid' || err.code === 'locked' ? err.code : 'network'
      }
    } else {
      const n = norm(name)
      const p = n.length >= 2 && localParticipants.find((x) => x.accessCode === code && norm(x.name).includes(n))
      if (!p) return 'invalid'
      id = p.id
      secret = crypto.randomUUID()
    }
    setEditSecret(secret)
    setCurrentUserId(id)
    setView(VIEWS.HOME)
    if (window.location.hash === JOIN_HASH) window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0 })
    return 'ok'
  }, [localParticipants])

  // Solo olvida el perfil en ESTE dispositivo (el registro sigue en la base de datos)
  const forgetMe = useCallback(() => {
    setCurrentUserId(null)
    setEditSecret(null)
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
      return demoParticipants(eventTopics.map((x) => x.id)).filter((p) => !names.has(p.name.toLowerCase()))
    }
    if (REMOTE) return modAction((pin) => api.modAddDemo(pin, pick(modStateRef.current?.participants ?? [])))
    setLocalParticipants((prev) => {
      const taken = new Set(prev.map((p) => p.accessCode))
      return [...prev, ...pick(prev).map((p) => ({ ...p, accessCode: newCode(taken) }))]
    })
  }, [modAction, eventTopics])

  // La moderadora añade o quita mesas del evento (con el nombre de quien la propone)
  const addEventTopic = useCallback((entry) => {
    if (REMOTE) return modAction((pin) => api.modAddTopic(pin, entry))
    setLocalTopics((prev) => [...prev, entry])
  }, [modAction])

  const removeEventTopic = useCallback((id) => {
    if (REMOTE) return modAction((pin) => api.modRemoveTopic(pin, id))
    setLocalTopics((prev) => prev.filter((x) => x.id !== id))
  }, [modAction])

  const clearDemo = useCallback(() => {
    if (REMOTE) return modAction((pin) => api.modClearDemo(pin))
    setLocalParticipants((prev) => prev.filter((p) => !p.demo))
  }, [modAction])

  /* ---------- Plan de la soirée y desarrollo de los tours ---------- */
  // `event.rounds` guarda el plan completo (las 5 rondas). Cada tour:
  //   plan            → todas sus mesas, decididas la semana anterior
  //   tables          → solo las mesas ya anunciadas en el proyector (lo único que leen los móviles:
  //                     una mesa aparece en el teléfono en el momento en que sale en pantalla)
  //   revealed        → cuántas mesas se han anunciado
  //   startedAt       → inicio de los 15 minutos de conversación
  //   pauseStartedAt  → inicio de la pausa (solo en el tour PAUSE_AFTER_ROUND)
  // `event.round` es el tour en pantalla (0 = la soirée no ha empezado).
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
    const optimistic = { ...s, event: next }
    modStateRef.current = optimistic // dos pulsaciones seguidas parten del último estado
    setModState(optimistic) // optimista: el proyector cambia al instante
    return modAction((pin) => api.modSetEvent(pin, next))
  }, [localParticipants, modAction])

  const [planning, setPlanning] = useState(false)
  const peopleRef = useRef(participants)
  peopleRef.current = participants
  const topicsRef = useRef(eventTopics)
  topicsRef.current = eventTopics

  // Al cálculo solo le hacen falta los temas (las fotos pesan y no se envían al worker)
  const runPlanner = useCallback((payload) => new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../lib/planner.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (e) => { resolve(e.data); worker.terminate() }
    worker.onerror = (e) => { reject(e); worker.terminate() }
    worker.postMessage({
      ...payload,
      topics: topicsRef.current.map((x) => x.id),
      people: peopleRef.current.map(({ id, country, offers, needs }) => ({ id, country, offers, needs })),
    })
  }), [])

  const newRound = (tables) => ({ plan: tables, tables: [], revealed: 0, startedAt: null, pauseStartedAt: null })
  const patchRound = (e, i, patch) => ({ ...e, rounds: e.rounds.map((r, k) => (k === i ? { ...r, ...patch } : r)) })
  // Un tour se puede retocar mientras no haya empezado a anunciarse
  const editable = (e, i) => !e.finished && i >= e.round

  const generatePlan = useCallback(async () => {
    if (peopleRef.current.length < 2) return
    setPlanning(true)
    try {
      const plan = await runPlanner({ type: 'plan' })
      await changeEvent((e) => (e.round ? e : { round: 0, finished: false, rounds: plan.map((r) => newRound(r.tables)) }))
    } finally { setPlanning(false) }
  }, [runPlanner, changeEvent])

  const regeneratePlanRound = useCallback(async (i) => {
    const s = REMOTE ? modStateRef.current?.event : localEvent
    if (!s || !editable(s, i)) return
    setPlanning(true)
    try {
      const otherRounds = s.rounds.filter((_, k) => k !== i).map((r) => ({ tables: r.plan }))
      const { tables } = await runPlanner({ type: 'round', otherRounds })
      await changeEvent((e) => (editable(e, i) ? patchRound(e, i, { plan: tables }) : e))
    } finally { setPlanning(false) }
  }, [runPlanner, changeEvent, localEvent])

  // Retoques a mano en un tour del plan: intercambiar a dos personas o mover a alguien de mesa
  const editPlanRound = useCallback((i, edit) => changeEvent((e) => {
    if (!editable(e, i)) return e
    const tables = edit(e.rounds[i].plan.map((t) => ({ ...t, members: [...t.members] })))
    if (!tables) return e
    const kept = tables.filter((t) => t.members.length).map((t, k) => ({ ...t, id: k + 1 }))
    return patchRound(e, i, { plan: kept })
  }), [changeEvent])

  const swapSeats = useCallback((i, a, b) => editPlanRound(i, (tables) => {
    const ta = tables.find((t) => t.members.includes(a))
    const tb = tables.find((t) => t.members.includes(b))
    if (!ta || !tb || ta === tb) return null
    ta.members[ta.members.indexOf(a)] = b
    tb.members[tb.members.indexOf(b)] = a
    return tables
  }), [editPlanRound])

  const moveSeat = useCallback((i, id, tableId) => editPlanRound(i, (tables) => {
    const from = tables.find((t) => t.members.includes(id))
    const to = tables.find((t) => t.id === tableId)
    if (!to || from === to) return null
    if (from) from.members = from.members.filter((x) => x !== id)
    to.members.push(id)
    return tables
  }), [editPlanRound])

  // Siguiente paso de la soirée (clic, espacio, flecha o mando de presentación):
  // portada del tour → anuncio de cada match → chrono → (pausa tras la ronda 3) → ronda siguiente → fin
  const advance = useCallback(() => changeEvent((e) => {
    if (e.finished || !e.rounds.length) return e
    if (!e.round) return { ...e, round: 1 }
    const i = e.round - 1
    const r = e.rounds[i]
    if (r.revealed < r.plan.length) return patchRound(e, i, { revealed: r.revealed + 1, tables: r.plan.slice(0, r.revealed + 1) })
    if (!r.startedAt) return patchRound(e, i, { startedAt: Date.now() })
    if (e.round === PAUSE_AFTER_ROUND && e.round < e.rounds.length && !r.pauseStartedAt) return patchRound(e, i, { pauseStartedAt: Date.now() })
    if (e.round < e.rounds.length) return { ...e, round: e.round + 1 }
    return { ...e, finished: true }
  }), [changeEvent])

  // Deshace el último paso (por si se pulsa una vez de más)
  const stepBack = useCallback(() => changeEvent((e) => {
    if (e.finished) return { ...e, finished: false }
    if (!e.round) return e
    const i = e.round - 1
    const r = e.rounds[i]
    if (r.pauseStartedAt) return patchRound(e, i, { pauseStartedAt: null })
    if (r.startedAt) return patchRound(e, i, { startedAt: null })
    if (r.revealed > 0) return patchRound(e, i, { revealed: r.revealed - 1, tables: r.plan.slice(0, r.revealed - 1) })
    return { ...e, round: e.round - 1 }
  }), [changeEvent])

  const restartTimer = useCallback(() => changeEvent((e) => {
    const r = e.round ? e.rounds[e.round - 1] : null
    if (!r || e.finished) return e
    if (r.pauseStartedAt) return patchRound(e, e.round - 1, { pauseStartedAt: Date.now() })
    return r.startedAt ? patchRound(e, e.round - 1, { startedAt: Date.now() }) : e
  }), [changeEvent])

  const finishEvent = useCallback(() => changeEvent((e) => ({ ...e, finished: true })), [changeEvent])
  // Vuelve al principio conservando el plan (para ensayar), o borra el plan entero
  const resetEvent = useCallback(() => changeEvent((e) => ({ round: 0, finished: false, rounds: e.rounds.map((r) => newRound(r.plan)) })), [changeEvent])
  const clearPlan = useCallback(() => changeEvent(() => EMPTY_EVENT), [changeEvent])

  const value = useMemo(() => ({
    remote: REMOTE,
    view, navigate,
    participants, currentUser, event, currentRound, seatedEver,
    modLoading: REMOTE && modUnlocked && !modState,
    register, login, forgetMe, removeParticipant, seedDemo, clearDemo,
    canEditProfile, updateProfile, profileUpdatedAt,
    eventTopics, eventTopicsLoaded, loadEventTopics, addEventTopic, removeEventTopic, history,
    modUnlocked, gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    planning, generatePlan, regeneratePlanRound, swapSeats, moveSeat,
    advance, stepBack, restartTimer, finishEvent, resetEvent, clearPlan,
  }), [view, navigate, participants, currentUser, event, currentRound, seatedEver, modUnlocked, modState,
    register, login, forgetMe, removeParticipant, seedDemo, clearDemo,
    canEditProfile, updateProfile, profileUpdatedAt,
    eventTopics, eventTopicsLoaded, loadEventTopics, addEventTopic, removeEventTopic, history,
    gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    planning, generatePlan, regeneratePlanRound, swapSeats, moveSeat,
    advance, stepBack, restartTimer, finishEvent, resetEvent, clearPlan])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}

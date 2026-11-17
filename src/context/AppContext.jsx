import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { VIEWS, MODERATOR_VIEWS, isModHash, JOIN_HASH, MOD_PIN, PAUSE_AFTER_ROUND, FIND_MINUTES, ROUND_MINUTES } from '../constants'
import { demoParticipants } from '../lib/demo'
import { configureEventTopics } from '../lib/topics'
import * as api from '../lib/backend'
import { translate } from '../lib/i18n'
import { clearNotes, saveNote } from '../lib/audioNotes'
import { reporterState } from '../lib/reporter'

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
const SECRET_KEY = 'cofinder:me:secret'
const LIVE_KEY = 'cofinder:me:live'       // este dispositivo entró con nombre + código (QR del día del evento)   // clave para poder modificar el propio perfil
const MOD_KEY = REMOTE ? 'cofinder:mod:pin' : 'cofinder:mod'
const EMPTY_EVENT = { round: 0, rounds: [], finished: false }
const MOD_POLL_MS = 15000
const historyKey = (id) => `cofinder:history:${id}`
const TABLE_POLL_MS = 30000
const REPORTER_POLL_MS = 4000 // mientras la mesa decide quién graba (por si el websocket se corta)
const FIND_MS = FIND_MINUTES * 60_000
const ROUND_MS = ROUND_MINUTES * 60_000

const read = (storage, key, fallback) => {
  try { return JSON.parse(storage.getItem(key)) ?? fallback } catch { return fallback }
}
const write = (storage, key, value) => {
  try { value == null ? storage.removeItem(key) : storage.setItem(key, JSON.stringify(value)) } catch { /* sin almacenamiento */ }
}
const currentLang = () => { try { return localStorage.getItem('cofinder:lang') === 'en' ? 'en' : 'fr' } catch { return 'fr' } }
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
  const [joinedLive, setJoinedLive] = useState(() => !!read(localStorage, LIVE_KEY, false))
  const [profileUpdatedAt, setProfileUpdatedAt] = useState(0)
  const [modPin, setModPin] = useState(() => read(sessionStorage, MOD_KEY, null)) // remoto: PIN; local: true
  const modUnlocked = !!modPin
  const [gateOpen, setGateOpen] = useState(() => isModHash(window.location.hash))
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
  useEffect(() => write(localStorage, LIVE_KEY, joinedLive || null), [joinedLive])
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
      if (isModHash(window.location.hash)) setGateOpen(true)
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
    setJoinedLive(false)
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
  // Los temas del panel (obligatorios y «au choix») se aplican antes de pintar cualquier pantalla
  useMemo(() => configureEventTopics(eventTopics), [eventTopics])
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

  /* ---------- Día del evento: mis mesas de todas las rondas y «Preparado» ---------- */
  const [readyOverride, setReadyOverride] = useState(null) // respuesta inmediata al pulsar, antes de que llegue el servidor
  const remoteReady = myTable?.ready
  useEffect(() => { setReadyOverride(null) }, [remoteReady, currentUserId])
  let myPlan, ready
  if (!REMOTE) {
    myPlan = event.rounds.map((r, i) => {
      const tb = r.plan.find((x) => x.members.includes(currentUserId))
      return tb ? { round: i + 1, table: tb.id, topic: tb.topic } : null
    }).filter(Boolean)
    ready = !!currentUser?.readyAt
  } else {
    myPlan = myTable?.plan ?? []
    ready = readyOverride ?? !!myTable?.ready
  }
  const setReady = useCallback(async (value = true) => {
    if (!currentUserId) return false
    if (REMOTE) {
      setReadyOverride(value)
      try { await api.setMyReady(currentUserId, value) } catch { setReadyOverride(null); return false }
      api.ping('ready')
      refreshMine()
    } else {
      setLocalParticipants((prev) => prev.map((p) => (p.id === currentUserId ? { ...p, readyAt: value ? Date.now() : null } : p)))
    }
    return true
  }, [currentUserId, refreshMine])

  /* ---------- Pantalla final: e-mail e idioma del informe ejecutivo ----------
     Devuelve null si se guardó, o el código de error: 'invalid_email' | 'sql' | 'network' */
  const saveReport = useCallback(async (email, lang) => {
    if (!currentUserId) return 'network'
    const clean = email.trim().toLowerCase()
    const patch = { reportEmail: clean, reportLang: lang, reportAt: Date.now() }
    if (REMOTE) {
      try { await api.setMyReport(currentUserId, clean, lang) } catch (err) {
        if (err.code === 'invalid_email') return 'invalid_email'
        if (err.code === 'PGRST202') return 'sql' // falta supabase/2026-11-informe.sql
        return 'network'
      }
      setMe((m) => (m?.id === currentUserId ? { ...m, ...patch } : m))
      api.ping('report')
      refreshMine()
    } else {
      setLocalParticipants((prev) => prev.map((p) => (p.id === currentUserId ? { ...p, ...patch } : p)))
    }
    return null
  }, [currentUserId, refreshMine])

  /* ---------- Notas de audio de cada ronda ---------- */
  const [notesOverride, setNotesOverride] = useState([]) // rondas enviadas en este dispositivo, antes de que lo confirme el servidor
  const myNotes = REMOTE ? [...(myTable?.notes ?? []), ...notesOverride] : (currentUser?.notedRounds ?? [])
  const noteSent = !!event.round && myNotes.includes(event.round)
  const submitNote = useCallback(async ({ round, tableId, topic, blob }) => {
    if (!currentUserId) return { uploaded: false }
    const res = await saveNote({ userId: currentUserId, round, tableId, topic, blob })
    if (REMOTE) {
      if (!res.uploaded) return res
      setNotesOverride((prev) => [...prev, round])
      api.ping('note')
      refreshMine()
    } else {
      setLocalParticipants((prev) => prev.map((p) => (p.id === currentUserId ? { ...p, notedRounds: [...new Set([...(p.notedRounds ?? []), round])] } : p)))
    }
    return res
  }, [currentUserId, refreshMine])

  /* ---------- Un solo resumen de audio por mesa: quién lo graba ----------
     Al acabar la ronda, cada móvil de la mesa elige «Je fais le résumé audio» o «Pas moi».
     Remoto: el servidor decide (supabase/2026-11-un-resumen-por-mesa.sql). Local: misma regla aquí. */
  const [remoteReporter, setRemoteReporter] = useState(null) // { round, members, reporter, forced, sent }
  const reporterRound = event.round
  const reporterTableId = myTableNow?.id ?? null
  const refreshReporter = useCallback(async () => {
    if (!REMOTE || !currentUserId || !reporterRound || reporterTableId == null) return
    try {
      const st = await api.fetchReporter(currentUserId, reporterRound)
      setRemoteReporter({ ...st, round: reporterRound })
    } catch { /* sin red o sin el SQL: se mantiene lo último conocido */ }
  }, [currentUserId, reporterRound, reporterTableId])
  // La pantalla «Temps écoulé» lo activa mientras está a la vista
  const watchReporter = useCallback(() => {
    if (!REMOTE) return () => {}
    refreshReporter()
    const off = api.onPing((kind) => (kind === 'reporter' || kind === 'note') && refreshReporter())
    const timer = setInterval(refreshReporter, REPORTER_POLL_MS)
    return () => { off(); clearInterval(timer) }
  }, [refreshReporter])

  let tableReporter = null
  if (REMOTE) {
    tableReporter = remoteReporter?.round === reporterRound ? remoteReporter : null
  } else if (myTableNow && reporterRound) {
    const real = myTableNow.members.filter((id) => participants.some((p) => p.id === id && !p.demo))
    const choices = Object.fromEntries(participants.filter((p) => p.reporterChoices?.[reporterRound]).map((p) => [p.id, p.reporterChoices[reporterRound]]))
    const sentIds = new Set(participants.filter((p) => p.notedRounds?.includes(reporterRound)).map((p) => p.id))
    tableReporter = reporterState(real, choices, sentIds)
  }

  /** choice: 'me' · 'pass' · 'relay'. Devuelve { lost } (true = otra persona se apuntó antes) */
  const chooseReporter = useCallback(async (choice) => {
    if (!currentUserId || !reporterRound) return { lost: false }
    if (REMOTE) {
      try {
        const st = await api.chooseReporter(currentUserId, reporterRound, choice)
        setRemoteReporter({ ...st, round: reporterRound })
        api.ping('reporter')
        return { lost: st.lost }
      } catch (err) {
        if (err.code === 'must_record') refreshReporter()
        return { lost: false, error: err.code ?? 'network' }
      }
    }
    const st = tableReporter
    if (!st) return { lost: false }
    if (choice === 'me' && st.reporter && st.reporter !== currentUserId) return { lost: true }
    if (choice === 'pass' && (st.reporter === currentUserId || st.forced === currentUserId)) return { lost: false, error: 'must_record' }
    const table = new Set(st.members.map((m) => m.id))
    setLocalParticipants((prev) => prev.map((p) => {
      let c = p.reporterChoices?.[reporterRound]
      if (p.id === currentUserId) c = choice === 'pass' ? 'pass' : 'me'
      else if (choice === 'relay' && table.has(p.id) && c === 'me') c = 'pass'
      else return p
      return { ...p, reporterChoices: { ...(p.reporterChoices ?? {}), [reporterRound]: c } }
    }))
    return { lost: false }
  }, [currentUserId, reporterRound, tableReporter, refreshReporter])

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
    if (isModHash(window.location.hash)) window.history.replaceState(null, '', window.location.pathname)
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
    if (isModHash(window.location.hash)) window.history.replaceState(null, '', window.location.pathname)
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
    setJoinedLive(true)
    setView(VIEWS.HOME)
    if (window.location.hash === JOIN_HASH) window.history.replaceState(null, '', window.location.pathname)
    window.scrollTo({ top: 0 })
    return 'ok'
  }, [localParticipants])

  // Solo olvida el perfil en ESTE dispositivo (el registro sigue en la base de datos)
  const forgetMe = useCallback(() => {
    setJoinedLive(false)
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
      window.alert(translate(currentLang(), err.code === 'locked' ? 'gate.locked' : 'gate.network'))
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

  // El Admin añade, edita o quita temas del evento. `oldId` = tema que se está editando (puede cambiar de título)
  const addEventTopic = useCallback((entry, oldId = null) => {
    if (REMOTE) return modAction((pin) => api.modSaveTopic(pin, entry, oldId))
    setLocalTopics((prev) => (oldId && prev.some((x) => x.id === oldId)
      ? prev.map((x) => (x.id === oldId ? entry : x))
      : [...prev, entry]))
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
      topics: topicsRef.current.map(({ id, family, mandatory }) => ({ id, family, mandatory: !!mandatory })),
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

  // Empezar una ronda: todas sus mesas a la vez (proyector con todos los nombres, cada móvil con la
  // suya) y FIND_MINUTES para encontrar la mesa. `startedAt` queda en el futuro: hasta esa hora es
  // «encuentra tu mesa» y a partir de ella corre la conversación, sin que nadie tenga que pulsar nada.
  const enterRound = (e, n) => patchRound({ ...e, round: n }, n - 1, {
    tables: e.rounds[n - 1].plan, revealed: e.rounds[n - 1].plan.length, startedAt: Date.now() + FIND_MS, pauseStartedAt: null,
  })

  // Siguiente paso (clic, espacio, flecha o mando de presentación):
  // encontrar la mesa (2 min) → conversación → «Tiempo terminado» (notas de audio) → (pausa tras la ronda 3)
  // → ronda siguiente → fin. Pulsar durante la conversación la termina ya: los móviles pasan a grabar la nota.
  const nextStep = (e) => {
    if (e.finished || !e.rounds.length) return e
    if (!e.round) return enterRound(e, 1)
    const i = e.round - 1
    const r = e.rounds[i]
    if (!r.startedAt) return enterRound(e, e.round)
    if (r.startedAt > Date.now()) return patchRound(e, i, { startedAt: Date.now() }) // ya están todos sentados
    if (Date.now() < r.startedAt + ROUND_MS) return patchRound(e, i, { startedAt: Date.now() - ROUND_MS }) // terminar la conversación
    if (e.round === PAUSE_AFTER_ROUND && e.round < e.rounds.length && !r.pauseStartedAt) return patchRound(e, i, { pauseStartedAt: Date.now() })
    if (e.round < e.rounds.length) return enterRound(e, e.round + 1)
    return { ...e, finished: true }
  }
  const advance = useCallback(() => changeEvent(nextStep), [changeEvent])

  // Tras el tiempo de la ronda `n`, cuando todos han enviado su nota de audio: siguiente paso
  // (solo si la ronda en pantalla sigue siendo esa y su tiempo ha terminado)
  const advanceAfterNotes = useCallback((n) => changeEvent((e) => {
    const r = e.rounds[n - 1]
    if (e.finished || e.round !== n || !r?.startedAt || r.pauseStartedAt || Date.now() < r.startedAt + ROUND_MS) return e
    return nextStep(e)
  }), [changeEvent])

  // Solo desde el principio: lo usa el arranque automático cuando todos están «Preparados»
  // (si hay dos paneles abiertos, el segundo no se salta la búsqueda de mesa)
  const startEvent = useCallback(() => changeEvent((e) => (e.round || e.finished || !e.rounds.length ? e : enterRound(e, 1))), [changeEvent])

  // Deshace el último paso (por si se pulsa una vez de más)
  const stepBack = useCallback(() => changeEvent((e) => {
    if (e.finished) return { ...e, finished: false }
    if (!e.round) return e
    const i = e.round - 1
    const r = e.rounds[i]
    if (r.pauseStartedAt) return patchRound(e, i, { pauseStartedAt: null })
    if (r.startedAt && r.startedAt + ROUND_MS <= Date.now()) return patchRound(e, i, { startedAt: Date.now() }) // «Tiempo terminado» → conversación de nuevo
    if (r.startedAt && r.startedAt <= Date.now()) return patchRound(e, i, { startedAt: Date.now() + FIND_MS })
    const back = patchRound(e, i, { tables: [], revealed: 0, startedAt: null })
    return { ...back, round: e.round - 1 }
  }), [changeEvent])

  const restartTimer = useCallback(() => changeEvent((e) => {
    const r = e.round ? e.rounds[e.round - 1] : null
    if (!r || e.finished) return e
    if (r.pauseStartedAt) return patchRound(e, e.round - 1, { pauseStartedAt: Date.now() })
    return r.startedAt ? patchRound(e, e.round - 1, { startedAt: Date.now() }) : e
  }), [changeEvent])

  const finishEvent = useCallback(() => changeEvent((e) => ({ ...e, finished: true })), [changeEvent])
  // Vuelve al principio conservando el plan (para ensayar), o borra el plan entero
  // Todos vuelven a «no preparados» (al reiniciar o borrar el plan)
  const resetReady = useCallback(() => {
    if (REMOTE) return modAction(async (pin) => { await api.modResetReady(pin); await api.modClearNotes(pin).catch(() => {}) })
    setLocalParticipants((prev) => prev.map((p) => (p.readyAt || p.notedRounds || p.reporterChoices || p.reportAt
      ? { ...p, readyAt: null, notedRounds: [], reporterChoices: {}, reportEmail: null, reportLang: null, reportAt: null } : p)))
  }, [modAction])
  const resetEvent = useCallback(() => {
    resetReady()
    return changeEvent((e) => ({ round: 0, finished: false, rounds: e.rounds.map((r) => newRound(r.plan)) }))
  }, [changeEvent, resetReady])
  const clearPlan = useCallback(() => {
    resetReady()
    return changeEvent(() => EMPTY_EVENT)
  }, [changeEvent, resetReady])

  // Arranque automático: en cuanto todas las personas reales con mesa en la ronda 1 han pulsado «Preparado»
  const firstRoundPeople = event.rounds[0]?.plan.flatMap((t) => t.members) ?? []
  const realPeople = participants.filter((p) => !p.demo && firstRoundPeople.includes(p.id))
  const readyCount = realPeople.filter((p) => p.readyAt).length
  const allReady = modUnlocked && !event.round && !event.finished && realPeople.length > 0 && readyCount === realPeople.length
  useEffect(() => { if (allReady) startEvent() }, [allReady, startEvent])

  // Resúmenes de audio de la ronda en pantalla: uno por mesa. Cuando todas las mesas con alguna persona
  // real tienen el suyo, se pasa solo a la siguiente (pausa tras la ronda 3, o el final)
  const realIds = new Set(participants.filter((p) => !p.demo).map((p) => p.id))
  const realTables = currentRound && !event.finished
    ? currentRound.tables.map((t) => t.members.filter((id) => realIds.has(id))).filter((m) => m.length)
    : []
  const notedIds = new Set(REMOTE
    ? (modState?.notes ?? []).filter((n) => n.round === event.round).map((n) => n.id)
    : participants.filter((p) => p.notedRounds?.includes(event.round)).map((p) => p.id))
  const notedCount = realTables.filter((m) => m.some((id) => notedIds.has(id))).length
  const allNoted = modUnlocked && event.round > 0 && !currentRound?.pauseStartedAt && realTables.length > 0 && notedCount === realTables.length
  useEffect(() => { if (allNoted) advanceAfterNotes(event.round) }, [allNoted, advanceAfterNotes, event.round])

  const value = useMemo(() => ({
    remote: REMOTE,
    view, navigate,
    participants, currentUser, event, currentRound, seatedEver,
    modLoading: REMOTE && modUnlocked && !modState,
    register, login, joinedLive, myPlan, ready, setReady, saveReport, readyCount, readyTotal: realPeople.length, startEvent, noteSent, submitNote, tableReporter, watchReporter, chooseReporter, notedCount, notedTotal: realTables.length, forgetMe, removeParticipant, seedDemo, clearDemo,
    canEditProfile, updateProfile, profileUpdatedAt,
    eventTopics, eventTopicsLoaded, loadEventTopics, addEventTopic, removeEventTopic, history,
    modUnlocked, gateOpen, openGate, closeGate, unlockModerator, lockModerator,
    planning, generatePlan, regeneratePlanRound, swapSeats, moveSeat,
    advance, stepBack, restartTimer, finishEvent, resetEvent, clearPlan,
  }), [view, navigate, participants, currentUser, event, currentRound, seatedEver, modUnlocked, modState,
    register, login, joinedLive, myPlan, ready, setReady, saveReport, readyCount, realPeople.length, startEvent, noteSent, submitNote, tableReporter, watchReporter, chooseReporter, notedCount, realTables.length, forgetMe, removeParticipant, seedDemo, clearDemo,
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

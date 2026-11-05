import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { EVENT_DATE } from '../constants'
import WaitingView from './WaitingView'
import RoundCardView from './RoundCardView'
import LobbyView from './LobbyView'
import MyTablesView from './MyTablesView'

/**
 * Vista pública de un participante ya registrado:
 *  - por defecto → su perfil, sus mesas y la cuenta atrás al día del evento
 *  - día del evento (entró con nombre + código tras escanear el QR, o ya es el día):
 *      mis mesas de cada ronda + «Preparado» → espera con frases hasta que todos estén preparados
 *  - en cuanto empieza la ronda y tiene mesa → «Encuentra tu mesa» (2 min) → ronda con cuenta atrás
 */
export default function HomeView() {
  const { event, seatedEver, joinedLive, ready, progress } = useApp()
  const [peek, setPeek] = useState(false) // ya preparado, repasando sus mesas
  if (event.round && seatedEver) return <RoundCardView />
  const eventDay = !event.finished && (joinedLive || Date.now() >= EVENT_DATE)
  if (!eventDay) return <WaitingView />
  if (!ready) return <MyTablesView />
  if (peek) return <MyTablesView onBack={() => setPeek(false)} />
  return <LobbyView onTables={() => setPeek(true)} count={progress && { n: progress.ready, total: progress.readyTotal }} />
}

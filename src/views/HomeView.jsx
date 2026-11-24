import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { EVENT_DATE } from '../constants'
import WaitingView from './WaitingView'
import RoundCardView from './RoundCardView'
import LobbyView from './LobbyView'
import MyTablesView from './MyTablesView'
import NoTableView from './NoTableView'

/**
 * Vista pública de un participante ya registrado:
 *  - por defecto → su perfil, sus mesas y la cuenta atrás al día del evento
 *  - día del evento (entró con nombre + código tras escanear el QR, o ya es el día):
 *      mis mesas de cada ronda + «Preparado» → espera con frases hasta que todos estén preparados
 *      (si las mesas aún no están preparadas → su perfil, que aún puede modificar, + «Preparado»)
 *  - en cuanto empieza la ronda y tiene mesa → «Encuentra tu mesa» (2 min) → ronda con cuenta atrás
 */
export default function HomeView() {
  const { event, seatedEver, joinedLive, ready, progress, myPlan, planLoaded } = useApp()
  const [peek, setPeek] = useState(false) // ya preparado, repasando sus mesas
  if (event.round && seatedEver) return <RoundCardView />
  // La sesión ya empezó y no está en ninguna mesa (casi siempre: se registró otra vez hoy) → que entre con su código
  if (event.round && !event.finished && planLoaded && !myPlan.length) return <NoTableView />
  const eventDay = !event.finished && (joinedLive || Date.now() >= EVENT_DATE)
  if (!eventDay) return <WaitingView />
  if (!ready && planLoaded && !myPlan.length) return <WaitingView live />
  if (!ready) return <MyTablesView />
  const noPlan = planLoaded && !myPlan.length
  // Ya preparado pero sin mesas todavía: «Voir mon profil» → su perfil (puede seguir modificándolo)
  if (peek) return noPlan ? <WaitingView live onLobby={() => setPeek(false)} /> : <MyTablesView onBack={() => setPeek(false)} />
  return <LobbyView onTables={() => setPeek(true)} tablesLabel={noPlan ? 'lobby.seeProfile' : undefined} count={progress && { n: progress.ready, total: progress.readyTotal }} />
}

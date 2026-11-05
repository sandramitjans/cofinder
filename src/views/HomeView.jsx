import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { EVENT_DATE } from '../constants'
import WaitingView from './WaitingView'
import RoundCardView from './RoundCardView'
import LobbyView from './LobbyView'

/**
 * Vista pública de un participante ya registrado:
 *  - por defecto → su perfil, sus mesas y la cuenta atrás al día del evento
 *  - si ha entrado con nombre + código (QR del proyector) o ya es el día del evento, y la sesión
 *    aún no ha empezado → sala de espera con frases que van cambiando («esperando a que todo el mundo se conecte…»)
 *  - solo el día del evento, y solo si la persona YA tiene mesa asignada en algún tour
 *    → su tarjeta de mesa (que cambia sola en cada tour) o el cierre del evento
 *
 * Así, quien se registra mientras hay tours de prueba (o se registra tarde) nunca ve
 * pantallas del día del evento sin tener mesa.
 */
export default function HomeView() {
  const { event, seatedEver, joinedLive } = useApp()
  const [showProfile, setShowProfile] = useState(false)
  if (event.round && seatedEver) return <RoundCardView />
  const lobby = !event.finished && (joinedLive || Date.now() >= EVENT_DATE)
  if (lobby && !showProfile) return <LobbyView onProfile={() => setShowProfile(true)} />
  return <WaitingView onLobby={lobby ? () => setShowProfile(false) : null} />
}

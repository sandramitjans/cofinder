import { useApp } from '../context/AppContext'
import WaitingView from './WaitingView'
import RoundCardView from './RoundCardView'

/**
 * Vista pública de un participante ya registrado:
 *  - por defecto → tarjeta VIP + cuenta atrás al 25/11 + frases de Cupidon
 *  - solo el día del evento, y solo si la persona YA tiene mesa asignada en algún tour
 *    → su tarjeta de mesa (que cambia sola en cada tour) o el cierre del evento
 *
 * Así, quien se registra mientras hay tours de prueba (o se registra tarde) nunca ve
 * pantallas del día del evento sin tener mesa: sigue viendo su tarjeta VIP y la cuenta atrás.
 */
export default function HomeView() {
  const { event, currentUser } = useApp()
  const seated = event.rounds.some((r) => r.tables.some((t) => t.members.includes(currentUser?.id)))
  return event.round && seated ? <RoundCardView /> : <WaitingView />
}

import { useApp } from '../context/AppContext'
import WaitingView from './WaitingView'
import RoundCardView from './RoundCardView'

/**
 * Vista pública de un participante ya registrado. Su contenido depende del evento:
 *  - antes de la Ronda 1 → espera con cuenta atrás (sin pistas de la dinámica)
 *  - durante las rondas  → su tarjeta de mesa, que cambia sola en cada ronda
 *  - al finalizar        → cierre
 */
export default function HomeView() {
  const { event } = useApp()
  return event.round ? <RoundCardView /> : <WaitingView />
}

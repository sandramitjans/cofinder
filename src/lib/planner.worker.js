import { generatePlan, generateRound } from './matching'

/**
 * El cálculo del plan tarda unos segundos: se hace aquí, fuera del hilo de la interfaz,
 * para que el panel no se congele.
 *  { type: 'plan', people }                → [{ tables }, …] con los 8 tours
 *  { type: 'round', people, otherRounds }  → { tables } de un tour, sin repetir lo de los demás
 */
self.onmessage = ({ data }) => {
  const result = data.type === 'round'
    ? { tables: generateRound(data.people, data.otherRounds).tables }
    : generatePlan(data.people)
  self.postMessage(result)
}

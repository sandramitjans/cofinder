import { generatePlan, generateRound } from './matching'

/**
 * El cálculo del plan tarda unos segundos: se hace aquí, fuera del hilo de la interfaz,
 * para que el panel no se congele.
 *  `topics` = mesas añadidas desde el panel (si hay, solo se usan esas)
 *  { type: 'plan', people }                → [{ tables }, …] con los 8 tours
 *  { type: 'round', people, otherRounds }  → { tables } de un tour, sin repetir lo de los demás
 */
self.onmessage = ({ data }) => {
  const result = data.type === 'round'
    ? { tables: generateRound(data.people, data.otherRounds, { topics: data.topics }).tables }
    : generatePlan(data.people, { topics: data.topics })
  self.postMessage(result)
}

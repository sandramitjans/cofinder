import { generatePlan, generateRound } from './matching'
import { configureEventTopics } from './topics'

/**
 * El cálculo del plan tarda unos segundos: se hace aquí, fuera del hilo de la interfaz,
 * para que el panel no se congele.
 *  `topics` = temas añadidos desde el panel [{ id, family, mandatory }] (si hay, solo se usan esos)
 *  { type: 'plan', people }                → [{ tables }, …] con los 8 tours
 *  { type: 'round', people, otherRounds }  → { tables } de un tour, sin repetir lo de los demás
 */
self.onmessage = ({ data }) => {
  configureEventTopics(data.topics ?? [])
  const ids = (data.topics ?? []).map((x) => x.id)
  const result = data.type === 'round'
    ? { tables: generateRound(data.people, data.otherRounds, { topics: ids }).tables }
    : generatePlan(data.people, { topics: ids })
  self.postMessage(result)
}

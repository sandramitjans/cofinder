import { TOPICS, TABLE_SIZE } from '../constants'
import { isCustom, topicKey } from './topics'

/**
 * Algoritmo de multi-match de Cofinder.
 *
 * Para cada ronda:
 *  1. Elige tantos temas como mesas entre los 20 de la lista y los temas propios («Autre»)
 *     que al menos 2 personas han escrito de forma parecida. Prioriza los que tienen a la vez
 *     gente que los ofrece y gente que los demanda, y evita temas de rondas anteriores.
 *  2. Reparte a las personas en mesas de ~4 minimizando un coste:
 *       - la persona no ofrece ni demanda el tema de su mesa         (+3)
 *       - la persona ya trató ese tema en una ronda anterior          (+6)
 *       - dos personas ya coincidieron UNA vez                        (+20 por pareja)
 *       - dos personas ya coincidieron DOS veces (sería la tercera)   (+400: prácticamente prohibido)
 *       - dos personas de la misma filial/departamento                (+1 por pareja, fomenta cross-border)
 *       - la mesa no tiene ningún experto (oferta)                    (+6)
 *       - la mesa no tiene a nadie que lo demande                     (+4)
 *     Regla de la organización: dos personas no deben compartir mesa más de 2 veces,
 *     y se intenta que repitan lo menos posible.
 *  3. Reparto inicial voraz + búsqueda local por intercambios (enfriamiento simulado),
 *     con varios reinicios aleatorios; se queda con la mejor solución.
 */

export const MAX_MEETINGS_PER_PAIR = 2
const COST_SECOND_MEETING = 20
const COST_OVER_LIMIT = 400

const sameBranch = (a, b) => !!a && String(a).trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export function tableSizes(n) {
  if (n <= 0) return []
  const k = Math.max(1, Math.round(n / TABLE_SIZE))
  const base = Math.floor(n / k)
  const extra = n % k
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0))
}

/** Historial: cuántas veces ha coincidido cada pareja y qué temas ha tratado cada persona */
function buildHistory(rounds) {
  const pairs = new Map()
  const topicsByPerson = new Map()
  const usedTopics = new Set()
  for (const round of rounds) {
    for (const t of round.tables) {
      const key = topicKey(t.topic)
      usedTopics.add(key)
      t.members.forEach((id, i) => {
        if (!topicsByPerson.has(id)) topicsByPerson.set(id, new Set())
        topicsByPerson.get(id).add(key)
        for (const other of t.members.slice(i + 1)) {
          const pk = pairKey(id, other)
          pairs.set(pk, (pairs.get(pk) ?? 0) + 1)
        }
      })
    }
  }
  return { pairs, topicsByPerson, usedTopics }
}

/** Personas con sus temas convertidos en claves comparables */
const prepare = (people) =>
  new Map(people.map((p) => [p.id, {
    id: p.id,
    country: p.country,
    offers: new Set((p.offers ?? []).map(topicKey)),
    needs: new Set((p.needs ?? []).map(topicKey)),
  }]))

/** Temas candidatos: los 20 de la lista + temas propios compartidos por ≥ 2 personas */
function candidateTopics(people) {
  const list = TOPICS.map((id) => ({ id, key: id }))
  const custom = new Map() // clave → { id original, personas }
  for (const p of people) {
    const mine = new Set([...(p.offers ?? []), ...(p.needs ?? [])].filter(isCustom))
    const seen = new Set()
    for (const id of mine) {
      const key = topicKey(id)
      if (seen.has(key)) continue
      seen.add(key)
      if (!custom.has(key)) custom.set(key, { id, key, count: 0 })
      custom.get(key).count++
    }
  }
  return [...list, ...[...custom.values()].filter((c) => c.count >= 2)]
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickTopics(candidates, prepared, k, history) {
  const people = [...prepared.values()]
  return candidates.map((c) => {
    const supply = people.filter((p) => p.offers.has(c.key)).length
    const demand = people.filter((p) => p.needs.has(c.key)).length
    let score = Math.min(supply, demand) * 3 + supply + demand + Math.random() * 2
    if (supply === 0) score -= 4
    if (history.usedTopics.has(c.key)) score -= 10
    return { ...c, score }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

function tableCost(key, members, byId, history) {
  let cost = 0
  let offerers = 0
  let needers = 0
  members.forEach((id, i) => {
    const p = byId.get(id)
    const offers = p.offers.has(key)
    const needs = p.needs.has(key)
    if (offers) offerers++
    if (needs) needers++
    if (!offers && !needs) cost += 3
    if (history.topicsByPerson.get(id)?.has(key)) cost += 6
    for (const otherId of members.slice(i + 1)) {
      const met = history.pairs.get(pairKey(id, otherId)) ?? 0
      if (met >= MAX_MEETINGS_PER_PAIR) cost += COST_OVER_LIMIT
      else if (met === 1) cost += COST_SECOND_MEETING
      if (sameBranch(byId.get(otherId).country, p.country)) cost += 1
    }
  })
  if (members.length) {
    if (offerers === 0) cost += 6
    if (needers === 0) cost += 4
  }
  return cost
}

const snapshot = (tables, cost) => ({ cost, tables: tables.map((t) => ({ topic: t.topic, key: t.key, members: [...t.members] })) })

export function generateRound(people, previousRounds = [], { attempts = 24, iterations = 4000 } = {}) {
  if (!people.length) return { tables: [], cost: 0 }
  const byId = prepare(people)
  const history = buildHistory(previousRounds)
  const sizes = tableSizes(people.length)
  const candidates = candidateTopics(people)
  let best = null

  for (let a = 0; a < attempts; a++) {
    const tables = pickTopics(candidates, byId, sizes.length, history)
      .map((c, i) => ({ topic: c.id, key: c.key, cap: sizes[i], members: [] }))

    // Reparto voraz
    for (const p of shuffle(people)) {
      let target = null
      let delta = Infinity
      for (const t of tables) {
        if (t.members.length >= t.cap) continue
        const d = tableCost(t.key, [...t.members, p.id], byId, history) - tableCost(t.key, t.members, byId, history)
        if (d < delta) { delta = d; target = t }
      }
      target.members.push(p.id)
    }

    // Búsqueda local: intercambios entre mesas
    const costs = tables.map((t) => tableCost(t.key, t.members, byId, history))
    if (tables.length > 1) {
      for (let it = 0; it < iterations; it++) {
        const i = Math.floor(Math.random() * tables.length)
        let j = Math.floor(Math.random() * (tables.length - 1))
        if (j >= i) j++
        const A = tables[i].members
        const B = tables[j].members
        const x = Math.floor(Math.random() * A.length)
        const y = Math.floor(Math.random() * B.length);
        [A[x], B[y]] = [B[y], A[x]]
        const ci = tableCost(tables[i].key, A, byId, history)
        const cj = tableCost(tables[j].key, B, byId, history)
        const delta = ci + cj - costs[i] - costs[j]
        const temperature = 6 * (1 - it / iterations) // se "enfría" hasta aceptar solo mejoras
        if (delta <= 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 1e-3))) {
          costs[i] = ci; costs[j] = cj
          const total = costs.reduce((s, c) => s + c, 0)
          if (!best || total < best.cost) best = snapshot(tables, total)
        } else {
          [A[x], B[y]] = [B[y], A[x]]
        }
      }
    }

    const total = costs.reduce((s, c) => s + c, 0)
    if (!best || total < best.cost) best = snapshot(tables, total)
  }

  return { cost: best.cost, tables: best.tables.map((t, i) => ({ id: i + 1, topic: t.topic, members: t.members })) }
}

/** Rol de una persona respecto al tema de su mesa (los temas propios se comparan normalizados) */
export function roleOf(person, topic) {
  const key = topicKey(topic)
  const offers = (person?.offers ?? []).some((x) => topicKey(x) === key)
  const needs = (person?.needs ?? []).some((x) => topicKey(x) === key)
  if (offers && needs) return 'both'
  if (offers) return 'expert'
  if (needs) return 'learner'
  return 'curious'
}

/** Indicadores de calidad de una ronda para el panel */
export function roundStats(round, previousRounds, byId) {
  const history = buildHistory(previousRounds)
  let repeatedPairs = 0
  let overLimitPairs = 0
  let repeatedTopics = 0
  let tablesWithoutExpert = 0
  for (const t of round.tables) {
    const key = topicKey(t.topic)
    t.members.forEach((id, i) => {
      if (history.topicsByPerson.get(id)?.has(key)) repeatedTopics++
      for (const other of t.members.slice(i + 1)) {
        const met = history.pairs.get(pairKey(id, other)) ?? 0
        if (met >= 1) repeatedPairs++
        if (met >= MAX_MEETINGS_PER_PAIR) overLimitPairs++
      }
    })
    if (!t.members.some((id) => (byId.get(id)?.offers ?? []).some((x) => topicKey(x) === key))) tablesWithoutExpert++
  }
  return { repeatedPairs, overLimitPairs, repeatedTopics, tablesWithoutExpert }
}

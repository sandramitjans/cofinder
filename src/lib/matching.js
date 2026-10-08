import { TOPICS, TABLE_SIZE } from '../constants'

/**
 * Algoritmo de multi-match de Cofinder.
 *
 * Para cada ronda:
 *  1. Elige tantos temas como mesas, priorizando los que tienen a la vez gente que
 *     los ofrece y gente que los demanda, y evitando temas de rondas anteriores.
 *  2. Reparte a las personas en mesas de ~4 minimizando un coste:
 *       - la persona no ofrece ni demanda el tema de su mesa      (+3)
 *       - la persona ya trató ese tema en una ronda anterior       (+6)
 *       - dos personas de la mesa ya coincidieron antes            (+20 por pareja)
 *       - dos personas de la misma filial/departamento comparten mesa (+1 por pareja, fomenta cross-border)
 *       - la mesa no tiene ningún experto (oferta)                 (+6)
 *       - la mesa no tiene a nadie que lo demande                  (+4)
 *  3. Reparto inicial voraz + búsqueda local por intercambios (enfriamiento simulado),
 *     con varios reinicios aleatorios; se queda con la mejor solución.
 */

const sameBranch = (a, b) => !!a && String(a).trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

export function tableSizes(n) {
  if (n <= 0) return []
  const k = Math.max(1, Math.round(n / TABLE_SIZE))
  const base = Math.floor(n / k)
  const extra = n % k
  return Array.from({ length: k }, (_, i) => base + (i < extra ? 1 : 0))
}

function buildHistory(rounds) {
  const pairs = new Set()
  const topicsByPerson = new Map()
  const usedTopics = new Set()
  for (const round of rounds) {
    for (const t of round.tables) {
      usedTopics.add(t.topic)
      t.members.forEach((id, i) => {
        if (!topicsByPerson.has(id)) topicsByPerson.set(id, new Set())
        topicsByPerson.get(id).add(t.topic)
        for (const other of t.members.slice(i + 1)) pairs.add(pairKey(id, other))
      })
    }
  }
  return { pairs, topicsByPerson, usedTopics }
}

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickTopics(people, k, history) {
  return TOPICS.map((topic) => {
    const supply = people.filter((p) => p.offers.includes(topic)).length
    const demand = people.filter((p) => p.needs.includes(topic)).length
    let score = Math.min(supply, demand) * 3 + supply + demand + Math.random() * 2
    if (supply === 0) score -= 4
    if (history.usedTopics.has(topic)) score -= 10
    return { topic, score }
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((t) => t.topic)
}

function tableCost(topic, members, byId, history) {
  let cost = 0
  let offerers = 0
  let needers = 0
  members.forEach((id, i) => {
    const p = byId.get(id)
    const offers = p.offers.includes(topic)
    const needs = p.needs.includes(topic)
    if (offers) offerers++
    if (needs) needers++
    if (!offers && !needs) cost += 3
    if (history.topicsByPerson.get(id)?.has(topic)) cost += 6
    for (const otherId of members.slice(i + 1)) {
      if (history.pairs.has(pairKey(id, otherId))) cost += 20
      if (sameBranch(byId.get(otherId).country, p.country)) cost += 1
    }
  })
  if (members.length) {
    if (offerers === 0) cost += 6
    if (needers === 0) cost += 4
  }
  return cost
}

const snapshot = (tables, cost) => ({ cost, tables: tables.map((t) => ({ topic: t.topic, members: [...t.members] })) })

export function generateRound(people, previousRounds = [], { attempts = 24, iterations = 4000 } = {}) {
  if (!people.length) return { tables: [], cost: 0 }
  const byId = new Map(people.map((p) => [p.id, p]))
  const history = buildHistory(previousRounds)
  const sizes = tableSizes(people.length)
  let best = null

  for (let a = 0; a < attempts; a++) {
    const tables = pickTopics(people, sizes.length, history).map((topic, i) => ({ topic, cap: sizes[i], members: [] }))

    // Reparto voraz
    for (const p of shuffle(people)) {
      let target = null
      let delta = Infinity
      for (const t of tables) {
        if (t.members.length >= t.cap) continue
        const d = tableCost(t.topic, [...t.members, p.id], byId, history) - tableCost(t.topic, t.members, byId, history)
        if (d < delta) { delta = d; target = t }
      }
      target.members.push(p.id)
    }

    // Búsqueda local: intercambios entre mesas
    const costs = tables.map((t) => tableCost(t.topic, t.members, byId, history))
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
        const ci = tableCost(tables[i].topic, A, byId, history)
        const cj = tableCost(tables[j].topic, B, byId, history)
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

  return { cost: best.cost, tables: best.tables.map((t, i) => ({ id: i + 1, ...t })) }
}

/** Rol de una persona respecto al tema de su mesa */
export function roleOf(person, topic) {
  const offers = person?.offers?.includes(topic)
  const needs = person?.needs?.includes(topic)
  if (offers && needs) return 'both'
  if (offers) return 'expert'
  if (needs) return 'learner'
  return 'curious'
}

/** Indicadores de calidad de una ronda para el panel */
export function roundStats(round, previousRounds, byId) {
  const history = buildHistory(previousRounds)
  let repeatedPairs = 0
  let repeatedTopics = 0
  let tablesWithoutExpert = 0
  for (const t of round.tables) {
    t.members.forEach((id, i) => {
      if (history.topicsByPerson.get(id)?.has(t.topic)) repeatedTopics++
      for (const other of t.members.slice(i + 1)) if (history.pairs.has(pairKey(id, other))) repeatedPairs++
    })
    if (!t.members.some((id) => byId.get(id)?.offers.includes(t.topic))) tablesWithoutExpert++
  }
  return { repeatedPairs, repeatedTopics, tablesWithoutExpert }
}

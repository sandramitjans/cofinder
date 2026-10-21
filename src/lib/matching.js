import { TOPICS, TOTAL_ROUNDS, MIN_TABLE_SIZE, MAX_TABLE_SIZE, MAX_TABLES } from '../constants'
import { isCustom, topicKey } from './topics'

/**
 * Algoritmo de multi-match de Cofinder.
 *
 * La semana anterior al evento se genera de una vez el PLAN de los 8 tours (`generatePlan`), que
 * la moderadora revisa, retoca y publica. Cada tour se calcula con `generateRound` teniendo en
 * cuenta los tours ya planificados:
 *  1. Elige entre MIN y MAX_TABLES temas entre los 20 de la lista y los temas propios («Autre»)
 *     que al menos 2 personas han escrito de forma parecida. Prioriza los más pedidos y evita
 *     temas de tours anteriores.
 *  2. Reparte a TODAS las personas en mesas de 2 a 5 minimizando un coste:
 *       - la persona no ha elegido el tema de su mesa                (+8)
 *       - la persona ya trató ese tema en otro tour                  (+60)
 *       - dos personas ya coincidieron una vez                       (+4 por pareja)
 *       - dos personas ya coincidieron dos veces                     (+15)
 *       - dos personas ya coincidieron tres veces (sería la cuarta)  (+400: prácticamente prohibido)
 *       - dos personas de la misma filial/departamento               (+1 por pareja, fomenta cross-border)
 *       - el tema ya salió en otro tour                              (+3 por vez)
 *       - si hay perfiles con «Je maîtrise»: mesa sin experto (+6) o sin nadie que lo demande (+4)
 *     Con ~12 personas y 8 tours es imposible no repetir parejas, así que el límite es 3 veces.
 *  3. Reparto inicial voraz + búsqueda local (intercambiar personas, mover a alguien de mesa y
 *     cambiar el tema de una mesa) con enfriamiento simulado y varios reinicios. Mover personas
 *     es lo que hace que el tamaño de cada mesa salga de la demanda de su tema.
 */

export const MAX_MEETINGS_PER_PAIR = 3
const COST_NOT_CHOSEN = 8
const COST_TOPIC_AGAIN = 60
const COST_MET = [0, 4, 15]
const COST_OVER_LIMIT = 400
const COST_TOPIC_REUSED = 3

const sameBranch = (a, b) => !!a && String(a).trim().toLowerCase() === String(b ?? '').trim().toLowerCase()
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** Cuántas mesas puede tener un tour con n personas: [mínimo, máximo] */
export function tableRange(n) {
  if (n < MIN_TABLE_SIZE * 2) return [1, 1]
  const min = Math.ceil(n / MAX_TABLE_SIZE)
  const max = Math.max(min, Math.min(MAX_TABLES, Math.floor(n / MIN_TABLE_SIZE)))
  return [min, max]
}

const evenSizes = (n, k) => Array.from({ length: k }, (_, i) => Math.floor(n / k) + (i < n % k ? 1 : 0))

/** Historial: cuántas veces ha coincidido cada pareja, qué temas ha tratado cada persona y cuántas veces salió cada tema */
function buildHistory(rounds) {
  const pairs = new Map()
  const topicsByPerson = new Map()
  const usedTopics = new Map()
  for (const round of rounds) {
    for (const t of round.tables) {
      const key = topicKey(t.topic)
      usedTopics.set(key, (usedTopics.get(key) ?? 0) + 1)
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

/** Interés de cada tema candidato: gente que lo ha elegido y que todavía no lo ha tratado */
function scoreTopics(candidates, prepared, history) {
  const people = [...prepared.values()]
  return candidates.map((c) => {
    const fresh = (p) => !history.topicsByPerson.get(p.id)?.has(c.key)
    const supply = people.filter((p) => p.offers.has(c.key) && fresh(p)).length
    const demand = people.filter((p) => p.needs.has(c.key) && fresh(p)).length
    let score = supply + demand + Math.min(supply, demand) * 2
    score -= (history.usedTopics.get(c.key) ?? 0) * 2
    return { ...c, score }
  })
}

const pickTopics = (scored, k) =>
  scored.map((c) => ({ ...c, s: c.score + Math.random() * 3 })).sort((a, b) => b.s - a.s).slice(0, k)

function tableCost(key, members, byId, history, expertMode) {
  let cost = 0
  let offerers = 0
  let needers = 0
  members.forEach((id, i) => {
    const p = byId.get(id)
    const offers = p.offers.has(key)
    const needs = p.needs.has(key)
    if (offers) offerers++
    if (needs) needers++
    if (!offers && !needs) cost += COST_NOT_CHOSEN
    if (history.topicsByPerson.get(id)?.has(key)) cost += COST_TOPIC_AGAIN
    for (const otherId of members.slice(i + 1)) {
      const met = history.pairs.get(pairKey(id, otherId)) ?? 0
      cost += met >= MAX_MEETINGS_PER_PAIR ? COST_OVER_LIMIT : COST_MET[met]
      if (sameBranch(byId.get(otherId).country, p.country)) cost += 1
    }
  })
  if (members.length) {
    cost += (history.usedTopics.get(key) ?? 0) * COST_TOPIC_REUSED
    if (expertMode && offerers === 0) cost += 6
    if (expertMode && needers === 0) cost += 4
  }
  return cost
}

const snapshot = (tables, cost) => ({ cost, tables: tables.map((t) => ({ topic: t.topic, key: t.key, members: [...t.members] })) })

/**
 * Un tour: todas las personas sentadas en mesas de 2 a 5 (como mucho MAX_TABLES mesas).
 * `previousRounds` = los demás tours del plan, para no repetir temas ni parejas.
 */
export function generateRound(people, previousRounds = [], { attempts = 24, iterations = 4000 } = {}) {
  if (!people.length) return { tables: [], cost: 0 }
  const byId = prepare(people)
  const history = buildHistory(previousRounds)
  const expertMode = [...byId.values()].some((p) => p.offers.size > 0)
  const [kMin, kMax] = tableRange(people.length)
  const minSize = people.length < MIN_TABLE_SIZE * 2 ? 1 : MIN_TABLE_SIZE
  const maxSize = Math.max(MAX_TABLE_SIZE, Math.ceil(people.length / kMax))
  const scored = scoreTopics(candidateTopics(people), byId, history)
  const cost = (t) => tableCost(t.key, t.members, byId, history, expertMode)
  let best = null

  for (let a = 0; a < attempts; a++) {
    const k = kMin + (a % (kMax - kMin + 1))
    const sizes = evenSizes(people.length, k)
    const tables = pickTopics(scored, k).map((c, i) => ({ topic: c.id, key: c.key, cap: sizes[i], members: [] }))

    // Reparto voraz
    for (const p of shuffle(people)) {
      let target = null
      let delta = Infinity
      for (const t of tables) {
        if (t.members.length >= t.cap) continue
        const d = tableCost(t.key, [...t.members, p.id], byId, history, expertMode) - cost(t)
        if (d < delta) { delta = d; target = t }
      }
      target.members.push(p.id)
    }

    // Búsqueda local: intercambiar, mover de mesa o cambiar el tema de una mesa
    const costs = tables.map(cost)
    const total = () => costs.reduce((s, c) => s + c, 0)
    for (let it = 0; it < iterations && tables.length > 1; it++) {
      const temperature = 6 * (1 - it / iterations) // se "enfría" hasta aceptar solo mejoras
      const accept = (delta) => delta <= 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 1e-3))
      const i = Math.floor(Math.random() * tables.length)
      let j = Math.floor(Math.random() * (tables.length - 1))
      if (j >= i) j++
      const A = tables[i]
      const B = tables[j]
      const move = Math.random()

      if (move < 0.08) {
        // Cambiar el tema de la mesa A por otro candidato que no esté en este tour
        const inUse = new Set(tables.map((t) => t.key))
        const free = scored.filter((c) => !inUse.has(c.key))
        if (!free.length) continue
        const c = free[Math.floor(Math.random() * free.length)]
        const prev = { topic: A.topic, key: A.key }
        A.topic = c.id; A.key = c.key
        const ci = cost(A)
        if (accept(ci - costs[i])) costs[i] = ci
        else { A.topic = prev.topic; A.key = prev.key }
      } else if (move < 0.4) {
        // Mover a una persona de A a B (el tamaño de las mesas sale de la demanda)
        if (A.members.length <= minSize || B.members.length >= maxSize) continue
        const x = Math.floor(Math.random() * A.members.length)
        const [id] = A.members.splice(x, 1)
        B.members.push(id)
        const ci = cost(A)
        const cj = cost(B)
        if (accept(ci + cj - costs[i] - costs[j])) { costs[i] = ci; costs[j] = cj }
        else { B.members.pop(); A.members.splice(x, 0, id) }
      } else {
        const x = Math.floor(Math.random() * A.members.length)
        const y = Math.floor(Math.random() * B.members.length);
        [A.members[x], B.members[y]] = [B.members[y], A.members[x]]
        const ci = cost(A)
        const cj = cost(B)
        if (accept(ci + cj - costs[i] - costs[j])) { costs[i] = ci; costs[j] = cj }
        else [A.members[x], B.members[y]] = [B.members[y], A.members[x]]
      }
      if (!best || total() < best.cost) best = snapshot(tables, total())
    }

    if (!best || total() < best.cost) best = snapshot(tables, total())
  }

  // Mesas más grandes primero: la Table 1 es la más concurrida
  const tables = [...best.tables].sort((x, y) => y.members.length - x.members.length)
  return { cost: best.cost, tables: tables.map((t, i) => ({ id: i + 1, topic: t.topic, members: t.members })) }
}

/**
 * Plan completo de la soirée: `rounds` tours encadenados. Se repite varias veces y se queda
 * con el de menor coste total. Devuelve [{ tables }, …].
 */
export function generatePlan(people, { rounds = TOTAL_ROUNDS, restarts = 2, attempts = 10, iterations = 3000 } = {}) {
  let best = null
  for (let r = 0; r < restarts; r++) {
    const plan = []
    let cost = 0
    for (let i = 0; i < rounds; i++) {
      const res = generateRound(people, plan, { attempts, iterations })
      plan.push({ tables: res.tables })
      cost += res.cost
    }
    if (!best || cost < best.cost) best = { cost, plan }
  }
  return best?.plan ?? []
}

/** Indicadores de calidad del plan completo para el panel */
export function planStats(rounds, byId) {
  const pairs = new Map()
  const seen = new Map()
  const contacts = new Map()
  let seats = 0
  let chosen = 0
  let repeatedTopics = 0
  let maxTables = 0
  for (const round of rounds) {
    maxTables = Math.max(maxTables, round.tables.length)
    for (const t of round.tables) {
      const key = topicKey(t.topic)
      t.members.forEach((id, i) => {
        const p = byId.get(id)
        if (!p) return
        seats++
        if ([...(p.offers ?? []), ...(p.needs ?? [])].some((x) => topicKey(x) === key)) chosen++
        if (!seen.has(id)) seen.set(id, new Set())
        if (seen.get(id).has(key)) repeatedTopics++
        seen.get(id).add(key)
        if (!contacts.has(id)) contacts.set(id, new Set())
        for (const other of t.members.slice(i + 1)) {
          if (!byId.has(other)) continue
          const pk = pairKey(id, other)
          pairs.set(pk, (pairs.get(pk) ?? 0) + 1)
          contacts.get(id).add(other)
          if (!contacts.has(other)) contacts.set(other, new Set())
          contacts.get(other).add(id)
        }
      })
    }
  }
  const people = [...contacts.values()]
  return {
    chosenPct: seats ? Math.round((chosen / seats) * 100) : 0,
    repeatedTopics,
    overLimitPairs: [...pairs.values()].filter((n) => n > MAX_MEETINGS_PER_PAIR).length,
    avgContacts: people.length ? people.reduce((s, c) => s + c.size, 0) / people.length : 0,
    maxTables,
  }
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

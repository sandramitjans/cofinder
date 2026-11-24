import { TOTAL_ROUNDS, MIN_TABLE_SIZE, MAX_TABLE_SIZE, MAX_TABLES, MAX_TABLES_PER_TOPIC } from '../constants'
import { chosenTopics, hasTopic, isCustom, isMandatory, mandatoryTopics, topicKey, optionalTopics } from './topics'

/**
 * Algoritmo de multi-match de Cofinder.
 *
 * La semana anterior al evento se genera de una vez el PLAN de los 8 tours (`generatePlan`), que
 * la moderadora revisa, retoca y publica. Cada tour se calcula con `generateRound` teniendo en
 * cuenta los tours ya planificados:
 *  1. Elige entre MIN y MAX_TABLES temas: los 4 obligatorios (que cuentan como elegidos por todo
 *     el mundo), los de la lista y los temas propios («Autre») que al menos 2 personas han escrito
 *     de forma parecida. Un mismo tema puede ocupar hasta MAX_TABLES_PER_TOPIC mesas del tour.
 *     Prioriza los más pedidos y evita temas de tours anteriores.
 *  2. Reparte a TODAS las personas en mesas de 3 a 4 minimizando un coste:
 *       - la persona no ha elegido el tema de su mesa                (+8)
 *       - la persona ya trató ese tema en otro tour                  (+60)
 *       - dos personas ya coincidieron una vez                       (+4 por pareja)
 *       - dos personas ya coincidieron dos veces                     (+15)
 *       - dos personas ya coincidieron tres veces (sería la cuarta)  (+400: prácticamente prohibido)
 *       - dos personas de la misma filial/departamento               (+1 por pareja, fomenta cross-border)
 *       - el tema ya salió en otro tour                              (+3 por vez)
 *       - si hay perfiles con nivel: mesa sin nadie Avancé en el tema (+300: regla del evento, siempre
 *         al menos una persona avanzada por mesa), sin nadie con experiencia (+50), todos Avancé sin
 *         nadie que venga a aprender (+3) o sin nadie que lo haya elegido (+4)
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
const COST_NO_EXPERIENCE = 50
const COST_NO_ADVANCED = 300
const COST_ALL_ADVANCED = 3

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
    // Todos los temas de la persona (obligatorios + elegido) cuentan como «needs» (los ha elegido);
    // `offers` = con experiencia (Avancé o Intermédiaire) y `advanced` = solo Avancé (ver lib/topics.js)
    offers: new Set((p.offers ?? []).map(topicKey)),
    advanced: new Set((p.offers ?? []).filter((x) => !(p.needs ?? []).some((y) => topicKey(y) === topicKey(x))).map(topicKey)),
    needs: new Set([...mandatoryTopics(), ...chosenTopics(p)].map(topicKey)),
  }]))

/**
 * Temas candidatos. Si la moderadora ha añadido mesas desde el panel (`topics`), solo esas.
 * Si no: los obligatorios (+ temas «au choix», si los hubiera) + temas propios compartidos por ≥ 2 personas.
 */
function candidateTopics(people, topics = []) {
  const mandatory = mandatoryTopics().map((id) => ({ id, key: topicKey(id) }))
  if (topics.length) return [...mandatory, ...topics.filter((id) => !mandatory.some((m) => m.key === topicKey(id))).map((id) => ({ id, key: topicKey(id) }))]
  const list = [...mandatory, ...optionalTopics().map((id) => ({ id, key: topicKey(id) }))]
  const custom = new Map() // clave → { id original, personas }
  for (const p of people) {
    const mine = new Set(chosenTopics(p).filter(isCustom))
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

/** k temas para las mesas del tour; un tema muy pedido puede salir en hasta MAX_TABLES_PER_TOPIC mesas */
const pickTopics = (scored, k) =>
  scored.flatMap((c) => Array.from({ length: MAX_TABLES_PER_TOPIC }, (_, copy) => ({ ...c, s: c.score / (copy + 1) - copy * 2 + Math.random() * 3 })))
    .sort((a, b) => b.s - a.s).slice(0, k)

function tableCost(key, members, byId, history, expertMode) {
  let cost = 0
  let offerers = 0
  let advanced = 0
  let needers = 0
  members.forEach((id, i) => {
    const p = byId.get(id)
    const offers = p.offers.has(key)
    const needs = p.needs.has(key)
    if (offers) offerers++
    if (p.advanced.has(key)) advanced++
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
    if (expertMode && advanced === 0) cost += COST_NO_ADVANCED
    if (expertMode && offerers === 0) cost += COST_NO_EXPERIENCE
    if (expertMode && members.length > 1 && advanced === members.length) cost += COST_ALL_ADVANCED
    if (expertMode && needers === 0) cost += 4
  }
  return cost
}

const snapshot = (tables, cost) => ({ cost, tables: tables.map((t) => ({ topic: t.topic, key: t.key, members: [...t.members] })) })

/**
 * Un tour: todas las personas sentadas en mesas de 3 a 4 (como mucho MAX_TABLES mesas).
 * `previousRounds` = los demás tours del plan, para no repetir temas ni parejas.
 */
export function generateRound(people, previousRounds = [], { attempts = 24, iterations = 4000, topics = [] } = {}) {
  if (!people.length) return { tables: [], cost: 0 }
  const byId = prepare(people)
  const history = buildHistory(previousRounds)
  const expertMode = [...byId.values()].some((p) => p.offers.size > 0)
  const [kMin, kMax] = tableRange(people.length)
  const minSize = people.length < MIN_TABLE_SIZE * 2 ? 1 : MIN_TABLE_SIZE
  const maxSize = Math.max(MAX_TABLE_SIZE, Math.ceil(people.length / kMax)) // = 4 salvo con más de MAX_TABLES × 4 personas
  const scored = scoreTopics(candidateTopics(people, topics), byId, history)
  const cost = (t) => tableCost(t.key, t.members, byId, history, expertMode)
  let best = null

  for (let a = 0; a < attempts; a++) {
    // Cada tema puede ocupar hasta MAX_TABLES_PER_TOPIC mesas; con pocos temas no hay más mesas posibles
    const k = Math.max(1, Math.min(kMin + (a % (kMax - kMin + 1)), scored.length * MAX_TABLES_PER_TOPIC))
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
        // Cambiar el tema de la mesa A por otro candidato con sitio en este tour
        const inUse = new Map()
        tables.forEach((t) => inUse.set(t.key, (inUse.get(t.key) ?? 0) + 1))
        const free = scored.filter((c) => c.key !== A.key && (inUse.get(c.key) ?? 0) < MAX_TABLES_PER_TOPIC)
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
 * Plan cuando todos los temas son obligatorios y hay tantos temas como tours (p. ej. 4 temas y 4 tours):
 * cada persona pasa exactamente una vez por cada tema. Se busca un horario (qué tema hace cada persona
 * en cada tour) cambiando el orden de los temas de una persona (enfriamiento simulado), con este coste:
 *  - grupo (tour, tema) imposible de dividir en mesas de 3 a 4 (1, 2 o 5 personas)          (+500)
 *  - mesa sin nadie Avancé en el tema (faltan avanzados en el grupo)                         (+300 por mesa)
 *  - mesa con 4 personas cuando podría tener 3 (preferir 4+3+3+3 a 4+4+…)                    (0: se deja libre)
 *  - parejas repetidas (+4 la segunda vez, +15 la tercera, +400 a partir de la cuarta) y misma filial (+1)
 * Además del cambio de orden de una persona, se prueba el intercambio de dos personas que hacen los
 * mismos dos temas en orden inverso: así un avanzado puede pasar al tour donde ese tema no tiene ninguno
 * (3 avanzados y 4 reuniones del tema → 3 reuniones con 1 referente cada una) sin deshacer las mesas de 3.
 * Con menos de 3 personas por tema y tour (11 personas, 4 temas) cada tour deja fuera un tema distinto,
 * para que no salgan mesas de 2. Después cada grupo se divide en mesas de 3 a 4 repartiendo primero a los
 * avanzados, y entre todos los intentos se elige el plan con menos problemas en las mesas reales.
 */
function scheduleMandatory(people, cands, rounds, { restarts = 12, iterations = 20000 } = {}) {
  const byId = prepare(people)
  const ids = people.map((p) => p.id)
  const n = ids.length
  const T = cands.length
  const adv = ids.map((id) => cands.map((c) => byId.get(id).advanced.has(c.key)))
  const branch = ids.map((id) => String(byId.get(id).country ?? '').trim().toLowerCase())
  const tablesFor = (size) => (size === 0 ? 0 : Math.ceil(size / MAX_TABLE_SIZE))
  const cellCost = (size, nAdv) => {
    if (size === 0) return 0
    let c = 0
    if (size < MIN_TABLE_SIZE || size === 5) c += 500
    const k = tablesFor(size)
    if (nAdv < k) c += COST_NO_ADVANCED * (k - nAdv)
    return c
  }
  const pairCost = (m) => (m <= 1 ? 0 : m >= MAX_MEETINGS_PER_PAIR + 1 ? COST_OVER_LIMIT * (m - MAX_MEETINGS_PER_PAIR) + 19 : COST_MET[1] + (m >= 3 ? COST_MET[2] : 0))

  const evaluate = (sched) => {
    let cost = 0
    const cells = Array.from({ length: rounds }, () => Array.from({ length: T }, () => []))
    sched.forEach((row, i) => row.forEach((t, r) => cells[r][t].push(i)))
    const met = new Map()
    for (const row of cells) for (const cell of row) {
      cost += cellCost(cell.length, cell.filter((i) => adv[i][row.indexOf(cell)]).length)
      // Parejas: en un grupo de más de 4 no se sabe aún quién comparte mesa; se cuenta la mitad
      const w = cell.length > MAX_TABLE_SIZE ? 1 / tablesFor(cell.length) : 1
      for (let x = 0; x < cell.length; x++) for (let y = x + 1; y < cell.length; y++) {
        const k = cell[x] * n + cell[y]
        met.set(k, (met.get(k) ?? 0) + w)
        if (branch[cell[x]] && branch[cell[x]] === branch[cell[y]]) cost += w
      }
    }
    for (const m of met.values()) cost += pairCost(Math.round(m))
    return cost
  }

  // Cada grupo (tour, tema) → mesas de 3 a 4; primero un avanzado en cada mesa, después el resto.
  // Si un grupo se divide en 2 mesas, cada persona va a la mesa donde menos veces ha coincidido ya con
  // los demás (así no se juntan siempre las mismas dos personas).
  const split = (sched) => {
    const cellsOf = (r) => cands.map((_, t) => ids.map((_, i) => i).filter((i) => sched[i][r] === t))
    const met = new Map()
    const meet = (members) => members.forEach((a, x) => members.slice(x + 1).forEach((b) => { const k = pairKey(a, b); met.set(k, (met.get(k) ?? 0) + 1) }))
    const seen = (id, members) => members.reduce((s, m) => s + (met.get(pairKey(id, m)) ?? 0) ** 2, 0)
    for (let r = 0; r < rounds; r++) cellsOf(r).forEach((cell) => { if (tablesFor(cell.length) === 1) meet(cell.map((i) => ids[i])) })
    return Array.from({ length: rounds }, (_, r) => {
      const tables = []
      cellsOf(r).forEach((all, t) => {
        if (!all.length) return
        const cell = shuffle(all)
        const k = tablesFor(cell.length)
        const cap = evenSizes(cell.length, k)
        const groups = Array.from({ length: k }, () => [])
        const ordered = [...cell.filter((i) => adv[i][t]), ...cell.filter((i) => !adv[i][t])]
        ordered.forEach((i, x) => {
          const room = groups.map((_, gi) => gi).filter((gi) => groups[gi].length < cap[gi])
          // Los primeros avanzados, uno por mesa; los demás, donde menos coincidencias haya
          const target = x < k && adv[i][t] ? room.find((gi) => !groups[gi].length) ?? room[0]
            : room.reduce((a, b) => (seen(ids[i], groups[b]) < seen(ids[i], groups[a]) ? b : a))
          groups[target].push(ids[i])
        })
        if (k > 1) groups.forEach(meet)
        groups.forEach((members) => tables.push({ topic: cands[t].id, t, members }))
      })
      return tables
    })
  }

  // Coste del plan ya dividido en mesas (lo que de verdad verá la gente)
  const index = new Map(ids.map((id, i) => [id, i]))
  const planCost = (plan) => {
    let cost = 0
    const met = new Map()
    for (const tables of plan) for (const { t, members } of tables) {
      if (members.length < MIN_TABLE_SIZE || members.length > MAX_TABLE_SIZE) cost += 5000 // regla del evento: nunca mesas de 2 ni de 5
      if (!members.some((id) => adv[index.get(id)][t])) cost += COST_NO_ADVANCED
      members.forEach((a, x) => members.slice(x + 1).forEach((b) => {
        const k = pairKey(a, b)
        met.set(k, (met.get(k) ?? 0) + 1)
        if (branch[index.get(a)] && branch[index.get(a)] === branch[index.get(b)]) cost += 1
      }))
    }
    for (const m of met.values()) cost += pairCost(m)
    return cost
  }

  let best = null
  for (let rs = 0; rs < restarts; rs++) {
    // Inicio equilibrado: rotación de los temas (persona i hace el tema (i + r) mod T en el tour r)
    const offset = shuffle(ids.map((_, i) => i))
    const sched = ids.map((_, i) => Array.from({ length: rounds }, (_, r) => (offset[i] + r) % T))
    // Con menos de 3 personas por tema y tour (p. ej. 11 personas y 4 temas) no caben todos los temas
    // en cada tour: cada tour deja fuera un tema distinto (con 11: 3 mesas por tour, 4+4+3, y cada tema
    // sale en 3 tours). Se empieza con un horario que ya respeta ese patrón y durante la búsqueda nadie
    // sale de él (`allowed`); si no, casi siempre salía una mesa de 2.
    const perRound = Math.max(1, Math.floor(n / MIN_TABLE_SIZE))
    const shift = Math.floor(Math.random() * T)
    const open = perRound < T && rounds === T
      ? Array.from({ length: rounds }, (_, r) => new Set(Array.from({ length: perRound }, (_, j) => (shift + r * perRound + j) % T)))
      : null
    const allowed = (row) => !open || row.every((t, r) => open[r].has(t))
    if (open) {
      sched.forEach((row) => {
        for (let tries = 0; tries < 500; tries++) {
          const order = shuffle(cands.map((_, t) => t))
          if (order.every((t, r) => open[r].has(t))) { order.forEach((t, r) => { row[r] = t }); break }
        }
      })
    }
    let cur = evaluate(sched)
    let local = { cost: cur, sched: sched.map((row) => [...row]) }
    for (let it = 0; it < iterations && local.cost > 0; it++) {
      const temperature = 8 * (1 - it / iterations)
      const i = Math.floor(Math.random() * n)
      const r1 = Math.floor(Math.random() * rounds)
      let r2 = Math.floor(Math.random() * (rounds - 1))
      if (r2 >= r1) r2++
      // Dos movimientos: (a) la persona i cambia el orden de dos de sus temas, o (b) la persona i y otra
      // persona j que hace esos mismos dos temas al revés se intercambian el sitio en los dos tours.
      // (b) no cambia el tamaño de ningún grupo: es lo que permite mover a un avanzado de un tour donde
      // sobra (2 avanzados en la misma mesa) a otro donde falta, sin romper las mesas de 3.
      const partners = Math.random() < 0.5
        ? ids.map((_, j) => j).filter((j) => j !== i && sched[j][r1] === sched[i][r2] && sched[j][r2] === sched[i][r1])
        : []
      const rows = partners.length ? [sched[i], sched[partners[Math.floor(Math.random() * partners.length)]]] : [sched[i]]
      const flip = () => rows.forEach((row) => { [row[r1], row[r2]] = [row[r2], row[r1]] })
      flip()
      if (!rows.every(allowed)) { flip(); continue }
      const next = evaluate(sched)
      const delta = next - cur
      if (delta <= 0 || Math.random() < Math.exp(-delta / Math.max(temperature, 1e-3))) {
        cur = next
        if (cur < local.cost) local = { cost: cur, sched: sched.map((x) => [...x]) }
      } else flip()
    }
    // Repaso final: se prueban TODOS los cambios posibles (de una persona o de dos) y se aplica cualquiera
    // que mejore, hasta que ninguno mejora. Así no queda un avanzado de más en una reunión mientras otra
    // reunión del mismo tema se queda sin ninguno, si hay forma de evitarlo.
    const sch = local.sched
    let cost = local.cost
    for (let improved = true; improved && cost > 0;) {
      improved = false
      for (let i = 0; i < n; i++) for (let r1 = 0; r1 < rounds; r1++) for (let r2 = r1 + 1; r2 < rounds; r2++) {
        for (let j = i; j < n; j++) {
          if (j !== i && !(sch[j][r1] === sch[i][r2] && sch[j][r2] === sch[i][r1])) continue
          const rows = j === i ? [sch[i]] : [sch[i], sch[j]]
          const flip = () => rows.forEach((row) => { [row[r1], row[r2]] = [row[r2], row[r1]] })
          flip()
          const next = rows.every(allowed) ? evaluate(sch) : Infinity
          if (next < cost) { cost = next; improved = true } else flip()
        }
      }
    }
    // Se divide en mesas varias veces y se queda el mejor plan real de todos los intentos
    for (let x = 0; x < 6; x++) {
      const plan = split(sch)
      const c = planCost(plan)
      if (!best || c < best.cost) best = { cost: c, plan }
    }
  }

  return best.plan.map((tables) => {
    const sorted = [...tables].sort((x, y) => y.members.length - x.members.length)
    return { tables: sorted.map(({ topic, members }, i) => ({ id: i + 1, topic, members })) }
  })
}

/**
 * Plan completo de la soirée: `rounds` tours encadenados. Se repite varias veces y se queda
 * con el de menor coste total. Devuelve [{ tables }, …].
 */
export function generatePlan(people, { rounds = TOTAL_ROUNDS, restarts = 2, attempts = 10, iterations = 3000, topics = [] } = {}) {
  // Solo temas obligatorios, uno por tour: horario en el que cada persona pasa una vez por cada tema
  const cands = candidateTopics(people, topics)
  if (people.length >= MIN_TABLE_SIZE * 2 && cands.length === rounds && cands.every((c) => isMandatory(c.id))) return scheduleMandatory(people, cands, rounds)
  let best = null
  for (let r = 0; r < restarts; r++) {
    const plan = []
    let cost = 0
    for (let i = 0; i < rounds; i++) {
      const res = generateRound(people, plan, { attempts, iterations, topics })
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
  let tables = 0
  let noExpert = 0
  for (const round of rounds) {
    maxTables = Math.max(maxTables, round.tables.length)
    for (const t of round.tables) {
      const key = topicKey(t.topic)
      tables++
      if (!t.members.some((id) => isAdvanced(byId.get(id), key))) noExpert++
      t.members.forEach((id, i) => {
        const p = byId.get(id)
        if (!p) return
        seats++
        if (hasTopic(p, key)) chosen++
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
    tables,
    noExpert, // mesas sin nadie «Expérimenté·e» en su tema
  }
}

/** ¿Nivel Avancé en el tema? (lo ofrece y no lo necesita, ver listsFromLevels en lib/topics.js) */
export const isAdvanced = (p, key) => !!p && (p.offers ?? []).some((x) => topicKey(x) === key) && !(p.needs ?? []).some((x) => topicKey(x) === key)

/**
 * Temas con menos personas Avancé que mesas: ahí es imposible que todas las mesas tengan a alguien avanzado.
 * Cada persona pasa una vez por cada tema, así que cada tema necesita unas ceil(n / MAX_TABLE_SIZE) mesas.
 * Devuelve [{ topic, advanced, needed }].
 */
export function advancedShortfall(people) {
  const needed = Math.ceil(people.length / MAX_TABLE_SIZE)
  return mandatoryTopics().map((id) => ({ topic: id, advanced: people.filter((p) => isAdvanced(p, topicKey(id))).length, needed }))
    .filter((x) => x.advanced < needed)
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

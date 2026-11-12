/**
 * Un solo resumen de audio por mesa: quién lo graba.
 * Misma regla que el servidor (supabase/2026-11-un-resumen-por-mesa.sql), para el modo local:
 *  - gana la primera persona que elige «me»;
 *  - si nadie se ha apuntado y solo queda una persona sin decidir, le toca a ella (`forced`).
 * `members`: ids de las personas reales de la mesa · `choices`: { id: 'me' | 'pass' } · `sentIds`: ids con nota enviada
 */
export function reporterState(members, choices, sentIds) {
  const list = members.map((id) => ({ id, choice: choices[id] ?? null }))
  const reporter = list.find((m) => m.choice === 'me')?.id ?? null
  const undecided = list.filter((m) => !m.choice)
  return {
    members: list,
    reporter,
    forced: !reporter && undecided.length === 1 ? undecided[0].id : null,
    sent: members.some((id) => sentIds.has(id)),
    lost: false,
  }
}

/** Qué ve esta persona: 'choose' · 'passed' · 'forced' · 'record' · 'other' (otra persona graba o le toca) */
export function reporterRole(state, myId) {
  if (!state) return 'choose'
  if (state.reporter === myId) return 'record'
  if (state.reporter) return 'other'
  if (state.forced === myId) return 'forced'
  if (state.forced) return 'other' // le toca a otra persona por ser la última
  return state.members.find((m) => m.id === myId)?.choice === 'pass' ? 'passed' : 'choose'
}

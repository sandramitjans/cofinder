import { MAX_INTERESTS } from '../constants'
import { LEVELS, isMandatory, listsFromLevels, mandatoryTopics, optionalTopics } from './topics'

// 12 directores ficticios (de las filiales del grupo, cargos en FR/EN) para ensayar la dinámica desde el panel de moderadora.
// Como en el formulario, cada uno elige 1 tema (además de los obligatorios, que cuentan para todos):
// el primero de su lista que no sea obligatorio y siga en la lista de temas. El nivel de cada tema, al azar.
const DEMO = [
  ['Laura Martín', 'Marketing Director', 'es', ['analytics', 'customer_journey', 'ai_guru', 'geo', 'social_strategy', 'b2b', 'pnl', 'branding'], ['shortcuts', 'outlook']],
  ['João Ferreira', 'Head of Marketing', 'pt', ['paid_performance', 'affiliates', 'branding', 'b2b', 'geo', 'emailing_loyalty', 'guerrilla', 'cofidis_ninja'], ['punchlines']],
  ['Camille Dubois', 'Directrice Marketing', 'fr', ['branding', 'public_relations', 'analytics', 'ai_guru', 'mass_media', 'customer_success', 'guerrilla', 'compliance'], ['charisma', 'pop_culture']],
  ['Marco Rossi', 'Marketing Director', 'it', ['emailing_loyalty', 'customer_success', 'social_strategy', 'paid_performance', 'customer_journey', 'ai_guru', 'operational_efficiency', 'risk_management'], ['pokerface']],
  ['Giulia Conti', 'Head of Growth', 'it', ['pnl', 'operational_efficiency', 'guerrilla', 'customer_journey', 'analytics', 'product_management', 'geo', 'paid_performance'], ['crisis', 'friday']],
  ['Nicolas Bernard', 'CMO', 'fr', ['ai_guru', 'product_management', 'mass_media', 'compliance', 'branding', 'public_relations', 'b2b', 'analytics'], ['generations']],
  ['Petra Nováková', 'Marketing Director', 'cz', ['social_strategy', 'guerrilla', 'pnl', 'risk_management', 'affiliates', 'customer_success', 'mass_media', 'geo'], ['charisma', 'punchlines']],
  ['Tomasz Kowalski', 'Head of Marketing', 'pl', ['geo', 'b2b', 'emailing_loyalty', 'ai_guru', 'paid_performance', 'customer_journey', 'cofidis_ninja', 'operational_efficiency'], ['psychologist']],
  ['Sophie Peeters', 'Directrice Marketing', 'be', ['compliance', 'risk_management', 'product_management', 'analytics', 'pnl', 'public_relations', 'social_strategy', 'customer_success'], ['corporate_french', 'outlook']],
  ['Zsófia Nagy', 'Head of Brand', 'hu', ['mass_media', 'cofidis_ninja', 'affiliates', 'operational_efficiency', 'ai_guru', 'branding', 'emailing_loyalty', 'product_management'], ['friday']],
  ['Martin Horváth', 'Marketing Director', 'sk', ['customer_journey', 'social_strategy', 'customer_success', 'pnl', 'geo', 'guerrilla', 'public_relations', 'affiliates'], ['pop_culture', 'psychologist']],
  ['Carmen Ruiz', 'Head of CRM', 'es', ['analytics', 'paid_performance', 'public_relations', 'cofidis_ninja', 'ai_guru', 'b2b', 'risk_management', 'compliance'], ['shortcuts', 'generations']],
]

// `eventTopics` = mesas añadidas desde el panel: si hay, cada perfil de prueba elige 1 al azar entre ellas
export const demoParticipants = (eventTopics = []) =>
  DEMO.map(([name, role, country, topics, superpowers]) => {
    const pool = eventTopics.filter((id) => !isMandatory(id))
    const mine = pool.length
      ? [...pool].sort(() => Math.random() - 0.5).slice(0, MAX_INTERESTS)
      : topics.filter((id) => optionalTopics().includes(id)).slice(0, MAX_INTERESTS)
    return {
      id: crypto.randomUUID(), createdAt: Date.now(), demo: true, name, role, country,
      ...listsFromLevels([...mandatoryTopics(), ...mine], Object.fromEntries([...mandatoryTopics(), ...mine].map((id) => [id, LEVELS[Math.floor(Math.random() * LEVELS.length)]]))),
      customTopics: pool.length ? mine : [], superpowers: superpowers.slice(0, 1),
    }
  })

// 12 directores ficticios para ensayar la dinámica desde el panel de moderadora.
// Como en el formulario, cada uno elige 8 temas; los 3 primeros los marca «Expérimenté·e» (`offers`)
// y el resto «Curieux·se» (`needs`).
const DEMO = [
  ['Laura Martín', 'Marketing Director', 'es', ['analytics', 'customer_journey', 'ai_guru', 'geo', 'social_strategy', 'b2b', 'pnl', 'branding'], ['shortcuts', 'outlook']],
  ['João Ferreira', 'Head of Marketing', 'pt', ['paid_performance', 'affiliates', 'branding', 'b2b', 'geo', 'emailing_loyalty', 'guerrilla', 'cofidis_ninja'], ['punchlines']],
  ['Camille Dubois', 'Directrice Marketing', 'fr', ['branding', 'public_relations', 'analytics', 'ai_guru', 'mass_media', 'customer_success', 'guerrilla', 'compliance'], ['charisma', 'pop_culture']],
  ['Marco Rossi', 'Marketing Director', 'it', ['emailing_loyalty', 'customer_success', 'social_strategy', 'paid_performance', 'customer_journey', 'ai_guru', 'operational_efficiency', 'risk_management'], ['pokerface']],
  ['Anna Schmidt', 'Head of Growth', 'de', ['pnl', 'operational_efficiency', 'guerrilla', 'customer_journey', 'analytics', 'product_management', 'geo', 'paid_performance'], ['crisis', 'friday']],
  ['Oliver Hughes', 'CMO', 'uk', ['ai_guru', 'product_management', 'mass_media', 'compliance', 'branding', 'public_relations', 'b2b', 'analytics'], ['generations']],
  ['Valeria Gómez', 'Directora de Marketing', 'mx', ['social_strategy', 'guerrilla', 'pnl', 'risk_management', 'affiliates', 'customer_success', 'mass_media', 'geo'], ['charisma', 'punchlines']],
  ['Andrés Restrepo', 'Head of Marketing', 'co', ['geo', 'b2b', 'emailing_loyalty', 'ai_guru', 'paid_performance', 'customer_journey', 'cofidis_ninja', 'operational_efficiency'], ['psychologist']],
  ['Lucía Fernández', 'Marketing Director', 'ar', ['compliance', 'risk_management', 'product_management', 'analytics', 'pnl', 'public_relations', 'social_strategy', 'customer_success'], ['corporate_french', 'outlook']],
  ['Tomás Silva', 'Gerente de Marketing', 'cl', ['mass_media', 'cofidis_ninja', 'affiliates', 'operational_efficiency', 'ai_guru', 'branding', 'emailing_loyalty', 'product_management'], ['friday']],
  ['Beatriz Costa', 'Diretora de Marketing', 'br', ['customer_journey', 'social_strategy', 'customer_success', 'pnl', 'geo', 'guerrilla', 'public_relations', 'affiliates'], ['pop_culture', 'psychologist']],
  ['Emily Carter', 'VP Marketing', 'us', ['analytics', 'paid_performance', 'public_relations', 'cofidis_ninja', 'ai_guru', 'b2b', 'risk_management', 'compliance'], ['shortcuts', 'generations']],
]

export const demoParticipants = () =>
  DEMO.map(([name, role, country, topics, superpowers]) => ({
    id: crypto.randomUUID(), createdAt: Date.now(), demo: true, name, role, country,
    offers: topics.slice(0, 3), needs: topics.slice(3), superpowers: superpowers.slice(0, 1),
  }))

// 12 directores ficticios para ensayar la dinámica desde el panel de moderadora
const DEMO = [
  ['Laura Martín', 'Marketing Director', 'es', ['analytics', 'customer_journey'], ['ai_guru', 'geo'], ['shortcuts', 'outlook']],
  ['João Ferreira', 'Head of Marketing', 'pt', ['paid_performance', 'affiliates'], ['branding', 'b2b'], ['punchlines']],
  ['Camille Dubois', 'Directrice Marketing', 'fr', ['branding', 'public_relations'], ['analytics', 'ai_guru'], ['charisma', 'pop_culture']],
  ['Marco Rossi', 'Marketing Director', 'it', ['emailing_loyalty', 'customer_success'], ['social_strategy', 'paid_performance'], ['pokerface']],
  ['Anna Schmidt', 'Head of Growth', 'de', ['pnl', 'operational_efficiency'], ['guerrilla', 'customer_journey'], ['crisis', 'friday']],
  ['Oliver Hughes', 'CMO', 'uk', ['ai_guru', 'product_management'], ['mass_media', 'compliance'], ['generations']],
  ['Valeria Gómez', 'Directora de Marketing', 'mx', ['social_strategy', 'guerrilla'], ['pnl', 'risk_management'], ['charisma', 'punchlines']],
  ['Andrés Restrepo', 'Head of Marketing', 'co', ['geo', 'b2b'], ['emailing_loyalty', 'ai_guru'], ['psychologist']],
  ['Lucía Fernández', 'Marketing Director', 'ar', ['compliance', 'risk_management'], ['product_management', 'analytics'], ['corporate_french', 'outlook']],
  ['Tomás Silva', 'Gerente de Marketing', 'cl', ['mass_media', 'cofidis_ninja'], ['affiliates', 'operational_efficiency'], ['friday']],
  ['Beatriz Costa', 'Diretora de Marketing', 'br', ['customer_journey', 'social_strategy'], ['customer_success', 'pnl'], ['pop_culture', 'psychologist']],
  ['Emily Carter', 'VP Marketing', 'us', ['analytics', 'paid_performance'], ['public_relations', 'cofidis_ninja'], ['shortcuts', 'generations']],
]

export const demoParticipants = () =>
  DEMO.map(([name, role, country, offers, needs, superpowers]) => ({
    id: crypto.randomUUID(), createdAt: Date.now(), demo: true, name, role, country, offers, needs, superpowers,
  }))

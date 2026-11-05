import { isCustom, customLabel } from './topics'

/**
 * «Para romper el hielo»: contexto, 3 preguntas y una pista para cada tema de la lista.
 * Textos redactados con IA (de ahí la etiqueta «Propuestas por la IA» en el móvil).
 * Para las mesas que añade el admin desde el panel se usan preguntas generales con su título.
 */
const ES = {
  ai_guru: {
    intro: 'La IA ya escribe anuncios, segmenta audiencias y responde a clientes, pero cada equipo la está adoptando a un ritmo muy distinto.',
    q: ['¿Qué tarea de tu equipo ha cambiado más gracias a la IA?', '¿Qué no dejarías nunca en manos de una IA?', '¿Cómo medís si un caso de uso de IA merece la pena?'],
    tip: 'Pista: compartid un ejemplo concreto que haya funcionado y otro que no.',
  },
  paid_performance: {
    intro: 'Los costes de los medios digitales suben y la medición es cada vez más difícil sin cookies de terceros.',
    q: ['¿Qué canal de pago os da hoy más retorno?', '¿Cómo repartís el presupuesto entre captación y marca?', '¿Qué métrica habéis dejado de mirar y por qué?'],
    tip: 'Pista: comparad cómo cada uno decide cortar una campaña que no funciona.',
  },
  social_strategy: {
    intro: 'Las redes premian lo auténtico y lo rápido, algo difícil de encajar en una marca financiera.',
    q: ['¿Qué red social os funciona mejor y cuál os sobra?', '¿Quién aprueba un post en tu empresa y cuánto tarda?', '¿Habéis trabajado con creadores de contenido? ¿Qué tal?'],
    tip: 'Pista: enseñaos en el móvil un post propio del que estéis orgullosos.',
  },
  affiliates: {
    intro: 'Los afiliados pueden traer mucho volumen, pero la calidad del tráfico y el control de la marca son el gran reto.',
    q: ['¿Qué peso tienen los afiliados en vuestra captación?', '¿Cómo detectáis tráfico de mala calidad?', '¿Pagáis por clic, por lead o por venta? ¿Por qué?'],
    tip: 'Pista: compartid la peor sorpresa que os habéis llevado con un afiliado.',
  },
  emailing_loyalty: {
    intro: 'El email sigue siendo de los canales más rentables, siempre que no acabe en la carpeta de spam.',
    q: ['¿Qué email vuestro tiene la mejor tasa de apertura?', '¿Cómo evitáis cansar a los clientes con demasiados envíos?', '¿Qué hacéis para recuperar a un cliente inactivo?'],
    tip: 'Pista: ¿cuál es el último email de marca que abristeis por gusto?',
  },
  geo: {
    intro: 'Cada vez más gente pregunta a asistentes de IA en lugar de buscar en Google. ¿Aparece tu marca en esas respuestas?',
    q: ['¿Habéis preguntado a una IA por vuestra marca? ¿Qué dijo?', '¿Estáis cambiando vuestros contenidos por la búsqueda con IA?', '¿Cómo se mide la visibilidad en un asistente de IA?'],
    tip: 'Pista: haced la prueba juntos en el móvil con una pregunta sobre vuestro sector.',
  },
  b2b: {
    intro: 'En B2B las decisiones son lentas, las toman varias personas y la relación pesa tanto como el producto.',
    q: ['¿Cuánto dura vuestro ciclo de venta medio?', '¿Qué contenido os ayuda más a convencer a un cliente empresa?', '¿Cómo trabajan juntos marketing y ventas en tu casa?'],
    tip: 'Pista: compartid cómo conseguisteis vuestro mejor cliente empresa.',
  },
  analytics: {
    intro: 'Hay más datos que nunca, pero convertirlos en decisiones sigue siendo lo difícil.',
    q: ['¿Qué dato te ha sorprendido más por su poder para predecir?', '¿Qué decisión tomasteis gracias a un análisis?', '¿Quién tiene la última palabra cuando los datos y la intuición chocan?'],
    tip: 'Pista: comparad cuál es el panel de control que miráis cada lunes.',
  },
  customer_success: {
    intro: 'Retener a un cliente cuesta mucho menos que conseguir uno nuevo, pero no siempre recibe la misma atención.',
    q: ['¿Cómo detectáis que un cliente está a punto de irse?', '¿Qué gesto sencillo ha mejorado la satisfacción de vuestros clientes?', '¿Quién es responsable de la experiencia del cliente en tu empresa?'],
    tip: 'Pista: compartid una queja de cliente que acabó siendo una buena idea.',
  },
  branding: {
    intro: 'Una marca fuerte hace que todo lo demás cueste menos, pero sus resultados se ven a largo plazo.',
    q: ['¿Cómo describirías vuestra marca en tres palabras?', '¿Cómo defendéis la inversión en marca ante dirección?', '¿Qué marca, de cualquier sector, os gustaría ser?'],
    tip: 'Pista: probad a adivinar las tres palabras de la marca de los demás.',
  },
  mass_media: {
    intro: 'Televisión, radio y exterior siguen llegando a millones de personas, aunque cada vez es más difícil medir su efecto.',
    q: ['¿Seguís invirtiendo en televisión? ¿Por qué sí o por qué no?', '¿Cómo medís el impacto de una campaña en medios masivos?', '¿Qué anuncio de la competencia os habría gustado firmar?'],
    tip: 'Pista: compartid el anuncio que recordáis de vuestra infancia.',
  },
  public_relations: {
    intro: 'Una buena noticia en prensa da credibilidad, y una mala puede costar años de reputación.',
    q: ['¿Cuál ha sido vuestra mejor aparición en prensa?', '¿Tenéis un plan preparado por si llega una crisis?', '¿Qué papel tienen los portavoces y la dirección en vuestra comunicación?'],
    tip: 'Pista: compartid cómo resolvisteis una noticia incómoda.',
  },
  guerrilla: {
    intro: 'Con poco presupuesto y mucha creatividad se pueden lograr campañas memorables, si la marca se atreve.',
    q: ['¿Cuál es la acción más atrevida que habéis hecho?', '¿Qué os frena a la hora de arriesgar en una campaña?', '¿Qué acción de guerrilla de otra marca os encantó?'],
    tip: 'Pista: inventad entre todos una acción loca para la marca de alguien de la mesa.',
  },
  product_management: {
    intro: 'Marketing y producto trabajan mejor juntos, pero no siempre comparten prioridades ni calendario.',
    q: ['¿Participa marketing en el diseño de nuevos productos?', '¿Cómo decidís qué mejora va primero?', '¿Qué producto lanzasteis que no funcionó y qué aprendisteis?'],
    tip: 'Pista: compartid cómo recogéis la opinión de los clientes antes de lanzar algo.',
  },
  pnl: {
    intro: 'Marketing tiene que demostrar su impacto en la cuenta de resultados, no solo en clics y alcance.',
    q: ['¿Cómo demostráis a finanzas que marketing aporta beneficio?', '¿Qué gasto habéis recortado sin perder resultados?', '¿Qué indicador comparte marketing con dirección financiera?'],
    tip: 'Pista: compartid la frase que mejor os funciona para defender un presupuesto.',
  },
  customer_journey: {
    intro: 'El cliente salta entre web, app, teléfono y oficina, y espera que todo encaje como una sola experiencia.',
    q: ['¿En qué paso del recorrido perdéis más clientes?', '¿Habéis probado vuestro propio proceso como si fuerais clientes?', '¿Qué canal os gustaría mejorar primero?'],
    tip: 'Pista: contad el último paso absurdo que encontrasteis en vuestro propio proceso.',
  },
  operational_efficiency: {
    intro: 'Hacer más con los mismos recursos obliga a revisar procesos, herramientas y prioridades.',
    q: ['¿Qué tarea repetitiva habéis automatizado este año?', '¿Qué reunión eliminaríais mañana mismo?', '¿Cómo decidís qué proyectos se dejan de hacer?'],
    tip: 'Pista: compartid una herramienta que os ahorre al menos una hora a la semana.',
  },
  risk_management: {
    intro: 'Cada campaña tiene riesgos: legales, de reputación o de crédito. Gestionarlos sin frenar la creatividad es todo un arte.',
    q: ['¿Qué riesgo os preocupa más en vuestras campañas?', '¿Cómo trabajáis con el equipo de riesgos sin que todo se retrase?', '¿Alguna campaña se tuvo que parar a última hora?'],
    tip: 'Pista: compartid cómo convencisteis a riesgos de aprobar una idea difícil.',
  },
  compliance: {
    intro: 'Las normas de publicidad financiera y de protección de datos cambian a menudo y afectan a cada mensaje.',
    q: ['¿Qué norma os ha obligado a cambiar más vuestra comunicación?', '¿Cómo validáis un mensaje con legal y cumplimiento?', '¿Dónde ponéis el límite entre útil e intrusivo con los datos?'],
    tip: 'Pista: comparad cuánto tarda en cada empresa aprobar un anuncio.',
  },
  cofidis_ninja: {
    intro: 'Sacar adelante un proyecto entre países, filiales y departamentos exige mano izquierda y buenos aliados.',
    q: ['¿Cuál es el proyecto entre países del que estáis más orgullosos?', '¿Qué truco usáis para alinear a equipos de distintos países?', '¿Qué proyecto de otra filial os gustaría copiar?'],
    tip: 'Pista: intercambiad el contacto de alguien clave en vuestra filial.',
  },
}

const EN = {
  ai_guru: {
    intro: 'AI already writes ads, segments audiences and answers customers, but each team is adopting it at a very different pace.',
    q: ['Which task in your team has changed most thanks to AI?', 'What would you never leave to an AI?', 'How do you tell if an AI use case is worth it?'],
    tip: 'Tip: share one concrete example that worked and one that didn’t.',
  },
  paid_performance: {
    intro: 'Digital media costs keep rising and measurement is harder without third-party cookies.',
    q: ['Which paid channel gives you the best return today?', 'How do you split budget between acquisition and brand?', 'Which metric have you stopped looking at, and why?'],
    tip: 'Tip: compare how each of you decides to stop a campaign that isn’t working.',
  },
  social_strategy: {
    intro: 'Social media rewards what is authentic and fast, which is hard to fit into a financial brand.',
    q: ['Which network works best for you, and which one could you drop?', 'Who approves a post at your company, and how long does it take?', 'Have you worked with content creators? How did it go?'],
    tip: 'Tip: show each other a post of yours you’re proud of.',
  },
  affiliates: {
    intro: 'Affiliates can bring lots of volume, but traffic quality and brand control are the big challenge.',
    q: ['How much of your acquisition comes from affiliates?', 'How do you spot poor-quality traffic?', 'Do you pay per click, per lead or per sale? Why?'],
    tip: 'Tip: share the worst surprise you’ve had with an affiliate.',
  },
  emailing_loyalty: {
    intro: 'Email is still one of the most profitable channels, as long as it doesn’t end up in spam.',
    q: ['Which of your emails has the best open rate?', 'How do you avoid tiring customers with too many sends?', 'What do you do to win back an inactive customer?'],
    tip: 'Tip: what’s the last brand email you opened just because you wanted to?',
  },
  geo: {
    intro: 'More and more people ask AI assistants instead of searching on Google. Does your brand show up in those answers?',
    q: ['Have you asked an AI about your brand? What did it say?', 'Are you changing your content because of AI search?', 'How do you measure visibility in an AI assistant?'],
    tip: 'Tip: try it together on your phone with a question about your sector.',
  },
  b2b: {
    intro: 'In B2B, decisions are slow, involve several people, and the relationship matters as much as the product.',
    q: ['How long is your average sales cycle?', 'Which content helps you most to convince a business client?', 'How do marketing and sales work together at your company?'],
    tip: 'Tip: share how you won your best business client.',
  },
  analytics: {
    intro: 'There is more data than ever, but turning it into decisions is still the hard part.',
    q: ['Which data point surprised you most with its predictive power?', 'Which decision did you make thanks to an analysis?', 'Who has the final say when data and gut feeling disagree?'],
    tip: 'Tip: compare which dashboard you check every Monday.',
  },
  customer_success: {
    intro: 'Keeping a customer costs much less than winning a new one, but it doesn’t always get the same attention.',
    q: ['How do you tell a customer is about to leave?', 'Which simple gesture improved your customers’ satisfaction?', 'Who owns the customer experience at your company?'],
    tip: 'Tip: share a customer complaint that turned into a good idea.',
  },
  branding: {
    intro: 'A strong brand makes everything else cheaper, but its results show in the long run.',
    q: ['How would you describe your brand in three words?', 'How do you defend brand investment to leadership?', 'Which brand, from any sector, would you like to be?'],
    tip: 'Tip: try to guess the three words for each other’s brands.',
  },
  mass_media: {
    intro: 'TV, radio and outdoor still reach millions of people, though their effect is harder and harder to measure.',
    q: ['Do you still invest in TV? Why or why not?', 'How do you measure the impact of a mass-media campaign?', 'Which competitor ad do you wish you had made?'],
    tip: 'Tip: share the ad you remember from your childhood.',
  },
  public_relations: {
    intro: 'Good press coverage builds credibility, and bad coverage can cost years of reputation.',
    q: ['What was your best press appearance?', 'Do you have a plan ready in case a crisis hits?', 'What role do spokespeople and leadership play in your communication?'],
    tip: 'Tip: share how you handled an awkward news story.',
  },
  guerrilla: {
    intro: 'With little budget and lots of creativity you can create memorable campaigns, if the brand dares.',
    q: ['What’s the boldest action you’ve ever done?', 'What holds you back from taking risks in a campaign?', 'Which guerrilla action by another brand did you love?'],
    tip: 'Tip: invent a crazy stunt together for someone’s brand at the table.',
  },
  product_management: {
    intro: 'Marketing and product work better together, but they don’t always share priorities or timelines.',
    q: ['Is marketing involved in designing new products?', 'How do you decide which improvement comes first?', 'Which launch didn’t work, and what did you learn?'],
    tip: 'Tip: share how you gather customer feedback before launching something.',
  },
  pnl: {
    intro: 'Marketing has to prove its impact on the bottom line, not just on clicks and reach.',
    q: ['How do you show finance that marketing brings profit?', 'Which cost did you cut without losing results?', 'Which indicator does marketing share with finance?'],
    tip: 'Tip: share the line that works best for you to defend a budget.',
  },
  customer_journey: {
    intro: 'Customers jump between website, app, phone and branch, and expect it all to feel like one experience.',
    q: ['At which step of the journey do you lose the most customers?', 'Have you gone through your own process as if you were a customer?', 'Which channel would you improve first?'],
    tip: 'Tip: tell the last absurd step you found in your own process.',
  },
  operational_efficiency: {
    intro: 'Doing more with the same resources means rethinking processes, tools and priorities.',
    q: ['Which repetitive task did you automate this year?', 'Which meeting would you cancel tomorrow?', 'How do you decide which projects to stop?'],
    tip: 'Tip: share a tool that saves you at least an hour a week.',
  },
  risk_management: {
    intro: 'Every campaign carries risks: legal, reputational or credit. Managing them without killing creativity is an art.',
    q: ['Which risk worries you most in your campaigns?', 'How do you work with the risk team without delaying everything?', 'Did a campaign ever have to be stopped at the last minute?'],
    tip: 'Tip: share how you convinced risk to approve a difficult idea.',
  },
  compliance: {
    intro: 'Rules on financial advertising and data protection change often and affect every message.',
    q: ['Which rule forced you to change your communication the most?', 'How do you get a message approved by legal and compliance?', 'Where do you draw the line between useful and intrusive with data?'],
    tip: 'Tip: compare how long it takes to approve an ad at each company.',
  },
  cofidis_ninja: {
    intro: 'Pushing a project through countries, subsidiaries and departments takes tact and good allies.',
    q: ['Which cross-country project are you proudest of?', 'What trick do you use to align teams from different countries?', 'Which project from another subsidiary would you like to copy?'],
    tip: 'Tip: swap the contact of a key person in your subsidiary.',
  },
}

// Para las mesas que añade el admin: preguntas generales con el título de la mesa
const GENERIC = {
  es: (name, desc) => ({
    intro: desc || `Hoy toca hablar de «${name}». Cada persona de la mesa lo vive desde un sitio distinto.`,
    q: [`¿Qué es lo que más te preocupa hoy de «${name}»?`, '¿Qué ha funcionado en tu equipo y qué no?', '¿Qué harías distinto si empezaras de cero mañana?'],
    tip: 'Pista: que cada persona cuente un ejemplo real en un minuto.',
  }),
  en: (name, desc) => ({
    intro: desc || `Today’s topic is “${name}”. Everyone at the table sees it from a different angle.`,
    q: [`What worries you most about “${name}” today?`, 'What has worked in your team, and what hasn’t?', 'What would you do differently if you started from scratch tomorrow?'],
    tip: 'Tip: each person shares a real example in one minute.',
  }),
}

/** Contexto, preguntas y pista para un tema. `desc` = descripción de la mesa, si la tiene */
export function icebreakerFor(topicId, lang, desc = '') {
  const dict = lang === 'en' ? EN : ES
  if (!isCustom(topicId) && dict[topicId]) return dict[topicId]
  const name = isCustom(topicId) ? customLabel(topicId) : String(topicId)
  return GENERIC[lang === 'en' ? 'en' : 'es'](name, desc)
}

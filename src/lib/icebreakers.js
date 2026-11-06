import { isCustom, customLabel } from './topics'

/**
 * «Pour briser la glace» / «Icebreakers»: contexto, 3 preguntas y una pista para cada tema de la lista.
 * Textos redactados con IA (de ahí la etiqueta «Suggestions de l’IA» en el móvil).
 * Para las mesas que añade el admin desde el panel se usan preguntas generales con su título.
 */
const FR = {
  ai_guru: {
    intro: 'L’IA rédige déjà des annonces, segmente les audiences et répond aux clients, mais chaque équipe l’adopte à un rythme très différent.',
    q: ['Quelle tâche de votre équipe l’IA a-t-elle le plus transformée\u00A0?', 'Que ne confieriez-vous jamais à une IA\u00A0?', 'Comment savez-vous si un cas d’usage de l’IA en vaut la peine\u00A0?'],
    tip: 'Astuce\u00A0: partagez un exemple concret qui a fonctionné, et un autre qui n’a pas marché.',
  },
  paid_performance: {
    intro: 'Les coûts des médias digitaux augmentent et la mesure se complique sans cookies tiers.',
    q: ['Quel canal payant vous rapporte le plus aujourd’hui\u00A0?', 'Comment répartissez-vous le budget entre acquisition et marque\u00A0?', 'Quel indicateur avez-vous cessé de suivre, et pourquoi\u00A0?'],
    tip: 'Astuce\u00A0: comparez comment chacun décide d’arrêter une campagne qui ne fonctionne pas.',
  },
  social_strategy: {
    intro: 'Les réseaux sociaux récompensent l’authenticité et la rapidité, deux qualités difficiles à concilier avec une marque financière.',
    q: ['Quel réseau fonctionne le mieux pour vous, et lequel pourriez-vous abandonner\u00A0?', 'Qui valide un post chez vous, et en combien de temps\u00A0?', 'Avez-vous travaillé avec des créateurs de contenu\u00A0? Quel bilan\u00A0?'],
    tip: 'Astuce\u00A0: montrez-vous sur votre téléphone l’un de vos posts préférés.',
  },
  affiliates: {
    intro: 'L’affiliation peut apporter beaucoup de volume, mais la qualité du trafic et le contrôle de la marque restent le grand défi.',
    q: ['Quelle part de votre acquisition vient de l’affiliation\u00A0?', 'Comment repérez-vous le trafic de mauvaise qualité\u00A0?', 'Payez-vous au clic, au lead ou à la vente\u00A0? Pourquoi\u00A0?'],
    tip: 'Astuce\u00A0: racontez la pire surprise que vous ait réservée un affilié.',
  },
  emailing_loyalty: {
    intro: 'L’email reste l’un des canaux les plus rentables, à condition de ne pas finir dans les spams.',
    q: ['Lequel de vos emails a le meilleur taux d’ouverture\u00A0?', 'Comment évitez-vous de lasser vos clients avec trop d’envois\u00A0?', 'Que faites-vous pour réactiver un client inactif\u00A0?'],
    tip: 'Astuce\u00A0: quel est le dernier email de marque que vous avez ouvert par simple envie\u00A0?',
  },
  geo: {
    intro: 'De plus en plus de gens interrogent des assistants IA au lieu de chercher sur Google. Votre marque apparaît-elle dans leurs réponses\u00A0?',
    q: ['Avez-vous déjà interrogé une IA sur votre marque\u00A0? Qu’a-t-elle répondu\u00A0?', 'Faites-vous évoluer vos contenus à cause de la recherche par IA\u00A0?', 'Comment mesurer la visibilité dans un assistant IA\u00A0?'],
    tip: 'Astuce\u00A0: faites le test ensemble sur votre téléphone avec une question sur votre secteur.',
  },
  b2b: {
    intro: 'En B2B, les décisions sont lentes, impliquent plusieurs personnes, et la relation compte autant que le produit.',
    q: ['Quelle est la durée moyenne de votre cycle de vente\u00A0?', 'Quel contenu vous aide le plus à convaincre un client entreprise\u00A0?', 'Comment le marketing et les ventes travaillent-ils ensemble chez vous\u00A0?'],
    tip: 'Astuce\u00A0: racontez comment vous avez gagné votre meilleur client entreprise.',
  },
  analytics: {
    intro: 'Les données n’ont jamais été aussi nombreuses, mais les transformer en décisions reste le plus difficile.',
    q: ['Quelle donnée s’est révélée étonnamment prédictive chez vous\u00A0?', 'Quelle décision avez-vous prise grâce à une analyse\u00A0?', 'Qui a le dernier mot quand les données et l’intuition ne sont pas d’accord\u00A0?'],
    tip: 'Astuce\u00A0: comparez le tableau de bord que vous consultez chaque lundi.',
  },
  customer_success: {
    intro: 'Fidéliser un client coûte bien moins cher qu’en conquérir un nouveau, mais cela ne reçoit pas toujours la même attention.',
    q: ['Comment repérez-vous un client sur le point de partir\u00A0?', 'Quel geste simple a amélioré la satisfaction de vos clients\u00A0?', 'Qui est responsable de l’expérience client dans votre entreprise\u00A0?'],
    tip: 'Astuce\u00A0: partagez une réclamation client qui s’est transformée en bonne idée.',
  },
  branding: {
    intro: 'Une marque forte rend tout le reste moins coûteux, mais ses résultats se voient sur le long terme.',
    q: ['Comment décririez-vous votre marque en trois mots\u00A0?', 'Comment défendez-vous l’investissement en marque auprès de la direction\u00A0?', 'Quelle marque, tous secteurs confondus, aimeriez-vous être\u00A0?'],
    tip: 'Astuce\u00A0: essayez de deviner les trois mots de la marque des autres.',
  },
  mass_media: {
    intro: 'La télévision, la radio et l’affichage touchent encore des millions de personnes, même si leur effet est de plus en plus difficile à mesurer.',
    q: ['Investissez-vous encore en télévision\u00A0? Pourquoi\u00A0?', 'Comment mesurez-vous l’impact d’une campagne dans les médias de masse\u00A0?', 'Quelle publicité d’un concurrent auriez-vous aimé signer\u00A0?'],
    tip: 'Astuce\u00A0: partagez la publicité qui a marqué votre enfance.',
  },
  public_relations: {
    intro: 'Un bon article de presse apporte de la crédibilité, un mauvais peut coûter des années de réputation.',
    q: ['Quelle a été votre plus belle retombée presse\u00A0?', 'Avez-vous un plan prêt en cas de crise\u00A0?', 'Quel rôle jouent les porte-parole et la direction dans votre communication\u00A0?'],
    tip: 'Astuce\u00A0: racontez comment vous avez géré une actualité embarrassante.',
  },
  guerrilla: {
    intro: 'Avec peu de budget et beaucoup de créativité, on peut signer des campagnes mémorables, si la marque ose.',
    q: ['Quelle est l’action la plus audacieuse que vous ayez menée\u00A0?', 'Qu’est-ce qui vous freine au moment de prendre des risques dans une campagne\u00A0?', 'Quelle action de guérilla d’une autre marque vous a fait envie\u00A0?'],
    tip: 'Astuce\u00A0: inventez ensemble une action folle pour la marque de l’un d’entre vous.',
  },
  product_management: {
    intro: 'Le marketing et le produit fonctionnent mieux ensemble, mais ne partagent pas toujours les mêmes priorités ni le même calendrier.',
    q: ['Le marketing participe-t-il à la conception des nouveaux produits\u00A0?', 'Comment décidez-vous quelle amélioration passe en premier\u00A0?', 'Quel lancement n’a pas fonctionné, et qu’en avez-vous appris\u00A0?'],
    tip: 'Astuce\u00A0: expliquez comment vous recueillez l’avis des clients avant un lancement.',
  },
  pnl: {
    intro: 'Le marketing doit prouver son impact sur le compte de résultat, pas seulement sur les clics et la portée.',
    q: ['Comment prouvez-vous à la finance que le marketing crée de la valeur\u00A0?', 'Quelle dépense avez-vous réduite sans perdre en résultats\u00A0?', 'Quel indicateur le marketing partage-t-il avec la direction financière\u00A0?'],
    tip: 'Astuce\u00A0: partagez la phrase qui marche le mieux pour défendre un budget.',
  },
  customer_journey: {
    intro: 'Le client passe du site à l’appli, au téléphone ou à l’agence, et attend que tout s’enchaîne comme une seule expérience.',
    q: ['À quelle étape du parcours perdez-vous le plus de clients\u00A0?', 'Avez-vous testé votre propre parcours en vous mettant à la place du client\u00A0?', 'Quel canal amélioreriez-vous en premier\u00A0?'],
    tip: 'Astuce\u00A0: racontez la dernière étape absurde que vous avez découverte dans votre propre parcours.',
  },
  operational_efficiency: {
    intro: 'Faire plus avec les mêmes ressources oblige à revoir les process, les outils et les priorités.',
    q: ['Quelle tâche répétitive avez-vous automatisée cette année\u00A0?', 'Quelle réunion supprimeriez-vous dès demain\u00A0?', 'Comment décidez-vous des projets à arrêter\u00A0?'],
    tip: 'Astuce\u00A0: partagez un outil qui vous fait gagner au moins une heure par semaine.',
  },
  risk_management: {
    intro: 'Chaque campagne comporte des risques\u00A0: juridiques, d’image ou de crédit. Les maîtriser sans brider la créativité est tout un art.',
    q: ['Quel risque vous inquiète le plus dans vos campagnes\u00A0?', 'Comment travaillez-vous avec l’équipe risques sans que tout prenne du retard\u00A0?', 'Une campagne a-t-elle déjà dû être stoppée à la dernière minute\u00A0?'],
    tip: 'Astuce\u00A0: racontez comment vous avez convaincu les risques de valider une idée difficile.',
  },
  compliance: {
    intro: 'Les règles sur la publicité financière et la protection des données évoluent souvent et touchent chaque message.',
    q: ['Quelle règle a le plus fait évoluer votre communication\u00A0?', 'Comment faites-vous valider un message par le juridique et la conformité\u00A0?', 'Où placez-vous la limite entre utile et intrusif avec les données\u00A0?'],
    tip: 'Astuce\u00A0: comparez le temps qu’il faut dans chaque entreprise pour valider une publicité.',
  },
  cofidis_ninja: {
    intro: 'Faire aboutir un projet entre pays, filiales et départements demande du doigté et de bons alliés.',
    q: ['Quel est votre plus beau projet entre pays\u00A0?', 'Quelle astuce utilisez-vous pour aligner des équipes de pays différents\u00A0?', 'Quel projet d’une autre filiale aimeriez-vous reproduire\u00A0?'],
    tip: 'Astuce\u00A0: échangez le contact d’une personne clé dans votre filiale.',
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
    tip: 'Tip: show each other one of your favourite posts on your phone.',
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
    q: ['Which data point turned out to be surprisingly predictive?', 'Which decision did you make thanks to an analysis?', 'Who has the final say when data and gut feeling disagree?'],
    tip: 'Tip: compare the dashboards you each check every Monday.',
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
    q: ['What’s the boldest stunt you’ve ever pulled off?', 'What holds you back from taking risks in a campaign?', 'Which guerrilla action by another brand did you love?'],
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
    q: ['At which step of the journey do you lose the most customers?', 'Have you gone through your own journey as if you were a customer?', 'Which channel would you improve first?'],
    tip: 'Tip: share the last absurd step you found in your own journey.',
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
    q: ['Which rule has changed your communication the most?', 'How do you get a message approved by legal and compliance?', 'Where do you draw the line between useful and intrusive with data?'],
    tip: 'Tip: compare how long it takes to approve an ad at each company.',
  },
  cofidis_ninja: {
    intro: 'Pushing a project through countries, subsidiaries and departments takes tact and good allies.',
    q: ['Which cross-country project are you proudest of?', 'What trick do you use to align teams from different countries?', 'Which project from another subsidiary would you like to copy?'],
    tip: 'Tip: swap the contact details of a key person in your subsidiaries.',
  },
}

// Para las mesas que añade el admin: preguntas generales con el título de la mesa
const GENERIC = {
  fr: (name, desc) => ({
    intro: desc || `Aujourd’hui, on parle de «\u00A0${name}\u00A0». Chacun à la table le vit sous un angle différent.`,
    q: [`Qu’est-ce qui vous préoccupe le plus aujourd’hui avec «\u00A0${name}\u00A0»\u00A0?`, 'Qu’est-ce qui a fonctionné dans votre équipe, et qu’est-ce qui n’a pas marché\u00A0?', 'Que feriez-vous différemment si vous repartiez de zéro demain\u00A0?'],
    tip: 'Astuce\u00A0: chaque personne partage un exemple réel en une minute.',
  }),
  en: (name, desc) => ({
    intro: desc || `Today’s topic is “${name}”. Everyone at the table sees it from a different angle.`,
    q: [`What worries you most about “${name}” today?`, 'What has worked in your team, and what hasn’t?', 'What would you do differently if you started from scratch tomorrow?'],
    tip: 'Tip: each person shares a real example in one minute.',
  }),
}

/** Contexto, preguntas y pista para un tema. `desc` = descripción de la mesa, si la tiene */
export function icebreakerFor(topicId, lang, desc = '') {
  const dict = lang === 'en' ? EN : FR
  if (!isCustom(topicId) && dict[topicId]) return dict[topicId]
  const name = isCustom(topicId) ? customLabel(topicId) : String(topicId)
  return GENERIC[lang === 'en' ? 'en' : 'fr'](name, desc)
}

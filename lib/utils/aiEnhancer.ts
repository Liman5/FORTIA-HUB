// Helper for AI text enhancement ("Améliorer") for digital product forms

const TITLE_ENHANCEMENTS: Record<string, string[]> = {
  ebook: [
    "Guide Ultime & Masterclass PDF : Stratégies Gagnantes 2026",
    "Ebook Pro : Le Manuel Complet de A à Z (Édition Mise à Jour)",
    "Bible Pratique & Fiches d'Action : Méthode Pas à Pas Téléchargeable",
    "Plan d'Action Stratégique : Les Clés Réussite & Exécution Rapide"
  ],
  canva_template: [
    "Pack 150+ Templates Canva Pro : Kit Visuel Haute Conversion",
    "Kit Design Canva Premium : Carrousels, Stories & Bannières Modifiables",
    "Templates Canva Prêts à L'Emploi : Identité Visuelle Pro en 1 Clic",
    "Bundle Design Réseaux Sociaux : 200+ Visuels d'Élite Modifiables"
  ],
  ai_prompts: [
    "Pack 500+ Prompts ChatGPT & Claude : Copier-Coller pour Business",
    "Master Pack Prompts IA 2026 : Ingénierie de Prompt & Automatisations",
    "Bibliothèque de Prompts Haute Performance : Marketing, Vente & Code",
    "Vault Prompts IA Sur-Mesure : Multipliez votre Productivité par 10"
  ],
  course: [
    "Formation Vidéo HD : Système Complet & Ateliers Pratiques",
    "Bootcamp Vidéo Immertif : Maîtrisez la Compétence en 7 Jours",
    "Masterclass Vidéo Pas à Pas : Études de Cas & Exercices Inclus",
    "Programme Vidéo Premium : De Débutant à Expert avec Projets Réels"
  ],
  business_plan: [
    "Modèle Business Plan Financier Excel & Pitch Deck Pro",
    "Pack Kit Création d'Entreprise : Prévisionnel, Statuts & Business Model",
    "Business Plan Prêt à Présenter aux Banques & Investisseurs",
    "Cadre Business Plan Complet : Tableaux Financiers & Executive Summary"
  ],
  contract: [
    "Pack Juridique Freelance & Agence : Contrats Standard, NDA & CGV",
    "Modèles de Contrats Légaux Validés : Prestation, Partenariat & Sub-Contract",
    "Kit Protection Juridique : Modèles d'Accords Prêts à Signer",
    "Contrats & chartes de Prestation de Service Haute Sécurité"
  ],
  default: [
    "Pack Ressources d'Élite 2026 : Outils Pratiques & Prêts à l'Emploi",
    "Guide & Fichiers Source Premium : Téléchargement Instantané 24/7",
    "Système Clé en Main Pro : Modèles & Frameworks de Haute Qualité",
    "Kit d'Exécution Rapide : Fichiers Modifiables & Mises à Jour Incluses"
  ]
};

const DESCRIPTION_VARIATIONS = [
  "Accédez immédiatement à une ressource numérique d'élite conçue sur-mesure pour vous offrir une méthode claire, structurée et directement applicable. En téléchargeant ce pack complet, vous bénéficiez de tous les fichiers sources modifiables, d'instructions étape par étape et d'un gain de temps considérable pour atteindre vos objectifs sans réinventer la roue.",
  "Découvrez une solution clé en main complète élaborée par des experts du domaine. Conçu pour répondre aux exigences les plus hautes, ce produit rassemble l'ensemble des modèles modifiables, des supports pratiques et des fichiers d'exécution nécessaires pour concrétiser vos projets avec une efficacité professionnelle.",
  "Un ensemble complet de ressources haut de gamme pensé pour simplifier votre quotidien et booster vos résultats. Vous recevez un accès instantané et sécurisé à l'ensemble des livrables téléchargeables, accompagnés d'une prise en main facile et de supports 100% personnalisables selon vos besoins.",
  "Transformez votre façon de travailler grâce à cette ressource numérique stratégique. Alliant pertinence technique et simplicité d'utilisation, ce coffret vous livre les outils essentiels, des exemples concrets et tous les fichiers nécessaires pour passer immédiatement à l'action avec succès.",
  "Ce produit numérique d'exception vous donne un avantage concurrentiel direct. Il intègre des templates professionnels haute définition, des cadres méthodologiques validés et des fiches d'action rapides téléchargeables en 1 clic dès la confirmation de votre commande."
];

const FEATURES_ENHANCEMENTS = [
  [
    "Accès instantané 24/7 & Téléchargement immédiat",
    "Fichiers source modifiables à 100% inclus",
    "Guide d'utilisation détaillé pas à pas",
    "Mises à jour gratuites à vie"
  ],
  [
    "Format universel compatible tous appareils (Mobile & PC)",
    "Templates haute résolution prêts à l'emploi",
    "Licence d'utilisation commerciale incluse",
    "Support prioritaire par email"
  ],
  [
    "Gain de temps estimé : +15h d'exécution économisées",
    "Structure professionnelle testée & approuvée",
    "Bonus exclusifs offerts dans le fichier téléchargeable",
    "Garantie zéro complication à la prise en main"
  ]
];

export function enhanceTitle(current: string, type: string = 'default', indexRef = 0): string {
  const options = TITLE_ENHANCEMENTS[type] || TITLE_ENHANCEMENTS.default;
  
  if (current.trim().length > 3) {
    // Polish current text
    const cleanText = current.trim();
    const prefixes = ["Master Pack - ", "Guide d'Élite : ", "Kit Premium : ", "Pack Pro 2026 : "];
    const prefix = prefixes[indexRef % prefixes.length];
    return `${prefix}${cleanText.charAt(0).toUpperCase() + cleanText.slice(1)}`;
  }

  return options[indexRef % options.length];
}

export function enhanceDescription(current: string, title: string = '', indexRef = 0): string {
  const cleanDesc = current.trim();
  const cleanTitle = title.trim();

  // Primary topic or title of the product
  const topic = cleanTitle || (cleanDesc.length > 3 ? cleanDesc : 'cette ressource numérique');

  const templates = [
    `Découvrez "${topic}" : une ressource numérique d'élite spécialement élaborée pour vous apporter un système clair, performant et directement opérationnel. En accédant à ce produit complet, vous téléchargez l'ensemble des fichiers de travail modifiables, modèles pratiques et instructions pas à pas nécessaires pour maîtriser le sujet et atteindre vos objectifs en toute autonomie.`,
    `Grâce à "${topic}", bénéficiez d'une solution clé en main haut de gamme conçue par des experts du secteur. Ce coffret rassemble tous les supports indispensables, des exemples d'exécution concrets et une structure 100% personnalisable pour transformer votre méthode de travail et booster vos résultats immédiatement.`,
    `Présentation de "${topic}" : le guide et kit stratégique indispensable pour passer au niveau supérieur. Il intègre des outils d'exécution rapide, une documentation complète et un accès instantané et sécurisé 24/7 à l'ensemble des livrables téléchargeables dès la confirmation de votre commande.`,
    `Maximisez vos performances grâce à "${topic}". Pensé pour simplifier votre quotidien tout en vous garantissant des standards professionnels exigés, ce produit numérique rassemble des fiches opérationnelles, des modules téléchargeables en 1 clic et un suivi clair sans réinventer la roue.`
  ];

  return templates[indexRef % templates.length];
}

export function enhanceFeatures(current: string, indexRef = 0): string {
  const selectedPreset = FEATURES_ENHANCEMENTS[indexRef % FEATURES_ENHANCEMENTS.length];
  
  if (current.trim().length > 5) {
    const lines = current.split('\n').map(l => l.trim()).filter(Boolean);
    const enhancedLines = lines.map(l => l.startsWith('•') || l.startsWith('✔') ? l : `✔ ${l}`);
    if (!enhancedLines.some(l => l.toLowerCase().includes('accès instantané'))) {
      enhancedLines.push('✔ Accès instantané 24/7 & Téléchargement immédiat');
    }
    return enhancedLines.join('\n');
  }

  return selectedPreset.join('\n');
}

import { 
  Course, 
  DigitalProduct, 
  ServicePackage, 
  Certificate, 
  UserProfile,
  FreelanceProfile,
  EnterpriseProfile,
  BlogPost,
  RegistrationFeeConfig,
  KycSubmission
} from '../types';

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-crypto-master',
    title: 'Masterclass Cryptomonnaie & Trading de Précision',
    slug: 'crypto-masterclass',
    category: 'crypto',
    categoryLabel: 'Cryptomonnaie & Blockchain',
    badge: 'Best-Seller',
    description: 'Maîtrisez la Blockchain, la gestion de Wallets, les écosystèmes USDT, SDA, PI, BNB, l\'analyse technique et la gestion stricte du risque.',
    fullDescription: 'Une formation complète étape par étape pour appréhender les marchés cryptographiques sans stress. Apprenez à sécuriser vos fonds sur Wallets froids, trader le BNB et l\'USDT, analyser le potentiel de projets comme Pi Network ou SDA, et élaborer un plan de gestion des risques infaillible.',
    level: 'Tous niveaux',
    durationHours: 24,
    lessonsCount: 38,
    price: 99,
    rating: 4.9,
    reviewsCount: 312,
    studentsCount: 1420,
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Ibrahima Cham',
      role: 'Expert Blockchain & Analyste Financier',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Comprendre le fonctionnement exact de la technologie Blockchain et du Web3',
      'Créer et sécuriser vos Wallets (Trust Wallet, MetaMask, Ledger)',
      'Acheter, vendre et transférer en toute sécurité USDT, BNB, SDA et PI',
      'Maîtriser l\'analyse technique (Chandeliers japonais, RSI, Support/Résistance)',
      'Appliquer une gestion de risque stricte (Ratio Risk/Reward, Stop Loss)'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Fondations Blockchain & Écosystème Web3',
        lessons: [
          { id: 'l1', title: 'Introduction à la Blockchain et à la Décentralisation', duration: '18 min', type: 'video' },
          { id: 'l2', title: 'Création & Sécurisation de vos Portefeuilles (Wallets)', duration: '25 min', type: 'video' },
          { id: 'l3', title: 'Comprendre les Stablecoins (USDT) & les Tokens (BNB, SDA, PI)', duration: '22 min', type: 'video' }
        ]
      },
      {
        id: 'c2',
        title: 'Chapitre 2: Analyses de Marché & Stratégie',
        lessons: [
          { id: 'l4', title: 'Lecture des graphiques & Analyse technique avancée', duration: '35 min', type: 'video' },
          { id: 'l5', title: 'Gestion du Risque & Calcul du Taille de Position', duration: '28 min', type: 'article' },
          { id: 'l6', title: 'Cas Pratiques : Transactions réelles BNB & USDT', duration: '30 min', type: 'video' }
        ]
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: 'Quel est l\'élément essentiel pour sécuriser un Wallet de Cryptomonnaie ?',
        options: [
          'Le numéro de téléphone',
          'La phrase de récupération (Seed Phrase de 12 ou 24 mots)',
          'Une capture d\'écran du mot de passe',
          'L\'adresse email'
        ],
        correctAnswer: 1,
        explanation: 'La phrase de récupération (Seed Phrase) est la clé maîtresse absolue de votre portefeuille. Elle ne doit jamais être partagée ni sauvegardée sur un appareil connecté.'
      },
      {
        id: 'q2',
        question: 'Quelle est la fonction principale d\'un Stablecoin comme l\'USDT ?',
        options: [
          'Offrir un rendement garanti de 1000%',
          'Maintenir une parité de valeur fixe (généralement 1 USDT = 1 USD)',
          'Miniciser les frais de transaction du Bitcoin',
          'Remplacer le système bancaire mondial'
        ],
        correctAnswer: 1,
        explanation: 'L\'USDT est un stablecoin adossé au Dollar américain pour préserver la valeur contre la volatilité du marché crypto.'
      }
    ]
  },
  {
    id: 'course-ai-expert',
    title: 'Expertise IA : ChatGPT, Prompt Engineering & Automatisation',
    slug: 'ai-prompt-engineering',
    category: 'ai',
    categoryLabel: 'Intelligence Artificielle',
    badge: 'Tendance',
    description: 'Devenez un maître de l\'IA Générative : ChatGPT, Midjourney, création d\'affiches, logos, White Papers, analyse de données et automatisation.',
    fullDescription: 'Exploitez la puissance des modèles IA de pointe pour décupler votre productivité. Apprenez le Prompt Engineering avancé, la création visuelle (affiches, logos professionnels), la rédaction automatisée de White Papers et l\'analyse automatique de données complexes.',
    level: 'Tous niveaux',
    durationHours: 18,
    lessonsCount: 30,
    price: 89,
    rating: 4.95,
    reviewsCount: 245,
    studentsCount: 1180,
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Dr. Sarah Diallo',
      role: 'Directrice de Recherche en IA & Data Science',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Rédiger des prompts ultra-précis selon les frameworks RTF et CHAIN',
      'Générer des affiches, visuels et logos vectoriels de qualité studio',
      'Rédiger des White Papers et e-books complets en un temps record',
      'Analyser des jeux de données complexes et créer des rapports automatisés',
      'Automatiser vos tâches répétitives avec Make, Zapier et les agents IA'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Les Secrets du Prompt Engineering',
        lessons: [
          { id: 'l1', title: 'Anatomie d\'un Prompt Parfait pour ChatGPT & Claude', duration: '20 min', type: 'video' },
          { id: 'l2', title: 'Création d\'Affiches & Logos avec l\'IA Visuelle', duration: '30 min', type: 'video' },
          { id: 'l3', title: 'Rédaction Assistée par IA de White Papers Professionnels', duration: '25 min', type: 'article' }
        ]
      }
    ],
    quiz: [
      {
        id: 'q1',
        question: 'En Prompt Engineering, que signifie donner un "Rôle" (Persona) à l\'IA ?',
        options: [
          'Changer la couleur de l\'interface',
          'Spécifier l\'expertise et la posture sous lesquelles l\'IA doit répondre',
          'Diminuer le nombre de mots dans la réponse',
          'Activer le mode nuit'
        ],
        correctAnswer: 1,
        explanation: 'Définir un rôle précis (ex: "Agis en tant qu\'expert marketing senior") oriente l\'IA vers un vocabulaire, un ton et une profondeur adaptés.'
      }
    ]
  },
  {
    id: 'course-blockchain-web3',
    title: 'Blockchain & Web3 : Smart Contracts, DeFi & DApps',
    slug: 'blockchain-web3-smart-contracts',
    category: 'blockchain',
    categoryLabel: 'Blockchain & Web3',
    badge: 'Nouveau',
    description: 'Comprendre l\'architecture décentralisée, les Smart Contracts Solidity, la Finance Décentralisée (DeFi) et les jetons Web3.',
    fullDescription: 'Développez des compétences de pointe dans le domaine révolutionnaire de la Blockchain et du Web3. De l\'analyse de protocoles DeFi à la création de Smart Contracts sécurisés.',
    level: 'Intermédiaire',
    durationHours: 20,
    lessonsCount: 32,
    price: 99,
    rating: 4.91,
    reviewsCount: 140,
    studentsCount: 620,
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Ibrahima Cham',
      role: 'Fondateur FORTIA HUB & Architecte Web3',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Architecture technique de la Blockchain Ethereum, Solana et BNB Chain',
      'Fondamentaux du langage Solidity et des Smart Contracts',
      'Fonctionnement des Pools de Liquidité et Yield Farming en DeFi',
      'Auditer la sécurité des tokens et éviter les arnaques'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Architecture Web3 & Smart Contracts',
        lessons: [
          { id: 'l1', title: 'Anatomie d\'un Smart Contract Solidity', duration: '25 min', type: 'video' },
          { id: 'l2', title: 'Interactuer avec des DApps via Web3.js', duration: '30 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-dev-web',
    title: 'Développement Web Fullstack : HTML, CSS, React & Node.js',
    slug: 'developpement-web-fullstack',
    category: 'dev_web',
    categoryLabel: 'Développement Web',
    badge: 'Incontournable',
    description: 'Créez des sites web dynamiques et des applications modernes avec HTML5, Tailwind CSS, JavaScript, React et Node.js.',
    fullDescription: 'Devenez un développeur web complet capable de construire des plateformes interactives modernes de A à Z. Apprenez les normes actuelles du web.',
    level: 'Débutant',
    durationHours: 35,
    lessonsCount: 50,
    price: 120,
    rating: 4.93,
    reviewsCount: 290,
    studentsCount: 1540,
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Ousmane Diop',
      role: 'Senior Fullstack Engineer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Concevoir des interfaces responsives avec HTML5 & Tailwind CSS',
      'Maîtriser JavaScript ES6+ et TypeScript',
      'Développer des SPAs performantes avec React et Vite',
      'Créer une API REST avec Express & Node.js'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Les Fondations du Web Moderne',
        lessons: [
          { id: 'l1', title: 'HTML5 Sémantique & Layouts Flexbox/Grid', duration: '30 min', type: 'video' },
          { id: 'l2', title: 'Introduction à React Hooks & Component Architecture', duration: '40 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-dev-mobile',
    title: 'Développement Mobile Cross-Platform avec React Native & Flutter',
    slug: 'developpement-mobile-react-native',
    category: 'dev_mobile',
    categoryLabel: 'Développement Mobile',
    badge: 'Populaire',
    description: 'Concevez des applications mobiles Android et iOS natives à fort impact à partir d\'un seul codebase.',
    fullDescription: 'Apprenez à concevoir, tester et publier vos applications sur le Google Play Store et l\'Apple App Store. Gestion d\'état, notifications push et stockage local.',
    level: 'Intermédiaire',
    durationHours: 28,
    lessonsCount: 42,
    price: 115,
    rating: 4.89,
    reviewsCount: 160,
    studentsCount: 810,
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Ousmane Diop',
      role: 'Lead Mobile Developer',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Architecture d\'applications mobiles modernes',
      'Consommer des APIs REST et gérer la persistance hors ligne',
      'Déployer sur le Play Store et l\'App Store'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Maîtriser le Développement Mobile',
        lessons: [
          { id: 'l1', title: 'Setup de l\'environnement & Premiers composants', duration: '25 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-infographie',
    title: 'Infographie & Design Vectoriel : Photoshop, Illustrator & InDesign',
    slug: 'infographie-suite-adobe',
    category: 'infographie',
    categoryLabel: 'Infographie & Suite Adobe',
    description: 'Maîtrisez la suite Adobe pour réaliser des affiches professionnelles, retouches photo, illustrations vectorielles et chartes graphiques.',
    fullDescription: 'Une formation complète aux standards des agences de publicité. De la manipulation des calques Photoshop au dessin vectoriel sous Illustrator.',
    level: 'Tous niveaux',
    durationHours: 25,
    lessonsCount: 36,
    price: 85,
    rating: 4.9,
    reviewsCount: 215,
    studentsCount: 980,
    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Amina Ba',
      role: 'Lead Designer Vectoriel',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Retouche et photomontage professionnel sous Photoshop',
      'Création de logos et illustrations vectorielles sous Illustrator',
      'Mise en page de brochures, livres et magazines sous InDesign'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Les Secrets de la Suite Adobe',
        lessons: [
          { id: 'l1', title: 'Détourage parfait et retouche sous Photoshop', duration: '35 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-secretariat',
    title: 'Secrétariat Bureautique 2.0 & Gestion Administrative',
    slug: 'secretariat-bureautique-pro',
    category: 'secretariat',
    categoryLabel: 'Secrétariat Bureautique',
    description: 'Word, Excel avancé, PowerPoint, rédaction administrative, archivage numérique et organisation efficace d\'entreprise.',
    fullDescription: 'Devenez une référence administrative indispensable. Maîtrisez la rédaction de courriers officiels, les tableaux croisés dynamiques Excel et la gestion des flux d\'informations.',
    level: 'Débutant',
    durationHours: 16,
    lessonsCount: 24,
    price: 49,
    rating: 4.86,
    reviewsCount: 175,
    studentsCount: 920,
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Fatou Bintou Ndiaye',
      role: 'Consultante en Organisation Administrative',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Rédiger des comptes-rendus et lettres administratives d\'excellence',
      'Créer des tableaux de bord interactifs avec Excel',
      'Concevoir des présentations professionnelles épurées'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Excel & Rédaction Officielle',
        lessons: [
          { id: 'l1', title: 'Formules avancées Excel & Tableaux Croisés Dynamiques', duration: '30 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-informatique-base',
    title: 'Informatique de Base, Internet & Sécurité Numérique',
    slug: 'informatique-de-base-debutant',
    category: 'informatique',
    categoryLabel: 'Informatique de Base',
    description: 'Prenez en main Windows/Mac, la gestion des fichiers, la navigation Internet sécurisée et les outils de travail collaboratifs.',
    fullDescription: 'Le guide fondamental pour toute personne souhaitant maîtriser l\'outil informatique sans crainte. Idéal pour débutants et reconversion.',
    level: 'Débutant',
    durationHours: 12,
    lessonsCount: 18,
    price: 39,
    rating: 4.94,
    reviewsCount: 310,
    studentsCount: 1890,
    image: 'https://images.unsplash.com/photo-1587614382346-4ec70e388b28?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Fatou Bintou Ndiaye',
      role: 'Formatrice Inclusion Numérique',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Utiliser un ordinateur en toute autonomie (Windows/Mac)',
      'Organiser ses dossiers et fichiers efficacement',
      'Naviguer sur Internet en sécurité et éviter les arnaques'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Premiers Pas avec l\'Ordinateur',
        lessons: [
          { id: 'l1', title: 'Découverte du système d\'exploitation & Clavier', duration: '20 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-canva-pro',
    title: 'Design Graphique & Branding Professionnel avec Canva Pro',
    slug: 'canva-design-branding',
    category: 'canva',
    categoryLabel: 'Canva & Design Graphique',
    description: 'Créez des affiches percutantes, charte graphique, logos, flyers, cartes de visite, présentations VIP et visuels réseaux sociaux.',
    fullDescription: 'Sublimez la communication de votre marque. Apprenez les règles d\'or du design graphique (typographie, théorie des couleurs, composition, espaces négatifs) et utilisez Canva Pro comme une agence de design chevronnée.',
    level: 'Débutant',
    durationHours: 14,
    lessonsCount: 26,
    price: 59,
    rating: 4.88,
    reviewsCount: 198,
    studentsCount: 950,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Amina Ba',
      role: 'Lead Branding & Visual Designer',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Concevoir une identité de marque complète (Brand Kit, Palette, Typo)',
      'Créer des affiches événementielles et flyers professionnels',
      'Réaliser des cartes de visite et présentations d\'affaires percutantes',
      'Optimiser les formats pour Instagram, Facebook, LinkedIn et TikTok'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Les Règles du Design & Identité Visuelle',
        lessons: [
          { id: 'l1', title: 'Fondamentaux de la Théorie des Couleurs & Typographie', duration: '22 min', type: 'video' },
          { id: 'l2', title: 'Création d\'un Brand Kit complet sous Canva Pro', duration: '28 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-capcut-pro',
    title: 'CapCut Pro : Montage Vidéo, Shorts, Reels & effets FX',
    slug: 'capcut-video-editing',
    category: 'capcut',
    categoryLabel: 'Montage Vidéo CapCut',
    description: 'Créez des vidéos YouTube, Shorts et Reels virales avec sous-titres animés, voice-over IA, effets cinématiques et transitions fluides.',
    fullDescription: 'Le montage vidéo moderne à la portée de tous. Découvrez les techniques de cutting dynamique, le sound design immersif, les sous-titres automatiques avec animations d\'accroche et la création de formats vidéo verticaux ultra-engagants.',
    level: 'Tous niveaux',
    durationHours: 16,
    lessonsCount: 28,
    price: 69,
    rating: 4.92,
    reviewsCount: 210,
    studentsCount: 1040,
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Kévin N\'Guessan',
      role: 'Réalisateur & Content Creator (+500k abonnés)',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Maîtriser l\'interface CapCut sur PC, Mac et Mobile',
      'Réaliser des montages rythmés pour Reels, Shorts et TikTok',
      'Ajouter des sous-titres dynamiques et des effets visuels cinématiques',
      'Utiliser le Voice-Over IA et étalonner les couleurs pour un rendu pro'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Montage Dynamique & Rétention',
        lessons: [
          { id: 'l1', title: 'Structure d\'une vidéo virale de 60 secondes', duration: '15 min', type: 'video' },
          { id: 'l2', title: 'Utilisation des Keyframes, Masques et Transitions', duration: '32 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-marketing-digital',
    title: 'Marketing Digital & Community Management 360°',
    slug: 'digital-marketing-community-management',
    category: 'marketing',
    categoryLabel: 'Marketing Digital',
    description: 'Stratégie Facebook, Instagram, X, LinkedIn, WhatsApp Business, branding, publicité ciblée et gestion de communauté.',
    fullDescription: 'Développez la visibilité de vos clients ou de votre propre entreprise. Apprenez à paramétrer des campagnes Meta Ads (Facebook & Instagram), exploiter WhatsApp Business pour la conversion directe, et animer une communauté fidèle.',
    level: 'Tous niveaux',
    durationHours: 22,
    lessonsCount: 35,
    price: 95,
    rating: 4.87,
    reviewsCount: 180,
    studentsCount: 890,
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Mariama Traoré',
      role: 'Consultante Stratégie Digitale & Ads',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Construire un calendrier éditorial d\'engagement fort',
      'Créer et optimiser des campagnes Meta Ads rentable',
      'Mettre en place un tunnel de vente via WhatsApp Business',
      'Gérer l\'e-réputation et mesurer le ROI de vos actions'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Stratégie Réseaux Sociaux & Conversion',
        lessons: [
          { id: 'l1', title: 'Définition du Persona Client & Stratégie de Contenu', duration: '24 min', type: 'video' },
          { id: 'l2', title: 'Tunnel de Vente & WhatsApp Business Automation', duration: '30 min', type: 'video' }
        ]
      }
    ]
  },
  {
    id: 'course-entrepreneuriat',
    title: 'Leadership, Business Model & Gestion Financière',
    slug: 'entrepreneuriat-leadership-finance',
    category: 'entrepreneurship',
    categoryLabel: 'Entrepreneuriat & Coaching',
    description: 'Développez un leadership impactant, structurez votre Business Model Canvas, optimisez votre productivité et gérez vos finances d\'entreprise.',
    fullDescription: 'Passez de l\'idée à l\'exécution avec succès. Ce programme est conçu pour les fondateurs, entrepreneurs et dirigeants souhaitant structurer leur entreprise, piloter la rentabilité financière et maintenir un niveau de productivité au sommet.',
    level: 'Tous niveaux',
    durationHours: 20,
    lessonsCount: 32,
    price: 110,
    rating: 4.96,
    reviewsCount: 165,
    studentsCount: 760,
    image: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
    instructor: {
      name: 'Ibrahima Cham',
      role: 'Fondateur FORTIA HUB & Serial Entrepreneur',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    },
    learningOutcomes: [
      'Élaborer un Business Model Canvas rentable et scalable',
      'Fixer ses prix, établir un plan de trésorerie et gérer le BFR',
      'Développer un leadership inspirant et gérer des équipes efficacement',
      'Appliquer le système de productivité des entrepreneurs à succès'
    ],
    chapters: [
      {
        id: 'c1',
        title: 'Chapitre 1: Structuration & Modèle d\'Affaires',
        lessons: [
          { id: 'l1', title: 'Construire un Business Model Canvas Scalable', duration: '28 min', type: 'video' },
          { id: 'l2', title: 'Gestion Financière & Calcul des Marges Nettes', duration: '35 min', type: 'video' }
        ]
      }
    ]
  }
];

export const INITIAL_DIGITAL_PRODUCTS: DigitalProduct[] = [
  {
    id: 'prod-ebook-crypto',
    title: 'Guide Ultime de Sécurité Crypto & Trading sans Stress (eBook PDF)',
    type: 'ebook',
    typeLabel: 'eBook PDF',
    description: '120 pages pratiques avec fiches réflexes pour sécuriser vos actifs (USDT, BNB, SDA, PI) et maîtriser la gestion du risque.',
    price: 19,
    originalPrice: 35,
    rating: 4.9,
    salesCount: 420,
    fileFormat: 'PDF Haute Résolution (Imprimable)',
    fileSize: '14.2 MB',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    features: [
      'Checklist de sécurisation des Wallets (Trust Wallet, Ledger)',
      'Guide d\'analyse des tokens d\'avenir (USDT, SDA, PI, BNB)',
      'Modèle Excel de calcul automatique de Money Management',
      'Téléchargement immédiat après paiement'
    ],
    isPopular: true
  },
  {
    id: 'prod-canva-pack-social',
    title: 'Pack de 150+ Modèles Canva Pro Réseaux Sociaux & Flyers',
    type: 'canva_template',
    typeLabel: 'Modèles Canva',
    description: 'Affiches, carrousels Instagram, bannières Facebook, cartes de visite et présentations éditables en 1 clic.',
    price: 25,
    originalPrice: 49,
    rating: 4.95,
    salesCount: 680,
    fileFormat: 'Liens directs d\'accès Canva Pro',
    fileSize: 'Accès Cloud instantané',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    features: [
      '150+ templates 100% personnalisables',
      'Formats adaptés Instagram, Facebook, LinkedIn & WhatsApp',
      'Inclus : Palettes de couleurs or & bleu marine élégantes',
      'Mises à jour gratuites à vie'
    ],
    isPopular: true
  },
  {
    id: 'prod-ai-prompts-vault',
    title: 'La Bible des 500+ Prompts IA (ChatGPT, Midjourney & Claude)',
    type: 'ai_prompts',
    typeLabel: 'Prompts IA',
    description: 'Prompts testés et approuvés pour générer des logos, affiches, White Papers, contenus réseaux sociaux et code.',
    price: 15,
    originalPrice: 29,
    rating: 4.88,
    salesCount: 890,
    fileFormat: 'PDF + Document Notion interactif',
    fileSize: '8.5 MB',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=600&q=80',
    features: [
      '500+ Prompts classés par catégories (Branding, Copywriting, Code)',
      'Exemples avant/après et astuces de réglage de paramètres',
      'Prompts spécifiques pour créations d\'affiches et logos',
      'Utilisable sur ChatGPT gratuit et Plus'
    ]
  },
  {
    id: 'prod-whitepaper-templates',
    title: 'White Paper Master Template & Guide de Rédaction Blockchain/IA',
    type: 'whitepaper',
    typeLabel: 'White Paper',
    description: 'Modèle professionnel complet de Livre Blanc (White Paper) pour le lancement de projet crypto, startup tech ou levée de fonds.',
    price: 35,
    originalPrice: 70,
    rating: 4.93,
    salesCount: 280,
    fileFormat: 'Word + Canva + PDF',
    fileSize: '18 MB',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
    features: [
      'Structure complète de 25 pages pré-rédigées',
      'Graphiques de tokenomics et roadmap éditables',
      'Normes internationales de présentation'
    ]
  },
  {
    id: 'prod-business-plan-kit',
    title: 'Business Plan VIP & Modèle Financier Excel (Prêt à Banker)',
    type: 'business_plan',
    typeLabel: 'Business Plan',
    description: 'Trame complète de Business Plan avec modèle d\'exploitation sur 3 ans, compte de résultat et plan de trésorerie automatique.',
    price: 39,
    originalPrice: 85,
    rating: 4.96,
    salesCount: 410,
    fileFormat: 'Excel + Word',
    fileSize: '12 MB',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    features: [
      'Plan financier automatisé avec formules Excel',
      'Textes pré-rédigés pour étude de marché et stratégie',
      'Idéal pour banques, investisseurs et subventions'
    ],
    isPopular: true
  },
  {
    id: 'prod-contracts-kit',
    title: 'Kit de Contrats Freelance & Modèles Juridiques Prestations',
    type: 'contract',
    typeLabel: 'Contrats & Juridique',
    description: 'Ensemble de modèles de contrats professionnels de prestation de service, accords de confidentialité (NDA), devis et conditions de vente.',
    price: 29,
    originalPrice: 60,
    rating: 4.89,
    salesCount: 350,
    fileFormat: 'Word éditables',
    fileSize: '5 MB',
    image: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    features: [
      'Contrat de prestation de service standard',
      'Accord de confidentialité (NDA) bilatéral',
      'Conditions Générales de Vente (CGV)'
    ]
  },
  {
    id: 'prod-pitch-deck-pack',
    title: 'Pitch Deck d\'Élite : 30 Templates PowerPoint & Keynote Investor-Ready',
    type: 'pitch_deck',
    typeLabel: 'Pitch Deck',
    description: 'Diaporama haut de gamme pour présenter votre entreprise devant des investisseurs ou lors de concours de pitch.',
    price: 32,
    originalPrice: 65,
    rating: 4.91,
    salesCount: 220,
    fileFormat: 'PPTX + Keynote',
    fileSize: '45 MB',
    image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
    features: [
      '30 slides uniques au design épuré',
      'Graphiques financiers et schémas d\'équipe',
      'Guide du pitch réussi inclus'
    ]
  },
  {
    id: 'prod-bundle-all-in-one',
    title: 'Pack Ultra Premium : L\'Intégrale des Ressources Numériques',
    type: 'premium_pack',
    typeLabel: 'Pack Premium',
    description: 'Accès complet immédiat : Tout le catalogue de ressources (eBooks, Prompts, Templates Canva, Kits CapCut & White Papers).',
    price: 69,
    originalPrice: 197,
    rating: 4.99,
    salesCount: 290,
    fileFormat: 'Accès VIP global (Téléchargement direct)',
    fileSize: '500 MB+',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80',
    features: [
      'Inclus tous les eBooks, templates Canva et Prompts IA',
      'Accès prioritaire aux futures mises à jour de contenu',
      'Économisez plus de 65% par rapport à l\'achat séparé',
      'Licence commerciale incluse'
    ],
    isPopular: true
  }
];

export const INITIAL_SERVICES: ServicePackage[] = [
  {
    id: 'serv-logo-branding',
    title: 'Création de Logos & Branding de Luxe',
    category: 'Design & Branding',
    description: 'Conception d\'identités visuelles haute de gamme avec charte graphique complète, déclinaisons de logos et fichiers vectoriels.',
    startingPrice: 150,
    estimatedDays: '3 à 5 jours',
    iconName: 'Palette',
    deliverables: [
      '3 propositions de logos originaux vectoriels (AI, SVG, PNG, PDF)',
      'Charte graphique (Palette de couleurs, typographies, règles d\'usage)',
      'Mockups d\'application (Cartes de visite, enseigne, réseaux sociaux)',
      'Cession complète des droits d\'auteur'
    ],
    options: [
      { name: 'Livraison express en 24h', price: 50 },
      { name: 'Kit réseaux sociaux complet (Bannières + 10 visuels)', price: 80 }
    ]
  },
  {
    id: 'serv-affiches-communication',
    title: 'Conception d\'Affiches & Visuels Publicitaires',
    category: 'Design & Graphisme',
    description: 'Création visuelle percutante pour vos événements, lancements de produits, campagnes d\'affichage et publicités sur réseaux.',
    startingPrice: 60,
    estimatedDays: '2 jours',
    iconName: 'Image',
    deliverables: [
      'Affiche haute résolution prête pour l\'impression (CMJN 300 DPI)',
      'Adaptations aux formats digitaux (Instagram, Facebook, WhatsApp)',
      'Fichiers sources modifiables',
      'Révisions illimitées jusqu\'à satisfaction'
    ]
  },
  {
    id: 'serv-whitepapers-redaction',
    title: 'Rédaction & Design de White Papers',
    category: 'Rédaction & Stratégie',
    description: 'Élaboration de livres blancs institutionnels, présentations de projets blockchain/IA ou dossiers d\'investissement d\'élite.',
    startingPrice: 200,
    estimatedDays: '5 à 7 jours',
    iconName: 'FileText',
    deliverables: [
      'Rédaction technique et rédactionnelle haut niveau',
      'Mise en page graphique soignée aux couleurs de votre marque',
      'Schémas, infographies et tableaux statistiques intégrés',
      'Export PDF interactif de haute qualité'
    ]
  }
];

export const INITIAL_FREELANCES: FreelanceProfile[] = [
  {
    id: 'free-1',
    name: 'Sidy Sarr',
    title: 'Expert IA, Automatisations Make & Prompt Engineer',
    bio: 'Spécialiste dans la création de bots IA, workflows d\'automatisation et génération de visuels/prompts haute précision.',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80',
    badge: 'green',
    badgeLabel: 'Badge Vert (Compte Vérifié Actif)',
    category: 'IA & Automatisation',
    rating: 4.95,
    completedJobs: 48,
    hourlyRate: 35,
    skills: ['ChatGPT', 'Make.com', 'Midjourney', 'Zapier', 'Python'],
    kycVerified: true,
    registrationFeePaid: true,
    canReceivePayments: true,
    canSellServices: true,
    location: 'Dakar, Sénégal',
    portfolio: [
      { title: 'Bot Service Client IA pour Agence E-commerce', image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=400&q=80' }
    ],
    services: [
      {
        id: 'fserv-1',
        freelanceId: 'free-1',
        title: 'Création de Bot IA & Automatisation Make/Zapier',
        category: 'IA & Automatisation',
        description: 'Je connecte votre support client ou vos formulaires à ChatGPT pour automatiser vos réponses et ventes.',
        startingPrice: 80,
        deliveryDays: 3,
        image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
        ordersCompleted: 24,
        rating: 4.9
      }
    ]
  },
  {
    id: 'free-2',
    name: 'Kadiatou Coulibaly',
    title: 'Senior UI/UX & Lead Designer Infographie',
    bio: 'Plus de 6 ans d\'expérience dans le branding de luxe, la création de logos, charte graphique et maquettes d\'applications.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    badge: 'green',
    badgeLabel: 'Badge Vert (Compte Vérifié Actif)',
    category: 'UI/UX & Infographie',
    rating: 4.98,
    completedJobs: 82,
    hourlyRate: 40,
    skills: ['Figma', 'Illustrator', 'Photoshop', 'Branding', 'Canva Pro'],
    kycVerified: true,
    registrationFeePaid: true,
    canReceivePayments: true,
    canSellServices: true,
    location: 'Abidjan, Côte d\'Ivoire',
    portfolio: [
      { title: 'Branding & Identity pour Fintech Africaine', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=400&q=80' }
    ],
    services: [
      {
        id: 'fserv-2',
        freelanceId: 'free-2',
        title: 'Conception de Logo & Charte Graphique Haute Gamme',
        category: 'Branding',
        description: 'Design de logo vectoriel d\'exception avec guide de marque complet.',
        startingPrice: 120,
        deliveryDays: 4,
        image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=400&q=80',
        ordersCompleted: 45,
        rating: 5.0
      }
    ]
  },
  {
    id: 'free-3',
    name: 'Mamadou Kane',
    title: 'Développeur Fullstack React & Node.js',
    bio: 'Créateur de sites web sur-mesure, plateformes SaaS et intégration de systèmes de paiement Mobile Money & Crypto.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    badge: 'green',
    badgeLabel: 'Badge Vert (Compte Vérifié Actif)',
    category: 'Développement Web',
    rating: 4.88,
    completedJobs: 35,
    hourlyRate: 45,
    skills: ['React', 'Node.js', 'TypeScript', 'Tailwind', 'MongoDB'],
    kycVerified: true,
    registrationFeePaid: true,
    canReceivePayments: true,
    canSellServices: true,
    location: 'Lomé, Togo',
    portfolio: [
      { title: 'Site Web E-commerce de Vente Directe', image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80' }
    ],
    services: [
      {
        id: 'fserv-3',
        freelanceId: 'free-3',
        title: 'Développement de Site Web Responsive & Rapide',
        category: 'Développement Web',
        description: 'Site web vitrine ou e-commerce sur-mesure optimisé SEO et mobile.',
        startingPrice: 190,
        deliveryDays: 5,
        image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=400&q=80',
        ordersCompleted: 18,
        rating: 4.85
      }
    ]
  },
  {
    id: 'free-4',
    name: 'Antoine Mensah',
    title: 'Créateur de Contenu & Monteur Vidéo CapCut/Premiere',
    bio: 'Spécialisé dans les formats courts captivants (Reels, TikTok, Shorts) avec sous-titres animés et effets sonores.',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    badge: 'none',
    badgeLabel: 'Sans Badge (Compte Non Vérifié)',
    category: 'Montage vidéo',
    rating: 4.7,
    completedJobs: 12,
    hourlyRate: 25,
    skills: ['CapCut', 'Premiere Pro', 'After Effects', 'Sound Design'],
    kycVerified: false,
    registrationFeePaid: false,
    canReceivePayments: false,
    canSellServices: false,
    location: 'Cotonou, Bénin',
    portfolio: [],
    services: []
  }
];

export const INITIAL_ENTERPRISES: EnterpriseProfile[] = [
  {
    id: 'ent-1',
    companyName: 'FORTIA DIGITAL AGENCY',
    tagline: 'L\'Agence Digitale 360° pour Entreprises & Marques d\'Élite',
    description: 'Agence spécialisée dans le branding institutionnel, le développement d\'applications sur-mesure, la stratégie de croissance et l\'intégration de solutions IA & Blockchain.',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
    badge: 'gold',
    badgeLabel: 'Badge Doré (Société Certifiée)',
    sector: 'Agence Digitale & IA',
    country: 'Sénégal / International',
    verifiedDocuments: true,
    registrationFeePaid: true,
    canReceivePayments: true,
    canSellServices: true,
    team: [
      { name: 'Ibrahima Cham', role: 'Fondateur & Managing Director', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80' },
      { name: 'Amina Ba', role: 'Directrice Créative & Brand Strategy', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
      { name: 'Ousmane Diop', role: 'Directeur Technique (CTO)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' }
    ],
    portfolio: [
      { title: 'Refonte d\'Identité Visuelle pour Groupe FinTech', category: 'Branding', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=400&q=80' },
      { title: 'Plateforme Web & Application Mobile Multi-Pays', category: 'Dev Web/Mobile', image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80' }
    ],
    offeredServices: [
      { title: 'Accompagnement Branding & Charte Institutionnelle', startingPrice: 450, description: 'Création globale d\'image de marque pour entreprise.' },
      { title: 'Développement de Solution Logicielle / SaaS Sur-Mesure', startingPrice: 950, description: 'Conception web/mobile complète sécurisée.' }
    ],
    contactEmail: 'contact@fortia-hub.com',
    contactPhone: '+221 77 000 00 00',
    website: 'https://fortia-hub.com'
  },
  {
    id: 'ent-2',
    companyName: 'AFRIKA MEDIA TECH',
    tagline: 'Production Audiovisuelle & Campagnes Marketing à Fort Impact',
    description: 'Studio de création multimédia spécialisé dans le montage vidéo cinématique, la couverture événementielle et la gestion de réputation de marque.',
    logo: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=200&q=80',
    badge: 'gold',
    badgeLabel: 'Badge Doré (Société Certifiée)',
    sector: 'Audiovisuel & Marketing',
    country: 'Côte d\'Ivoire',
    verifiedDocuments: true,
    registrationFeePaid: true,
    canReceivePayments: true,
    canSellServices: true,
    team: [
      { name: 'Kévin N\'Guessan', role: 'Directeur de Production', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' }
    ],
    portfolio: [
      { title: 'Film Institutionnel pour Entreprise Minière', category: 'Vidéo', image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&w=400&q=80' }
    ],
    offeredServices: [
      { title: 'Tournage & Montage de Spot Publicitaire HD/4K', startingPrice: 350, description: 'Vidéo promotionnelle pour TV et Réseaux Sociaux.' }
    ],
    contactEmail: 'contact@afrikamedia.ci',
    contactPhone: '+225 07 11 22 33 44'
  }
];

export const INITIAL_BLOG_POSTS: BlogPost[] = [
  {
    id: 'post-1',
    title: 'Comment l\'Intelligence Artificielle Révolutionne le Freelancing en Afrique',
    slug: 'ia-revolution-freelance-afrique',
    excerpt: 'Découvrez comment les prompts avancés, ChatGPT et Canva Pro permettent aux freelances de doubler leur chiffre d\'affaires.',
    content: `L'Intelligence Artificielle Générative ne remplace pas les créatifs : elle propulse ceux qui savent l'utiliser à un niveau d'efficacité inégalé.

Sur FORTIA HUB, nous formons une nouvelle génération de talents capables de produire en quelques heures ce qui nécessitait autrefois plusieurs jours de travail.

1. **Génération de concepts visuels instantanés** : Grâce à Midjourney et aux outils IA intégrés dans Canva Pro, établir un Moodboard n'a jamais été aussi rapide.
2. **Rédaction de propositions commerciales irrésistibles** : ChatGPT permet de structurer des devis et des plans de projet d'une précision chirurgicale.
3. **Automatisation du support client** : Les agents automatisés prennent le relais des demandes récurrentes.`,
    author: {
      name: 'Ibrahima Cham',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      role: 'Fondateur FORTIA HUB'
    },
    category: 'Intelligence Artificielle',
    date: '24 Juillet 2026',
    readTime: '5 min',
    image: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    tags: ['IA', 'Freelancing', 'Productivité', 'Fortia Hub']
  },
  {
    id: 'post-2',
    title: 'Les 5 Erreurs à Éviter ABSOLUMENT en Trading de Cryptomonnaies en 2026',
    slug: 'erreurs-trading-cryptomonnaies-2026',
    excerpt: 'Protéger son capital est la règle N°1. Voici la feuille de route pour sécuriser vos Wallets et éviter le sur-levier.',
    content: `Le marché des cryptomonnaies offre d'immenses opportunités, mais il exige une rigueur absolue.

Voici les 5 principes fondamentaux enseignés dans notre Masterclass Cryptomonnaie :

- **Pas de phrase de récupération en ligne** : Ne stockez JAMAIS vos 12/24 mots sur Google Drive, WhatsApp ou une capture d'écran.
- **Diversification intelligente** : Conservez une réserve importante en USDT pour saisir les opportunités lors des retractions.
- **Gestion stricte du risque** : Ne risquez jamais plus de 1% à 2% de votre capital total sur un seul trade.
- **Vérification systématique des adresses** : Vérifiez toujours les 4 premiers et 4 derniers caractères d'une adresse de dépôt BNB/USDT/SDA.`,
    author: {
      name: 'Dr. Sarah Diallo',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      role: 'Experte Blockchain'
    },
    category: 'Cryptomonnaie',
    date: '18 Juillet 2026',
    readTime: '6 min',
    image: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?auto=format&fit=crop&w=800&q=80',
    tags: ['Crypto', 'Trading', 'Sécurité', 'USDT']
  }
];

export const INITIAL_FEE_CONFIG: RegistrationFeeConfig = {
  freelanceFeeUsd: 15,
  freelanceFeeFcfa: 10000,
  enterpriseFeeUsd: 50,
  enterpriseFeeFcfa: 30000,
  buyerFeeUsd: 0,
  feeEnabled: true
};

export const INITIAL_KYC_SUBMISSIONS: KycSubmission[] = [
  {
    id: 'kyc-101',
    applicantType: 'freelance',
    applicantId: 'free-1',
    applicantName: 'Sidy Sarr',
    email: 'sidy.sarr@example.com',
    documentType: 'Carte Nationale d\'Identité (CNI)',
    documentNumber: '1 771 1994 00293',
    submittedAt: '12/07/2026',
    status: 'Approuvé',
    adminNotes: 'Document CNI valide. Badge Vert accordé.'
  },
  {
    id: 'kyc-102',
    applicantType: 'enterprise',
    applicantId: 'ent-1',
    applicantName: 'FORTIA DIGITAL AGENCY',
    email: 'contact@fortia-hub.com',
    documentType: 'Registre du Commerce (RCCM) & NINEA',
    documentNumber: 'SN.DKR.2024.B.18920',
    submittedAt: '10/07/2026',
    status: 'Approuvé',
    adminNotes: 'Société immatriculée vérifiée. Badge Doré attribué.'
  }
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Moussa Sylla',
  email: 'moussa.sylla@example.com',
  phone: '+221 77 123 45 67',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  accountType: 'freelance',
  badge: 'green',
  kycStatus: 'approuve',
  enrolledCourseIds: ['course-crypto-master', 'course-ai-expert'],
  courseProgress: {
    'course-crypto-master': 100,
    'course-ai-expert': 45
  },
  purchasedProductIds: ['prod-ebook-crypto', 'prod-canva-pack-social'],
  earnedCertificates: [
    {
      id: 'FORTIA-2026-CRYP-9482',
      studentName: 'Moussa Sylla',
      courseTitle: 'Masterclass Cryptomonnaie & Trading de Précision',
      category: 'Cryptomonnaie & Blockchain',
      issueDate: '15 Mai 2026',
      grade: 'Mention Très Bien (96%)',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FORTIA-2026-CRYP-9482',
      verified: true
    }
  ],
  paymentHistory: [
    {
      id: 'PAY-883920',
      date: '15/05/2026',
      amount: 99,
      method: 'USDT (TRC20)',
      items: ['Masterclass Cryptomonnaie & Trading de Précision'],
      status: 'Validé'
    },
    {
      id: 'PAY-771204',
      date: '02/06/2026',
      amount: 25,
      method: 'Orange Money',
      items: ['Pack de 150+ Modèles Canva Pro'],
      status: 'Validé'
    }
  ]
};

export const INITIAL_CERTIFICATES_DATABASE: Certificate[] = [
  {
    id: 'FORTIA-2026-CRYP-9482',
    studentName: 'Moussa Sylla',
    courseTitle: 'Masterclass Cryptomonnaie & Trading de Précision',
    category: 'Cryptomonnaie & Blockchain',
    issueDate: '15 Mai 2026',
    grade: 'Mention Très Bien (96%)',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FORTIA-2026-CRYP-9482',
    verified: true
  },
  {
    id: 'FORTIA-2026-AI-1039',
    studentName: 'Aïssatou Sow',
    courseTitle: 'Expertise IA : ChatGPT, Prompt Engineering & Automatisation',
    category: 'Intelligence Artificielle',
    issueDate: '10 Juin 2026',
    grade: 'Mention Excellent (100%)',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FORTIA-2026-AI-1039',
    verified: true
  },
  {
    id: 'FORTIA-2026-MARK-4412',
    studentName: 'Jean-Pascal Kassi',
    courseTitle: 'Marketing Digital & Community Management 360°',
    category: 'Marketing Digital',
    issueDate: '28 Avril 2026',
    grade: 'Mention Bien (88%)',
    qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=FORTIA-2026-MARK-4412',
    verified: true
  }
];

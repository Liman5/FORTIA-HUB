import { 
  VendorStore, 
  MarketplaceProduct, 
  VendorApplication, 
  MarketplaceOrder, 
  PayoutRequest, 
  MarketplaceConfig 
} from '../types';

export const INITIAL_STORES: VendorStore[] = [
  {
    id: 'store-fortia-official',
    vendorId: 'vendor-admin',
    ownerName: 'FORTIA HUB Official',
    ownerEmail: 'contact@fortiahub.com',
    ownerPhone: '+221 77 888 99 00',
    name: 'FORTIA Digital Official Store',
    slug: 'fortia-digital-official',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    banner: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80',
    description: 'Boutique officielle FORTIA HUB - Formations certifiantes, Kits de démarrage Business, Templates Pro et Prompts IA optimisés.',
    categories: ['Formations', 'Prompts IA', 'Canva', 'Templates Pro', 'White Papers'],
    status: 'active',
    isVerified: true,
    createdAt: '2026-01-15',
    salesCount: 1420,
    totalRevenueUsd: 41180,
    payoutInfo: {
      method: 'bank_transfer',
      accountName: 'FORTIA HUB S.A.R.L.',
      accountNumber: 'SN012 01001 0293847592 10',
      providerName: 'CBAO Groupe Attijariwafa'
    }
  },
  {
    id: 'store-samba-tech',
    vendorId: 'vendor-samba',
    ownerName: 'Samba Diop',
    ownerEmail: 'samba.diop@techdakar.sn',
    ownerPhone: '+221 78 123 45 67',
    name: 'Samba Tech & Code Academy',
    slug: 'samba-tech-code',
    logo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    banner: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    description: 'Ressources de programmation, scripts SaaS, templates React & Mobile, et kits d\'automatisation Python pour entrepreneurs africains.',
    categories: ['Dev Web', 'Dev Mobile', 'Prompts IA', 'Scripts SaaS'],
    status: 'active',
    isVerified: true,
    createdAt: '2026-02-10',
    salesCount: 384,
    totalRevenueUsd: 11520,
    payoutInfo: {
      method: 'mobile_money',
      accountName: 'Samba Diop',
      accountNumber: '+221 78 123 45 67',
      providerName: 'Wave Senegal'
    }
  },
  {
    id: 'store-fatou-design',
    vendorId: 'vendor-fatou',
    ownerName: 'Fatou Ndiaye',
    ownerEmail: 'fatou.design@chariow.net',
    ownerPhone: '+221 76 987 65 43',
    name: 'Fatou Canva & Branding Lab',
    slug: 'fatou-canva-branding',
    logo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    banner: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=80',
    description: 'Modèles Canva Pro 100% éditables pour réseaux sociaux, e-books de branding, chartes graphiques et Pitch Decks pour Startups.',
    categories: ['Canva', 'Branding', 'Pitch Deck', 'Ebooks'],
    status: 'active',
    isVerified: true,
    createdAt: '2026-03-01',
    salesCount: 512,
    totalRevenueUsd: 14840,
    payoutInfo: {
      method: 'mobile_money',
      accountName: 'Fatou Ndiaye',
      accountNumber: '+221 76 987 65 43',
      providerName: 'Orange Money'
    }
  },
  {
    id: 'store-aminata-legal',
    vendorId: 'vendor-aminata',
    ownerName: 'Maître Aminata Sow',
    ownerEmail: 'aminata.sow@lexafrica.com',
    ownerPhone: '+221 77 444 33 22',
    name: 'JurisConsult Africa Digital',
    slug: 'jurisconsult-africa',
    logo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    banner: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
    description: 'Contrats juridiques certifiés OHADA, statuts d\'entreprises, accords de confidentialité (NDA) et guides de conformité pour Startups.',
    categories: ['Contrats', 'Business Plan', 'White Papers'],
    status: 'active',
    isVerified: true,
    createdAt: '2026-04-05',
    salesCount: 189,
    totalRevenueUsd: 9450,
    payoutInfo: {
      method: 'paypal',
      accountName: 'JurisConsult Africa',
      accountNumber: 'finance@lexafrica.com'
    }
  }
];

export const INITIAL_MARKETPLACE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'mp-101',
    storeId: 'store-fortia-official',
    storeName: 'FORTIA Digital Official Store',
    storeLogo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
    vendorId: 'vendor-admin',
    title: 'Pack 500+ Prompts ChatGPT Pro & Midjourney V6',
    slug: 'pack-500-prompts-chatgpt-midjourney',
    type: 'ai_prompts',
    typeLabel: 'Pack Prompts IA',
    description: 'Collection complète de prompts ultra-ciblés pour le Marketing, le Copywriting, la Création d\'Affiches et le Code.',
    fullDescription: 'Optimisez l\'utilisation de ChatGPT, Claude 3.5 et Midjourney avec plus de 500 formules de prompts testées pour générer du contenu percutant, des images haute résolution et des stratégies de vente.',
    price: 29,
    originalPrice: 79,
    fileFormat: 'PDF + Notion DB',
    fileSize: '12 MB',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    features: ['500+ Prompts Copier-Coller', 'Guide d\'utilisation pas à pas', 'Mises à jour gratuites à vie'],
    downloadUrl: '#',
    isPublished: true,
    isApproved: true,
    isPopular: true,
    rating: 4.9,
    reviewsCount: 142,
    salesCount: 650,
    createdAt: '2026-02-01'
  },
  {
    id: 'mp-102',
    storeId: 'store-fatou-design',
    storeName: 'Fatou Canva & Branding Lab',
    storeLogo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    vendorId: 'vendor-fatou',
    title: 'Kit Ultime Canva Pro - 150+ Modèles Réseaux Sociaux & Carrousels',
    slug: 'kit-ultime-canva-pro-150-templates',
    type: 'canva_template',
    typeLabel: 'Modèle Canva Pro',
    description: 'Des designs modernes et captivants pour Instagram, LinkedIn et Facebook. Modifiables en 1 clic sur Canva.',
    fullDescription: 'Augmentez votre taux d\'engagement avec 150 modèles élégants et personnalisables (publications, storys, carrousels pédagogiques, bannières).',
    price: 35,
    originalPrice: 85,
    fileFormat: 'Lien Canva Pro Direct',
    fileSize: 'Instant',
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=800&q=80',
    features: ['150+ Templates Carrousels & Feeds', 'Typographies & Palettes incluses', 'Format 1080x1080 & 1080x1920'],
    downloadUrl: '#',
    isPublished: true,
    isApproved: true,
    isPopular: true,
    rating: 5.0,
    reviewsCount: 89,
    salesCount: 310,
    createdAt: '2026-03-02'
  },
  {
    id: 'mp-103',
    storeId: 'store-samba-tech',
    storeName: 'Samba Tech & Code Academy',
    storeLogo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    vendorId: 'vendor-samba',
    title: 'eBook : Créer et Lancer son Micro-SaaS avec IA en 14 Jours',
    slug: 'ebook-creer-micro-saas-ia-14-jours',
    type: 'ebook',
    typeLabel: 'eBook PDF',
    description: 'Guide pratique étape par étape pour prototyper, coder et vendre une application web avec Cursor, Claude et Stripe/Wave.',
    fullDescription: 'Le manuel de référence pour les développeurs et solopreneurs voulant créer des revenus récurrents avec l\'IA.',
    price: 49,
    originalPrice: 120,
    fileFormat: 'ePub + PDF HD',
    fileSize: '18 MB',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    features: ['240 Pages de conseils pratiques', 'Code source des projets fourni', 'Fichiers d\'architecture inclus'],
    downloadUrl: '#',
    isPublished: true,
    isApproved: true,
    isPopular: false,
    rating: 4.8,
    reviewsCount: 64,
    salesCount: 195,
    createdAt: '2026-02-15'
  },
  {
    id: 'mp-104',
    storeId: 'store-aminata-legal',
    storeName: 'JurisConsult Africa Digital',
    storeLogo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80',
    vendorId: 'vendor-aminata',
    title: 'Pack Juridique Startup OHADA (Contrats, Statuts, NDA, Prestations)',
    slug: 'pack-juridique-startup-ohada',
    type: 'contract',
    typeLabel: 'Contrat Type',
    description: 'Modèles de contrats rédigés et validés par des juristes expérimentés en droit des affaires africain (OHADA).',
    fullDescription: 'Sécurisez vos relations commerciales et partenariats grâce à ce pack de contrats éditables au format Microsoft Word & PDF.',
    price: 69,
    originalPrice: 150,
    fileFormat: 'DOCX + PDF',
    fileSize: '8 MB',
    image: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    features: ['Contrat de Prestation Freelance', 'Accord de Confidentialité (NDA)', 'Statuts SARL / SAS Standard', 'Pacte d\'Associés'],
    downloadUrl: '#',
    isPublished: true,
    isApproved: true,
    isPopular: true,
    rating: 4.9,
    reviewsCount: 42,
    salesCount: 120,
    createdAt: '2026-04-10'
  }
];

export const INITIAL_VENDOR_APPLICATIONS: VendorApplication[] = [
  {
    id: 'app-001',
    userId: 'user-moustapha',
    applicantName: 'Moustapha Kane',
    email: 'moustapha.kane@designflow.sn',
    phone: '+221 77 111 22 33',
    storeName: 'DesignFlow Motion & Video Studio',
    storeCategory: 'Montage Vidéo & Motion Design',
    storeDescription: 'Vente de templates CapCut, Presets Premiere Pro et formations accélérées au montage vidéo sur Smartphone.',
    experienceBio: 'Plus de 6 ans d\'expérience dans le montage vidéo et la création de contenu sur TikTok et YouTube.',
    submittedAt: '2026-07-25',
    status: 'En attente'
  },
  {
    id: 'app-002',
    userId: 'user-khadija',
    applicantName: 'Khadija Ba',
    email: 'khadija.ba@growthmind.com',
    phone: '+221 78 555 66 77',
    storeName: 'GrowthMind Digital Agency',
    storeCategory: 'Marketing & Vente',
    storeDescription: 'Guides de prospection B2B, scripts d\'appels de vente et tunnels de conversion pour infopreneurs.',
    experienceBio: 'Consultante en stratégie commerciale ayant accompagné plus de 40 entreprises en Afrique de l\'Ouest.',
    submittedAt: '2026-07-28',
    status: 'En attente'
  }
];

export const INITIAL_MARKETPLACE_ORDERS: MarketplaceOrder[] = [
  {
    id: 'ord-901',
    orderNumber: 'CHAR-2026-8812',
    buyerName: 'Ousmane Fall',
    buyerEmail: 'ousmane.fall@gmail.com',
    buyerPhone: '+221 77 333 44 55',
    storeId: 'store-fatou-design',
    storeName: 'Fatou Canva & Branding Lab',
    productId: 'mp-102',
    productTitle: 'Kit Ultime Canva Pro - 150+ Modèles Réseaux Sociaux & Carrousels',
    amountUsd: 35,
    platformCommissionUsd: 3.5, // 10%
    vendorEarningsUsd: 31.5,
    paymentGateway: 'Wave API',
    transactionRef: 'WAVE-TX-9948271',
    status: 'Payé',
    createdAt: '2026-07-28'
  },
  {
    id: 'ord-902',
    orderNumber: 'CHAR-2026-8813',
    buyerName: 'Awa Cissé',
    buyerEmail: 'awa.cisse@outlook.fr',
    buyerPhone: '+221 78 222 11 00',
    storeId: 'store-samba-tech',
    storeName: 'Samba Tech & Code Academy',
    productId: 'mp-103',
    productTitle: 'eBook : Créer et Lancer son Micro-SaaS avec IA en 14 Jours',
    amountUsd: 49,
    platformCommissionUsd: 4.9, // 10%
    vendorEarningsUsd: 44.1,
    paymentGateway: 'Orange Money API',
    transactionRef: 'OM-SN-8823719',
    status: 'Payé',
    createdAt: '2026-07-29'
  }
];

export const INITIAL_PAYOUT_REQUESTS: PayoutRequest[] = [
  {
    id: 'pay-501',
    storeId: 'store-fatou-design',
    storeName: 'Fatou Canva & Branding Lab',
    vendorName: 'Fatou Ndiaye',
    amountUsd: 250,
    amountFcfa: 150000,
    payoutMethod: 'Orange Money (+221 76 987 65 43)',
    accountDetails: 'Fatou Ndiaye - OM Sénégal',
    requestedAt: '2026-07-27',
    status: 'Payé',
    transactionHashOrRef: 'OM-PAYOUT-771829'
  },
  {
    id: 'pay-502',
    storeId: 'store-samba-tech',
    storeName: 'Samba Tech & Code Academy',
    vendorName: 'Samba Diop',
    amountUsd: 300,
    amountFcfa: 180000,
    payoutMethod: 'Wave Senegal (+221 78 123 45 67)',
    accountDetails: 'Samba Diop - Wave',
    requestedAt: '2026-07-29',
    status: 'En attente'
  }
];

export const INITIAL_MARKETPLACE_CONFIG: MarketplaceConfig = {
  platformCommissionPercentage: 10,
  autoApproveNewProducts: true,
  minWithdrawalUsd: 20,
  acceptedPaymentGateways: ['Wave API', 'Orange Money API', 'MTN Money API', 'Card Stripe API', 'PayPal API', 'Crypto USDT TRC20']
};

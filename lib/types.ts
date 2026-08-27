export type CourseCategory = 
  | 'crypto' 
  | 'ai' 
  | 'canva' 
  | 'capcut' 
  | 'marketing' 
  | 'entrepreneurship'
  | 'blockchain'
  | 'dev_web'
  | 'dev_mobile'
  | 'infographie'
  | 'secretariat'
  | 'informatique';

export interface Lesson {
  id: string;
  title: string;
  duration: string; // e.g., "15 min"
  type: 'video' | 'article' | 'quiz';
  videoUrl?: string;
  content?: string;
  isCompleted?: boolean;
}

export interface CourseChapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TrainingCenter {
  id: string;
  ownerId?: string;
  centerName: string;
  slug: string;
  description: string;
  logo: string;
  banner: string;
  status: 'pending' | 'active' | 'suspended';
  isVerified: boolean;
  feePaid: boolean;
  feeAmountUsd: number;
  storageQuotaGb: number;
  storageUsedBytes: number;
  createdAt: string;
}

export interface InstructorCommission {
  id: string;
  instructorId: string;
  centerId?: string;
  courseId?: string;
  courseTitle: string;
  amountPaidUsd: number;
  platformFeeUsd: number;
  instructorEarningsUsd: number;
  status: string;
  createdAt: string;
}

export interface InstructorStoragePurchase {
  id: string;
  instructorId: string;
  centerId?: string;
  amountGb: number;
  amountUsd: number;
  status: string;
  createdAt: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  instructorId?: string;
  centerId?: string;
  category: CourseCategory;
  categoryLabel: string;
  description: string;
  fullDescription: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé' | 'Expert' | 'Tous niveaux';
  durationHours: number;
  lessonsCount: number;
  price: number;
  rating: number;
  reviewsCount: number;
  studentsCount: number;
  image: string;
  instructor: {
    name: string;
    role: string;
    avatar: string;
  };
  learningOutcomes: string[];
  chapters: CourseChapter[];
  quiz?: QuizQuestion[];
  badge?: string;
}

export type DigitalProductType = 
  | 'ebook' 
  | 'canva_template' 
  | 'ai_prompts' 
  | 'whitepaper' 
  | 'business_plan' 
  | 'contract' 
  | 'pitch_deck' 
  | 'pro_templates' 
  | 'premium_pack';

export interface DigitalProduct {
  id: string;
  title: string;
  type: DigitalProductType;
  typeLabel: string;
  description: string;
  price: number;
  originalPrice?: number;
  rating: number;
  salesCount: number;
  fileFormat: string; // e.g. "PDF + Links", "ZIP (Canva + Prompts)"
  fileSize: string;
  image: string;
  bannerImage?: string;
  features: string[];
  downloadUrl?: string;
  isPopular?: boolean;
}

export type ServiceCardAnimation = 'none' | 'fade-up' | 'zoom-in' | 'flip' | 'slide-in' | 'pulse';
export type ServiceCardBorderStyle = 'none' | 'gold' | 'emerald' | 'blue' | 'purple' | 'rose' | 'gradient' | 'double';

export interface ServicePackage {
  id: string;
  title: string;
  category: string;
  description: string;
  startingPrice: number;
  estimatedDays: string;
  iconName: string;
  deliverables: string[];
  options?: { name: string; price: number }[];
  // 🎨 Personnalisation visuelle de la carte (gérée depuis l'admin)
  borderStyle?: ServiceCardBorderStyle;
  cardAnimation?: ServiceCardAnimation;
  accentColor?: string;       // Couleur personnalisée hex (ex: '#10B981')
  badgeText?: string;         // Badge optionnel (ex: 'Populaire', 'Best-Seller')
  featured?: boolean;         // Met en avant la carte
  isActive?: boolean;         // Visible sur la page services
  displayOrder?: number;      // Ordre d'affichage dans la page services
}

export interface CartItem {
  id: string;
  type: 'course' | 'product' | 'service';
  title: string;
  price: number;
  image: string;
  categoryLabel?: string;
}

export interface Certificate {
  id: string; // e.g. "FORTIA-2026-CRYP-9482"
  studentName: string;
  courseTitle: string;
  category: string;
  issueDate: string;
  grade: string;
  qrCodeUrl: string;
  verified: boolean;
}

export type BadgeType = 'green' | 'gold' | 'none';

export interface FreelanceService {
  id: string;
  freelanceId: string;
  title: string;
  category: string;
  description: string;
  startingPrice: number;
  deliveryDays: number;
  image: string;
  ordersCompleted: number;
  rating: number;
}

export interface FreelanceProfile {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  badge: BadgeType;
  badgeLabel: string;
  category: string;
  rating: number;
  completedJobs: number;
  hourlyRate: number;
  skills: string[];
  kycVerified: boolean;
  registrationFeePaid: boolean;
  canReceivePayments: boolean;
  canSellServices: boolean;
  location: string;
  portfolio: { title: string; image: string; link?: string }[];
  services: FreelanceService[];
}

export interface EnterpriseTeamMember {
  name: string;
  role: string;
  avatar: string;
}

export interface EnterpriseProfile {
  id: string;
  companyName: string;
  tagline: string;
  description: string;
  logo: string;
  badge: 'gold' | 'none'; // Golden Badge for Enterprise
  badgeLabel: string;
  sector: string;
  country: string;
  verifiedDocuments: boolean; // KYC Enterprise
  registrationFeePaid: boolean;
  canReceivePayments: boolean;
  canSellServices: boolean;
  team: EnterpriseTeamMember[];
  portfolio: { title: string; category: string; image: string; link?: string }[];
  offeredServices: { title: string; startingPrice: number; description: string }[];
  contactEmail: string;
  contactPhone: string;
  website?: string;
}

export interface KycSubmission {
  id: string;
  applicantType: 'freelance' | 'enterprise';
  applicantId: string;
  applicantName: string;
  firstName?: string;
  lastName?: string;
  repRole?: string;
  email: string;
  phone?: string;
  country?: string;
  address?: string;
  documentType: string; // CNI, Passeport, Permis, Registre du Commerce (RCCM), NINEA
  documentNumber: string;
  idExpirationDate?: string;
  idRectoUrl?: string;
  idVersoUrl?: string;
  selfieUrl?: string;
  companyName?: string;
  legalForm?: string;
  rccmNumber?: string;
  companyDocUrl?: string;
  documentFileUrl?: string;
  submittedAt: string;
  status: 'En attente' | 'Approuvé' | 'Rejeté';
  adminNotes?: string;
  rejectionReason?: string;
}

export interface RegistrationFeeConfig {
  freelanceFeeUsd: number;
  freelanceFeeFcfa: number;
  enterpriseFeeUsd: number;
  enterpriseFeeFcfa: number;
  buyerFeeUsd: number; // Always 0
  feeEnabled: boolean;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: { name: string; avatar: string; role: string };
  category: string;
  date: string;
  readTime: string;
  image: string;
  tags: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  read: boolean;
  type: 'info' | 'success' | 'warning';
  linkTab?: string;
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  accountType: 'buyer' | 'freelance' | 'enterprise';
  badge: BadgeType;
  twoFactorEnabled?: boolean;
  kycStatus: 'non_soumis' | 'en_attente' | 'approuve' | 'rejete';
  deletionRequestedAt?: string;
  deletionScheduledFor?: string;
  enrolledCourseIds: string[];
  courseProgress: Record<string, number>; // courseId -> percentage 0-100
  purchasedProductIds: string[];
  earnedCertificates: Certificate[];
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    method: string;
    items: string[];
    status: 'Validé' | 'En attente' | 'Échoué';
  }[];
}

export interface ServiceQuoteRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  serviceId: string;
  serviceTitle: string;
  estimatedPrice: number;
  details: string;
  deadline: string;
  status: 'Reçu' | 'En cours d\'analyse' | 'Devis validé' | 'En réalisation';
  date: string;
}

// ==========================================
// MULTI-VENDOR MARKETPLACE SYSTEM (CHARIOW STYLE)
// ==========================================

export type StoreStatus = 'active' | 'pending' | 'suspended';

export interface VendorStore {
  id: string;
  vendorId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  name: string;
  slug: string;
  logo: string;
  banner: string;
  description: string;
  categories: string[];
  status: StoreStatus;
  isVerified: boolean;
  createdAt: string;
  salesCount: number;
  totalRevenueUsd: number;
  rating?: number;
  payoutInfo: {
    method: 'mobile_money' | 'bank_transfer' | 'paypal' | 'crypto';
    accountName: string;
    accountNumber: string; // Wave, OM, IBAN, USDT wallet
    providerName?: string; // Wave, Orange Money, MTN, Moov, Bank Name
  };
}

export interface MarketplaceProduct {
  id: string;
  storeId: string;
  storeName: string;
  storeLogo: string;
  vendorId: string;
  title: string;
  slug: string;
  type: DigitalProductType | 'course' | 'service' | 'software' | 'template';
  typeLabel: string;
  description: string;
  fullDescription?: string;
  price: number;
  originalPrice?: number;
  fileFormat: string;
  fileSize: string;
  image: string;
  bannerImage?: string;
  features: string[];
  downloadUrl?: string;
  isPublished: boolean; // Seller published or unpublished
  isApproved: boolean;  // Platform Owner / Admin approval
  isPopular?: boolean;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  createdAt: string;
}

export interface VendorApplication {
  id: string;
  userId: string;
  applicantName: string;
  email: string;
  phone: string;
  storeName: string;
  storeCategory: string;
  storeDescription: string;
  experienceBio: string;
  submittedAt: string;
  status: 'En attente' | 'Approuvé' | 'Rejeté';
  adminNotes?: string;
}

export interface MarketplaceOrder {
  id: string;
  orderNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  buyerUserId?: string;
  storeId?: string;
  storeName: string;
  productId?: string;
  productTitle: string;
  amountUsd: number;
  platformCommissionUsd: number; // e.g., 10%
  vendorEarningsUsd: number;      // e.g., 90%
  paymentGateway: 'Wave API' | 'Orange Money API' | 'MTN Money API' | 'Card Stripe API' | 'PayPal API' | 'Crypto USDT TRC20';
  transactionRef: string;
  status: 'Payé' | 'En attente API' | 'Échoué' | 'Remboursé';
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  storeId: string;
  storeName: string;
  vendorName: string;
  amountUsd: number;
  amountFcfa: number;
  payoutMethod: string;
  accountDetails: string;
  requestedAt: string;
  status: 'En attente' | 'Payé' | 'Rejeté';
  transactionHashOrRef?: string;
}

export interface MarketplaceConfig {
  platformCommissionPercentage: number; // Default 10%
  autoApproveNewProducts: boolean;
  minWithdrawalUsd: number; // Default 20$
  acceptedPaymentGateways: string[];
}

export interface SiteContent {
  heroBadgeText: string;
  heroTitleText: string;
  heroTitleGradient: string;
  heroSubtitle: string;
  heroImageUrl: string;
  heroVideoUrl: string;
  heroAudioUrl: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  topAnnouncementBanner: string;
  statStudents: string;
  statSuccessRate: string;
  statModules: string;
  footerAboutText: string;
  contactEmail: string;
  contactPhone: string;
  supportHours: string;
}

export interface PostPurchaseSupportSubmission {
  id: string;
  orderNumber?: string;
  productTitle: string;
  lastName: string;       // Nom
  firstName: string;      // Prénom
  phoneContact: string;   // Contact / Téléphone / WhatsApp
  email: string;          // Email du client
  notes?: string;         // Précisions ou problème signalé
  submittedAt: string;
  forwardedEmail: string; // Email du vendeur destinataire
  status: 'Transmis / Enregistré' | 'En cours' | 'Résolu';
}



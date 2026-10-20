// ============================================================
// FORTIA HUB — CONTRAT DU STORE (types)
// ------------------------------------------------------------
// Interface publique de `useAppStore()`. Extraite de AppStore.tsx
// pour que la façade ne contienne plus que la composition et les
// chargements transverses.
// ============================================================

import type {
  Course,
  DigitalProduct,
  ServicePackage,
  CartItem,
  Certificate,
  ServiceQuoteRequest,
  UserProfile,
  FreelanceProfile,
  EnterpriseProfile,
  BlogPost,
  RegistrationFeeConfig,
  KycSubmission,
  VendorStore,
  MarketplaceProduct,
  VendorApplication,
  MarketplaceOrder,
  PayoutRequest,
  MarketplaceConfig,
  PostPurchaseSupportSubmission,
  AppNotification,
  SiteContent,
  FreelanceService,
  TrainingCenter,
  InstructorCommission,
  InstructorStoragePurchase,
  CourseCategoryRecord,
  SiteBanner,
} from "@/lib/types";

export interface AppStoreContextValue {
  // Chargement des données platform (Supabase)
  platformLoaded: boolean;
  /** Recharge les données plateforme (Supabase) à la demande (après une écriture) */
  refreshPlatformData: () => Promise<void>;
  /** Données sensibles d'administration chargées ? (commandes, KYC, retraits…) */
  adminDataLoaded: boolean;
  /** Charge les collections réservées à l'administration (endpoint protégé). */
  loadAdminData: () => Promise<void>;

  // Site Content
  siteContent: SiteContent;
  updateSiteContent: (content: SiteContent) => void;

  // Courses
  courses: Course[];
  /** Nombre total de formations côté serveur (pagination du catalogue). */
  catalogTotal: number;
  /** Reste-t-il des formations à charger depuis le serveur ? */
  catalogHasMore: boolean;
  /** Charge la page suivante du catalogue (pagination serveur). */
  loadMoreCourses: () => Promise<void>;
  /** Charge TOUTES les formations, brouillons inclus (espaces de gestion). */
  loadAllCourses: () => Promise<void>;
  /** Complète la liste avec des formations précises (Mon Compte). */
  ensureCoursesByIds: (ids: string[]) => Promise<void>;
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  deleteCourse: (id: string) => void;

  // Products
  marketplaceProducts: MarketplaceProduct[];
  addProduct: (product: DigitalProduct | MarketplaceProduct) => void;
  updateProduct: (product: DigitalProduct | MarketplaceProduct) => void;
  deleteProduct: (id: string) => void;

  // Services
  services: ServicePackage[];
  serviceQuotes: ServiceQuoteRequest[];
  submitQuote: (quote: ServiceQuoteRequest) => void;
  addService: (service: ServicePackage) => void;
  updateService: (service: ServicePackage) => void;
  deleteService: (id: string) => void;
  toggleServiceActive: (id: string) => void;

  // Bannières du site — MODULE INDÉPENDANT (images R2, animation, lien, durée)
  siteBanners: SiteBanner[];
  addBanner: (banner: SiteBanner) => void;
  updateBanner: (banner: SiteBanner) => void;
  deleteBanner: (id: string) => void;
  toggleBannerActive: (id: string) => void;

  // Marketplace
  stores: VendorStore[];
  activeVendorStore: VendorStore;
  setActiveVendorStore: (store: VendorStore) => void;
  selectedStore: VendorStore | null;
  openStore: (store: VendorStore) => void;
  closeStore: () => void;
  vendorApplications: VendorApplication[];
  marketplaceOrders: MarketplaceOrder[];
  payoutRequests: PayoutRequest[];
  marketplaceConfig: MarketplaceConfig;
  postPurchaseSubmissions: PostPurchaseSupportSubmission[];
  updateStore: (store: VendorStore) => void;
  deleteStore: (id: string) => void;
  approveStore: (id: string) => void;
  suspendStore: (id: string) => void;
  submitVendorApplication: (app: VendorApplication) => void;
  approveVendorApplication: (id: string) => void;
  rejectVendorApplication: (id: string) => void;
  requestPayout: (payout: PayoutRequest) => void;
  approvePayout: (id: string) => void;
  updateMarketplaceConfig: (config: MarketplaceConfig) => void;
  handlePaymentSuccess: (order: MarketplaceOrder) => void;
  addSupportSubmission: (submission: PostPurchaseSupportSubmission) => void;
  deleteSupportSubmission: (id: string) => void;

  // Platform Features
  freelances: FreelanceProfile[];
  enterprises: EnterpriseProfile[];
  blogPosts: BlogPost[];
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  feeConfig: RegistrationFeeConfig;
  setFeeConfig: (config: RegistrationFeeConfig) => void;
  kycSubmissions: KycSubmission[];
  submitKyc: (submission: KycSubmission) => void;
  approveKyc: (id: string) => void;

  // Cart (page dédiée /cart — plus aucune fenêtre superposée)
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;

  // User Auth
  isUserLoggedIn: boolean;
  userProfile: UserProfile;
  /** true pendant la vérification de session au démarrage (évite le flash « reconnectez-vous »). */
  sessionChecking: boolean;
  loginUser: (userData: Partial<UserProfile>) => void;
  logoutUser: () => void;

  // Admin Auth
  isAdmin: boolean;
  setAdmin: (admin: boolean) => void;
  isAdminAuthModalOpen: boolean;
  setAdminAuthModalOpen: (open: boolean) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearNotifications: () => void;
  // Données personnelles filtrées par le serveur (endpoint /api/me)
  myOrders: MarketplaceOrder[];
  myNotifications: AppNotification[];
  myKycSubmissions: KycSubmission[];

  // Course Player
  selectedCourseForPlayer: Course | null;
  setSelectedCourseForPlayer: (course: Course | null) => void;

  // Checkout / Payment : le panier ET le paiement sont des étapes de la page /cart

  // Recherche globale (barre de recherche navbar → boutique numérique)
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Vendor Application
  isVendorApplicationModalOpen: boolean;
  setVendorApplicationModalOpen: (open: boolean) => void;

  // KYC
  isKycModalOpen: boolean;
  setKycModalOpen: (open: boolean) => void;

  // Order Freelance Service
  orderService: (service: FreelanceService, freelance: FreelanceProfile) => void;

  // Académie Multi-Formateurs
  trainingCenters: TrainingCenter[];
  /** Catégories de formations stockées en base (alimentent les filtres du catalogue). */
  courseCategories: CourseCategoryRecord[];
  /** Crée une catégorie de formation (persistée dans course_categories). */
  addCourseCategory: (payload: {
    label: string;
    code?: string;
    description?: string;
    iconName?: string;
  }) => void;
  /** Met à jour une catégorie de formation (libellé, ordre, activation). */
  updateCourseCategory: (category: CourseCategoryRecord) => void;
  /** Active/désactive la mise en avant éditoriale d'une formation. */
  toggleCourseFeatured: (courseId: string, isFeatured: boolean) => void;
  /** Supprime une catégorie de formation (refusé si des formations y sont rattachées). */
  deleteCourseCategory: (id: string) => Promise<boolean>;
  instructorCommissions: InstructorCommission[];
  instructorStoragePurchases: InstructorStoragePurchase[];
  instructorCenter: TrainingCenter | null;
  createTrainingCenter: (data: { centerName: string; description: string }) => void;
  addInstructorCourse: (course: Course) => void;
  updateInstructorCourse: (courseId: string, updates: Partial<Course>) => void;
  rateCourse: (courseId: string, rating: number) => void;
  suspendInstructorCourse: (courseId: string) => void;
  deleteInstructorCourse: (courseId: string) => void;
  /** Enregistre le % d'avancement d'une formation sur le compte membre. */
  recordCourseProgress: (courseId: string, percent: number) => void;
  /** Ajoute l'attestation officielle au compte membre (visible onglet Attestations). */
  grantCertificate: (certificate: Certificate) => void;
  /** Inscrit le membre à une formation (ajout à enrolledCourseIds + progression initiale). */
  ensureCourseEnrollment: (courseId: string) => void;
  buyInstructorStorage: (center: TrainingCenter, amountGb: number, amountUsd: number) => void;
  adminAddInstructor: (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => void;
}

"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import {
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
} from "@/lib/types";

import { apiFetchPlatformData, clearPlatformCache } from "@/lib/services/platformApi";
import { apiWritePlatform } from "@/lib/services/platformWrite";

interface AppStoreContextValue {
  // Chargement des données platform (Supabase)
  platformLoaded: boolean;
  // Recharge les données platform (Supabase) à la demande (après une écriture)
  refreshPlatformData: () => Promise<void>;

  // Site Content
  siteContent: SiteContent;
  updateSiteContent: (content: SiteContent) => void;

  // Courses
  courses: Course[];
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
  feeConfig: RegistrationFeeConfig;
  setFeeConfig: (config: RegistrationFeeConfig) => void;
  kycSubmissions: KycSubmission[];
  submitKyc: (submission: KycSubmission) => void;
  approveKyc: (id: string) => void;

  // Cart
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;

  // User Auth
  isUserLoggedIn: boolean;
  userProfile: UserProfile;
  /** true pendant la vérification de session au démarrage (évite le flash « reconnectez-vous »). */
  sessionChecking: boolean;
  openAuthModal: boolean;
  setOpenAuthModal: (open: boolean) => void;
  authMode: "login" | "signup";
  setAuthMode: (mode: "login" | "signup") => void;
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

  // Checkout / Payment
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  paymentItems: CartItem[];
  setPaymentItems: (items: CartItem[]) => void;
  isPaymentGatewayOpen: boolean;
  setPaymentGatewayOpen: (open: boolean) => void;

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

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

// Helper for localStorage with SSR safety
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return initialValue;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }, [key, value]);

  return [value, setValue];
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  // ======== CHARGEMENT DES DONNÉES RÉELLES DEPUIS SUPABASE ========
  const [platformLoaded, setPlatformLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Purge des éventuelles données mockées/fictives persistées en localStorage
    // (anciennes sessions ou contenus de démonstration).
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("fortia_site_content");
        const savedProfile = localStorage.getItem("fortia_user_profile");
        if (savedProfile) {
          const parsedProfile = JSON.parse(savedProfile);
          if (
            parsedProfile?.email &&
            (parsedProfile.email.includes("example.com") ||
              parsedProfile.email.includes("sanaaraav"))
          ) {
            localStorage.removeItem("fortia_user_profile");
            localStorage.removeItem("fortia_user_logged_in");
          }
        }
      }
    } catch {}

    refreshPlatformData();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======== SYNCHRONISATION DE SESSION AU CHARGEMENT (JWT HttpOnly) ========
  // Vérifie la session auprès du serveur : si le cookie est expiré, révoqué
  // ou invalide, l'état utilisateur local est nettoyé (utilisateur déconnecté).
  // La redirection vers la connexion pour une page privée est gérée par le proxy.
  useEffect(() => {
    let mounted = true;

    async function syncSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (mounted && data?.user) {
            setIsUserLoggedIn(true);
            setUserProfile((prev) => {
              const merged = { ...prev, ...data.user };
              try {
                localStorage.setItem("fortia_user_logged_in", "true");
                localStorage.setItem("fortia_user_profile", JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
          // Charge les données personnelles FILTRÉES par le serveur (jamais celles d'un autre)
          if (mounted) {
            fetch("/api/me", { cache: "no-store" })
              .then((r) => r.json())
              .then((me) => {
                if (!mounted || !me?.success) return;
                setMyOrders((me.orders || []) as MarketplaceOrder[]);
                setMyNotifications((me.notifications || []) as AppNotification[]);
                setMyKycSubmissions((me.kycSubmissions || []) as KycSubmission[]);
              })
              .catch(() => {});
          }
        } else {
          // Seule une vraie 401 (session invalide/expirée) entraîne la déconnexion.
          // Une erreur 500 / réseau (base momentanément indisponible) ne doit JAMAIS
          // déconnecter l'utilisateur : on conserve sa session locale.
          if (res.status === 401 && mounted) {
            setIsUserLoggedIn(false);
            setUserProfile({} as UserProfile);
            try {
              localStorage.removeItem("fortia_user_logged_in");
              localStorage.removeItem("fortia_user_profile");
            } catch {}
          }
        }
      } catch {
        // Erreur réseau : on conserve l'état actuel (aucune décision bloquante).
      }
      if (mounted) setSessionChecking(false);
    }

    syncSession();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Site Content
  const [siteContent, setSiteContent] = useState<SiteContent>({} as SiteContent);

  // Courses
  const [courses, setCourses] = useState<Course[]>([]);

  // Digital Products / Marketplace
  const [marketplaceProducts, setMarketplaceProducts] = useState<MarketplaceProduct[]>([]);

  // Services
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [serviceQuotes, setServiceQuotes] = useState<ServiceQuoteRequest[]>([]);

  // Marketplace
  const [stores, setStores] = useState<VendorStore[]>([]);
  const [activeVendorStore, setActiveVendorStore] = useState<VendorStore>({} as VendorStore);
  const [selectedStore, setSelectedStore] = useState<VendorStore | null>(null);
  const [vendorApplications, setVendorApplications] = useState<VendorApplication[]>([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState<MarketplaceOrder[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [marketplaceConfig, setMarketplaceConfig] = useState<MarketplaceConfig>({} as MarketplaceConfig);
  const [postPurchaseSubmissions, setPostPurchaseSubmissions] = useState<PostPurchaseSupportSubmission[]>([]);

  // Platform Features
  const [freelances, setFreelances] = useState<FreelanceProfile[]>([]);
  const [enterprises, setEnterprises] = useState<EnterpriseProfile[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [feeConfig, setFeeConfigState] = useState<RegistrationFeeConfig>({
    freelanceFeeUsd: 0,
    freelanceFeeFcfa: 0,
    enterpriseFeeUsd: 0,
    enterpriseFeeFcfa: 0,
    buyerFeeUsd: 0,
    feeEnabled: false,
  });
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);

  // Notifications
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // User Auth
  const [isUserLoggedIn, setIsUserLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("fortia_user_logged_in") === "true";
    } catch (e) {
      return false;
    }
  });
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window === "undefined") return {} as UserProfile;
    try {
      // Aucun profil chargé si l'utilisateur n'est pas connecté (évite les données fictives)
      if (localStorage.getItem("fortia_user_logged_in") !== "true") {
        return {} as UserProfile;
      }
      const saved = localStorage.getItem("fortia_user_profile");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.email) {
          return parsed;
        }
      }
    } catch (e) {}
    return {} as UserProfile;
  });
  const [openAuthModal, setOpenAuthModal] = useState(false);
  // Anti-flash : reste true tant que la session serveur n'est pas vérifiée
  const [sessionChecking, setSessionChecking] = useState(true);
  // Données personnelles filtrées par le serveur (/api/me)
  const [myOrders, setMyOrders] = useState<MarketplaceOrder[]>([]);
  const [myNotifications, setMyNotifications] = useState<AppNotification[]>([]);
  const [myKycSubmissions, setMyKycSubmissions] = useState<KycSubmission[]>([]);

  // ======== RECHARGEMENT DES DONNÉES PLATFORM (à la demande) ========
  // Déclaration `function` (hoistée) : appelée par le useEffect initial et
  // exposée dans le contexte pour rafraîchir les données après une écriture
  // (profil freelance, boutique, formation...) sans recharger la page.
  async function refreshPlatformData() {
    try {
      const data = await apiFetchPlatformData();
      if (!data) return;

      // Mettre à jour les états avec les données réelles Supabase si disponibles
      if (data.courses?.length > 0) {
        setCourses(
          (data.courses as any[]).map((c: any) => ({
            ...c,
            quiz:
              (c.quiz as any[]) ||
              (c.quizzes as any[])?.map((q: any) => ({
                id: q.id,
                question: q.question,
                explanation: q.explanation || "",
                options: (q.options || []).map((o: any) => o.optionText),
                correctAnswer: (q.options || []).findIndex((o: any) => o.isCorrect),
              })) ||
              [],
          }))
        );
      }
      if (data.products?.length > 0) {
        setMarketplaceProducts(data.products as any);
      }
      if (data.stores?.length > 0) {
        setStores(data.stores as any);
        setActiveVendorStore((data.stores[0] as any));
      }
      if (data.freelances?.length > 0) {
        setFreelances(data.freelances as any);
      }
      if (data.enterprises?.length > 0) {
        setEnterprises(data.enterprises as any);
      }
      if (data.blogPosts?.length > 0) {
        setBlogPosts(data.blogPosts as any);
      }
      if (data.kycSubmissions?.length > 0) {
        setKycSubmissions(data.kycSubmissions as any);
      }
      if (data.vendorApplications?.length > 0) {
        setVendorApplications(data.vendorApplications as any);
      }
      if (data.marketplaceOrders?.length > 0) {
        setMarketplaceOrders(data.marketplaceOrders as any);
      }
      if (data.payoutRequests?.length > 0) {
        setPayoutRequests(data.payoutRequests as any);
      }
      if (data.postPurchaseSupport?.length > 0) {
        setPostPurchaseSubmissions(data.postPurchaseSupport as any);
      }
      if (data.serviceQuotes?.length > 0) {
        setServiceQuotes(data.serviceQuotes as any);
      }
      if (data.servicePackages?.length > 0) {
        setServices(data.servicePackages as any);
      }
      if (data.notifications?.length > 0) {
        setNotifications(data.notifications as any);
      }
      if (data.siteContent?.length > 0) {
        setSiteContent(data.siteContent[0] as any);
      }
      if (data.feeConfig) {
        setFeeConfigState(data.feeConfig as any);
      }
      if (data.trainingCenters?.length > 0) {
        setTrainingCenters(data.trainingCenters as any);
        const myCenter = (data.trainingCenters as any).find(
          (c: any) => c.ownerId === userProfile?.id
        );
        if (myCenter) setInstructorCenter(myCenter);
      }
      if (data.instructorCommissions?.length > 0) {
        setInstructorCommissions(data.instructorCommissions as any);
      }
      if (data.instructorStoragePurchases?.length > 0) {
        setInstructorStoragePurchases(data.instructorStoragePurchases as any);
      }
    } catch (error) {
      console.warn("[AppStore] Données Supabase non chargées (états vides affichés):", error);
    } finally {
      setPlatformLoaded(true);
    }
  }
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");

  // Admin
  const [isAdmin, setIsAdmin] = useState(true);
  const [isAdminAuthModalOpen, setIsAdminAuthModalOpen] = useState(false);

  // ======== ACADÉMIE MULTI-FORMATEURS ========
  const [trainingCenters, setTrainingCenters] = useState<TrainingCenter[]>([]);
  const [instructorCommissions, setInstructorCommissions] = useState<InstructorCommission[]>([]);
  const [instructorStoragePurchases, setInstructorStoragePurchases] = useState<InstructorStoragePurchase[]>([]);
  const [instructorCenter, setInstructorCenter] = useState<TrainingCenter | null>(null);

  useEffect(() => {
    if (!isUserLoggedIn || !userProfile?.id) {
      setInstructorCenter(null);
      return;
    }
    const found = trainingCenters.find((c) => c.ownerId === userProfile.id) || null;
    setInstructorCenter(found);
  }, [isUserLoggedIn, userProfile?.id, trainingCenters]);

  const createTrainingCenter = useCallback(
    (data: { centerName: string; description: string }) => {
      const ownerId = userProfile?.id;
      const tempCenter: TrainingCenter = {
        id: `center-${Date.now()}`,
        ownerId,
        centerName: data.centerName,
        slug: data.centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: data.description,
        logo: "",
        banner: "",
        status: "pending",
        isVerified: false,
        feePaid: false,
        feeAmountUsd: 2,
        storageQuotaGb: 4,
        storageUsedBytes: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setTrainingCenters((prev) => [tempCenter, ...prev]);
      setInstructorCenter(tempCenter);

      apiWritePlatform("create-training-center", { ownerId, ...data }).then((res) => {
        if (res.success && res.id) {
          const realCenter: TrainingCenter = {
            ...tempCenter,
            id: res.id,
            status: "active",
            feePaid: true,
          };
          setTrainingCenters((prev) => prev.map((c) => (c.id === tempCenter.id ? realCenter : c)));
          setInstructorCenter(realCenter);
          apiWritePlatform("pay-training-center-fee", { centerId: res.id });
          alert("🎉 Votre centre de formation a été créé et est actif !");
        } else {
          alert(
            "⚠️ Le centre a été créé localement mais n'a pas été enregistré en base (serveur inaccessible). " +
            "Réessayez ou contactez l'admin."
          );
        }
      });
    },
    [userProfile]
  );

  const updateInstructorCourse = useCallback(
    (courseId: string, updates: Partial<Course>) => {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, ...updates } : c))
      );
      apiWritePlatform("update-course", {
        id: courseId,
        title: updates.title,
        slug: updates.slug,
        category: updates.category,
        categoryLabel: updates.categoryLabel,
        description: updates.description,
        fullDescription: updates.fullDescription,
        level: updates.level,
        durationHours: updates.durationHours,
        lessonsCount: updates.lessonsCount,
        price: updates.price,
        image: updates.image,
        badge: updates.badge,
        instructorName: updates.instructor?.name,
        instructorRole: updates.instructor?.role,
        instructorAvatar: updates.instructor?.avatar,
        learningOutcomes: updates.learningOutcomes,
        isPublished: (updates as any).isPublished,
        chapters: (updates as any).chapters || [],
        quiz: (updates as any).quiz || [],
      });
      alert("✅ Formation mise à jour avec succès !");
      clearPlatformCache();
      refreshPlatformData();
    },
    []
  );

  const rateCourse = useCallback(
    (courseId: string, rating: number) => {
      const userId = userProfile?.id;
      if (!userId) {
        alert("Connectez-vous pour noter une formation.");
        return;
      }
      const clamped = Math.max(1, Math.min(5, Math.round(rating)));

      apiWritePlatform("rate-course", {
        courseId,
        userId,
        rating: clamped,
      }).then((res: any) => {
        if (res?.alreadyRated) {
          alert("⭐ Vous avez déjà noté cette formation. Un seul vote est autorisé par personne.");
          return;
        }
        if (res?.success && typeof res.rating === "number") {
          setCourses((prev) =>
            prev.map((c) =>
              c.id === courseId
                ? { ...c, rating: res.rating, reviewsCount: res.reviewsCount }
                : c
            )
          );
        }
      });
    },
    [userProfile?.id]
  );

  const addInstructorCourse = useCallback(
    (course: Course) => {
      const tempId = String(course.id || `course-${Date.now()}`);
      setCourses((prev) => [{ ...(course as any), id: tempId } as Course, ...prev]);
      apiWritePlatform("submit-course-by-instructor", {
        title: course.title,
        slug: course.slug || `cours-${Date.now()}`,
        instructorId: userProfile?.id,
        centerId: instructorCenter?.id,
        categoryId: course.category as string,
        categoryLabel: course.categoryLabel || course.category,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        lessonsCount: course.lessonsCount,
        price: course.price,
        image: course.image,
        instructorName: course.instructor?.name,
        instructorRole: course.instructor?.role,
        instructorAvatar: course.instructor?.avatar,
        learningOutcomes: course.learningOutcomes,
        chapters: course.chapters || [],
        quiz: course.quiz || [],
        isPublished: true,
      }).then((res) => {
        if (res.success && res.id) {
          setCourses((prev) =>
            prev.map((c) => (c.id === tempId ? { ...c, id: res.id as string } : c))
          );
          clearPlatformCache();
          refreshPlatformData();
        }
      });
    },
    [userProfile, instructorCenter]
  );

  const suspendInstructorCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.map((c) => (c.id === courseId ? { ...c, isPublished: false } : c)));
    apiWritePlatform("suspend-course", { id: courseId });
  }, []);

  const deleteInstructorCourse = useCallback((courseId: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
    apiWritePlatform("delete-course", { id: courseId });
  }, []);

  const buyInstructorStorage = useCallback(
    (center: TrainingCenter, amountGb: number, amountUsd: number) => {
      const updated = { ...center, storageQuotaGb: center.storageQuotaGb + amountGb };
      setInstructorCenter(updated);
      setTrainingCenters((prev) => prev.map((c) => (c.id === center.id ? updated : c)));
      apiWritePlatform("register-instructor-purchase", {
        instructorId: userProfile?.id,
        centerId: center.id,
        amountGb,
        amountUsd,
      });
    },
    [userProfile]
  );

  const adminAddInstructor = useCallback(
    (data: { email: string; centerName: string; description?: string; storageQuotaGb?: number }) => {
      const tempCenter: TrainingCenter = {
        id: `center-${Date.now()}`,
        centerName: data.centerName,
        slug: data.centerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: data.description || "",
        logo: "",
        banner: "",
        status: "active",
        isVerified: true,
        feePaid: true,
        feeAmountUsd: 2,
        storageQuotaGb: data.storageQuotaGb || 4,
        storageUsedBytes: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setTrainingCenters((prev) => [tempCenter, ...prev]);
      apiWritePlatform("admin-add-instructor", data).then((res) => {
        if (res.success && res.id) {
          const realCenter: TrainingCenter = { ...tempCenter, id: res.id };
          setTrainingCenters((prev) => prev.map((c) => (c.id === tempCenter.id ? realCenter : c)));
        }
      });
    },
    []
  );

  // Cart
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);

  // Course Player
  const [selectedCourseForPlayer, setSelectedCourseForPlayer] = useState<Course | null>(null);

  // Payment Gateway
  const [paymentItems, setPaymentItems] = useState<CartItem[]>([]);
  const [isPaymentGatewayOpen, setPaymentGatewayOpen] = useState(false);

  // Recherche globale (navbar → boutique)
  const [searchQuery, setSearchQueryState] = useState("");
  const setSearchQuery = useCallback((query: string) => setSearchQueryState(query), []);

  // Vendor Application
  const [isVendorApplicationModalOpen, setVendorApplicationModalOpen] = useState(false);

  // KYC
  const [isKycModalOpen, setKycModalOpen] = useState(false);

  // ======== HELPERS ========

  const updateSiteContent = useCallback(
    (content: SiteContent) => setSiteContent(content),
    [setSiteContent]
  );

  const addCourse = useCallback(
    (course: Course) => {
      setCourses((prev) => [course, ...prev]);
      apiWritePlatform("create-course", {
        title: course.title,
        slug: course.slug || `cours-${Date.now()}`,
        category: course.category,
        categoryLabel: course.categoryLabel || course.category,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        lessonsCount: course.lessonsCount,
        price: course.price,
        image: course.image,
        badge: course.badge,
        instructorName: course.instructor?.name || "",
        instructorRole: course.instructor?.role || "",
        instructorAvatar: course.instructor?.avatar || "",
        learningOutcomes: course.learningOutcomes || [],
        isPublished: (course as any).isPublished ?? true,
      });
    },
    [setCourses]
  );
  const updateCourse = useCallback(
    (course: Course) => {
      setCourses((prev) => prev.map((c) => (c.id === course.id ? course : c)));
      apiWritePlatform("update-course", {
        id: course.id,
        title: course.title,
        description: course.description,
        fullDescription: course.fullDescription,
        level: course.level,
        durationHours: course.durationHours,
        price: course.price,
        image: course.image,
        badge: course.badge,
        instructorName: course.instructor?.name || "",
        instructorRole: course.instructor?.role || "",
        instructorAvatar: course.instructor?.avatar || "",
        learningOutcomes: course.learningOutcomes || [],
        isPublished: (course as any).isPublished ?? true,
      });
    },
    [setCourses]
  );
  const deleteCourse = useCallback(
    (id: string) => setCourses((prev) => prev.filter((c) => c.id !== id)),
    [setCourses]
  );

  const addProduct = useCallback(
    (newProduct: DigitalProduct | MarketplaceProduct) => {
      const realStore =
        userProfile?.email
          ? stores.find((s) => s.ownerEmail === userProfile.email) ||
            stores.find((s) => s.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase())
          : undefined;
      const vendorStore = realStore || activeVendorStore;

      const mProduct: MarketplaceProduct = {
        id: newProduct.id || `prod-${Date.now()}`,
        storeId: vendorStore.id,
        storeName: vendorStore.name,
        storeLogo: vendorStore.logo,
        vendorId: vendorStore.vendorId,
        title: newProduct.title,
        slug: newProduct.title.toLowerCase().replace(/\s+/g, "-"),
        type: newProduct.type as any,
        typeLabel: newProduct.typeLabel || "Produit Numérique",
        description: newProduct.description,
        price: newProduct.price,
        originalPrice: newProduct.originalPrice || newProduct.price * 1.5,
        fileFormat: newProduct.fileFormat || "PDF",
        fileSize: newProduct.fileSize || "10 MB",
        image: newProduct.image,
        features: newProduct.features || [],
        downloadUrl: newProduct.downloadUrl || "#",
        isPublished: true,
        isApproved: true,
        isPopular: !!newProduct.isPopular,
        rating: 5.0,
        reviewsCount: 1,
        salesCount: 0,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setMarketplaceProducts((prev) => [mProduct, ...prev]);
      apiWritePlatform("create-product", {
        storeId: mProduct.storeId,
        storeName: mProduct.storeName,
        storeLogo: mProduct.storeLogo,
        vendorId: mProduct.vendorId,
        title: mProduct.title,
        slug: mProduct.slug,
        type: mProduct.type as string,
        typeLabel: mProduct.typeLabel || "Produit Numérique",
        description: mProduct.description || "",
        price: mProduct.price,
        fileFormat: mProduct.fileFormat || "PDF",
        fileSize: mProduct.fileSize || "10 MB",
        image: mProduct.image || "",
        bannerImage: mProduct.bannerImage || "",
        features: mProduct.features || [],
        downloadUrl: mProduct.downloadUrl || "#",
        isPublished: mProduct.isPublished ?? true,
        isApproved: mProduct.isApproved ?? true,
        isPopular: mProduct.isPopular ?? false,
      });
    },
    [activeVendorStore, userProfile, stores]
  );

  const updateProduct = useCallback(
    (product: DigitalProduct | MarketplaceProduct) => {
      setMarketplaceProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...product } : p))
      );
      apiWritePlatform("update-product", {
        id: product.id,
        title: product.title,
        description: product.description || "",
        price: product.price,
        fileFormat: product.fileFormat || "PDF",
        image: (product as any).image || "",
        isPublished: (product as any).isPublished ?? true,
        isApproved: (product as any).isApproved ?? true,
        isPopular: (product as any).isPopular ?? false,
      });
    },
    []
  );
  const deleteProduct = useCallback(
    (id: string) => setMarketplaceProducts((prev) => prev.filter((p) => p.id !== id)),
    []
  );

  const submitQuote = useCallback((quote: ServiceQuoteRequest) => {
    setServiceQuotes((prev) => [quote, ...prev]);
    apiWritePlatform("submit-quote", {
      clientName: quote.clientName || "",
      clientEmail: quote.clientEmail || "",
      phone: quote.clientPhone || "",
      serviceTitle: quote.serviceTitle || "",
      serviceCategory: quote.serviceId || "",
      details: quote.details || "",
      estimatedPrice: quote.estimatedPrice || 0,
    });
  }, []);

  // SERVICES AGENCE : CRUD Complet
  const addService = useCallback((service: ServicePackage) => {
    const tempId = service.id || `serv-${Date.now()}`;
    setServices((prev) => [{ ...service, id: tempId }, ...prev]);
    apiWritePlatform("create-service", {
      title: service.title || "",
      category: service.category || "",
      description: service.description || "",
      startingPrice: service.startingPrice || 0,
      estimatedDays: service.estimatedDays || "",
      iconName: service.iconName || "Briefcase",
      deliverables: service.deliverables || [],
      options: service.options || [],
      borderStyle: service.borderStyle || "gold",
      cardAnimation: service.cardAnimation || "fade-up",
      accentColor: service.accentColor || "#D69E25",
      badgeText: service.badgeText || "",
      featured: service.featured ?? false,
      isActive: service.isActive ?? true,
      displayOrder: service.displayOrder ?? 0,
    }).then((res) => {
      if (res.success && res.id) {
        // Remplace l'ID temporaire par l'ID réel généré en base
        setServices((prev) =>
          prev.map((s) => (s.id === tempId ? { ...s, id: res.id as string } : s))
        );
      } else {
        console.warn("[AppStore] Service créé localement mais non persisté:", res.error);
      }
    });
    alert("Service cree et publie avec succes !");
  }, []);

  const updateService = useCallback((service: ServicePackage) => {
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, ...service } : s))
    );
    apiWritePlatform("update-service", {
      id: service.id,
      title: service.title || "",
      category: service.category || "",
      description: service.description || "",
      startingPrice: service.startingPrice || 0,
      estimatedDays: service.estimatedDays || "",
      iconName: service.iconName || "Briefcase",
      deliverables: service.deliverables || [],
      options: service.options || [],
      borderStyle: service.borderStyle || "gold",
      cardAnimation: service.cardAnimation || "fade-up",
      accentColor: service.accentColor || "#D69E25",
      badgeText: service.badgeText || "",
      featured: service.featured ?? false,
      isActive: service.isActive ?? true,
      displayOrder: service.displayOrder ?? 0,
    });
    alert("Service modifie et synchronise avec succes !");
  }, []);

  const deleteService = useCallback((id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    apiWritePlatform("delete-service", { id });
    alert("Service supprime avec succes !");
  }, []);

  const toggleServiceActive = useCallback((id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !(s.isActive ?? true) } : s))
    );
  }, []);

  const openStore = useCallback((store: VendorStore) => setSelectedStore(store), []);
  const closeStore = useCallback(() => setSelectedStore(null), []);

  const updateStore = useCallback(
    (store: VendorStore) => {
      setStores((prev) => prev.map((s) => (s.id === store.id ? store : s)));
      setActiveVendorStore(store);
      // Persiste en base Supabase (logo, bannière, nom, description)
      apiWritePlatform("update-store", {
        storeId: store.id,
        name: store.name,
        description: store.description,
        logo: store.logo,
        banner: store.banner,
        categories: store.categories,
      });
    },
    []
  );
  const deleteStore = useCallback(
    (id: string) => setStores((prev) => prev.filter((s) => s.id !== id)),
    []
  );
  const approveStore = useCallback(
    (id: string) => setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: "active" } : s))),
    []
  );
  const suspendStore = useCallback(
    (id: string) => setStores((prev) => prev.map((s) => (s.id === id ? { ...s, status: "suspended" } : s))),
    []
  );

  const submitVendorApplication = useCallback((app: VendorApplication) => {
    setVendorApplications((prev) => [app, ...prev]);
    apiWritePlatform("submit-vendor-app", {
      userId: app.userId,
      applicantName: app.applicantName || "",
      email: app.email || "",
      phone: app.phone || "",
      storeName: app.storeName || "",
      storeCategory: app.storeCategory || "",
      storeDescription: app.storeDescription || "",
      experienceBio: app.experienceBio || "",
    });
  }, []);

  const approveVendorApplication = useCallback((id: string) => {
    setVendorApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Approuvé" } : a))
    );
    const app = vendorApplications.find((a) => a.id === id);
    if (!app) return;
    const newStore: VendorStore = {
      id: `store-${Date.now()}`,
      vendorId: app.userId || `user-${Date.now()}`,
      name: app.storeName,
      slug: app.storeName.toLowerCase().replace(/\s+/g, "-"),
      ownerName: app.applicantName,
      ownerEmail: app.email,
      ownerPhone: app.phone,
      description: app.storeDescription,
      logo: "",
      banner: "",
      categories: [app.storeCategory],
      rating: 5.0,
      salesCount: 0,
      totalRevenueUsd: 0,
      status: "active",
      isVerified: true,
      createdAt: new Date().toISOString().split("T")[0],
      payoutInfo: {
        method: "mobile_money",
        accountName: app.applicantName,
        accountNumber: app.phone,
        providerName: "Wave Senegal",
      },
    };
    setStores((prev) => [...prev, newStore]);
    apiWritePlatform("approve-vendor-app", { id });
  }, [vendorApplications]);

  const rejectVendorApplication = useCallback((id: string) => {
    setVendorApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: "Rejeté" } : a))
    );
    apiWritePlatform("reject-vendor-app", { id });
  }, []);

  const requestPayout = useCallback((payout: PayoutRequest) => {
    setPayoutRequests((prev) => [payout, ...prev]);
    apiWritePlatform("submit-payout", {
      storeId: payout.storeId,
      storeName: payout.storeName,
      vendorName: payout.vendorName,
      amountUsd: payout.amountUsd,
      amountFcfa: payout.amountFcfa,
      payoutMethod: payout.payoutMethod,
      accountDetails: payout.accountDetails,
    });
  }, []);

  const approvePayout = useCallback((id: string) => {
    const payout = payoutRequests.find((p) => p.id === id);
    setPayoutRequests((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "Payé" } : p))
    );
    if (payout?.storeId) {
      const amount = payout.amountUsd || 0;
      setStores((prev) =>
        prev.map((s) =>
          s.id === payout.storeId
            ? { ...s, totalRevenueUsd: Math.max((s.totalRevenueUsd || 0) - amount, 0) }
            : s
        )
      );
      setActiveVendorStore((prev) =>
        prev.id === payout.storeId
          ? { ...prev, totalRevenueUsd: Math.max((prev.totalRevenueUsd || 0) - amount, 0) }
          : prev
      );
    }
    apiWritePlatform("approve-payout", { id });
  }, [payoutRequests]);

  const handlePaymentSuccess = useCallback((order: MarketplaceOrder) => {
    setMarketplaceOrders((prev) => [order, ...prev]);
    setCartItems([]);
    if (isUserLoggedIn && userProfile) {
      const productId = order.productId;
      const updatedProfile: UserProfile = {
        ...userProfile,
        purchasedProductIds:
          productId && !(userProfile.purchasedProductIds || []).includes(productId)
            ? [...(userProfile.purchasedProductIds || []), productId]
            : userProfile.purchasedProductIds || [],
        paymentHistory: [
          {
            id: `pay-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            amount: order.amountUsd,
            method: order.paymentGateway,
            items: [order.productTitle],
            status: "Validé",
          },
          ...(userProfile.paymentHistory || []),
        ],
      };
      setUserProfile(updatedProfile);
      try {
        localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
      } catch (e) {}
    }

    apiWritePlatform("submit-order", {
      orderNumber: order.orderNumber || `ORD-${Date.now()}`,
      buyerName: order.buyerName || "",
      buyerEmail: order.buyerEmail || "",
      buyerPhone: order.buyerPhone || "",
      buyerUserId: userProfile?.id || undefined,
      storeId: order.storeId,
      storeName: order.storeName || "",
      productId: order.productId,
      productTitle: order.productTitle || "",
      amountUsd: order.amountUsd || 0,
      platformCommissionUsd: order.platformCommissionUsd || 0,
      vendorEarningsUsd: order.vendorEarningsUsd || 0,
      paymentGateway: order.paymentGateway || "Wave API",
      transactionRef: order.transactionRef || "",
    }).then((res) => {
      if (res.success && res.id && userProfile?.id) {
        apiWritePlatform("register-free-purchase", {
          userId: userProfile.id,
          orderId: res.id,
        });
      }
    });
  }, [isUserLoggedIn, userProfile]);

  const addSupportSubmission = useCallback((submission: PostPurchaseSupportSubmission) => {
    setPostPurchaseSubmissions((prev) => [submission, ...prev]);
    apiWritePlatform("submit-support", {
      orderNumber: submission.orderNumber || "",
      productTitle: submission.productTitle || "",
      lastName: submission.lastName || "",
      firstName: submission.firstName || "",
      phoneContact: submission.phoneContact || "",
      email: submission.email || "",
      notes: submission.notes || "",
      forwardedEmail: submission.forwardedEmail || "",
    });
  }, []);

  const deleteSupportSubmission = useCallback((id: string) => {
    setPostPurchaseSubmissions((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const submitKyc = useCallback((submission: KycSubmission) => {
    setKycSubmissions((prev) => [submission, ...prev]);
    apiWritePlatform("submit-kyc", {
      applicantType: submission.applicantType || "freelance",
      applicantId: submission.applicantId || undefined,
      applicantName: submission.applicantName || "",
      firstName: submission.firstName || "",
      lastName: submission.lastName || "",
      repRole: submission.repRole || "",
      email: submission.email || "",
      phone: submission.phone || "",
      country: submission.country || "",
      address: submission.address || "",
      documentType: submission.documentType || "CNI",
      documentNumber: submission.documentNumber || "",
      idExpirationDate: submission.idExpirationDate || "",
      idRectoUrl: submission.idRectoUrl || "",
      idVersoUrl: submission.idVersoUrl || "",
      selfieUrl: submission.selfieUrl || "",
      companyName: submission.companyName || "",
      legalForm: submission.legalForm || "",
      rccmNumber: submission.rccmNumber || "",
      companyDocUrl: submission.companyDocUrl || "",
      documentFileUrl: submission.documentFileUrl || "",
    }).then((res) => {
      if (res.success && res.id) {
        // Remplace l'ID temporaire par l'ID réel généré en base
        setKycSubmissions((prev) =>
          prev.map((k) => (k.id === submission.id ? { ...k, id: res.id as string } : k))
        );
      } else {
        console.warn("[AppStore] KYC non persisté en base:", res.error);
      }
    });
  }, []);
  const approveKyc = useCallback((id: string) => {
    const sub = kycSubmissions.find((k) => k.id === id);
    setKycSubmissions((prev) =>
      prev.map((k) => (k.id === id ? { ...k, status: "Approuvé" } : k))
    );
    // Persiste l'approbation complète : crée le profil freelance/entreprise + badge + notification
    // Envoie aussi l'email pour permettre de retrouver la demande si l'ID est local/temporaire
    apiWritePlatform("approve-kyc-full", {
      id,
      email: sub?.email || "",
      userId: sub?.applicantId || userProfile?.id || undefined,
      canReceivePayments: false,
    });
  }, [kycSubmissions, userProfile?.id]);

  const addToCart = useCallback((item: CartItem) => {
    setCartItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
    setCartOpen(true);
  }, []);
  const removeFromCart = useCallback((id: string) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id));
  }, []);
  const clearCart = useCallback(() => setCartItems([]), []);

  // ===== Apprentissage : progression & attestations du membre =====
  const persistUserLearning = useCallback(
    (updatedProfile: UserProfile) => {
      setUserProfile(updatedProfile);
      try {
        localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
      } catch (e) {}
      if (updatedProfile.id) {
        apiWritePlatform("sync-user-learning", {
          userId: updatedProfile.id,
          courseProgress: updatedProfile.courseProgress || {},
          enrolledCourseIds: updatedProfile.enrolledCourseIds || [],
          earnedCertificates: updatedProfile.earnedCertificates || [],
        });
      }
    },
    []
  );

  const recordCourseProgress = useCallback(
    (courseId: string, percent: number) => {
      if (!courseId || !userProfile) return;
      const safePct = Math.max(0, Math.min(100, Math.round(percent || 0)));
      const updated: UserProfile = {
        ...userProfile,
        courseProgress: {
          ...(userProfile.courseProgress || {}),
          [courseId]: safePct,
        },
      };
      persistUserLearning(updated);
    },
    [userProfile, persistUserLearning]
  );

  const grantCertificate = useCallback(
    (certificate: Certificate) => {
      if (!certificate?.courseTitle || !userProfile) return;
      // Candidat local (utilisé uniquement si le serveur est indisponible)
      const candidate: Certificate = {
        ...certificate,
        courseId: certificate.courseId || undefined,
        userId: userProfile.id,
      };

      const applyCertificate = (finalCert: Certificate) => {
        const existing = userProfile.earnedCertificates || [];
        if (existing.some((c) => c.id === finalCert.id)) return;
        const updated: UserProfile = {
          ...userProfile,
          earnedCertificates: [...existing, finalCert],
        };
        setUserProfile(updated);
        try {
          localStorage.setItem("fortia_user_profile", JSON.stringify(updated));
        } catch (e) {}
        if (userProfile.id) {
          apiWritePlatform("sync-user-learning", {
            userId: userProfile.id,
            courseProgress: updated.courseProgress || {},
            enrolledCourseIds: updated.enrolledCourseIds || [],
            earnedCertificates: updated.earnedCertificates || [],
          });
        }
      };

      if (userProfile.id) {
        // Voie officielle : le serveur génère un numéro UNIQUE enregistré en base
        apiWritePlatform("issue-certificate", {
          userId: userProfile.id,
          courseId: certificate.courseId || undefined,
          courseTitle: certificate.courseTitle,
          studentName: certificate.studentName,
          category: certificate.category || "",
          grade: certificate.grade || "",
        }).then((res) => {
          if (res.success && res.certificate) {
            applyCertificate(res.certificate as unknown as Certificate);
          } else {
            applyCertificate(candidate);
          }
        });
      } else {
        applyCertificate(candidate);
      }
    },
    [userProfile]
  );

  const ensureCourseEnrollment = useCallback(
    (courseId: string) => {
      if (!courseId || !userProfile) return;
      const enrolled = userProfile.enrolledCourseIds || [];
      if (enrolled.includes(courseId)) return;
      const updated: UserProfile = {
        ...userProfile,
        enrolledCourseIds: [...enrolled, courseId],
        courseProgress: {
          ...(userProfile.courseProgress || {}),
          [courseId]: userProfile.courseProgress?.[courseId] ?? 0,
        },
      };
      persistUserLearning(updated);
    },
    [userProfile, persistUserLearning]
  );

  const loginUser = useCallback(
    (userData: Partial<UserProfile>) => {
      // Sécurité : au changement de compte (email différent), on repart d'un profil
      // vierge — JAMAIS de fusion avec les achats/attestations du compte précédent.
      const sameEmail =
        !!userProfile?.email &&
        !!userData?.email &&
        userProfile.email.toLowerCase() === (userData.email || "").toLowerCase();
      const base = sameEmail ? userProfile : ({} as UserProfile);

      const updatedProfile: UserProfile = {
        ...base,
        ...userData,
        enrolledCourseIds: sameEmail
          ? userProfile.enrolledCourseIds || []
          : userData.enrolledCourseIds || [],
        courseProgress: sameEmail
          ? userProfile.courseProgress || {}
          : userData.courseProgress || {},
        purchasedProductIds: sameEmail
          ? userProfile.purchasedProductIds || []
          : userData.purchasedProductIds || [],
        earnedCertificates: sameEmail
          ? userProfile.earnedCertificates || []
          : userData.earnedCertificates || [],
        paymentHistory: sameEmail
          ? userProfile.paymentHistory || []
          : userData.paymentHistory || [],
      };
      setUserProfile(updatedProfile);
      setIsUserLoggedIn(true);
      setOpenAuthModal(false);
      try {
        localStorage.setItem("fortia_user_logged_in", "true");
        localStorage.setItem("fortia_user_profile", JSON.stringify(updatedProfile));
      } catch (e) {}
      setNotifications((prev) => [
        {
          id: `notif-login-${Date.now()}`,
          title: "Connexion Réussie",
          message: `Bienvenue, ${userData.name || "Utilisateur"} ! Votre session est sécurisée.`,
          date: "À l'instant",
          read: false,
          type: "success",
          linkTab: "member",
        },
        ...prev,
      ]);
    },
    [userProfile]
  );

  const logoutUser = useCallback(() => {
    setIsUserLoggedIn(false);
    // Purge COMPLÈTE : aucun reste du compte précédent ne doit survivre
    setUserProfile({} as UserProfile);
    try {
      // Révoque la session JWT côté serveur (cookie HttpOnly) — best-effort :
      // même si la requête échoue, la session locale est nettoyée.
      fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
      localStorage.removeItem("fortia_user_logged_in");
      localStorage.removeItem("fortia_user_profile");
    } catch (e) {}
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    apiWritePlatform("mark-notification-read", { id });
  }, []);
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);
  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);
  const clearNotifications = useCallback(() => setNotifications([]), []);

  const orderService = useCallback(
    (service: FreelanceService, freelance: FreelanceProfile) => {
      const item: CartItem = {
        id: service.id,
        type: "service",
        title: `${service.title} (par ${freelance.name})`,
        price: service.startingPrice,
        image: freelance.avatar,
        categoryLabel: "Service Freelance",
      };
      addToCart(item);
    },
    [addToCart]
  );

  const value = useMemo<AppStoreContextValue>(
    () => ({
      platformLoaded,
      refreshPlatformData,
      siteContent,
      updateSiteContent,
      courses,
      addCourse,
      updateCourse,
      deleteCourse,
      services,
      serviceQuotes,
      submitQuote,
      addService,
      updateService,
      deleteService,
      toggleServiceActive,
      marketplaceProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      stores,
      activeVendorStore,
      setActiveVendorStore,
      selectedStore,
      openStore,
      closeStore,
      vendorApplications,
      marketplaceOrders,
      payoutRequests,
      marketplaceConfig,
      postPurchaseSubmissions,
      updateStore,
      deleteStore,
      approveStore,
      suspendStore,
      submitVendorApplication,
      approveVendorApplication,
      rejectVendorApplication,
      requestPayout,
      approvePayout,
      updateMarketplaceConfig: setMarketplaceConfig,
      handlePaymentSuccess,
      addSupportSubmission,
      deleteSupportSubmission,
      freelances,
      enterprises,
      blogPosts,
      feeConfig,
      setFeeConfig: setFeeConfigState,
      kycSubmissions,
      submitKyc,
      approveKyc,
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      isUserLoggedIn,
      userProfile,
      sessionChecking,
      openAuthModal,
      setOpenAuthModal,
      authMode,
      setAuthMode,
      loginUser,
      logoutUser,
      isAdmin,
      setAdmin: setIsAdmin,
      isAdminAuthModalOpen,
      setAdminAuthModalOpen: setIsAdminAuthModalOpen,
      myOrders,
      myNotifications,
      myKycSubmissions,
      notifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      clearNotifications,
      selectedCourseForPlayer,
      setSelectedCourseForPlayer,
      isCartOpen,
      setCartOpen,
      paymentItems,
      setPaymentItems,
      isPaymentGatewayOpen,
      setPaymentGatewayOpen,
      isVendorApplicationModalOpen,
      setVendorApplicationModalOpen,
      isKycModalOpen,
      setKycModalOpen,
      searchQuery,
      setSearchQuery,
      orderService,
      trainingCenters,
      instructorCommissions,
      instructorStoragePurchases,
      instructorCenter,
      createTrainingCenter,
      addInstructorCourse,
      updateInstructorCourse,
      rateCourse,
      suspendInstructorCourse,
      deleteInstructorCourse,
      recordCourseProgress,
      grantCertificate,
      ensureCourseEnrollment,
      buyInstructorStorage,
      adminAddInstructor,
    }),
    [
      platformLoaded,
      refreshPlatformData,
      siteContent,
      updateSiteContent,
      courses,
      addCourse,
      updateCourse,
      deleteCourse,
      services,
      serviceQuotes,
      submitQuote,
      addService,
      updateService,
      deleteService,
      toggleServiceActive,
      marketplaceProducts,
      addProduct,
      updateProduct,
      deleteProduct,
      stores,
      activeVendorStore,
      selectedStore,
      openStore,
      closeStore,
      vendorApplications,
      marketplaceOrders,
      payoutRequests,
      marketplaceConfig,
      postPurchaseSubmissions,
      updateStore,
      deleteStore,
      approveStore,
      suspendStore,
      submitVendorApplication,
      approveVendorApplication,
      rejectVendorApplication,
      approvePayout,
      requestPayout,
      handlePaymentSuccess,
      addSupportSubmission,
      deleteSupportSubmission,
      freelances,
      enterprises,
      blogPosts,
      feeConfig,
      kycSubmissions,
      submitKyc,
      approveKyc,
      cartItems,
      addToCart,
      removeFromCart,
      clearCart,
      isUserLoggedIn,
      userProfile,
      sessionChecking,
      openAuthModal,
      authMode,
      loginUser,
      logoutUser,
      isAdmin,
      isAdminAuthModalOpen,
      myOrders,
      myNotifications,
      myKycSubmissions,
      notifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      deleteNotification,
      clearNotifications,
      selectedCourseForPlayer,
      isCartOpen,
      paymentItems,
      isPaymentGatewayOpen,
      isVendorApplicationModalOpen,
      isKycModalOpen,
      searchQuery,
      setSearchQuery,
      orderService,
      trainingCenters,
      instructorCommissions,
      instructorStoragePurchases,
      instructorCenter,
      createTrainingCenter,
      addInstructorCourse,
      updateInstructorCourse,
      rateCourse,
      suspendInstructorCourse,
      deleteInstructorCourse,
      recordCourseProgress,
      grantCertificate,
      ensureCourseEnrollment,
      buyInstructorStorage,
      adminAddInstructor,
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return ctx;
}
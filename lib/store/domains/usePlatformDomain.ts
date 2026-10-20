"use client";

// ============================================================
// FORTIA HUB — DOMAINE « PLATEFORME » (chargement global & administration)
// ------------------------------------------------------------
// Extrait de `lib/store/AppStore.tsx`. Ce module possède :
//   • l'état de chargement global (`platformLoaded`) et le rechargement des
//     données publiques (`refreshPlatformData`) ;
//   • le chargement des collections RÉSERVÉES À L'ADMINISTRATION
//     (`adminDataLoaded`, `loadAdminData`) ;
//   • la purge unique, au démarrage, des données de démonstration persistées.
//
// Les setters des autres domaines lui sont INJECTÉS explicitement : aucune
// dépendance cachée (même règle que les autres domaines).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import type {
  AppNotification,
  BlogPost,
  Course,
  CourseCategoryRecord,
  EnterpriseProfile,
  FreelanceProfile,
  InstructorCommission,
  InstructorStoragePurchase,
  KycSubmission,
  MarketplaceOrder,
  MarketplaceProduct,
  PayoutRequest,
  PostPurchaseSupportSubmission,
  RegistrationFeeConfig,
  ServicePackage,
  ServiceQuoteRequest,
  SiteContent,
  TrainingCenter,
  UserProfile,
  VendorApplication,
  VendorStore,
} from "@/lib/types";
import { apiFetchPlatformData } from "@/lib/services/platformApi";

export interface PlatformDomainDeps {
  userProfile: UserProfile;
  setCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  setMarketplaceProducts: React.Dispatch<React.SetStateAction<MarketplaceProduct[]>>;
  setCatalogTotal: React.Dispatch<React.SetStateAction<number>>;
  setCatalogHasMore: React.Dispatch<React.SetStateAction<boolean>>;
  setStores: React.Dispatch<React.SetStateAction<VendorStore[]>>;
  setActiveVendorStore: React.Dispatch<React.SetStateAction<VendorStore>>;
  setFreelances: React.Dispatch<React.SetStateAction<FreelanceProfile[]>>;
  setEnterprises: React.Dispatch<React.SetStateAction<EnterpriseProfile[]>>;
  setBlogPosts: React.Dispatch<React.SetStateAction<BlogPost[]>>;
  setKycSubmissions: React.Dispatch<React.SetStateAction<KycSubmission[]>>;
  setVendorApplications: React.Dispatch<React.SetStateAction<VendorApplication[]>>;
  setMarketplaceOrders: React.Dispatch<React.SetStateAction<MarketplaceOrder[]>>;
  setPayoutRequests: React.Dispatch<React.SetStateAction<PayoutRequest[]>>;
  setPostPurchaseSubmissions: React.Dispatch<React.SetStateAction<PostPurchaseSupportSubmission[]>>;
  setServiceQuotes: React.Dispatch<React.SetStateAction<ServiceQuoteRequest[]>>;
  setServices: React.Dispatch<React.SetStateAction<ServicePackage[]>>;
  /** Bannières du site (module indépendant). */
  setSiteBanners: (banners: any[]) => void;
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  setSiteContent: React.Dispatch<React.SetStateAction<SiteContent>>;
  setFeeConfigState: React.Dispatch<React.SetStateAction<RegistrationFeeConfig>>;
  setTrainingCenters: React.Dispatch<React.SetStateAction<TrainingCenter[]>>;
  setInstructorCenter: React.Dispatch<React.SetStateAction<TrainingCenter | null>>;
  setCourseCategories: React.Dispatch<React.SetStateAction<CourseCategoryRecord[]>>;
  setInstructorCommissions: React.Dispatch<React.SetStateAction<InstructorCommission[]>>;
  setInstructorStoragePurchases: React.Dispatch<React.SetStateAction<InstructorStoragePurchase[]>>;
}

export function usePlatformDomain({
  userProfile,
  setCourses,
  setMarketplaceProducts,
  setCatalogTotal,
  setCatalogHasMore,
  setStores,
  setActiveVendorStore,
  setFreelances,
  setEnterprises,
  setBlogPosts,
  setKycSubmissions,
  setVendorApplications,
  setMarketplaceOrders,
  setPayoutRequests,
  setPostPurchaseSubmissions,
  setServiceQuotes,
  setServices,
  setSiteBanners,
  setNotifications,
  setSiteContent,
  setFeeConfigState,
  setTrainingCenters,
  setInstructorCenter,
  setCourseCategories,
  setInstructorCommissions,
  setInstructorStoragePurchases,
}: PlatformDomainDeps) {
  const [platformLoaded, setPlatformLoaded] = useState(false);
  const [adminDataLoaded, setAdminDataLoaded] = useState(false);

  // ======== RECHARGEMENT DES DONNÉES PLATFORM (publiques) ========
  // Les setters React sont stables : la seule dépendance réelle est le profil
  // (recherche du centre de formation du formateur connecté).
  const refreshPlatformData = useCallback(async (force = false) => {
    try {
      const data = await apiFetchPlatformData(force);
      if (!data) return;

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
      if (data.products?.length > 0) setMarketplaceProducts(data.products as any);
      if (typeof data.catalogTotal === "number") setCatalogTotal(data.catalogTotal);
      if (typeof data.catalogHasMore === "boolean") setCatalogHasMore(data.catalogHasMore);
      if (data.stores?.length > 0) {
        setStores(data.stores as any);
        setActiveVendorStore(data.stores[0] as any);
      }
      if (data.freelances?.length > 0) setFreelances(data.freelances as any);
      if (data.enterprises?.length > 0) setEnterprises(data.enterprises as any);
      if (data.blogPosts?.length > 0) setBlogPosts(data.blogPosts as any);
      if ((data.kycSubmissions?.length ?? 0) > 0) setKycSubmissions(data.kycSubmissions as any);
      if ((data.vendorApplications?.length ?? 0) > 0)
        setVendorApplications(data.vendorApplications as any);
      if ((data.marketplaceOrders?.length ?? 0) > 0)
        setMarketplaceOrders(data.marketplaceOrders as any);
      if ((data.payoutRequests?.length ?? 0) > 0) setPayoutRequests(data.payoutRequests as any);
      if ((data.postPurchaseSupport?.length ?? 0) > 0)
        setPostPurchaseSubmissions(data.postPurchaseSupport as any);
      if ((data.serviceQuotes?.length ?? 0) > 0) setServiceQuotes(data.serviceQuotes as any);
      if (data.servicePackages?.length > 0) setServices(data.servicePackages as any);
      // Bannières : liste TOUJOURS appliquée (une liste vide doit pouvoir
      // vider l'affichage après une suppression dans l'administration).
      if (Array.isArray(data.siteBanners)) setSiteBanners(data.siteBanners as any[]);
      if (data.notifications?.length > 0)
        setNotifications(
          (data.notifications as Record<string, unknown>[]).map((n) => ({
            ...n,
            read: n.read === true || n.isRead === true,
            date: String(n.date || n.createdAt || ""),
          })) as AppNotification[]
        );
      if (data.siteContent?.length > 0) setSiteContent(data.siteContent[0] as any);
      if (data.feeConfig) setFeeConfigState(data.feeConfig as any);
      if (data.trainingCenters?.length > 0) {
        setTrainingCenters(data.trainingCenters as any);
        // Même règle que le domaine catalogue : un compte = un seul centre,
        // choisi de façon déterministe (actif/payé d'abord, puis le plus récent).
        const owned = (data.trainingCenters as any[]).filter(
          (c: any) => c.ownerId === userProfile?.id
        );
        const score = (c: any) => (c.feePaid || c.status === "active" ? 1 : 0);
        const myCenter =
          owned.sort((a: any, b: any) => {
            const diff = score(b) - score(a);
            if (diff !== 0) return diff;
            return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
          })[0] || null;
        if (myCenter) setInstructorCenter(myCenter);
      }
      if (data.courseCategories?.length > 0) {
        setCourseCategories(data.courseCategories as CourseCategoryRecord[]);
      }
      if ((data.instructorCommissions?.length ?? 0) > 0)
        setInstructorCommissions(data.instructorCommissions as any);
      if ((data.instructorStoragePurchases?.length ?? 0) > 0)
        setInstructorStoragePurchases(data.instructorStoragePurchases as any);
    } catch (error) {
      console.warn("[Plateforme] Données non chargées (états vides affichés):", error);
    } finally {
      setPlatformLoaded(true);
    }
  }, [userProfile?.id]);

  // ======== DÉMARRAGE : purge de démonstration + premier chargement ========
  useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ======== DONNÉES RÉSERVÉES À L'ADMINISTRATION ========
  const loadAdminData = useCallback(async () => {
    try {
      // Jeton de session admin (délivré par /api/admin/auth) : indispensable
      // pour accéder aux collections sensibles côté serveur.
      let token = "";
      try {
        token = localStorage.getItem("fortia_admin_token") || "";
      } catch {}

      const res = await fetch("/api/platform/admin-sync", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        if (res.status === 401) {
          try {
            localStorage.removeItem("fortia_admin_token");
          } catch {}
        }
        return;
      }

      const json = await res.json();
      const data = json?.data;
      if (!data) return;

      if (Array.isArray(data.marketplaceOrders)) setMarketplaceOrders(data.marketplaceOrders);
      if (Array.isArray(data.payoutRequests)) setPayoutRequests(data.payoutRequests);
      if (Array.isArray(data.kycSubmissions)) setKycSubmissions(data.kycSubmissions);
      if (Array.isArray(data.postPurchaseSupport))
        setPostPurchaseSubmissions(data.postPurchaseSupport);
      if (Array.isArray(data.vendorApplications)) setVendorApplications(data.vendorApplications);
      if (Array.isArray(data.serviceQuotes)) setServiceQuotes(data.serviceQuotes);
      if (Array.isArray(data.instructorCommissions))
        setInstructorCommissions(data.instructorCommissions);
      if (Array.isArray(data.instructorStoragePurchases))
        setInstructorStoragePurchases(data.instructorStoragePurchases);
      if (Array.isArray(data.stores) && data.stores.length > 0) {
        setStores(data.stores);
        setActiveVendorStore(data.stores[0]);
      }

      // ===== Catalogue et contenu réel (source : base de données) =====
      if (Array.isArray(data.courses)) setCourses(data.courses);
      if (Array.isArray(data.courseCategories) && data.courseCategories.length > 0)
        setCourseCategories(data.courseCategories);
      if (Array.isArray(data.trainingCenters) && data.trainingCenters.length > 0)
        setTrainingCenters(data.trainingCenters);
      if (Array.isArray(data.products)) setMarketplaceProducts(data.products);
      if (Array.isArray(data.servicePackages)) setServices(data.servicePackages);
      if (Array.isArray(data.freelances)) setFreelances(data.freelances);
      if (Array.isArray(data.enterprises)) setEnterprises(data.enterprises);
      if (Array.isArray(data.blogPosts)) setBlogPosts(data.blogPosts);

      setAdminDataLoaded(true);
    } catch (error) {
      console.warn("[Plateforme] Chargement des données admin impossible:", error);
    }
  }, []);

  return { platformLoaded, refreshPlatformData, adminDataLoaded, loadAdminData };
}

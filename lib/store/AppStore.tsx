"use client";

import React, { createContext, useContext, useMemo, useEffect, useCallback, useRef } from "react";
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
  CourseCategoryRecord,
} from "@/lib/types";

import { apiFetchPlatformData, clearPlatformCache, CATALOG_PAGE_SIZE } from "@/lib/services/platformApi";
import { useCommerceDomain } from "@/lib/store/domains/useCommerceDomain";
import { useUiDomain } from "@/lib/store/domains/useUiDomain";
import { useAuthDomain } from "@/lib/store/domains/useAuthDomain";
import { useMarketplaceDomain } from "@/lib/store/domains/useMarketplaceDomain";
import { useCatalogDomain } from "@/lib/store/domains/useCatalogDomain";
import { usePlatformDomain } from "@/lib/store/domains/usePlatformDomain";
import { useBannersDomain } from "@/lib/store/domains/useBannersDomain";
import {
  fetchCatalog,
  fetchCourseDetail,
  fetchAllCourses,
  CATALOG_DEFAULT_LIMIT,
} from "@/lib/services/api/catalog";
import { apiWritePlatform } from "@/lib/services/platformWrite";

import type { AppStoreContextValue } from "./storeTypes";
import {
  CommerceValueContext,
  UiValueContext,
  AuthValueContext,
  MarketplaceValueContext,
  CatalogValueContext,
} from "./domains/contexts";

// Le contrat reste importable depuis AppStore (compatibilité des consommateurs)
export type { AppStoreContextValue };
const AppStoreContext = createContext<AppStoreContextValue | null>(null);

/* Note : ne jamais lire `localStorage` pendant le rendu d'un composant â€”
   cela provoque une divergence entre le HTML serveur et le premier rendu
   client (« Hydration failed »). Toute lecture locale doit se faire dans
   un `useEffect` après le montage (voir la restauration de session). */

export function AppStoreProvider({ children }: { children: React.ReactNode }) {

  // Rafraîchissement des données publiques : indirection stable (le domaine
  // « plateforme » est créé après le catalogue, qui en a besoin).
  const refreshPlatformRef = useRef<() => Promise<void>>(async () => {});
  const refreshPlatform = useCallback(() => refreshPlatformRef.current(), []);

  // ===== DOMAINE « BANNIÈRES DU SITE » (module indépendant) =====
  // Le module possède son endpoint (/api/banners), son cache et son état.
  // Après une écriture, il force le rafraîchissement des données publiques
  // pour que la bannière apparaisse immédiatement sur le site.
  const banners = useBannersDomain({ onSaved: refreshPlatform as (force?: boolean) => void });
  const { setSiteBanners } = banners;
  // ===== DOMAINE « INTERFACE » (lib/store/domains/useUiDomain.ts) =====
  const ui = useUiDomain();
  const {
    setNotifications,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    setIsAdminAuthModalOpen,
  } = ui;

  // ===== DOMAINE « SESSION, COMPTE, KYC, ADMIN » (lib/store/domains/useAuthDomain.ts) =====
  const auth = useAuthDomain({ setNotifications });
  const {
    isUserLoggedIn,
    setIsUserLoggedIn,
    userProfile,
    setUserProfile,
    setSessionChecking,
    setMyOrders,
    setMyNotifications,
    setMyKycSubmissions,
    setKycSubmissions,
    setFeeConfigState,
    setIsAdmin,
    persistUserLearning,
  } = auth;
  // ===== DOMAINE « BOUTIQUE, SERVICES & SOCIAL » (lib/store/domains/useMarketplaceDomain.ts) =====
  const marketplace = useMarketplaceDomain({ userProfile, onSaved: refreshPlatform });
  const {
    services,
    setStores,
    setActiveVendorStore,
    setVendorApplications,
    setMarketplaceOrders,
    setPayoutRequests,
    setMarketplaceConfig,
    setPostPurchaseSubmissions,
    setFreelances,
    setEnterprises,
    setBlogPosts,
    setSiteContent,
    setMarketplaceProducts,
    setServices,
    setServiceQuotes,
  } = marketplace;
  // ===== DOMAINE « ACADÉMIE / CATALOGUE » (lib/store/domains/useCatalogDomain.ts) =====
  const catalog = useCatalogDomain({
    userProfile,
    isUserLoggedIn,
    refreshPlatformData: refreshPlatform,
    setUserProfile,
    persistUserLearning,
  });
  const {
    trainingCenters,
    setTrainingCenters,
    setCatalogTotal,
    setCatalogHasMore,
    setCourses,
    setCourseCategories,
    setInstructorCommissions,
    setInstructorStoragePurchases,
    setInstructorCenter,
  } = catalog;

  // ===== DOMAINE « PANIER & PAIEMENT » (lib/store/domains/useCommerceDomain.ts) =====
  const commerce = useCommerceDomain({
    isUserLoggedIn,
    userProfile,
    setUserProfile,
    setMarketplaceOrders,
  });

  // ===== DOMAINE « PLATEFORME » (lib/store/domains/usePlatformDomain.ts) =====
  const platform = usePlatformDomain({
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
  });
  const { platformLoaded, refreshPlatformData, adminDataLoaded, loadAdminData } = platform;

  // Le domaine « plateforme » est prêt : les actions des autres domaines peuvent
  // désormais déclencher un rafraîchissement réel des données publiques.
  useEffect(() => {
    refreshPlatformRef.current = platform.refreshPlatformData;
  }, [platform.refreshPlatformData]);

  // Valeur mémoïsée du domaine « commerce » : son identité ne change que


  // ======== VALEUR DE LA FAÇADE : UNION DES DOMAINES ====================
  // L'objet exposé n'est plus recopié champ par champ : il est composé par
  // ÉTALEMENT des valeurs de domaine (déjà mémoïsées), puis complété par les
  // champs transverses et les renommages â€” qui priment en cas de doublon.
  const value = useMemo<AppStoreContextValue>(
    () => ({
      ...ui,
      ...auth,
      ...commerce,
      ...marketplace,
      ...catalog,
      ...banners,

      // --- Champs transverses & renommages (hors domaines) ---
      platformLoaded,
      refreshPlatformData,
      adminDataLoaded,
      loadAdminData,
      updateMarketplaceConfig: setMarketplaceConfig,
      setAdmin: setIsAdmin,
      setAdminAuthModalOpen: setIsAdminAuthModalOpen,
    }),
    [
      ui,
      auth,
      commerce,
      marketplace,
      catalog,
      banners,
      platformLoaded,
      refreshPlatformData,
      adminDataLoaded,
      loadAdminData,
    ]
  );

  return (
    <AppStoreContext.Provider value={value}>
      <UiValueContext.Provider value={ui}>
            <AuthValueContext.Provider value={auth}>
                  <MarketplaceValueContext.Provider value={marketplace}>
                        <CatalogValueContext.Provider value={catalog}>
                              <CommerceValueContext.Provider value={commerce}>
                                    {children}
                              </CommerceValueContext.Provider>
                        </CatalogValueContext.Provider>
                  </MarketplaceValueContext.Provider>
            </AuthValueContext.Provider>
      </UiValueContext.Provider>
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore must be used within AppStoreProvider");
  }
  return ctx;
}

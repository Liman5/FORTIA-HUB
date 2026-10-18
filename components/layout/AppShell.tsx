"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import type { Certificate } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BottomNavbar } from "@/components/BottomNavbar";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { AdminAuthModal } from "@/components/AdminAuthModal";
import { CoursePlayerModal } from "@/components/CoursePlayerModal";
import { KycModal } from "@/components/KycModal";
import { VendorApplicationModal } from "@/components/VendorApplicationModal";
import { Sidebar } from "@/components/layout/Sidebar";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { SearchResultsModal } from "@/components/SearchResultsModal";
import { AnimatePresence } from "motion/react";
import { registerServiceWorker } from "@/app/registerServiceWorker";
import { initPwaStore } from "@/lib/pwa/pwaStore";
import { showSystemNotification } from "@/lib/services/appNotifications";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";
  // `/` et `/landing` : la landing marketing historique (sans navbar ni barre du bas)
  const isLandingPage = pathname === "/landing";
  // Pages où la barre de recherche de l'en-tête est MASQUÉE : parcours dédiés
  // (espace membre, prestations de l'agence) — en-tête épuré, sans recherche.
  const hideHeaderSearch = pathname === "/member" || pathname === "/services";
  const store = useAppStore();
  const { activeTab, setActiveTab } = useActiveSection();

  const {
    siteContent,
    cartItems,
    isAdmin,
    setAdmin,
    isUserLoggedIn,
    userProfile,
    sessionChecking,
    logoutUser,
    notifications,
    myNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    isKycModalOpen,
    setKycModalOpen,
    isVendorApplicationModalOpen,
    setVendorApplicationModalOpen,
    feeConfig,
    submitKyc,
    submitVendorApplication,
    addToCart,
    rateCourse,
    recordCourseProgress,
    grantCertificate,
    ensureCourseEnrollment,
    isAdminAuthModalOpen,
    setAdminAuthModalOpen,
    searchQuery,
    setSearchQuery,
    refreshPlatformData,
  } = store;

  // Derive cart count and vendor email
  const cartCount = cartItems.length;

  const router = useRouter();

  /**
   * Connexion / inscription : on NAVIGUE vers les pages dédiées (/login et
   * /register). Plus aucune fenêtre superposée : l'accès a sa propre URL, il
   * est partageable et le bouton « Retour » du navigateur fonctionne.
   */
  const handleOpenAuthModal = (mode: "login" | "signup" = "signup") => {
    if (isUserLoggedIn) return;
    router.push(mode === "login" ? "/login" : "/register");
  };

  // ===== Accès à une formation : obligatoirement payée / achetée =====
  const playerCourse = selectedCourseForPlayer;
  const playerHasAccess =
    !!playerCourse &&
    isUserLoggedIn &&
    !!userProfile &&
    (Number(playerCourse.price) === 0 ||
      (userProfile.enrolledCourseIds || []).includes(playerCourse.id) ||
      (userProfile.purchasedProductIds || []).includes(playerCourse.id) ||
      (store.marketplaceOrders || []).some(
        (o) =>
          (o.productId === playerCourse.id ||
            (o.productTitle || "").toLowerCase() === (playerCourse.title || "").toLowerCase()) &&
          (o.buyerEmail || "").toLowerCase() === (userProfile.email || "").toLowerCase()
      ));

  const handleBuyCourseFromPlayer = () => {
    if (!playerCourse) return;
    addToCart({
      id: playerCourse.id,
      type: "course",
      title: playerCourse.title,
      price: Number(playerCourse.price) || 0,
      image: playerCourse.image || "",
      categoryLabel: playerCourse.categoryLabel,
    });
    setSelectedCourseForPlayer(null);
  };

  // Progression déjà enregistrée + délivrance de l'attestation (compte membre)
  const playerInitialProgress =
    playerCourse && userProfile?.courseProgress ? userProfile.courseProgress[playerCourse.id] || 0 : 0;

  const handleEarnedCertificate = (certificate: Certificate) => {
    if (!playerCourse) return;
    grantCertificate(certificate);
    ensureCourseEnrollment(playerCourse.id);
  };

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  // Confirmation avant déconnexion
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  // Recherche globale : le modal s'ouvre dès que l'utilisateur tape,
  // mais reste fermé après une navigation vers la boutique (le filtre est conservé).
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  // Session locale : lue uniquement APRÈS montage (sinon divergence serveur/client)
  const [hasStoredSession, setHasStoredSession] = React.useState(false);

  React.useEffect(() => {
    try {
      setHasStoredSession(localStorage.getItem("fortia_user_logged_in") === "true");
    } catch {
      setHasStoredSession(false);
    }
  }, []);

  // ===== Recherche globale : ouverture du modal (bouton d'en-tête ou ⌘K) =====
  const openSearch = React.useCallback(() => setIsSearchOpen(true), []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Le raccourci ⌘K/Ctrl+K ne s'active pas là où la recherche est masquée.
      if (hideHeaderSearch) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [hideHeaderSearch]);

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleNavigateFromSearch = () => {
    setIsSearchOpen(false);
  };

  // ===== PWA : initialisation du store d'installation + service worker (mises à jour auto) =====
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    initPwaStore();
    registerServiceWorker();
  }, []);

  // ===== Notifications "comme une app" : rafraîchissement périodique (quasi temps réel) =====
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isUserLoggedIn) {
      // Rafraîchit les données (notifications, commandes…) toutes les 60 secondes
      interval = setInterval(() => {
        refreshPlatformData().catch(() => {});
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUserLoggedIn, refreshPlatformData]);

  // ===== Notifications système quand une nouvelle notification in-app arrive =====
  const seenNotifIdsRef = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const notifList = notifications || [];
    // Marquer silencieusement les notifications existantes au premier chargement
    if (seenNotifIdsRef.current.size === 0) {
      notifList.forEach((n) => n && n.id && seenNotifIdsRef.current.add(n.id));
      return;
    }
    notifList.forEach((n) => {
      if (n && n.id && !n.read && !seenNotifIdsRef.current.has(n.id)) {
        seenNotifIdsRef.current.add(n.id);
        showSystemNotification({
          title: n.title || "FORTIA HUB",
          body: n.message || "",
          tag: n.id,
          data: { linkTab: n.linkTab || "" },
        });
      }
    });
    // Nettoyage des ids qui n'existent plus (notifications supprimées)
    const existingIds = new Set(notifList.map((n) => n.id));
    seenNotifIdsRef.current = new Set(
      [...seenNotifIdsRef.current].filter((id) => existingIds.has(id))
    );
  }, [notifications]);

  return (
    <div className={`min-h-screen bg-[#021231] font-sans antialiased text-slate-100 flex flex-col ${isAdminPage || isLandingPage ? "" : "pb-24 sm:pb-28"}`}>
      {/* Écran de chargement anti-flash : tant que la session n'est pas vérifiée
          (n'affiche jamais « reconnectez-vous » par erreur au rechargement) */}
      {sessionChecking && hasStoredSession && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[#021231]">
          <div className="w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center">
            <span className="block w-6 h-6 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" style={{ animationDuration: "1s" }} />
          </div>
          <p className="text-xs font-bold text-slate-400 animate-pulse">Chargement de votre session…</p>
        </div>
      )}
      {/* Top Navbar - masqué sur la page admin et sur la landing page */}
      {!isAdminPage && !isLandingPage && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isAdmin={isAdmin}
          setIsAdmin={setAdmin}
          onOpenSearch={openSearch}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isUserLoggedIn={isUserLoggedIn}
          userEmail={userProfile.email}
          userName={userProfile.name}
          onLogout={() => setShowLogoutConfirm(true)}
          notifications={myNotifications || []}
          onMarkNotificationAsRead={markNotificationAsRead}
          onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
          onDeleteNotification={deleteNotification}
          siteContent={siteContent}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          isLandingPage={isLandingPage}
          hideSearch={hideHeaderSearch}
        />
      )}

      {/* Sidebar - masqué sur la landing page */}
      {!isAdminPage && !isLandingPage && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isUserLoggedIn={isUserLoggedIn}
          onOpenAuthModal={handleOpenAuthModal}
        />
      )}

      {/* PWA Install Prompt Banner */}
      <PWAInstallBanner />

      {/* Main View Router */}
      {/* Main View Router — isolé : une erreur de page n'emporte plus
          l'en-tête, la navigation ni les modales. */}
      <main className="flex-1">
        <ErrorBoundary variant="page" label="page">
          {children}
        </ErrorBoundary>
      </main>

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAdminAuthModalOpen}
        onClose={() => setAdminAuthModalOpen(false)}
        onSuccess={() => {
          setAdmin(true);
          setActiveTab("admin");
          setAdminAuthModalOpen(false);
        }}
      />

      {/* Course Player Modal */}
      {selectedCourseForPlayer && (
        <CoursePlayerModal
          course={selectedCourseForPlayer}
          onClose={() => setSelectedCourseForPlayer(null)}
          studentName={userProfile.name}
          onRateCourse={(courseId, rating) => rateCourse(courseId, rating)}
          hasAccess={playerHasAccess}
          isLoggedIn={isUserLoggedIn}
          onBuyCourse={handleBuyCourseFromPlayer}
          onRequireLogin={() => handleOpenAuthModal("login")}
          initialProgress={playerInitialProgress}
          onProgressChanged={(pct) => {
            if (playerCourse) {
              recordCourseProgress(playerCourse.id, pct);
              ensureCourseEnrollment(playerCourse.id);
            }
          }}
          onCertificateEarned={handleEarnedCertificate}
          userAccountId={userProfile?.id}
        />
      )}

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setKycModalOpen(false)}
        feeConfig={feeConfig}
        onSubmitKyc={submitKyc}
        userId={userProfile?.id}
      />

      {/* Vendor Application Modal */}
      <VendorApplicationModal
        isOpen={isVendorApplicationModalOpen}
        onClose={() => setVendorApplicationModalOpen(false)}
        onSubmitApplication={submitVendorApplication}
        isLoggedIn={isUserLoggedIn}
        userEmail={userProfile?.email}
        userName={userProfile?.name}
      />

      {/* Le panier ET le paiement sont des PAGES dédiées (/cart, étape 2) :
          plus aucune fenêtre de paiement dans le shell global. */}

      {/* La connexion / l'inscription sont des PAGES dédiées (/login,
          /register) : plus aucune fenêtre superposée ici. */}

      {/* Persistent Bottom Navigation Bar - masqué sur la page admin et sur la landing page */}
      {!isAdminPage && !isLandingPage && (
        <BottomNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUserLoggedIn={isUserLoggedIn}
          onOpenAuthModal={handleOpenAuthModal}
          isLandingPage={isLandingPage}
          cartCount={cartCount}
        />
      )}

      {/* Modal de résultats de recherche globale (barre de recherche navbar → boutique) */}
      {!isAdminPage && !isLandingPage && !hideHeaderSearch && (
        <AnimatePresence>
          {isSearchOpen && (
            <SearchResultsModal
              onClose={handleCloseSearch}
              onNavigate={handleNavigateFromSearch}
            />
          )}
        </AnimatePresence>
      )}

      {/* Robot IA Fortia flottant sur toutes les pages */}
      <FloatingAiAssistant />

      {/* Confirmation de déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center space-y-5 border border-slate-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center">
              <span className="text-red-500 text-2xl">⏻</span>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-[#021231]">Se déconnecter ?</h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Voulez-vous vraiment vous déconnecter de votre compte FORTIA HUB ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="py-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logoutUser();
                }}
                className="py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-700 text-white font-black text-xs shadow-lg shadow-red-500/25 transition hover:brightness-110"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
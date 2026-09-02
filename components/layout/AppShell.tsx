"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import type { Certificate } from "@/lib/types";
import { Navbar } from "@/components/Navbar";
import { BottomNavbar } from "@/components/BottomNavbar";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { AdminAuthModal } from "@/components/AdminAuthModal";
import { CoursePlayerModal } from "@/components/CoursePlayerModal";
import { KycModal } from "@/components/KycModal";
import { VendorApplicationModal } from "@/components/VendorApplicationModal";
import { CheckoutModal } from "@/components/CheckoutModal";
import { PaymentGatewayModal } from "@/components/PaymentGatewayModal";
import { UserAuthModal } from "@/components/UserAuthModal";
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
  const isLandingPage = pathname === "/";
  const store = useAppStore();
  const { activeTab, setActiveTab } = useActiveSection();

  const {
    siteContent,
    cartItems,
    isAdmin,
    setAdmin,
    isUserLoggedIn,
    userProfile,
    logoutUser,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearNotifications,
    openAuthModal,
    setOpenAuthModal,
    authMode,
    setAuthMode,
    loginUser,
    selectedCourseForPlayer,
    setSelectedCourseForPlayer,
    isKycModalOpen,
    setKycModalOpen,
    isVendorApplicationModalOpen,
    setVendorApplicationModalOpen,
    isCartOpen,
    setCartOpen,
    paymentItems,
    setPaymentItems,
    isPaymentGatewayOpen,
    setPaymentGatewayOpen,
    feeConfig,
    submitKyc,
    submitVendorApplication,
    handlePaymentSuccess,
    addSupportSubmission,
    addToCart,
    removeFromCart,
    clearCart,
    rateCourse,
    recordCourseProgress,
    grantCertificate,
    ensureCourseEnrollment,
    activeVendorStore,
    selectedStore,
    isAdminAuthModalOpen,
    setAdminAuthModalOpen,
    searchQuery,
    setSearchQuery,
    refreshPlatformData,
  } = store;

  // Derive cart count and vendor email
  const cartCount = cartItems.length;
  const vendorEmail =
    selectedStore?.ownerEmail || activeVendorStore?.ownerEmail || "vendeur@fortiahub.com";

  const handleOpenAuthModal = (mode: "login" | "signup" = "signup") => {
    if (isUserLoggedIn) return;
    setAuthMode(mode);
    setOpenAuthModal(true);
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

  // Recherche globale : le modal s'ouvre dès que l'utilisateur tape,
  // mais reste fermé après une navigation vers la boutique (le filtre est conservé).
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  React.useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 0) {
      setIsSearchOpen(true);
    }
  }, [searchQuery]);

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
      {/* Top Navbar - masqué sur la page admin et sur la landing page */}
      {!isAdminPage && !isLandingPage && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartCount={cartCount}
          setIsCartOpen={() => setCartOpen(true)}
          isAdmin={isAdmin}
          setIsAdmin={setAdmin}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onOpenAuthModal={handleOpenAuthModal}
          isUserLoggedIn={isUserLoggedIn}
          userEmail={userProfile.email}
          userName={userProfile.name}
          onLogout={logoutUser}
          notifications={notifications}
          onMarkNotificationAsRead={markNotificationAsRead}
          onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
          onDeleteNotification={deleteNotification}
          siteContent={siteContent}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          isLandingPage={isLandingPage}
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
      <main className="flex-1">{children}</main>

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

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onAddSupportSubmission={addSupportSubmission}
        vendorEmail={vendorEmail}
        onPaymentSuccess={handlePaymentSuccess}
        buyerUserId={userProfile?.id}
        marketplaceProducts={store.marketplaceProducts}
        stores={store.stores}
        onOpenPaymentGateway={(items) => {
          setPaymentItems(items);
          setCartOpen(false);
          setPaymentGatewayOpen(true);
        }}
      />

      {/* Multi-Method Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={isPaymentGatewayOpen}
        onClose={() => setPaymentGatewayOpen(false)}
        cartItems={paymentItems.length > 0 ? paymentItems : cartItems}
        totalAmountUsd={paymentItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0)}
        onPaymentSuccess={handlePaymentSuccess}
        onAddSupportSubmission={addSupportSubmission}
        vendorEmail={vendorEmail}
        buyerUserId={userProfile?.id}
        marketplaceProducts={store.marketplaceProducts}
        stores={store.stores}
      />

      {/* Mandatory User Registration & Login Auth Modal */}
      <UserAuthModal
        isOpen={openAuthModal}
        onClose={() => setOpenAuthModal(false)}
        initialMode={authMode}
        onLoginSuccess={loginUser}
      />

      {/* Persistent Bottom Navigation Bar - masqué sur la page admin et sur la landing page */}
      {!isAdminPage && !isLandingPage && (
        <BottomNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUserLoggedIn={isUserLoggedIn}
          onOpenAuthModal={handleOpenAuthModal}
          isLandingPage={isLandingPage}
        />
      )}

      {/* Modal de résultats de recherche globale (barre de recherche navbar → boutique) */}
      {!isAdminPage && !isLandingPage && (
        <AnimatePresence>
          {isSearchOpen && searchQuery && searchQuery.trim().length > 0 && (
            <SearchResultsModal
              onClose={handleCloseSearch}
              onNavigate={handleNavigateFromSearch}
            />
          )}
        </AnimatePresence>
      )}

      {/* Robot IA Fortia flottant sur toutes les pages */}
      <FloatingAiAssistant />
    </div>
  );
}
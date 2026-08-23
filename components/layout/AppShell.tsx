"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
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

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname === "/admin";
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
    removeFromCart,
    clearCart,
    rateCourse,
    activeVendorStore,
    selectedStore,
    isAdminAuthModalOpen,
    setAdminAuthModalOpen,
  } = store;

  // Search query state (persisted locally in this shell)
  const [localSearchQuery, setLocalSearchQuery] = React.useState("");

  // Derive cart count and vendor email
  const cartCount = cartItems.length;
  const vendorEmail =
    selectedStore?.ownerEmail || activeVendorStore?.ownerEmail || "vendeur@fortiahub.com";

  const handleOpenAuthModal = (mode: "login" | "signup" = "signup") => {
    if (isUserLoggedIn) return;
    setAuthMode(mode);
    setOpenAuthModal(true);
  };

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className={`min-h-screen bg-[#021231] font-sans antialiased text-slate-100 flex flex-col ${isAdminPage ? "" : "pb-24 sm:pb-28"}`}>
      {/* Top Navbar - masqué sur la page admin */}
      {!isAdminPage && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          cartCount={cartCount}
          setIsCartOpen={() => setCartOpen(true)}
          isAdmin={isAdmin}
          setIsAdmin={setAdmin}
          searchQuery={localSearchQuery}
          setSearchQuery={setLocalSearchQuery}
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
        />
      )}

      {/* Sidebar */}
      {!isAdminPage && (
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

      {/* Persistent Bottom Navigation Bar - masqué sur la page admin */}
      {!isAdminPage && (
        <BottomNavbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUserLoggedIn={isUserLoggedIn}
          onOpenAuthModal={handleOpenAuthModal}
        />
      )}

      {/* Robot IA Fortia flottant sur toutes les pages */}
      <FloatingAiAssistant />
    </div>
  );
}
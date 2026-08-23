"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, AdminModuleKey } from "./AdminSidebar";
import { AdminStatsModule } from "./AdminStatsModule";
import { AdminDashboard } from "@/components/AdminDashboard";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { Menu } from "lucide-react";

/**
 * AdminModernPage - Nouveau panneau d'administration moderne
 * - Header avec horloge temps réel, mode nuit, notifications, déconnexion
 * - Sidebar avec navigation par modules
 * - Module Statistiques Globales avec charts SVG
 * - Modules existants (formations, produits, etc.) rendus via AdminDashboard
 */
export function AdminModernPage() {
  const router = useRouter();
  const store = useAppStore();
  const [activeModule, setActiveModule] = useState<AdminModuleKey>("stats");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    isAdmin,
    logoutUser,
    notifications,
    markAllNotificationsAsRead,
    courses,
    marketplaceProducts,
    services,
    serviceQuotes,
    feeConfig,
    setFeeConfig,
    kycSubmissions,
    approveKyc,
    addCourse,
    updateCourse,
    deleteCourse,
    addProduct,
    updateProduct,
    deleteProduct,
    siteContent,
    updateSiteContent,
    stores,
    deleteStore,
    vendorApplications,
    marketplaceOrders,
    payoutRequests,
    marketplaceConfig,
    postPurchaseSubmissions,
    deleteSupportSubmission,
    approveStore,
    suspendStore,
    approveVendorApplication,
    rejectVendorApplication,
    approvePayout,
    updateMarketplaceConfig,
    trainingCenters,
    instructorCommissions,
    instructorStoragePurchases,
    adminAddInstructor,
    suspendInstructorCourse,
    deleteInstructorCourse,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
  } = store;

  if (!isAdmin) {
    return (
      <div className="py-20 px-4 bg-[#021231] text-white text-center space-y-4 min-h-[500px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-[#D69E25] text-[#D69E25] flex items-center justify-center mb-2">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-black">Espace Administration Sécurisé</h2>
        <p className="text-xs text-slate-400 max-w-md">
          L'accès à cette section est strictement réservé aux administrateurs autorisés
          de FORTIA HUB. Veuillez vous authentifier pour continuer.
        </p>
      </div>
    );
  }

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  const handleOpenNotifications = () => {
    router.push("/notifications");
  };

  // Badges pour la sidebar
  const pendingKyc = kycSubmissions.filter((k) => String(k.status).includes("ttente")).length;
  const pendingVendors = vendorApplications.filter((a) => String(a.status).includes("ttente")).length;
  const pendingPayouts = payoutRequests.filter((p) => String(p.status).includes("ttente")).length;
  const pendingSupport = postPurchaseSubmissions.filter(
    (s) => String(s.status).includes("n cours") || String(s.status).includes("Transmis")
  ).length;
  const pendingQuotes = serviceQuotes.filter(
    (q) => String(q.status).includes("Reç") || String(q.status).includes("En cours")
  ).length;

  const badges: Partial<Record<AdminModuleKey, number>> = {
    kyc: pendingKyc,
    marketplace: pendingVendors + pendingPayouts,
    support: pendingSupport,
    devis: pendingQuotes,
  };

  // Mapping AdminModuleKey -> ancien activeTab AdminDashboard
  const moduleToLegacyTab: Record<AdminModuleKey, "stats" | "site_content" | "courses" | "products" | "services" | "quotes" | "kyc" | "fees" | "marketplace" | "support" | "instructors"> = {
    stats: "stats",
    formations: "courses",
    produits: "products",
    services: "services",
    marketplace: "marketplace",
    support: "support",
    formateurs: "instructors",
    kyc: "kyc",
    devis: "quotes",
    frais: "fees",
    cms: "site_content",
  };

  const MODULE_TITLES: Record<AdminModuleKey, { title: string; subtitle: string }> = {
    stats: { title: "Statistiques Globales", subtitle: "Vue d'ensemble de toute la plateforme FORTIA HUB" },
    formations: { title: "Gestion des Formations", subtitle: "Catalogue des formations certifiantes de l'académie" },
    produits: { title: "Gestion des Produits Numériques", subtitle: "Produits digitaux disponibles sur la marketplace" },
    services: { title: "Services Agence", subtitle: "Packages de services proposés par l'agence FORTIA" },
    marketplace: { title: "Marketplace & Vendeurs", subtitle: "Boutiques, candidatures, retraits et commissions" },
    support: { title: "Support Post-Achat", subtitle: "Demandes de support des clients après achat" },
    formateurs: { title: "Gestion des Formateurs", subtitle: "Centres de formation autonomes et commissions" },
    kyc: { title: "Vérifications KYC", subtitle: "Validation des badges freelance et entreprise" },
    devis: { title: "Demandes de Devis", subtitle: "Devis reçus pour les services de l'agence" },
    frais: { title: "Paramétrage des Frais", subtitle: "Configuration des frais d'inscription KYC" },
    cms: { title: "Contenu du Site (CMS)", subtitle: "Éditeur de contenu temps réel pour le site" },
  };

  const currentMeta = MODULE_TITLES[activeModule];

  return (
    <div className="min-h-screen bg-[#021231] text-white">
      {/* Header admin avec horloge temps réel */}
      <AdminHeader
        notifications={notifications}
        onMarkAllNotificationsAsRead={markAllNotificationsAsRead}
        onOpenNotifications={handleOpenNotifications}
        onLogout={handleLogout}
      />

      {/* Bouton menu mobile pour la sidebar */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 rounded-xl bg-[#D69E25] text-[#021231] shadow-2xl border border-amber-300"
        title="Ouvrir la navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex">
        {/* Sidebar modules */}
        <AdminSidebar
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          badges={badges}
        />

        {/* Contenu principal */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* En-tête de module */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{currentMeta.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{currentMeta.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              {activeModule === "formations" && (
                <button
                  onClick={() => {
                    const dash = document.querySelector("[data-admin-actions]");
                    // Déclenche l'ajout via le state local du dashboard
                    window.dispatchEvent(new CustomEvent("admin:add-course"));
                  }}
                  className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 shadow-lg"
                >
                  <span className="text-base leading-none">+</span> Ajouter une Formation
                </button>
              )}
              {activeModule === "produits" && (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("admin:add-product"))}
                  className="px-4 py-2.5 bg-[#D69E25] text-[#021231] font-bold text-xs rounded-xl hover:bg-amber-400 transition flex items-center gap-2 shadow-lg"
                >
                  <span className="text-base leading-none">+</span> Ajouter un Produit
                </button>
              )}
            </div>
          </div>

          {/* Rendu du module actif */}
          {activeModule === "stats" ? (
            <AdminStatsModule
              courses={courses}
              digitalProducts={marketplaceProducts as any}
              serviceQuotes={serviceQuotes}
              kycSubmissions={kycSubmissions}
              stores={stores}
              marketplaceOrders={marketplaceOrders}
              payoutRequests={payoutRequests}
              vendorApplications={vendorApplications}
              services={services}
              postPurchaseSubmissions={postPurchaseSubmissions}
              trainingCenters={trainingCenters}
              instructorCommissions={instructorCommissions}
            />
          ) : (
            <div className="bg-[#011D46] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <AdminDashboard
                key={activeModule}
                hideShell
                initialTab={moduleToLegacyTab[activeModule]}
                courses={courses}
                digitalProducts={marketplaceProducts as any}
                serviceQuotes={serviceQuotes}
                services={services}
                onAddService={addService}
                onUpdateService={updateService}
                onDeleteService={deleteService}
                onToggleServiceActive={toggleServiceActive}
                feeConfig={feeConfig}
                onUpdateFeeConfig={setFeeConfig}
                kycSubmissions={kycSubmissions}
                onApproveKyc={approveKyc}
                onAddCourse={addCourse}
                onUpdateCourse={updateCourse}
                onAddProduct={addProduct}
                onUpdateProduct={updateProduct}
                onDeleteProduct={deleteProduct}
                siteContent={siteContent}
                onUpdateSiteContent={updateSiteContent}
                stores={stores}
                onDeleteStore={deleteStore}
                vendorApplications={vendorApplications}
                marketplaceOrders={marketplaceOrders}
                payoutRequests={payoutRequests}
                marketplaceConfig={marketplaceConfig}
                postPurchaseSubmissions={postPurchaseSubmissions}
                onDeleteSupportSubmission={deleteSupportSubmission}
                onApproveStore={approveStore}
                onSuspendStore={suspendStore}
                onApproveVendorApplication={approveVendorApplication}
                onRejectVendorApplication={rejectVendorApplication}
                onApprovePayout={approvePayout}
                onUpdateMarketplaceConfig={updateMarketplaceConfig}
                trainingCenters={trainingCenters}
                instructorCommissions={instructorCommissions}
                instructorStoragePurchases={instructorStoragePurchases}
                onAddInstructor={adminAddInstructor}
                onSuspendCourse={suspendInstructorCourse}
                onDeleteCourse={deleteInstructorCourse}
              />
            </div>
          )}
        </main>
      </div>

      {/* Robot IA Fortia flottant sur la page admin */}
      <FloatingAiAssistant />
    </div>
  );
}

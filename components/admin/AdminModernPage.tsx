"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, AdminModuleKey } from "./AdminSidebar";
import { AdminStatsModule } from "./AdminStatsModule";
import { AdminCourseCategoriesPanel } from "./AdminCourseCategoriesPanel";
import { AdminBannersPanel } from "./AdminBannersPanel";
import { AdminVendorVerificationsPanel } from "./AdminVendorVerificationsPanel";
import { AdminAdminsPanel } from "./AdminAdminsPanel";
import { AdminBlogPanel } from "./AdminBlogPanel";
import { normalizeAdminRole } from "@/lib/server/adminRoles";
import { AdminDashboard } from "@/components/AdminDashboard";
import { FloatingAiAssistant } from "@/components/FloatingAiAssistant";
import { Menu, Lock, ShieldCheck } from "lucide-react";

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
  // Connexion administrateur affichée directement sur la page /admin
  // (cette page n'est pas enveloppée dans AppShell : la fenêtre globale n'y existe pas).
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Charge les données sensibles (commandes, KYC, retraits, support…) via
  // l'endpoint protégé : elles ne sont plus incluses dans le sync public.
  // Charge aussi le catalogue COMPLET (brouillons inclus) : l'administration
  // doit voir toutes les formations, pas seulement la première page.
  React.useEffect(() => {
    store.loadAdminData();
    store.loadAllCourses();
  }, [store.loadAdminData, store.loadAllCourses]);

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
    courseCategories,
    addCourseCategory,
    updateCourseCategory,
    deleteCourseCategory,
    toggleCourseFeatured,
    instructorCommissions,
    instructorStoragePurchases,
    adminAddInstructor,
    suspendInstructorCourse,
    deleteInstructorCourse,
    addService,
    updateService,
    deleteService,
    toggleServiceActive,
    siteBanners,
    addBanner,
    updateBanner,
    deleteBanner,
    toggleBannerActive,
    blogPosts,
    setBlogPosts,
  } = store;

  // Session administrateur confirmée → (re)charge les collections réservées
  // et récupère le RÔLE (seul un superadmin gère les comptes administrateurs).
  const [adminRole, setAdminRole] = React.useState("");

  React.useEffect(() => {
    if (!isAdmin) return;
    let token = "";
    try {
      token = localStorage.getItem("fortia_admin_token") || "";
    } catch {}
    fetch("/api/admin/session", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json?.isAdmin) setAdminRole(String(json.admin?.role || ""));
      })
      .catch(() => {});
    store.loadAdminData();
  }, [isAdmin, store.loadAdminData]);

  // Superadministrateur ? (comparaison normalisée : superadmin, super_admin…)
  const roleKey = normalizeAdminRole(adminRole);
  const canManageAdmins = roleKey === "superadmin";

  // Modules visibles selon le profil :
  //   superviseur / général / superadmin → tous (le serveur refuse les écritures
  //   du superviseur) ; financier → finance ; vérificateur KYC → KYC.
  const allowedModules: AdminModuleKey[] | undefined =
    roleKey === "financier"
      ? ["stats", "marketplace", "devis", "frais"]
      : roleKey === "kyc"
        ? ["stats", "kyc"]
        : undefined;

  const isReadOnlyRole = roleKey === "superviseur";

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
          L&apos;accès à cette section est strictement réservé aux administrateurs autorisés
          de FORTIA HUB. Veuillez vous authentifier pour continuer.
        </p>

        {/* ===== CONNEXION ADMINISTRATEUR (directement sur la page) =====
            La page /admin n'est pas enveloppée dans AppShell : la fenêtre de
            connexion globale n'y est pas montée. Le formulaire est donc ici,
            visible sans aucun clic. */}
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setLoginError("");
            setLoginLoading(true);
            try {
              const res = await fetch("/api/admin/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: loginEmail.trim().toLowerCase(),
                  password: loginPassword,
                }),
              });
              const json = await res.json().catch(() => null);
              if (!res.ok || !json?.token) {
                setLoginError(json?.error || "Identifiants administrateur invalides.");
                return;
              }
              try {
                localStorage.setItem("fortia_admin_token", json.token);
              } catch {}
              setLoginPassword("");
              store.setAdmin(true);
              store.setAdminAuthModalOpen(false);
            } catch {
              setLoginError("Connexion au serveur impossible. Vérifiez le réseau puis réessayez.");
            } finally {
              setLoginLoading(false);
            }
          }}
          className="w-full max-w-sm bg-[#011D46] border border-[#D69E25]/40 rounded-2xl p-5 space-y-3 text-left"
        >
          <div className="flex items-center gap-2 pb-1">
            <ShieldCheck className="w-4 h-4 text-[#D69E25]" />
            <span className="text-[11px] font-black text-[#D69E25] uppercase tracking-wider">
              Connexion administrateur
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Adresse e-mail administrateur
            </label>
            <input
              type="email"
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="admin@fortia-hub.com"
              autoComplete="username"
              className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-[#021231] border border-slate-700 text-sm rounded-xl p-3 text-white focus:outline-none focus:border-[#D69E25]"
            />
          </div>

          {loginError && (
            <p className="text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">
              {loginError}
            </p>
          )}

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-3 bg-[#D69E25] text-[#021231] font-black text-xs rounded-xl hover:bg-amber-400 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>{loginLoading ? "Connexion…" : "Se connecter"}</span>
          </button>
        </form>
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
    // Le module « Bannières du Site » rend SON PROPRE panneau : la valeur de
    // repli ci-dessous n'est jamais utilisée (AdminDashboard n'est pas monté
    // pour ce module) — aucune intégration au CMS.
    bannieres: "site_content",
    // Le module « Vérification Boutique » rend son propre panneau.
    boutiques: "marketplace",
    marketplace: "marketplace",
    support: "support",
    formateurs: "instructors",
    kyc: "kyc",
    devis: "quotes",
    frais: "fees",
    cms: "site_content",
    // Le module « Administrateurs » rend son propre panneau (aucun onglet CMS).
    admins: "site_content",
    blog: "site_content",
  };

  const MODULE_TITLES: Record<AdminModuleKey, { title: string; subtitle: string }> = {
    stats: { title: "Statistiques Globales", subtitle: "Vue d'ensemble de toute la plateforme FORTIA HUB" },
    formations: { title: "Gestion des Formations", subtitle: "Catalogue des formations certifiantes de l'académie" },
    produits: { title: "Gestion des Produits Numériques", subtitle: "Produits digitaux disponibles sur la marketplace" },
    services: { title: "Services Agence", subtitle: "Packages de services proposés par l'agence FORTIA" },
    bannieres: {
      title: "Bannières du Site",
      subtitle: "Bandeau animé du haut de site : image R2, animation, bouton (lien interne/externe) et durée d'affichage",
    },
    marketplace: { title: "Marketplace & Vendeurs", subtitle: "Boutiques actives, retraits et commissions" },
    boutiques: {
      title: "Vérification Boutique",
      subtitle: "Candidatures vendeurs : informations complètes et décision d'approbation",
    },
    support: { title: "Support Post-Achat", subtitle: "Demandes de support des clients après achat" },
    formateurs: { title: "Gestion des Formateurs", subtitle: "Centres de formation autonomes et commissions" },
    kyc: { title: "Vérifications KYC", subtitle: "Validation des badges freelance et entreprise" },
    devis: { title: "Demandes de Devis", subtitle: "Devis reçus pour les services de l'agence" },
    frais: { title: "Paramétrage des Frais", subtitle: "Configuration des frais d'inscription KYC" },
    cms: { title: "Contenu du Site (CMS)", subtitle: "Éditeur de contenu temps réel pour le site" },
    admins: {
      title: "Comptes administrateurs",
      subtitle: "Création des admins par le superadministrateur · mot de passe unique par compte · superadmin insupprimable",
    },
    blog: {
      title: "Blog & Articles",
      subtitle: "Publication d'articles : image facultative, couleur d'accent, style de vignette et visibilité",
    },
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
          allowAdmins={canManageAdmins}
          allowedModules={allowedModules}
        />

        {/* Contenu principal */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Profil SUPERviseur : lecture seule (le serveur refuse toute écriture) */}
          {isReadOnlyRole && (
            <div className="flex items-center gap-3 bg-[#D69E25]/10 border border-[#D69E25]/40 rounded-2xl px-4 py-3">
              <ShieldCheck className="w-4 h-4 text-[#D69E25] shrink-0" />
              <p className="text-[11px] font-bold text-[#D69E25]">
                Profil superviseur : consultation uniquement. Aucune modification, suppression ni
                téléversement n&apos;est autorisé.
              </p>
            </div>
          )}

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
          ) : activeModule === "bannieres" ? (
            /* ===== MODULE INDÉPENDANT : BANNIÈRES DU SITE =====
               Panneau dédié — aucun passage par le tableau de bord CMS. */
            <AdminBannersPanel
              banners={siteBanners}
              onAdd={addBanner}
              onUpdate={updateBanner}
              onDelete={deleteBanner}
              onToggleActive={toggleBannerActive}
            />
          ) : activeModule === "blog" ? (
            /* ===== MODULE INDÉPENDANT : BLOG & ARTICLES ===== */
            <AdminBlogPanel
              posts={blogPosts}
              onPostsChange={(next) => setBlogPosts(next as any)}
              onRefresh={() => store.refreshPlatformData?.()}
            />
          ) : activeModule === "boutiques" ? (
            /* ===== MODULE INDÉPENDANT : VÉRIFICATION BOUTIQUE =====
               Candidatures vendeurs isolées de Marketplace, avec toutes les
               informations du candidat avant approbation. */
            <AdminVendorVerificationsPanel />
          ) : activeModule === "admins" ? (
            /* ===== COMPTES ADMINISTRATEURS (superadmin uniquement) ===== */
            <AdminAdminsPanel />
          ) : (
            <>
              {/* Catégories de formations : créées/modifiées en base */}
              {activeModule === "formations" && (
                <AdminCourseCategoriesPanel
                  categories={courseCategories}
                  courses={courses as any}
                  onAdd={addCourseCategory}
                  onUpdate={updateCourseCategory}
                  onDelete={deleteCourseCategory}
                />
              )}

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
                onToggleFeatured={toggleCourseFeatured}
              />
              </div>
            </>
          )}
        </main>
      </div>

      {/* Robot IA Fortia flottant sur la page admin */}
      <FloatingAiAssistant />
    </div>
  );
}

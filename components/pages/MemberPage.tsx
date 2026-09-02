"use client";

import React from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { MemberDashboard } from "@/components/MemberDashboard";
import { ProviderProfileManager } from "@/components/ProviderProfileManager";
import { Lock, Building2 } from "lucide-react";

export function MemberPage({ initialTab }: { initialTab?: "settings" | "progress" }) {
  const {
    isUserLoggedIn,
    userProfile,
    sessionChecking,
    courses,
    marketplaceProducts,
    stores,
    marketplaceOrders,
    trainingCenters,
    freelances,
    enterprises,
    kycSubmissions,
    myKycSubmissions,
    myOrders,
    isKycModalOpen,
    setKycModalOpen,
    logoutUser,
    setSelectedCourseForPlayer,
    setOpenAuthModal,
    setAuthMode,
    loginUser,
    refreshPlatformData,
  } = useAppStore();
  const { setActiveTab } = useActiveSection();

  // Profil Freelance / Entreprise du membre connecté (après approbation KYC)
  // userId est renvoyé par la base même si absent du type TS → cast via any
  const myFreelance = (freelances || []).find((f) => (f as any).userId === userProfile?.id || f.id === userProfile?.id);
  const myEnterprise = (enterprises || []).find((e) => (e as any).userId === userProfile?.id || e.id === userProfile?.id);
  const isProviderApproved = !!myFreelance || !!myEnterprise;

  // Dernière demande KYC de l'utilisateur connecté (source serveur /api/me d'abord)
  const kycSource = myKycSubmissions && myKycSubmissions.length > 0 ? myKycSubmissions : kycSubmissions || [];
  const myKyc = kycSource.find(
    (k) =>
      (k.applicantId && userProfile?.id && k.applicantId === userProfile.id) ||
      (userProfile?.email && k.email && k.email.toLowerCase() === userProfile.email.toLowerCase())
  );
  const kycStatus = String(myKyc?.status || "");
  const kycPending = !!myKyc && (kycStatus === "En attente" || kycStatus === "En_attente");
  const kycApproved = isProviderApproved || (!!myKyc && (kycStatus === "Approuvé" || kycStatus === "Approuve"));
  const kycRejected = !!myKyc && (kycStatus === "Rejeté" || kycStatus === "Rejete");

  // Boutique du vendeur connecté (par email) — l'accès au dashboard vendeur n'est
  // accordé que si la boutique est réellement approuvée (statut "active").
  const ownedStores = userProfile?.email
    ? stores.filter(
        (s) =>
          (s.ownerEmail === userProfile.email || s.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase())
      )
    : [];
  const myApprovedStore = ownedStores.find((s) => s.status === "active") || null;
  const myPendingStore = ownedStores.find((s) => s.status === "pending") || null;

  // Centre de formation du membre connecté
  const hasTrainingCenter = (trainingCenters || []).some((c) => c.ownerId === userProfile?.id);

  // Pendant la vérification de session, on n'affiche JAMAIS « reconnectez-vous »
  if (sessionChecking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center">
          <span className="block w-6 h-6 border-2 border-[#D69E25] border-t-transparent rounded-full animate-spin" style={{ animationDuration: "1s" }} />
        </div>
        <p className="text-xs font-bold text-slate-400 animate-pulse">Chargement de votre session…</p>
      </div>
    );
  }

  if (!isUserLoggedIn) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Mon Compte FORTIA HUB</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
              Veuillez vous connecter pour accéder à votre tableau de bord, vos formations
              achetées, vos attestations et paramètres.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2 justify-center">
            <button
              onClick={() => {
                setAuthMode("login");
                setOpenAuthModal(true);
              }}
              className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer"
            >
              Se Connecter à Mon Compte
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setOpenAuthModal(true);
              }}
              className="px-6 py-3 border-2 border-[#D69E25] text-[#D69E25] font-black rounded-xl text-xs hover:bg-[#D69E25]/10 transition cursor-pointer"
            >
              Créer un Compte Gratuit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Bannière bouton accès boutique approuvée */}
            {/* Banniere suivi KYC */}
      {(kycPending || kycRejected) && !kycApproved && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border bg-amber-500/10 border-amber-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-black text-white">
                  {kycRejected ? "Votre demande KYC a ete rejetee" : "Votre demande KYC est en cours de traitement"}
                </p>
                <p className="text-[11px] text-slate-300">
                  {kycRejected
                    ? "Veuillez soumettre un nouveau dossier corrige pour obtenir votre badge certifie."
                    : "Notre equipe verifie votre dossier. Vous serez notifie des son approbation."}
                </p>
              </div>
            </div>
            <button
              onClick={() => setKycModalOpen(true)}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-[#021231] font-black text-xs rounded-xl transition shadow-lg flex items-center gap-2"
            >
              <Building2 className="w-4 h-4" />
              <span>{kycRejected ? "Resoumettre un Dossier KYC" : "Suivre ma Demande KYC"}</span>
            </button>
          </div>
        </div>
      )}

      <MemberDashboard
        user={userProfile}
        onOpenVendor={() => setActiveTab("vendor")}
        onOpenInstructor={() => setActiveTab("instructor")}
        providerProfileManager={isProviderApproved || kycApproved ? (
          <ProviderProfileManager
            user={userProfile}
            freelance={myFreelance || null}
            enterprise={myEnterprise || null}
            onSaved={refreshPlatformData}
          />
        ) : null}
        isProviderApproved={isProviderApproved || kycApproved}
        providerTypeLabel={myFreelance ? "Freelance" : myEnterprise ? "Entreprise" : "Freelance"}
        hasApprovedStore={!!myApprovedStore}
        hasPendingStore={!!myPendingStore}
        onOpenKyc={() => setKycModalOpen(true)}
        badgeType={myFreelance?.badge || myEnterprise ? "gold" : (myFreelance as any)?.badge || undefined}
        courses={courses}
        digitalProducts={marketplaceProducts as any}
        orders={myOrders as any}
        marketplaceProducts={marketplaceProducts as any}
        onOpenCourse={(course) => setSelectedCourseForPlayer((course as any) || null)}
        onLogout={logoutUser}
        onUpdateProfile={(updates) => loginUser(updates as any)}
        initialTab={initialTab || "progress"}
      />
    </>
  );
}
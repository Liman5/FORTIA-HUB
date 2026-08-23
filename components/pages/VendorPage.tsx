"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { VendorDashboard } from "@/components/VendorDashboard";
import { Lock } from "lucide-react";

function getStoreSlug(store: { slug?: string; name?: string }): string {
  const base = store.slug && store.slug.trim() ? store.slug : (store.name || "boutique");
  return base.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "boutique";
}

export function VendorPage() {
  const {
    isUserLoggedIn,
    userProfile,
    stores,
    activeVendorStore,
    marketplaceProducts,
    marketplaceOrders,
    payoutRequests,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStore,
    requestPayout,
    openStore,
    setOpenAuthModal,
    setAuthMode,
  } = useAppStore();

  const { setActiveTab } = useActiveSection();
  const router = useRouter();

  if (!isUserLoggedIn) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">
              Espace Vendeur Réservé aux Membres
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
              Veuillez vous connecter à votre compte pour gérer votre boutique, publier vos
              e-books et suivre vos commandes.
            </p>
          </div>
          <button
            onClick={() => {
              setAuthMode("login");
              setOpenAuthModal(true);
            }}
            className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer"
          >
            Se Connecter à Mon Compte
          </button>
        </div>
      </div>
    );
  }

  // === Boutique du vendeur CONNECTÉ (par email) : prioritaire sur la 1ère boutique ===
  const myStore =
    (userProfile?.email &&
      (stores.find((s) => s.ownerEmail === userProfile.email) ||
        stores.find((s) => s.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase()))) ||
    activeVendorStore;

  // Si l'utilisateur est connecté mais n'a PAS encore de boutique approuvée
  if (!myStore?.id && !stores.some((s) => s.ownerEmail === userProfile?.email)) {
    return (
      <div className="py-16 px-4 max-w-2xl mx-auto text-center space-y-6">
        <div className="p-8 sm:p-10 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">Aucune boutique approuvée</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-lg mx-auto">
              Vous n'avez pas encore de boutique active sur FORTIA HUB. Soumettez une candidature vendeur depuis la
              page Marketplace, puis attendez l'approbation de l'administration. Une notification vous préviendra
              dès que votre boutique sera approuvée.
            </p>
          </div>
          <button
            onClick={() => setActiveTab("marketplace")}
            className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer"
          >
            Devenir Vendeur
          </button>
        </div>
      </div>
    );
  }

  return (
    <VendorDashboard
      store={myStore}
      products={marketplaceProducts.filter(
        (p) => p.storeId === myStore.id || p.storeName === myStore.name
      )}
      orders={marketplaceOrders.filter(
        (o) => o.storeId === myStore.id || o.storeName === myStore.name
      )}
      payoutRequests={payoutRequests.filter(
        (p) => p.storeId === myStore.id || p.storeName === myStore.name
      )}
      onAddProduct={addProduct}
      onUpdateProduct={updateProduct}
      onDeleteProduct={deleteProduct}
      onUpdateStore={updateStore}
      onRequestPayout={requestPayout}
      onViewPublicStore={() => {
        router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(myStore))}`);
      }}
    />
  );
}

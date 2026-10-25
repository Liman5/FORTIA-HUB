"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/AppStore";
import { useMarketplace, useCommerce, useAuth, useUi } from "@/lib/store/domains/contexts";
import { DigitalShop } from "@/components/DigitalShop";
import { FreelanceMarketplace } from "@/components/FreelanceMarketplace";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";
import {
  ShoppingBag,
  Users,
  Building2,
  Loader2,
} from "lucide-react";

function getStoreSlug(store: { slug?: string; name?: string }): string {
  const base = store.slug && store.slug.trim() ? store.slug : (store.name || "boutique");
  return base.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "boutique";
}

export function MarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
    const { setVendorApplicationModalOpen, setKycModalOpen, searchQuery, setSearchQuery } = useUi();
  const { isAdmin, isUserLoggedIn, feeConfig, userProfile } = useAuth();
  const { marketplaceProducts, stores, deleteProduct, updateProduct, selectedStore, freelances, enterprises, vendorApplications } = useMarketplace();
  const { addToCart, orderService } = useCommerce();
  const { platformLoaded } = useAppStore();

  /* ----- Statut réel du compte : boutons d'inscription masqués si déjà validé ----- */
  const myEmail = (userProfile?.email || "").toLowerCase();
  const myStores = myEmail
    ? stores.filter((s) => (s.ownerEmail || "").toLowerCase() === myEmail)
    : [];
  const hasApprovedStore = myStores.some((s) => s.status === "active");
  const hasPendingStore = myStores.some((s) => s.status === "pending");
  const hasPendingApplication = (vendorApplications || []).some(
    (a) => (a.email || "").toLowerCase() === myEmail && a.status === "En attente"
  );
  // Bouton « Ouvrir ma Boutique » : masqué si boutique validée/en attente ou
  // candidature en cours ; il RÉAPPARAÎT si la candidature a été rejetée.
  const hideVendorCta = !!myEmail && (hasApprovedStore || hasPendingStore || hasPendingApplication);
  const kycVerified =
    userProfile?.kycStatus === "approuve" ||
    userProfile?.badge === "green" ||
    userProfile?.badge === "gold";

  const [activeSection, setActiveSection] = useState<"shop" | "freelance" | "enterprise">("shop");

  /* ----- Onglet et filtre pilotés par l'URL (?section=…&type=…) ----- */
  const sectionParam = searchParams?.get("section") || null;
  const typeParam = searchParams?.get("type") || null;

  useEffect(() => {
    if (sectionParam === "freelance") setActiveSection("freelance");
    else if (sectionParam === "enterprise") setActiveSection("enterprise");
    else if (sectionParam === "shop") setActiveSection("shop");
  }, [sectionParam]);

  const handleSectionChange = (section: "shop" | "freelance" | "enterprise") => {
    setActiveSection(section);
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (section === "shop") params.delete("section");
    else params.set("section", section);
    const query = params.toString();
    router.replace(query ? `/marketplace?${query}` : "/marketplace", { scroll: false });
  };

  const handleTypeFilterChange = (filterId: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (!filterId || filterId === "all") params.delete("type");
    else params.set("type", filterId);
    const query = params.toString();
    router.replace(query ? `/marketplace?${query}` : "/marketplace", { scroll: false });
  };

  const handleInstantBuy = (item: {
    id: string;
    type: "course" | "product" | "service";
    title: string;
    price: number;
    image: string;
    categoryLabel?: string;
  }) => {
    // Un seul chemin d'achat : ajout au panier puis étape paiement de la page /cart.
    addToCart(item);
    router.push("/cart?payer=1");
  };

  const handleOpenVendorApplication = () => {
    if (isUserLoggedIn) {
      setVendorApplicationModalOpen(true);
    } else {
      router.push("/login");
    }
  };

  // Ouvre directement la page publique de la boutique /vendorstore/{slug} (lien court)
  const handleOpenStore = (store: any) => {
    router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(store))}`);
  };

  const handleOpenKyc = () => {
    if (!isUserLoggedIn) {
      router.push("/login");
    } else {
      setKycModalOpen(true);
    }
  };

  const tabs = [
    { id: "shop" as const, label: "Produits", icon: ShoppingBag },
    { id: "freelance" as const, label: "Freelances", icon: Users },
    { id: "enterprise" as const, label: "Entreprises", icon: Building2 },
  ];

  // If a store is selected (ancien flux interne), redirige vers la page publique dédiée
  if (selectedStore) {
    router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(selectedStore))}`);
    return null;
  }

  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69E25]" />
          <p className="text-xs text-slate-400">Chargement de la marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30">
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden pt-10 pb-6">
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.1)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(14,165,233,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-15" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/40 to-transparent" />

        {/* Floating shapes */}
        <motion.div
          className="absolute top-14 right-10 w-16 h-16 rounded-2xl border border-[#D69E25]/20 bg-[#D69E25]/5 rotate-12 pointer-events-none"
          animate={{ y: [0, -12, 0], rotate: [12, 24, 12] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-8 left-10 w-12 h-12 rounded-full border border-emerald-400/20 bg-emerald-400/5 pointer-events-none"
          animate={{ y: [0, 10, 0], x: [0, -6, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Section Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
            className="relative flex items-center justify-center gap-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 max-w-md mx-auto"
          >
            <div className="absolute inset-0 bg-[#D69E25]/5 blur-xl rounded-2xl opacity-0" />
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSectionChange(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] shadow-lg shadow-[#D69E25]/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`sm:hidden ${isActive ? "text-[#021231]" : "text-slate-400"}`}>{tab.label}</span>
                </button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ==================== ACTIVE SECTION ==================== */}
      <div className="relative">
        {/* Shop Section */}
        {activeSection === "shop" && (
          <DigitalShop
            products={marketplaceProducts}
            stores={stores}
            onAddToCart={addToCart}
            onInstantBuy={handleInstantBuy}
            searchQuery={searchQuery}
            isAdmin={isAdmin}
            onDeleteProduct={deleteProduct}
            onEditProduct={updateProduct}
            onOpenStore={handleOpenStore}
            onOpenVendorApplication={handleOpenVendorApplication}
            hideVendorCta={hideVendorCta}
            onClearSearch={() => setSearchQuery("")}
            onSearchChange={setSearchQuery}
            initialFilter={typeParam}
            onFilterChange={handleTypeFilterChange}
          />
        )}

        {/* Freelance Section */}
        {activeSection === "freelance" && (
          <FreelanceMarketplace
            freelances={freelances}
            feeConfig={feeConfig}
            onOpenKycModal={handleOpenKyc}
            onOrderService={orderService}
            hideKycCta={kycVerified}
          />
        )}

        {/* Entreprise Section */}
        {activeSection === "enterprise" && (
          <EnterpriseDirectory
            enterprises={enterprises}
            feeConfig={feeConfig}
            onOpenKycModal={handleOpenKyc}
            hideKycCta={kycVerified}
          />
        )}
      </div>
    </div>
  );
}

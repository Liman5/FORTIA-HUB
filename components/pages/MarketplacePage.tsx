"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useAppStore } from "@/lib/store/AppStore";
import { DigitalShop } from "@/components/DigitalShop";
import { FreelanceMarketplace } from "@/components/FreelanceMarketplace";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";
import {
  ShoppingBag,
  Users,
  Building2,
  Sparkles,
  BadgeCheck,
  ShieldCheck,
  Zap,
} from "lucide-react";

function getStoreSlug(store: { slug?: string; name?: string }): string {
  const base = store.slug && store.slug.trim() ? store.slug : (store.name || "boutique");
  return base.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "boutique";
}

export function MarketplacePage() {
  const router = useRouter();
  const {
    marketplaceProducts,
    stores,
    addToCart,
    setPaymentItems,
    setPaymentGatewayOpen,
    isAdmin,
    deleteProduct,
    updateProduct,
    selectedStore,
    setVendorApplicationModalOpen,
    isUserLoggedIn,
    setOpenAuthModal,
    setAuthMode,
    freelances,
    enterprises,
    feeConfig,
    setKycModalOpen,
    orderService,
  } = useAppStore();

  const [activeSection, setActiveSection] = useState<"shop" | "freelance" | "enterprise">("shop");
  const [searchQuery, setSearchQuery] = useState("");

  const handleInstantBuy = (item: {
    id: string;
    type: "course" | "product" | "service";
    title: string;
    price: number;
    image: string;
    categoryLabel?: string;
  }) => {
    setPaymentItems([item]);
    setPaymentGatewayOpen(true);
  };

  const handleOpenVendorApplication = () => {
    if (isUserLoggedIn) {
      setVendorApplicationModalOpen(true);
    } else {
      setAuthMode("login");
      setOpenAuthModal(true);
    }
  };

  // Ouvre directement la page publique de la boutique /vendorstore/{slug} (lien court)
  const handleOpenStore = (store: any) => {
    router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(store))}`);
  };

  const handleOpenKyc = () => {
    if (!isUserLoggedIn) {
      setAuthMode("login");
      setOpenAuthModal(true);
    } else {
      setKycModalOpen(true);
    }
  };

  const totalProducts = marketplaceProducts.filter(p => p.isPublished || isAdmin).length;
  const totalFreelances = freelances.length;
  const totalEnterprises = enterprises.length;

  const tabs = [
    { id: "shop" as const, label: "Produits", icon: ShoppingBag, count: totalProducts },
    { id: "freelance" as const, label: "Freelances", icon: Users, count: totalFreelances },
    { id: "enterprise" as const, label: "Entreprises", icon: Building2, count: totalEnterprises },
  ];

  // If a store is selected (ancien flux interne), redirige vers la page publique dédiée
  if (selectedStore) {
    router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(selectedStore))}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-[#021231] text-white selection:bg-[#D69E25]/30">
      {/* ==================== HERO SECTION ==================== */}
      <section className="relative overflow-hidden pt-14 pb-10">
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
          <div className="text-center space-y-5">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-5 py-2 rounded-full text-xs font-bold text-[#D69E25] shadow-[0_0_20px_rgba(214,158,37,0.15)]"
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#D69E25]"
              />
              <Sparkles className="w-4 h-4" />
              <span>Marketplace FORTIA HUB</span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]"
            >
              Boutique Digitale &{" "}
              <span className="animated-gradient-text inline-block">Freelances Vérifiés</span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed"
            >
              Produits numériques, ebooks, templates et services freelance vérifiés par KYC strict.
              Des milliers de solutions prêtes à l'emploi pour développer votre activité.
            </motion.p>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-400"
            >
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-emerald-400/20 rounded-full px-3 py-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                Vendeurs KYC vérifiés
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-[#D69E25]/20 rounded-full px-3 py-1.5">
                <Zap className="w-3.5 h-3.5 text-[#D69E25]" />
                Livraison instantanée
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 backdrop-blur-xl border border-sky-400/20 rounded-full px-3 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                Paiements sécurisés
              </span>
            </motion.div>
          </div>

          {/* Section Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.45, ease: "easeOut" }}
            className="relative flex items-center justify-center gap-2 mt-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 max-w-md mx-auto"
          >
            <div className="absolute inset-0 bg-[#D69E25]/5 blur-xl rounded-2xl opacity-0" />
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] shadow-lg shadow-[#D69E25]/20"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className={`sm:hidden ${isActive ? "text-[#021231]" : "text-slate-400"}`}>{tab.label}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                    isActive ? "bg-[#021231]/20 text-[#021231]" : "bg-white/10 text-slate-400"
                  }`}>
                    {tab.count}
                  </span>
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
          />
        )}

        {/* Freelance Section */}
        {activeSection === "freelance" && (
          <FreelanceMarketplace
            freelances={freelances}
            feeConfig={feeConfig}
            onOpenKycModal={handleOpenKyc}
            onOrderService={orderService}
          />
        )}

        {/* Entreprise Section */}
        {activeSection === "enterprise" && (
          <EnterpriseDirectory
            enterprises={enterprises}
            feeConfig={feeConfig}
            onOpenKycModal={handleOpenKyc}
          />
        )}
      </div>
    </div>
  );
}

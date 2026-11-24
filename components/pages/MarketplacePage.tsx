"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useMarketplace, useCommerce, useAuth, useUi } from "@/lib/store/domains/contexts";
import { DigitalShop } from "@/components/DigitalShop";
import { FreelanceMarketplace } from "@/components/FreelanceMarketplace";
import { EnterpriseDirectory } from "@/components/EnterpriseDirectory";
import { ShoppingBag, Users, Building2, Loader2, LayoutGrid } from "lucide-react";

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
  /** Catégorie (domaine) réelle du produit : ?categorie=<slug>. */
  const categoryParam = searchParams?.get("categorie") || null;

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

  /** Synchronise la catégorie (domaine produit) dans l'URL. */
  const handleCategoryFilterChange = (slug: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (!slug) params.delete("categorie");
    else params.set("categorie", slug);
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
      <div className="ibx-page flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin" style={{ color: "var(--ibx-accent)" }} />
          <p className="ibx-small">Chargement de la marketplace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ibx-page ibx-catalogue">
      {/* ==================== EN-TETE ==================== */}
      <header style={{ borderColor: "var(--ibx-border)" }} className="border-b">
        <div className="ibx-container py-6 sm:py-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 space-y-1.5">
              <p className="ibx-label">Marketplace numérique</p>
              <h1 className="ibx-h1">Produits numériques, freelances et entreprises</h1>
              <p className="ibx-body max-w-2xl">
                Ebooks, templates, packs et documents prêts à télécharger, ainsi que des
                prestataires et des entreprises identifiés sur la plateforme.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <button
                type="button"
                onClick={() => router.push("/marketplace/categories")}
                className="ibx-btn ibx-btn-outline"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                Catégories de produits
              </button>
              <button
                type="button"
                onClick={() => router.push("/marketplace/ressources")}
                className="ibx-btn ibx-btn-ghost"
              >
                Ressources numériques
              </button>
            </div>
          </div>

          {/* Indicateurs de sections : cartes distinctes, séparées et cliquables */}
          <div
            className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3"
            role="tablist"
            aria-label="Sections de la marketplace"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              const count =
                tab.id === "shop"
                  ? (marketplaceProducts || []).filter((item) => item?.isPublished !== false).length
                  : tab.id === "freelance"
                    ? (freelances || []).length
                    : (enterprises || []).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSectionChange(tab.id)}
                  className="ibx-card-flat ibx-interactive flex items-center gap-3 p-3 text-left"
                  style={{
                    borderColor: isActive ? "var(--ibx-accent)" : "var(--ibx-border)",
                    backgroundColor: isActive
                      ? "color-mix(in srgb, var(--ibx-accent) 8%, var(--ibx-surface))"
                      : undefined,
                  }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
                    style={{
                      backgroundColor: isActive ? "var(--ibx-accent)" : "var(--ibx-surface-muted)",
                      color: isActive ? "#1c1405" : "var(--ibx-accent-strong)",
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="ibx-h3 block truncate">{tab.label}</span>
                    <span className="ibx-tiny block">
                      {count} {tab.id === "shop" ? "produit" : "profil"}
                      {count > 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>


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
            initialCategory={categoryParam}
            onCategoryChange={handleCategoryFilterChange}
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

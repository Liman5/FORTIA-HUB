"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/store/AppStore";
import { useMarketplace, useAuth, useCommerce } from "@/lib/store/domains/contexts";
import { VendorStoreView } from "@/components/VendorStoreView";
import { Store, ArrowLeft } from "lucide-react";

interface VendorStorePageProps {
  slug: string;
}

export function VendorStorePage({ slug }: VendorStorePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeIdParam = searchParams?.get("storeId");
    const { userProfile } = useAuth();
  const { stores, activeVendorStore, selectedStore, marketplaceProducts } = useMarketplace();
  const { addToCart } = useCommerce();
  const { platformLoaded } = useAppStore();

  // Normalisation identique à VendorStoreView/getStoreSlug
  const normalizeSlug = (value: string): string => {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "boutique";
  };

  // Trouver la boutique par ID (paramètre URL) puis par slug/nom
  const store = useMemo(() => {
    if (!slug) return null;
    const rawSlug = decodeURIComponent(slug);
    const normalized = normalizeSlug(rawSlug);

    // 1. Priorité : recherche par ID explicite (le plus fiable)
    if (storeIdParam) {
      const byId =
        stores.find((s) => s.id === storeIdParam || s.id?.toLowerCase() === storeIdParam.toLowerCase()) ||
        (activeVendorStore?.id === storeIdParam ? activeVendorStore : null) ||
        (selectedStore?.id === storeIdParam ? selectedStore : null);
      if (byId) return byId;
    }

    // 2. Par slug normalisé ou nom
    const bySlug =
      stores.find((s) => normalizeSlug(s.slug || "") === normalized) ||
      stores.find((s) => normalizeSlug(s.name || "") === normalized) ||
      stores.find((s) => s.id?.toLowerCase() === rawSlug.toLowerCase()) ||
      (activeVendorStore?.id && normalizeSlug(activeVendorStore.name || "") === normalized ? activeVendorStore : null) ||
      (activeVendorStore?.id && normalizeSlug(activeVendorStore.slug || "") === normalized ? activeVendorStore : null) ||
      (selectedStore?.id && normalizeSlug(selectedStore.name || "") === normalized ? selectedStore : null);
    if (bySlug) return bySlug;

    // 3. Fallback ultime : boutique de l'utilisateur connecté (par email)
    if (userProfile?.email) {
      const myStore =
        stores.find((s) => s.ownerEmail === userProfile.email) ||
        stores.find((s) => s.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase()) ||
        (activeVendorStore?.id && activeVendorStore.ownerEmail?.toLowerCase() === userProfile.email?.toLowerCase() ? activeVendorStore : null);
      if (myStore) return myStore;
    }

    return null;
  }, [stores, slug, storeIdParam, activeVendorStore, selectedStore, userProfile]);

  const products = useMemo(() => {
    if (!store) return [];
    return marketplaceProducts.filter(
      (p) => p.storeId === store.id || p.storeName === store.name
    );
  }, [marketplaceProducts, store]);

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

  // Pendant le chargement des données Supabase, on affiche un état de chargement
  if (!platformLoaded) {
    return (
      <div className="min-h-screen bg-[#021231] text-white py-24 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 flex items-center justify-center animate-pulse">
            <Store className="w-7 h-7 text-[#D69E25] animate-spin" style={{ animationDuration: "2s" }} />
          </div>
          <p className="text-xs font-bold text-slate-400">Chargement de la boutique...</p>
        </div>
      </div>
    );
  }

  // Si la boutique n'existe pas → message élégant
  if (!store) {
    return (
      <div className="min-h-screen bg-[#021231] text-white py-16 px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="p-8 bg-[#011D46]/90 border-2 border-[#D69E25]/40 rounded-3xl space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#D69E25]/20 border border-[#D69E25]/40 text-[#D69E25] flex items-center justify-center mx-auto">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Boutique introuvable</h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-sm mx-auto">
                La boutique que vous recherchez n'existe pas ou n'est plus disponible sur FORTIA HUB.
              </p>
            </div>
            <button
              onClick={() => router.push("/marketplace")}
              className="px-6 py-3 bg-[#D69E25] text-[#021231] font-black rounded-xl text-xs shadow-lg hover:bg-amber-400 transition cursor-pointer inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la Marketplace
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VendorStoreView
      store={store}
      products={products}
      onAddToCart={addToCart}
      onInstantBuy={handleInstantBuy}
      onBackToMarketplace={() => router.push("/marketplace")}
    />
  );
}
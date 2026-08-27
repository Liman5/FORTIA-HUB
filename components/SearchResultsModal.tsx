"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Search,
  X,
  ShoppingBag,
  Store,
  GraduationCap,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useActiveSection } from "@/lib/store/useActiveSection";
import { MarketplaceProduct, VendorStore, Course } from "@/lib/types";

function getStoreSlug(store: { slug?: string; name?: string }): string {
  const base = store.slug && store.slug.trim() ? store.slug : store.name || "boutique";
  return (
    base
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "boutique"
  );
}

interface SearchResultsModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

export function SearchResultsModal({ onClose, onNavigate }: SearchResultsModalProps) {
  const router = useRouter();
  const { setActiveTab } = useActiveSection();
  const {
    searchQuery,
    setSearchQuery,
    marketplaceProducts,
    stores,
    courses,
    isAdmin,
  } = useAppStore();

  const q = (searchQuery || "").trim().toLowerCase();

  const productResults = useMemo<MarketplaceProduct[]>(() => {
    if (!q) return [];
    return (marketplaceProducts || []).filter((p) => {
      if (!p.isPublished && !isAdmin) return false;
      if (p.isApproved === false && !isAdmin) return false;
      const haystack = `${p.title} ${p.description} ${p.typeLabel} ${p.storeName}`.toLowerCase();
      return haystack.includes(q);
    }).slice(0, 6);
  }, [marketplaceProducts, q, isAdmin]);

  const storeResults = useMemo<VendorStore[]>(() => {
    if (!q) return [];
    return (stores || []).filter((s) => {
      const haystack = `${s.name} ${s.ownerName} ${s.description} ${(s.categories || []).join(" ")}`.toLowerCase();
      return haystack.includes(q);
    }).slice(0, 4);
  }, [stores, q]);

  const courseResults = useMemo<Course[]>(() => {
    if (!q) return [];
    return (courses || []).filter((c) => {
      const haystack = `${c.title} ${c.categoryLabel} ${c.description} ${c.instructor?.name || ""}`.toLowerCase();
      return haystack.includes(q);
    }).slice(0, 5);
  }, [courses, q]);

  const total = productResults.length + storeResults.length + courseResults.length;

  // Fermer avec la touche Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelectProduct = () => {
    setActiveTab("marketplace");
    onNavigate();
  };

  const handleSelectStore = (store: VendorStore) => {
    router.push(`/vendorstore/${encodeURIComponent(getStoreSlug(store))}`);
    onNavigate();
  };

  const handleSelectCourse = () => {
    setActiveTab("academy");
    onNavigate();
  };

  const handleViewAll = () => {
    setActiveTab("marketplace");
    onNavigate();
  };

  const clearSearch = () => setSearchQuery("");

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-3 sm:p-6 pt-20 sm:pt-24 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Résultats de recherche"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onMouseDown={onClose} />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-2xl bg-[#021231] border border-[#D69E25]/40 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* En-tête : champ de recherche */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-[#011D46]/50">
          <Search className="w-5 h-5 text-[#D69E25] shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher produit, e-book, boutique, formation..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              title="Effacer la recherche"
              aria-label="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-[#D69E25]/10 border border-[#D69E25]/40 text-[#D69E25] text-[10px] font-black hover:bg-[#D69E25] hover:text-[#021231] transition"
          >
            Fermer
          </button>
        </div>

        {/* Résultats */}
        <div className="max-h-[55vh] overflow-y-auto">
          {total === 0 ? (
            <div className="text-center py-14 px-6">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-slate-500" />
              </div>
              <h3 className="text-sm font-black text-white mb-1">
                Aucun résultat pour « {searchQuery} »
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Essayez un autre mot-clé : un produit (e-book, prompts IA, template Canva...), une
                boutique, une formation ou une catégorie.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {/* Produits */}
              {productResults.length > 0 && (
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D69E25] mb-3">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Produits ({productResults.length})
                  </div>
                  <div className="space-y-2">
                    {productResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={handleSelectProduct}
                        className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-[#D69E25]/40 rounded-2xl p-2.5 text-left transition group"
                      >
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#D69E25]/10 border border-[#D69E25]/30 flex items-center justify-center shrink-0">
                            <ShoppingBag className="w-5 h-5 text-[#D69E25]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-[#D69E25] transition">
                            {p.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {p.typeLabel} · {p.storeName || "Boutique"}
                          </p>
                        </div>
                        <span className="text-xs font-black text-[#D69E25] shrink-0">
                          ${p.price}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Boutiques */}
              {storeResults.length > 0 && (
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-3">
                    <Store className="w-3.5 h-3.5" />
                    Boutiques ({storeResults.length})
                  </div>
                  <div className="space-y-2">
                    {storeResults.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStore(s)}
                        className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/40 rounded-2xl p-2.5 text-left transition group"
                      >
                        {s.logo ? (
                          <img
                            src={s.logo}
                            alt={s.name}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Store className="w-5 h-5 text-emerald-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {s.ownerName} · {s.salesCount} ventes
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Formations */}
              {courseResults.length > 0 && (
                <div className="p-3 sm:p-4">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-400 mb-3">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Formations ({courseResults.length})
                  </div>
                  <div className="space-y-2">
                    {courseResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={handleSelectCourse}
                        className="w-full flex items-center gap-3 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-sky-500/40 rounded-2xl p-2.5 text-left transition group"
                      >
                        {c.image ? (
                          <img
                            src={c.image}
                            alt={c.title}
                            className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-5 h-5 text-sky-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-sky-400 transition">
                            {c.title}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {c.categoryLabel} · ${c.price}
                          </p>
                        </div>
                        <Sparkles className="w-4 h-4 text-[#D69E25]/70 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Pied : voir tous les résultats */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-3 bg-[#011D46]/50">
          <span className="text-[10px] text-slate-400 font-semibold">
            {total} résultat{total > 1 ? "s" : ""} trouvé{total > 1 ? "s" : ""}
          </span>
          <button
            onClick={handleViewAll}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[10px] font-black hover:brightness-110 active:scale-95 transition"
          >
            Voir tous les résultats dans la boutique
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </motion.div>
    </div>
  );
}

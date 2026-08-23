"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import { CartItem, VendorStore, MarketplaceProduct } from "@/lib/types";
import { OptimizedImage } from "./OptimizedImage";
import {
  Download,
  Check,
  ShoppingCart,
  Store,
  ExternalLink,
  Plus,
  Star,
  Search,
  Sparkles,
} from "lucide-react";

interface DigitalShopProps {
  products: MarketplaceProduct[];
  stores?: VendorStore[];
  onAddToCart: (item: CartItem) => void;
  onInstantBuy: (item: CartItem) => void;
  searchQuery: string;
  isAdmin?: boolean;
  onDeleteProduct?: (id: string) => void;
  onEditProduct?: (product: MarketplaceProduct) => void;
  onOpenStore?: (store: VendorStore) => void;
  onOpenVendorApplication?: () => void;
}

export const DigitalShop: React.FC<DigitalShopProps> = ({
  products,
  stores = [],
  onAddToCart,
  onInstantBuy,
  searchQuery,
  isAdmin,
  onDeleteProduct,
  onEditProduct,
  onOpenStore,
  onOpenVendorApplication,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [previewProduct, setPreviewProduct] = useState<MarketplaceProduct | null>(null);

  const filters = [
    { id: "all", label: "Tous" },
    { id: "ebook", label: "eBooks" },
    { id: "canva_template", label: "Canva" },
    { id: "ai_prompts", label: "Prompts IA" },
    { id: "whitepaper", label: "White Papers" },
    { id: "business_plan", label: "Business Plans" },
    { id: "contract", label: "Contrats" },
    { id: "pitch_deck", label: "Pitch Decks" },
    { id: "premium_pack", label: "Packs Premium" },
  ];

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return (products || []).filter((prod) => {
      if (!prod.isPublished && !isAdmin) return false;
      const matchesFilter = selectedFilter === "all" || prod.type === selectedFilter;
      const matchesStore = selectedStoreId === "all" || prod.storeId === selectedStoreId;
      const matchesSearch =
        !q ||
        (prod.title && prod.title.toLowerCase().includes(q)) ||
        (prod.description && prod.description.toLowerCase().includes(q)) ||
        (prod.typeLabel && prod.typeLabel.toLowerCase().includes(q)) ||
        (prod.storeName && prod.storeName.toLowerCase().includes(q));
      return matchesFilter && matchesStore && matchesSearch;
    });
  }, [products, isAdmin, selectedFilter, selectedStoreId, searchQuery]);

  const hasActiveFilters = selectedFilter !== "all" || selectedStoreId !== "all" || searchQuery;

  const handleReset = () => {
    setSelectedFilter("all");
    setSelectedStoreId("all");
  };

  return (
    <section className="py-12 bg-[#021231] min-h-[600px] relative overflow-hidden" id="shop-section">
      {/* Background decoration */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/20 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(214,158,37,0.03)_0%,transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7 relative z-10">
        {/* COMPACT HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-xl border border-[#D69E25]/40 px-4 py-2 rounded-full text-xs font-bold text-[#D69E25] shadow-[0_0_20px_rgba(214,158,37,0.1)]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Marketplace</span>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              {filteredProducts.length} produits
            </span>
          </div>
          <button
            onClick={onOpenVendorApplication}
            className="group relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D69E25] via-[#F6E05E] to-[#AB6F10] bg-[length:200%_auto] hover:bg-right text-[#021231] font-black text-xs uppercase tracking-wider hover:scale-105 active:scale-95 transition-all duration-300 shadow-lg shadow-[#D69E25]/30 overflow-hidden"
          >
            <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 group-hover:animate-shine transition-opacity" />
            <Plus className="w-3.5 h-3.5" />
            Ouvrir ma Boutique
          </button>
        </div>

        {/* STORES CAROUSEL */}
        {stores.length > 0 && (
          <div className="relative rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-3 overflow-hidden">
            {/* Fonds dégradés latéraux retirés - effet noir supprimé */}

            <div className="flex items-center gap-3 py-1 animate-marquee">
              {[...stores, ...stores, ...stores].map((st, i) => (
                <button
                  key={`${st.id}-${i}`}
                  onClick={() => onOpenStore && onOpenStore(st)}
                  className="flex items-center gap-2.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-[#D69E25]/50 p-2.5 rounded-xl transition duration-300 shrink-0 group/store min-w-[190px] backdrop-blur-md"
                  title={st.name}
                >
                  {st.logo ? (
                    <img
                      src={st.logo}
                      alt={st.name}
                      className="w-10 h-10 rounded-lg object-cover border border-[#D69E25]/30 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#D69E25]/10 text-[#D69E25] border border-[#D69E25]/30 flex items-center justify-center shrink-0">
                      <Store className="w-4 h-4" />
                    </div>
                  )}
                  <div className="text-left space-y-0.5 pr-1 flex-1 min-w-0">
                    <p className="text-xs font-bold text-white group-hover/store:text-[#D69E25] transition truncate">
                      {st.name}
                    </p>
                    <span className="text-[10px] text-slate-400 font-medium block truncate">
                      {st.salesCount} ventes · {st.ownerName}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover/store:text-[#D69E25] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none flex-1 snap-x snap-mandatory scroll-px-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {filters.map((f) => {
              const isActive = selectedFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={`px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap snap-start shrink-0 transition-all duration-300 ${
                    isActive
                      ? "bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-black shadow-lg shadow-[#D69E25]/20"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {stores.length > 0 && (
            <div className="shrink-0 relative">
              <Store className="w-3.5 h-3.5 text-[#D69E25] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-white/5 border border-white/15 text-xs text-white rounded-xl pl-9 pr-8 py-2.5 font-semibold focus:outline-none focus:border-[#D69E25]/50 backdrop-blur-xl appearance-none cursor-pointer hover:border-white/30 transition-colors"
              >
                <option value="all" className="bg-[#021231] text-white">Toutes les Boutiques</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#021231] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium">
            {filteredProducts.length} produit{filteredProducts.length > 1 ? "s" : ""} trouvé{filteredProducts.length > 1 ? "s" : ""}
          </span>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-[#D69E25] hover:text-amber-300 font-semibold transition-colors"
            >
              <Search className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* PRODUCTS GRID */}
        {filteredProducts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <Search className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-bold text-white">Aucun produit ne correspond à votre recherche</h3>
            <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
              Essayez de réinitialiser vos filtres ou de modifier les mots-clés.
            </p>
            <button
              onClick={handleReset}
              className="px-5 py-2.5 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
            >
              Réinitialiser les Filtres
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((prod, index) => {
              const prodStore = stores.find((s) => s.id === prod.storeId);
              return (
                <motion.div
                  key={prod.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
                  whileHover={{ y: -6, scale: 1.01 }}
                  className="group relative bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl hover:border-[#D69E25]/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(214,158,37,0.1)] transition-all duration-500 flex flex-col overflow-hidden"
                >
                  {/* Top border gradient on hover */}
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />

                  <div className="relative h-32 sm:h-36 bg-[#021231] overflow-hidden">
                    {prod.image ? (
                      <OptimizedImage
                        src={prod.image}
                        alt={prod.title}
                        fallbackCategory={prod.typeLabel}
                        className="w-full h-full object-cover group-hover:scale-110 transition duration-700 opacity-85 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#021231] flex flex-col items-center justify-center text-slate-500 p-2 text-center">
                        <Store className="w-7 h-7 text-[#D69E25]/70 mb-1" />
                        <span className="text-[9px] font-bold text-slate-500">Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-transparent to-transparent opacity-70" />

                    <span className="absolute top-2 left-2 bg-[#021231]/85 backdrop-blur-md text-[#D69E25] border border-[#D69E25]/40 text-[8px] sm:text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-lg whitespace-nowrap">
                      {prod.typeLabel}
                    </span>
                    {prod.isPopular && !isAdmin && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] text-[8px] sm:text-[9px] font-black px-2 py-0.5 rounded-md shadow-lg">
                        ★ Top
                      </span>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        {prodStore ? (
                          <button
                            onClick={() => onOpenStore && onOpenStore(prodStore)}
                            className="flex items-center gap-1 text-[9px] text-[#D69E25] hover:underline font-bold truncate min-w-0"
                          >
                            {prodStore.logo ? (
                              <img
                                src={prodStore.logo}
                                alt={prodStore.name}
                                className="w-3.5 h-3.5 rounded-full object-cover shrink-0 border border-[#D69E25]/30"
                              />
                            ) : (
                              <Store className="w-3 h-3 shrink-0" />
                            )}
                            <span className="truncate">{prodStore.name}</span>
                          </button>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-bold">FORTIA</span>
                        )}
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold shrink-0">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {prod.rating || 5.0}
                        </span>
                      </div>

                      <h3
                        onClick={() => setPreviewProduct(prod)}
                        className="font-black text-white text-xs sm:text-sm group-hover:text-[#D69E25] transition line-clamp-2 cursor-pointer leading-snug"
                      >
                        {prod.title}
                      </h3>
                      <p className="text-slate-400 text-[10px] sm:text-[11px] line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-auto gap-1.5">
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base sm:text-lg font-black text-[#D69E25]">${prod.price}</span>
                          {prod.originalPrice && (
                            <span className="text-[9px] text-slate-500 line-through">${prod.originalPrice}</span>
                          )}
                        </div>
                        <span className="text-[8px] sm:text-[9px] text-slate-500 block font-medium truncate">
                          ≈ {Math.round(prod.price * 600).toLocaleString("fr-FR")} FCFA
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() =>
                            onAddToCart({ id: prod.id, type: "product", title: prod.title, price: prod.price, image: prod.image, categoryLabel: prod.typeLabel })
                          }
                          className="shop-cart-btn p-2 rounded-lg border border-[#D69E25]/70"
                          title="Ajouter au Panier"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() =>
                            onInstantBuy({ id: prod.id, type: "product", title: prod.title, price: prod.price, image: prod.image, categoryLabel: prod.typeLabel })
                          }
                          className="px-2.5 py-2 rounded-lg bg-gradient-to-r from-[#D69E25] to-[#AB6F10] hover:brightness-110 text-[#021231] font-black text-[9px] sm:text-[10px] transition-all duration-300 active:scale-95 shadow-lg shadow-[#D69E25]/20 flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Acheter
                        </button>
                      </div>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Product Preview Modal */}
        {previewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative bg-[#021231] border border-[#D69E25]/40 rounded-3xl max-w-lg w-full overflow-hidden text-white space-y-4 shadow-2xl shadow-[#D69E25]/10"
            >
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D69E25]/50 to-transparent" />

              <div className="h-44 w-full relative bg-[#011D46] overflow-hidden">
                <img src={previewProduct.bannerImage || previewProduct.image} alt={previewProduct.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#021231] via-[#021231]/40 to-black/30" />
                <button
                  onClick={() => setPreviewProduct(null)}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black hover:scale-110 transition-all active:scale-95"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 pt-0 space-y-4">
                <h3 className="text-lg font-black text-white">{previewProduct.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{previewProduct.description}</p>

                <div className="space-y-2 bg-white/[0.04] p-4 rounded-xl border border-white/10">
                  <p className="text-xs font-bold text-[#D69E25]">Inclus :</p>
                  {previewProduct.features &&
                    previewProduct.features.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-2xl font-black text-[#D69E25]">${previewProduct.price}</span>
                    <span className="text-xs text-slate-400 block">
                      ≈ {Math.round(previewProduct.price * 600).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      onInstantBuy({
                        id: previewProduct.id,
                        type: "product",
                        title: previewProduct.title,
                        price: previewProduct.price,
                        image: previewProduct.image,
                        categoryLabel: previewProduct.typeLabel,
                      });
                      setPreviewProduct(null);
                    }}
                    className="px-5 py-3 bg-gradient-to-r from-[#D69E25] to-[#AB6F10] text-[#021231] font-extrabold text-xs rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#D69E25]/20"
                  >
                    Procéder au Paiement
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
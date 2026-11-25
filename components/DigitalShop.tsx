"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { trackProductEvent } from "@/lib/services/track";
import { CartItem, VendorStore, MarketplaceProduct } from "@/lib/types";
import {
  Download,
  ShoppingCart,
  Store,
  Star,
  X,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { IbxLightbox } from "@/components/ui/IbxLightbox";
import { buildProductCategories, matchesProductCategory } from "@/lib/data/productCategories";
import { formatFcfa, formatPricePair, resolveMoneyConfig } from "@/lib/data/currency";
import { useAppStore } from "@/lib/store/AppStore";

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
  onClearSearch?: () => void;
  onSearchChange?: (query: string) => void;
  initialFilter?: string | null;
  initialCategory?: string | null;
  onFilterChange?: (filterId: string) => void;
  onCategoryChange?: (slug: string) => void;
}

/**
 * Boutique numérique.
 *
 * La page ne présente plus de barre de filtres : la recherche est assurée par
 * l'en-tête global, les catégories et les formats arrivent par l'URL
 * (`?categorie=` / `?type=`) depuis l'accueil et les pages de découverte.
 * Les boutiques des vendeurs défilent horizontalement (flèches + balayage).
 *
 * Prix : FCFA TOUJOURS en premier (voir lib/data/currency.ts) ; l'équivalent
 * USD est facultatif et secondaire.
 */
export const DigitalShop: React.FC<DigitalShopProps> = ({
  products,
  stores = [],
  onAddToCart,
  onInstantBuy,
  searchQuery,
  isAdmin,
  onOpenStore,
  onClearSearch,
  onSearchChange,
  initialFilter,
  onFilterChange,
  initialCategory,
  onCategoryChange,
}) => {
  const { siteContent } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);

  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter || "all");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "");
  /** Rail horizontal des boutiques : référence + défilement par flèches. */
  const storesRef = React.useRef<HTMLDivElement>(null);
  /** Galerie plein écran : plusieurs images si le produit en possède. */
  const [zoom, setZoom] = useState<{ images: string[]; index: number } | null>(null);

  /* Synchronise le format avec l'URL (liens directs ?type=…) */
  useEffect(() => {
    setSelectedFilter(initialFilter || "all");
  }, [initialFilter]);

  /* Synchronise la catégorie (domaine) avec l'URL (?categorie=…) */
  useEffect(() => {
    setSelectedCategory(initialCategory || "");
  }, [initialCategory]);

  /** Domaines réellement utilisés par les produits publiés. */
  const categories = useMemo(() => buildProductCategories(products || []), [products]);

  const filteredProducts = useMemo(() => {
    const q = (searchQuery || "").toLowerCase();
    return (products || []).filter((prod) => {
      if (!prod.isPublished && !isAdmin) return false;
      const matchesFormat = selectedFilter === "all" || prod.type === selectedFilter;
      const matchesCategory = !selectedCategory || matchesProductCategory(prod, selectedCategory);
      const matchesSearch =
        !q ||
        (prod.title && prod.title.toLowerCase().includes(q)) ||
        (prod.description && prod.description.toLowerCase().includes(q)) ||
        (prod.typeLabel && prod.typeLabel.toLowerCase().includes(q)) ||
        (prod.storeName && prod.storeName.toLowerCase().includes(q));
      return matchesFormat && matchesCategory && matchesSearch;
    });
  }, [products, isAdmin, selectedFilter, selectedCategory, searchQuery]);

  /** Produits affichés : les plus récents d'abord. */
  const visibleProducts = useMemo(
    () =>
      [...filteredProducts].sort(
        (a, b) =>
          new Date(String(b.createdAt || 0)).getTime() - new Date(String(a.createdAt || 0)).getTime()
      ),
    [filteredProducts]
  );

  const hasActiveFilters = selectedFilter !== "all" || !!searchQuery || !!selectedCategory;

  /** Libellé lisible de la catégorie active (donnée réelle). */
  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategory) return "";
    const match = categories.find((item) => item.slug === selectedCategory);
    return match?.label || selectedCategory.replace(/-/g, " ");
  }, [categories, selectedCategory]);

  const handleReset = () => {
    setSelectedFilter("all");
    setSelectedCategory("");
    onClearSearch?.();
    onFilterChange?.("");
    onCategoryChange?.("");
  };

  /** Défilement horizontal des boutiques (flèches). */
  const scrollStores = (direction: 1 | -1) => {
    const el = storesRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * Math.max(180, el.clientWidth * 0.7), behavior: "smooth" });
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    onCategoryChange?.(slug);
  };

  /** Ouvre l'aperçu plein écran (galerie si le produit a 2 images). */
  const openZoom = (prod: MarketplaceProduct, startIndex = 0) => {
    const images = Array.from(
      new Set([prod.bannerImage, prod.image].filter(Boolean) as string[])
    );
    if (images.length === 0) return;
    setZoom({ images, index: Math.min(startIndex, images.length - 1) });
  };


  return (
    <section className="relative pb-14 pt-6" id="shop-section">
      <div className="ibx-container space-y-4">
        {/* ================= BOUTIQUES (carrousel horizontal) ================= */}
        {stores.length > 0 && (
          <section aria-label="Boutiques de la marketplace" className="ibx-card p-2.5">
            <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
              <p className="ibx-label">Boutiques</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scrollStores(-1)}
                  className="ibx-btn ibx-btn-ghost !px-1.5 !py-1"
                  aria-label="Boutiques précédentes"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollStores(1)}
                  className="ibx-btn ibx-btn-ghost !px-1.5 !py-1"
                  aria-label="Boutiques suivantes"
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div
              ref={storesRef}
              role="group"
              aria-label="Défilement horizontal des boutiques"
              className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => onOpenStore?.(store)}
                  className="ibx-card-flat ibx-interactive flex w-[152px] shrink-0 snap-start items-center gap-2 p-1.5 text-left"
                  title={store.name}
                  aria-label={`Ouvrir la boutique ${store.name}`}
                >
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ibx-radius-sm)]"
                    style={{
                      backgroundColor: "var(--ibx-surface-muted)",
                      color: "var(--ibx-accent-strong)",
                    }}
                    aria-hidden="true"
                  >
                    {store.logo ? (
                      <img src={store.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="ibx-tiny block truncate !text-[9.5px] font-bold">{store.name}</span>
                    <span className="ibx-tiny block truncate !text-[9px]">
                      {Number(store.salesCount) || 0} vente
                      {(Number(store.salesCount) || 0) > 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ================= COMPTEUR DE RESULTATS ================= */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="ibx-small">
            {visibleProducts.length} produit{visibleProducts.length > 1 ? "s" : ""}
            {hasActiveFilters ? " correspondant aux filtres" : " disponible" + (visibleProducts.length > 1 ? "s" : "")}
          </p>
          {selectedCategory && (
            <button
              type="button"
              className="ibx-chip"
              data-active="true"
              onClick={() => handleCategorySelect("")}
              aria-label={`Retirer le filtre de catégorie ${activeCategoryLabel}`}
            >
              Catégorie : {activeCategoryLabel}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {searchQuery && (
            <button
              type="button"
              className="ibx-chip"
              data-active="true"
              onClick={() => onSearchChange?.("")}
              aria-label={`Retirer la recherche ${searchQuery}`}
            >
              « {searchQuery} »
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {selectedFilter !== "all" && (
            <button
              type="button"
              className="ibx-chip"
              data-active="true"
              onClick={() => {
                setSelectedFilter("all");
                onFilterChange?.("");
              }}
              aria-label="Retirer le filtre de format"
            >
              Format : {selectedFilter.replace(/_/g, " ")}
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          )}
          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-ghost !px-2 !py-1">
              <X className="h-3 w-3" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>


        {/* ================= GRILLE DE PRODUITS ================= */}
        {visibleProducts.length === 0 ? (
          <div className="ibx-empty">
            <p className="ibx-h3">Aucun produit ne correspond à votre recherche</p>
            <p className="ibx-small mt-1">
              Essayez de réinitialiser les filtres ou de modifier les mots-clés.
            </p>
            <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-primary mt-3">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleProducts.map((prod, index) => {
              const prodStore = stores.find((item) => item.id === prod.storeId);
              const pricePair = formatPricePair(Number(prod.price) || 0, money);
              const productHref = `/product/${encodeURIComponent(
                String((prod as { slug?: string }).slug || prod.id)
              )}`;

              return (
                <motion.article
                  key={prod.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.04, ease: "easeOut" }}
                  className="ibx-card-flat ibx-interactive group relative flex flex-col overflow-hidden"
                >
                  {/* Texture discrète (aucun aplat plat) */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--ibx-info) 9%, transparent) 0%, transparent 60%)",
                    }}
                  />

                  <div className="ibx-media relative h-32 sm:h-36">
                    {prod.image ? (
                      <img
                        src={prod.image}
                        alt={prod.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span
                        className="flex h-full w-full items-center justify-center"
                        aria-hidden="true"
                      >
                        <Store className="h-6 w-6" style={{ color: "var(--ibx-fg-subtle)" }} />
                      </span>
                    )}

                    {/* Zoom : action distincte de l'ouverture de la fiche */}
                    {prod.image && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openZoom(prod);
                        }}
                        className="ibx-media-zoom"
                        style={{ opacity: 1, zIndex: 20 }}
                        aria-label={`Agrandir l'image de ${prod.title}`}
                        title="Agrandir l'image"
                      >
                        <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}

                    <span
                      className="absolute left-1.5 top-1.5 max-w-[75%] truncate rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                      style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
                    >
                      {prod.typeLabel}
                    </span>
                    {prod.isPopular && !isAdmin && (
                      <span
                        className="absolute right-1.5 top-1.5 rounded px-1 py-0.5 text-[8px] font-bold"
                        style={{
                          backgroundColor: "var(--ibx-surface)",
                          color: "var(--ibx-accent-strong)",
                        }}
                      >
                        ★ Top
                      </span>
                    )}
                  </div>


                  <div className="relative flex flex-1 flex-col gap-1 p-2.5">
                    <div className="flex items-center justify-between gap-1">
                      {prodStore ? (
                        <button
                          type="button"
                          onClick={() => onOpenStore?.(prodStore)}
                          className="ibx-tiny flex min-w-0 items-center gap-1 !text-[9px] font-bold"
                          style={{ color: "var(--ibx-accent-strong)" }}
                        >
                          <Store className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{prodStore.name}</span>
                        </button>
                      ) : (
                        <span className="ibx-tiny font-bold !text-[9px]">FORTIA</span>
                      )}
                      {Number(prod.reviewsCount) > 0 ? (
                        <span className="ibx-tiny inline-flex shrink-0 items-center gap-0.5 !text-[9px] font-bold">
                          <Star
                            className="h-2.5 w-2.5"
                            aria-hidden="true"
                            style={{ color: "var(--ibx-accent)", fill: "var(--ibx-accent)" }}
                          />
                          {Number(prod.rating || 0).toFixed(1)}
                        </span>
                      ) : (
                        <span className="ibx-tiny shrink-0 font-bold !text-[9px]">Nouveau</span>
                      )}
                    </div>

                    <Link
                      href={productHref}
                      prefetch
                      onClick={() =>
                        trackProductEvent("click", prod.id, (prod as { storeId?: string }).storeId)
                      }
                      className="ibx-h3 line-clamp-2 !text-[12px] leading-[1.3] hover:underline"
                      style={{ color: "var(--ibx-fg)" }}
                    >
                      {prod.title}
                    </Link>

                    <p className="ibx-tiny line-clamp-2 !text-[9.5px]">{prod.description}</p>

                    <div
                      className="mt-auto flex items-end justify-between gap-1.5 border-t pt-1.5"
                      style={{ borderColor: "var(--ibx-border)" }}
                    >
                      <div className="min-w-0">
                        <span className="ibx-price block !text-[12.5px]">{pricePair.primary}</span>
                        {pricePair.secondary && (
                          <span className="ibx-tiny block !text-[9px]">{pricePair.secondary}</span>
                        )}
                        {prod.originalPrice && Number(prod.originalPrice) > Number(prod.price) && (
                          <span className="ibx-price-old block !text-[9px]">
                            {formatFcfa(Number(prod.originalPrice), money.rate)}
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            onAddToCart({
                              id: prod.id,
                              type: "product",
                              title: prod.title,
                              price: prod.price,
                              image: prod.image,
                              categoryLabel: prod.typeLabel,
                            })
                          }
                          className="ibx-btn ibx-btn-outline !px-1.5 !py-1"
                          title="Ajouter au panier"
                          aria-label={`Ajouter ${prod.title} au panier`}
                        >
                          <ShoppingCart className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onInstantBuy({
                              id: prod.id,
                              type: "product",
                              title: prod.title,
                              price: prod.price,
                              image: prod.image,
                              categoryLabel: prod.typeLabel,
                            })
                          }
                          className="ibx-btn ibx-btn-primary !px-1.5 !py-1 !text-[9.5px]"
                          aria-label={`Acheter ${prod.title}`}
                        >
                          <Download className="h-2.5 w-2.5" aria-hidden="true" />
                          Acheter
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      {/* Galerie plein écran (composant unique réutilisé) */}
      <IbxLightbox
        images={(zoom?.images || []).map((src) => ({ src, alt: "Aperçu du produit" }))}
        index={zoom?.index ?? 0}
        open={!!zoom}
        onClose={() => setZoom(null)}
        onIndexChange={(next) => setZoom((current) => (current ? { ...current, index: next } : current))}
        label="Aperçu du produit"
      />
    </section>
  );
};


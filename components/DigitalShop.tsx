"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { trackProductEvent } from "@/lib/services/track";
import { CartItem, VendorStore, MarketplaceProduct } from "@/lib/types";
import {
  Download,
  ShoppingCart,
  Store,
  Plus,
  Star,
  Search,
  X,
  ZoomIn,
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
  onOpenVendorApplication?: () => void;
  hideVendorCta?: boolean;
  onClearSearch?: () => void;
  onSearchChange?: (query: string) => void;
  initialFilter?: string | null;
  initialCategory?: string | null;
  onFilterChange?: (filterId: string) => void;
  onCategoryChange?: (slug: string) => void;
}

/** Formats de fichiers proposés en filtre secondaire (colonne `type`). */
const FORMAT_FILTERS = [
  { id: "all", label: "Tous les formats" },
  { id: "ebook", label: "eBooks" },
  { id: "canva_template", label: "Templates Canva" },
  { id: "ai_prompts", label: "Prompts IA" },
  { id: "whitepaper", label: "White papers" },
  { id: "business_plan", label: "Business plans" },
  { id: "contract", label: "Contrats" },
  { id: "pitch_deck", label: "Pitch decks" },
  { id: "premium_pack", label: "Packs premium" },
];

/**
 * Boutique numérique.
 *
 * Barre d'outils unifiée : recherche contextuelle (uniquement là où l'en-tête
 * global ne la propose pas), domaines (catégories réelles), format, boutique,
 * tri, compteur et réinitialisation.
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
  onOpenVendorApplication,
  hideVendorCta = false,
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  /** Tri des résultats (fonctionnel, appliqué aux produits réellement filtrés). */
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc" | "popular" | "rating">(
    "recent"
  );
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
      const matchesStore = selectedStoreId === "all" || prod.storeId === selectedStoreId;
      const matchesCategory = !selectedCategory || matchesProductCategory(prod, selectedCategory);
      const matchesSearch =
        !q ||
        (prod.title && prod.title.toLowerCase().includes(q)) ||
        (prod.description && prod.description.toLowerCase().includes(q)) ||
        (prod.typeLabel && prod.typeLabel.toLowerCase().includes(q)) ||
        (prod.storeName && prod.storeName.toLowerCase().includes(q));
      return matchesFormat && matchesStore && matchesCategory && matchesSearch;
    });
  }, [products, isAdmin, selectedFilter, selectedStoreId, selectedCategory, searchQuery]);

  /** Produits affichés : filtres réels + tri réel. */
  const visibleProducts = useMemo(() => {
    const list = [...filteredProducts];
    switch (sortBy) {
      case "price_asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "price_desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "popular":
        return list.sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));
      case "rating":
        return list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
      case "recent":
      default:
        return list.sort(
          (a, b) =>
            new Date(String(b.createdAt || 0)).getTime() -
            new Date(String(a.createdAt || 0)).getTime()
        );
    }
  }, [filteredProducts, sortBy]);

  const hasActiveFilters =
    selectedFilter !== "all" ||
    selectedStoreId !== "all" ||
    !!searchQuery ||
    !!selectedCategory ||
    sortBy !== "recent";

  /** Libellé lisible de la catégorie active (donnée réelle). */
  const activeCategoryLabel = useMemo(() => {
    if (!selectedCategory) return "";
    const match = categories.find((item) => item.slug === selectedCategory);
    return match?.label || selectedCategory.replace(/-/g, " ");
  }, [categories, selectedCategory]);

  const handleReset = () => {
    setSelectedFilter("all");
    setSelectedStoreId("all");
    setSelectedCategory("");
    setSortBy("recent");
    onClearSearch?.();
    onFilterChange?.("");
    onCategoryChange?.("");
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
      <div className="ibx-container space-y-5">
        {/* ================= BARRE D'OUTILS DU CATALOGUE ================= */}
        <div className="ibx-card p-3 sm:p-4">
          {/* Ligne 1 : recherche (< lg) + ouverture boutique vendeur */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex w-full items-center lg:hidden">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4"
                style={{ color: "var(--ibx-fg-subtle)" }}
                aria-hidden="true"
              />
              <input
                type="search"
                id="shop-search"
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Rechercher un produit…"
                aria-label="Rechercher dans la boutique"
                className="ibx-input pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ color: "var(--ibx-fg-muted)" }}
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {/* Desktop : la recherche est déjà dans l'en-tête global */}
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <p className="ibx-small truncate">
                {hasActiveFilters ? "Filtres actifs" : "Parcourez la boutique numérique"}
              </p>
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
            </div>

            {!hideVendorCta && (
              <button
                type="button"
                onClick={onOpenVendorApplication}
                className="ibx-btn ibx-btn-primary"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Ouvrir ma boutique
              </button>
            )}
          </div>

          {/* Ligne 2 : catégories (domaines réels) */}
          {categories.length > 0 && (
            <div
              className="ibx-scroll-x mt-3 border-t pt-3"
              style={{ borderColor: "var(--ibx-border)" }}
              role="group"
              aria-label="Explorer par catégorie"
            >
              <button
                type="button"
                className="ibx-chip"
                data-active={!selectedCategory ? "true" : "false"}
                onClick={() => handleCategorySelect("")}
              >
                Tous
              </button>
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  className="ibx-chip"
                  data-active={selectedCategory === category.slug ? "true" : "false"}
                  onClick={() => handleCategorySelect(category.slug)}
                >
                  {category.label}
                  <span className="ibx-tiny">{category.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>


        {/* Ligne 3 : format, boutique, tri, réinitialisation */}
        <div className="ibx-card flex flex-wrap items-center gap-2 p-3">
          <label className="ibx-tiny" htmlFor="shop-format">
            Format
          </label>
          <select
            id="shop-format"
            className="ibx-select"
            value={selectedFilter}
            onChange={(event) => {
              setSelectedFilter(event.target.value);
              onFilterChange?.(event.target.value === "all" ? "" : event.target.value);
            }}
          >
            {FORMAT_FILTERS.map((format) => (
              <option key={format.id} value={format.id}>
                {format.label}
              </option>
            ))}
          </select>

          {stores.length > 0 && (
            <>
              <label className="ibx-tiny" htmlFor="shop-store">
                Boutique
              </label>
              <select
                id="shop-store"
                className="ibx-select max-w-[180px]"
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
              >
                <option value="all">Toutes les boutiques</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="ibx-tiny sm:ml-auto" htmlFor="shop-sort">
            Trier
          </label>
          <select
            id="shop-sort"
            className="ibx-select"
            value={sortBy}
            onChange={(event) =>
              setSortBy(
                event.target.value as "recent" | "price_asc" | "price_desc" | "popular" | "rating"
              )
            }
          >
            <option value="recent">Plus récents</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="popular">Plus vendus</option>
            <option value="rating">Mieux notés</option>
          </select>

          {hasActiveFilters && (
            <button type="button" onClick={handleReset} className="ibx-btn ibx-btn-ghost">
              <X className="h-3 w-3" aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* ================= BANDE DE BOUTIQUES (compacte) ================= */}
        {stores.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="ibx-label">Boutiques</p>
              <button
                type="button"
                className="ibx-btn ibx-btn-ghost !px-2 !py-1"
                onClick={() => setSelectedStoreId("all")}
              >
                Toutes les boutiques
              </button>
            </div>
            <div className="ibx-scroll-x">
              {stores.map((store) => {
                const isActive = selectedStoreId === store.id;
                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => onOpenStore?.(store)}
                    className="ibx-card-flat ibx-interactive flex w-[168px] shrink-0 items-center gap-2 p-2 text-left"
                    style={{
                      borderColor: isActive ? "var(--ibx-accent)" : "var(--ibx-border)",
                    }}
                    title={store.name}
                    aria-label={`Ouvrir la boutique ${store.name}`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--ibx-radius-sm)]"
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
                      <span className="ibx-tiny block truncate font-bold">{store.name}</span>
                      <span className="ibx-tiny block truncate">
                        {Number(store.salesCount) || 0} vente
                        {(Number(store.salesCount) || 0) > 1 ? "s" : ""}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:gap-4">
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

                  <div className="ibx-media relative h-36 sm:h-40">
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
                      className="absolute left-2 top-2 max-w-[75%] truncate rounded-full px-2 py-0.5 text-[9px] font-black"
                      style={{ backgroundColor: "var(--ibx-accent)", color: "#1c1405" }}
                    >
                      {prod.typeLabel}
                    </span>
                    {prod.isPopular && !isAdmin && (
                      <span
                        className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[9px] font-black"
                        style={{
                          backgroundColor: "var(--ibx-surface)",
                          color: "var(--ibx-accent-strong)",
                        }}
                      >
                        ★ Top
                      </span>
                    )}
                  </div>


                  <div className="relative flex flex-1 flex-col gap-1.5 p-3">
                    <div className="flex items-center justify-between gap-1">
                      {prodStore ? (
                        <button
                          type="button"
                          onClick={() => onOpenStore?.(prodStore)}
                          className="ibx-tiny flex min-w-0 items-center gap-1 font-bold"
                          style={{ color: "var(--ibx-accent-strong)" }}
                        >
                          <Store className="h-3 w-3 shrink-0" aria-hidden="true" />
                          <span className="truncate">{prodStore.name}</span>
                        </button>
                      ) : (
                        <span className="ibx-tiny font-bold">FORTIA</span>
                      )}
                      {Number(prod.reviewsCount) > 0 ? (
                        <span className="ibx-tiny inline-flex shrink-0 items-center gap-0.5 font-bold">
                          <Star
                            className="h-3 w-3"
                            aria-hidden="true"
                            style={{ color: "var(--ibx-accent)", fill: "var(--ibx-accent)" }}
                          />
                          {Number(prod.rating || 0).toFixed(1)}
                        </span>
                      ) : (
                        <span className="ibx-tiny shrink-0 font-bold">Nouveau</span>
                      )}
                    </div>

                    <a
                      href={productHref}
                      onClick={() =>
                        trackProductEvent("click", prod.id, (prod as { storeId?: string }).storeId)
                      }
                      className="ibx-h3 line-clamp-2 leading-snug hover:underline"
                      style={{ color: "var(--ibx-fg)" }}
                    >
                      {prod.title}
                    </a>

                    <p className="ibx-tiny line-clamp-2">{prod.description}</p>

                    <div
                      className="mt-auto flex items-end justify-between gap-2 border-t pt-2"
                      style={{ borderColor: "var(--ibx-border)" }}
                    >
                      <div className="min-w-0">
                        <span className="ibx-price block">{pricePair.primary}</span>
                        {pricePair.secondary && (
                          <span className="ibx-tiny block">{pricePair.secondary}</span>
                        )}
                        {prod.originalPrice && Number(prod.originalPrice) > Number(prod.price) && (
                          <span className="ibx-price-old block">
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
                          className="ibx-btn ibx-btn-outline !px-2 !py-1.5"
                          title="Ajouter au panier"
                          aria-label={`Ajouter ${prod.title} au panier`}
                        >
                          <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
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
                          className="ibx-btn ibx-btn-primary !px-2 !py-1.5"
                          aria-label={`Acheter ${prod.title}`}
                        >
                          <Download className="h-3 w-3" aria-hidden="true" />
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


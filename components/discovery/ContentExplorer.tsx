"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Gift, GraduationCap, ShoppingBag, Search, X, Loader2, Layers } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useMarketplace } from "@/lib/store/domains/contexts";
import { resolveMoneyConfig } from "@/lib/data/currency";
import {
  buildMixedFeed,
  listFreeCourses,
  listFreeProducts,
  toCourseItem,
  toProductItem,
  type ExplorerItem,
} from "@/lib/data/explorer";
import { ContentCard } from "./ContentCard";

export type ExplorerMode = "free-courses" | "free-products" | "mixed";

interface ContentExplorerProps {
  mode: ExplorerMode;
  title: string;
  subtitle: string;
  /** Nombre d'éléments affichés par palier (mode mixte). */
  pageSize?: number;
}

const BADGE: Record<ExplorerMode, { label: string; icon: React.ElementType }> = {
  "free-courses": { label: "Accès libre", icon: GraduationCap },
  "free-products": { label: "Téléchargement libre", icon: ShoppingBag },
  mixed: { label: "Exploration", icon: Layers },
};

/**
 * Explorateur de contenus : formations gratuites, produits gratuits ou flux
 * mixte de découverte. Recherche, catégories réelles et pagination locale.
 * Toutes les données proviennent du store (aucun contenu inventé).
 */
export function ContentExplorer({ mode, title, subtitle, pageSize = 25 }: ContentExplorerProps) {
  const { platformLoaded, siteContent } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);
  const { courses } = useCatalog();
  const { marketplaceProducts } = useMarketplace();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [kind, setKind] = useState<"all" | "course" | "product">("all");
  const [visible, setVisible] = useState(pageSize);

  const freeCoursesCount = useMemo(() => listFreeCourses(courses).length, [courses]);
  const freeProductsCount = useMemo(
    () => listFreeProducts(marketplaceProducts).length,
    [marketplaceProducts]
  );

  const allItems = useMemo<ExplorerItem[]>(() => {
    if (mode === "free-courses") return listFreeCourses(courses).map(toCourseItem);
    if (mode === "free-products") return listFreeProducts(marketplaceProducts).map(toProductItem);
    return buildMixedFeed(courses, marketplaceProducts, 500);
  }, [mode, courses, marketplaceProducts]);

  const categories = useMemo(() => {
    const map = new Map<string, { slug: string; label: string; count: number }>();
    for (const item of allItems) {
      if (!item.categorySlug) continue;
      const existing = map.get(item.categorySlug);
      if (existing) existing.count += 1;
      else map.set(item.categorySlug, { slug: item.categorySlug, label: item.categoryLabel, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr"));
  }, [allItems]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (kind !== "all" && item.kind !== kind) return false;
      if (category !== "all" && item.categorySlug !== category) return false;
      if (!q) return true;
      return `${item.title} ${item.description} ${item.categoryLabel} ${item.author}`
        .toLowerCase()
        .includes(q);
    });
  }, [allItems, kind, category, query]);

  const shown = filtered.slice(0, visible);
  const BadgeIcon = BADGE[mode].icon;

  return (
    <div className="ibx-page ibx-catalogue">
      <header className="border-b" style={{ borderColor: "var(--ibx-border)" }}>
        <div className="ibx-container py-5 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <span className="ibx-badge">
                <BadgeIcon className="h-3 w-3" aria-hidden="true" />
                {BADGE[mode].label}
              </span>
              <h1 className="ibx-h1">{title}</h1>
              <p className="ibx-body max-w-2xl">{subtitle}</p>
              <div className="ibx-toolbar pt-0.5">
                <span className="ibx-badge">
                  <Gift className="h-3 w-3" aria-hidden="true" />
                  {freeCoursesCount} formation{freeCoursesCount > 1 ? "s" : ""} gratuite
                  {freeCoursesCount > 1 ? "s" : ""}
                </span>
                <span className="ibx-badge">
                  <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                  {freeProductsCount} produit{freeProductsCount > 1 ? "s" : ""} gratuit
                  {freeProductsCount > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:shrink-0">
              {mode !== "free-courses" && (
                <Link href="/gratuit/formations" prefetch className="ibx-btn ibx-btn-outline">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  Formations gratuites
                </Link>
              )}
              {mode !== "free-products" && (
                <Link href="/gratuit/produits" prefetch className="ibx-btn ibx-btn-outline">
                  <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
                  Produits gratuits
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="ibx-container py-5">
        <div className="ibx-card space-y-2.5 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="relative flex w-full items-center lg:flex-1">
              <Search
                className="pointer-events-none absolute left-3 h-4 w-4"
                style={{ color: "var(--ibx-fg-subtle)" }}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setVisible(pageSize);
                }}
                placeholder="Rechercher un titre, un domaine, un formateur…"
                aria-label="Rechercher un contenu"
                className="ibx-input pl-9 pr-9"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 inline-flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ color: "var(--ibx-fg-muted)" }}
                  aria-label="Effacer la recherche"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {mode === "mixed" && (
              <div className="ibx-scroll-x" role="group" aria-label="Filtrer par univers">
                {[
                  { id: "all" as const, label: "Tout" },
                  { id: "course" as const, label: "Formations" },
                  { id: "product" as const, label: "Produits" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="ibx-chip"
                    data-active={kind === option.id ? "true" : "false"}
                    onClick={() => {
                      setKind(option.id);
                      setVisible(pageSize);
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {categories.length > 1 && (
            <div
              className="ibx-scroll-x border-t pt-2.5"
              style={{ borderColor: "var(--ibx-border)" }}
              role="group"
              aria-label="Filtrer par catégorie"
            >
              <button
                type="button"
                className="ibx-chip"
                data-active={category === "all" ? "true" : "false"}
                onClick={() => {
                  setCategory("all");
                  setVisible(pageSize);
                }}
              >
                Toutes les catégories
              </button>
              {categories.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className="ibx-chip"
                  data-active={category === item.slug ? "true" : "false"}
                  onClick={() => {
                    setCategory(item.slug);
                    setVisible(pageSize);
                  }}
                >
                  {item.label}
                  <span className="text-[9px] font-bold opacity-70">{item.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="ibx-small font-semibold">
            {filtered.length} contenu{filtered.length > 1 ? "s" : ""}
            {category !== "all" || query || kind !== "all" ? " correspondant aux filtres" : ""}
          </p>
        </div>

        {!platformLoaded ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--ibx-accent)" }} />
          </div>
        ) : shown.length === 0 ? (
          <div className="ibx-empty mt-3">
            <p className="ibx-h3">Aucun contenu ne correspond à cette sélection</p>
            <p className="ibx-small mt-1">
              Modifiez la recherche ou choisissez une autre catégorie.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
              {shown.map((item) => (
                <ContentCard key={item.key} item={item} money={money} />
              ))}
            </div>

            {visible < filtered.length && (
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => setVisible((count) => count + pageSize)}
                  className="ibx-btn ibx-btn-outline"
                >
                  Afficher {Math.min(pageSize, filtered.length - visible)} contenu
                  {Math.min(pageSize, filtered.length - visible) > 1 ? "s" : ""} de plus
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

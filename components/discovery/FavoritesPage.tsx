"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Heart, LogIn, Compass } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useAuth, useCatalog, useMarketplace } from "@/lib/store/domains/contexts";
import { resolveMoneyConfig } from "@/lib/data/currency";
import { toCourseItem, toProductItem, type ExplorerItem } from "@/lib/data/explorer";
import { useFavorites } from "@/lib/store/favoritesStore";
import { ContentCard } from "./ContentCard";

/**
 * Page « Mes favoris ».
 *
 * Les favoris sont enregistrés en base (`favorites`) par compte. La page
 * résout les identifiants stockés vers les contenus réels déjà chargés par
 * l'application (aucune donnée inventée, aucun appel superflu).
 */
export function FavoritesPage() {
  const { siteContent, platformLoaded } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);
  const { isUserLoggedIn } = useAuth();
  const { courses } = useCatalog();
  const { marketplaceProducts } = useMarketplace();
  const { entries, status } = useFavorites();

  const items = useMemo<ExplorerItem[]>(() => {
    const courseById = new Map<string, any>((courses || []).map((course: any) => [String(course.id), course]));
    const productById = new Map<string, any>(
      (marketplaceProducts || []).map((product: any) => [String(product.id), product])
    );

    const resolved: ExplorerItem[] = [];
    for (const entry of entries) {
      if (entry.resourceType === "course") {
        const course = courseById.get(entry.resourceId);
        if (course) resolved.push(toCourseItem(course));
      } else {
        const product = productById.get(entry.resourceId);
        if (product) resolved.push(toProductItem(product));
      }
    }
    return resolved;
  }, [entries, courses, marketplaceProducts]);

  const loading = !platformLoaded || status === "loading";

  return (
    <div className="ibx-page ibx-catalogue">
      <header className="border-b" style={{ borderColor: "var(--ibx-border)" }}>
        <div className="ibx-container py-5 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <span className="ibx-badge">
                <Heart className="h-3 w-3" aria-hidden="true" />
                Ma sélection
              </span>
              <h1 className="ibx-h1">Mes favoris</h1>
              <p className="ibx-body max-w-2xl">
                Les formations et produits numériques que vous avez mis de côté.
                Retrouvez-les ici à tout moment.
              </p>
              <div className="ibx-toolbar pt-0.5">
                <span className="ibx-badge">
                  <Heart className="h-3 w-3" aria-hidden="true" />
                  {items.length} contenu{items.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <Link href="/decouvrir" prefetch className="ibx-btn ibx-btn-outline">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                Découvrir des contenus
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="ibx-container py-5">
        {!isUserLoggedIn ? (
          <div className="ibx-card p-6 text-center">
            <span
              className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--ibx-radius-md)]"
              style={{ backgroundColor: "var(--ibx-accent-soft)", color: "var(--ibx-accent-strong)" }}
              aria-hidden="true"
            >
              <Heart className="h-5 w-5" />
            </span>
            <p className="ibx-h3">Connectez-vous pour retrouver vos favoris</p>
            <p className="ibx-small mx-auto mt-1 max-w-md">
              Vos favoris sont enregistrés sur votre compte et restent disponibles sur tous vos appareils.
            </p>
            <Link href="/login" prefetch className="ibx-btn ibx-btn-primary mt-3">
              <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
              Se connecter
            </Link>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="ibx-small">Chargement de vos favoris…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="ibx-empty">
            <p className="ibx-h3">Aucun favori pour le moment</p>
            <p className="ibx-small mx-auto mt-1 max-w-md">
              Touchez le cœur sur un produit ou une formation pour l&apos;ajouter ici.
            </p>
            <Link href="/decouvrir" prefetch className="ibx-btn ibx-btn-primary mt-3">
              Explorer les contenus
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-3">
            {items.map((item) => (
              <ContentCard key={item.key} item={item} money={money} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

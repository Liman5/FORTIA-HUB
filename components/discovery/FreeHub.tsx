"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Gift,
  GraduationCap,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Download,
  BadgeCheck,
} from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { useCatalog, useMarketplace } from "@/lib/store/domains/contexts";
import { resolveMoneyConfig, type MoneyConfig } from "@/lib/data/currency";
import {
  listFreeCourses,
  listFreeProducts,
  toCourseItem,
  toProductItem,
  type ExplorerItem,
} from "@/lib/data/explorer";
import { ContentCard } from "./ContentCard";

/**
 * Page d'entrée « Gratuit ».
 * Deux univers séparés (formations / produits) + rappel des règles d'accès.
 */
export function FreeHub() {
  const { platformLoaded, siteContent } = useAppStore();
  const money = useMemo(() => resolveMoneyConfig(siteContent), [siteContent]);
  const { courses } = useCatalog();
  const { marketplaceProducts } = useMarketplace();

  const freeCourses = useMemo(() => listFreeCourses(courses).map(toCourseItem), [courses]);
  const freeProducts = useMemo(
    () => listFreeProducts(marketplaceProducts).map(toProductItem),
    [marketplaceProducts]
  );

  const highlights = [
    {
      icon: ShieldCheck,
      title: "Aucun paiement",
      description: "Un contenu gratuit reste gratuit : pas de panier, pas de frais cachés.",
    },
    {
      icon: Download,
      title: "Accès immédiat",
      description: "La formation ou le fichier s'ouvre directement depuis la fiche.",
    },
    {
      icon: BadgeCheck,
      title: "Certificat inclus",
      description: "Les formations gratuites délivrent aussi leur certificat vérifiable.",
    },
  ];

  return (
    <div className="ibx-page ibx-catalogue">
      <header className="border-b" style={{ borderColor: "var(--ibx-border)" }}>
        <div className="ibx-container py-5 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <span className="ibx-badge">
                <Gift className="h-3 w-3" aria-hidden="true" />
                Accès libre
              </span>
              <h1 className="ibx-h1">Formations &amp; produits gratuits</h1>
              <p className="ibx-body max-w-2xl">
                Tout ce qui est librement accessible sur FORTIA HUB, réuni au même endroit.
                Apprenez ou téléchargez sans rien payer.
              </p>
              <div className="ibx-toolbar pt-0.5">
                <span className="ibx-badge">
                  <GraduationCap className="h-3 w-3" aria-hidden="true" />
                  {freeCourses.length} formation{freeCourses.length > 1 ? "s" : ""}
                </span>
                <span className="ibx-badge">
                  <ShoppingBag className="h-3 w-3" aria-hidden="true" />
                  {freeProducts.length} produit{freeProducts.length > 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:shrink-0">
              <Link href="/gratuit/formations" prefetch className="ibx-btn ibx-btn-primary">
                Formations gratuites
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              <Link href="/gratuit/produits" prefetch className="ibx-btn ibx-btn-outline">
                Produits gratuits
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="ibx-container space-y-7 py-6">
        <FreeRail
          title="Formations gratuites"
          description="Des parcours complets, en vidéo et en PDF, accessibles sans paiement."
          href="/gratuit/formations"
          items={freeCourses}
          money={money}
          loading={!platformLoaded}
          emptyLabel="Aucune formation gratuite n'est publiée pour le moment."
        />

        <FreeRail
          title="Produits numériques gratuits"
          description="Ebooks, modèles et ressources prêtes à télécharger, sans frais."
          href="/gratuit/produits"
          items={freeProducts}
          money={money}
          loading={!platformLoaded}
          emptyLabel="Aucun produit gratuit n'est disponible pour le moment."
        />

        <section className="grid gap-2.5 sm:grid-cols-3">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="ibx-card-flat ibx-interactive flex items-start gap-3 p-3.5">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--ibx-radius-sm)]"
                  style={{ backgroundColor: "var(--ibx-success-soft)", color: "var(--ibx-success)" }}
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="ibx-h3 block !text-[12px]">{item.title}</span>
                  <span className="ibx-tiny mt-0.5 block !text-[10px]">{item.description}</span>
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

/** Rangée horizontale de contenus gratuits (défilement natif + snap). */
function FreeRail({
  title,
  description,
  href,
  items,
  money,
  loading,
  emptyLabel,
}: {
  title: string;
  description: string;
  href: string;
  items: ExplorerItem[];
  money: MoneyConfig;
  loading: boolean;
  emptyLabel: string;
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="ibx-h2">{title}</h2>
          <p className="ibx-small mt-0.5">{description}</p>
        </div>
        <Link href={href} prefetch className="ibx-btn ibx-btn-ghost !px-2 !py-1 !text-[10px]">
          Voir tout
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      </div>

      {loading ? (
        <div className="ibx-card-muted flex h-24 items-center justify-center">
          <span className="ibx-small">Chargement…</span>
        </div>
      ) : items.length === 0 ? (
        <div className="ibx-empty">
          <p className="ibx-small">{emptyLabel}</p>
        </div>
      ) : (
        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.slice(0, 12).map((item) => (
            <div key={item.key} className="w-[200px] shrink-0 snap-start">
              <ContentCard item={item} money={money} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Download, Star, ArrowRight } from "lucide-react";
import type { ExplorerItem } from "@/lib/data/explorer";
import { formatPricePair, type MoneyConfig } from "@/lib/data/currency";

/**
 * Carte de contenu (formation ou produit numérique).
 *
 * • Navigation instantanée : liens Next avec `prefetch` (aucun rechargement).
 * • La catégorie reste cliquable : elle mène au catalogue filtré de son univers.
 * • Aucun `<a>` imbriqué : la carte contient deux liens frères (fiche + catégorie).
 */
export function ContentCard({ item, money }: { item: ExplorerItem; money: MoneyConfig }) {
  const price = formatPricePair(item.price, money);

  return (
    <article className="ibx-card-flat ibx-interactive group relative flex h-[286px] flex-col overflow-hidden">
      <Link
        href={item.href}
        prefetch
        className="flex min-h-0 flex-1 flex-col focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ outlineColor: "var(--ibx-focus)" }}
        aria-label={`Ouvrir ${item.title}`}
      >
        <span className="ibx-media relative block h-32 shrink-0">
          {item.image ? (
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center" aria-hidden="true">
              {item.kind === "course" ? (
                <GraduationCap className="h-6 w-6" style={{ color: "var(--ibx-fg-subtle)" }} />
              ) : (
                <Download className="h-6 w-6" style={{ color: "var(--ibx-fg-subtle)" }} />
              )}
            </span>
          )}

          <span
            className="absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
            style={{ backgroundColor: "var(--ibx-surface)", color: "var(--ibx-fg-muted)", border: "1px solid var(--ibx-border)" }}
          >
            {item.kind === "course" ? "Formation" : "Produit"}
          </span>

          {item.isFree && (
            <span
              className="absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: "var(--ibx-success)", color: "#04140c" }}
            >
              Gratuit
            </span>
          )}
        </span>

        <span className="block px-2.5 pt-2">
          {/* Hauteur fixe : le titre occupe toujours deux lignes (tronquées). */}
          <span className="ibx-h3 line-clamp-2 h-[33px] !text-[12.5px] leading-[1.3]">
            {item.title}
          </span>
          {/* Description tronquée sur deux lignes, hauteur réservée : aucune
              carte ne s'agrandit avec un texte plus long. */}
          <span className="ibx-tiny mt-0.5 line-clamp-2 h-[26px] !text-[9.5px] leading-[1.35]">
            {item.description || ""}
          </span>
        </span>
      </Link>

      <div className="mt-auto space-y-1.5 p-2.5 pt-2">
        <div className="flex items-center justify-between gap-1.5">
          <Link
            href={item.categoryHref}
            prefetch
            className="max-w-[70%] truncate rounded border px-1.5 py-0.5 text-[8.5px] font-semibold transition hover:opacity-80"
            style={{ borderColor: "var(--ibx-border)", color: "var(--ibx-accent-strong)" }}
            title={`Voir la catégorie ${item.categoryLabel}`}
          >
            {item.categoryLabel}
          </Link>
          <span className="flex shrink-0 items-center gap-0.5 text-[9px]" style={{ color: "var(--ibx-fg-muted)" }}>
            {item.reviewsCount > 0 ? (
              <>
                <Star className="h-2.5 w-2.5" style={{ color: "var(--ibx-accent)", fill: "var(--ibx-accent)" }} aria-hidden="true" />
                {item.rating.toFixed(1)}
              </>
            ) : (
              item.meta || (item.kind === "course" ? "En ligne" : "Téléchargeable")
            )}
          </span>
        </div>

        <div
          className="flex items-end justify-between gap-1.5 border-t pt-1.5"
          style={{ borderColor: "var(--ibx-border)" }}
        >
          <span className="min-w-0">
            {item.isFree ? (
              <span className="block text-[11px] font-bold" style={{ color: "var(--ibx-success)" }}>
                Accès libre
              </span>
            ) : (
              <>
                <span className="ibx-price block !text-[12.5px]">{price.primary}</span>
                {price.secondary && <span className="ibx-tiny block !text-[9px]">{price.secondary}</span>}
              </>
            )}
            <span className="ibx-tiny block truncate !text-[9px]">{item.author}</span>
          </span>
          <Link
            href={item.href}
            prefetch
            className="ibx-btn ibx-btn-outline shrink-0 !px-2 !py-1 !text-[9.5px]"
          >
            Voir
            <ArrowRight className="h-2.5 w-2.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

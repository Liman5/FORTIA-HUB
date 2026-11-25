"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, BookOpen, ShoppingBag, FileText, Gift } from "lucide-react";
import {
  COURSE_CATEGORY_FAMILIES,
  FREE_COURSE_CATEGORY_LABEL,
  FREE_COURSE_CATEGORY_SLUG,
} from "@/lib/data/courseCategories";
import { REFERENCE_PRODUCT_CATEGORIES } from "@/components/CategorySelect";
import { buildProductCategories } from "@/lib/data/productCategories";
import { useCatalog, useMarketplace } from "@/lib/store/domains/contexts";

type Kind = "course" | "product" | "resource";

const RESOURCE_TYPES = new Set(["ebook", "canva_template", "ai_prompts", "business_plan", "whitepaper", "contract", "pitch_deck", "premium_pack", "template_excel", "notion", "audio", "photo_pack", "preset", "plugin", "mockup"]);

export function CategoryHub({ kind }: { kind: Kind }) {
  const router = useRouter();
  const { courseCategories, courses } = useCatalog();
  const { marketplaceProducts } = useMarketplace();
  const [query, setQuery] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (kind === "course") {
      const families = COURSE_CATEGORY_FAMILIES.filter(
        (family) => !q || family.label.toLowerCase().includes(q)
      ).map((family) => ({
        id: family.slug,
        label: family.label,
        description: "Formations de cette catégorie",
        count: (courses || []).filter((course: any) => {
          const code = String(course?.category?.code || course?.categoryCode || course?.categoryId || "");
          return family.codes.includes(code) || String(course?.categoryLabel || "").toLowerCase() === family.label.toLowerCase();
        }).length,
        href: `/academy?categorie=${encodeURIComponent(family.slug)}`,
        icon: family.icon,
      }));

      // Catégorie transversale « Gratuit » : ajoutée en tête du répertoire.
      const freeCount = (courses || []).filter(
        (course: any) =>
          course?.isPublished !== false &&
          course?.price !== null &&
          course?.price !== undefined &&
          Number(course?.price) === 0
      ).length;
      const freeMatches = !q || FREE_COURSE_CATEGORY_LABEL.toLowerCase().includes(q) || "gratuit".includes(q);
      if (freeCount > 0 && freeMatches) {
        families.unshift({
          id: FREE_COURSE_CATEGORY_SLUG,
          label: FREE_COURSE_CATEGORY_LABEL,
          description: "Formations accessibles sans paiement",
          count: freeCount,
          href: `/academy?categorie=${encodeURIComponent(FREE_COURSE_CATEGORY_SLUG)}`,
          icon: Gift,
        });
      }

      return families;
    }
    const products = (marketplaceProducts || []).filter((p: any) => p?.isPublished !== false);

    // Ressources : classement par FORMAT/TYPE réel (ebook, template, prompts…).
    if (kind === "resource") {
      return REFERENCE_PRODUCT_CATEGORIES
        .filter((category) => RESOURCE_TYPES.has(category.code))
        .filter((category) => !q || category.label.toLowerCase().includes(q) || category.code.toLowerCase().includes(q))
        .map((category) => ({
          id: category.code,
          label: category.label,
          description: "Ressource numérique téléchargeable",
          count: products.filter((p: any) => String(p?.type || "") === category.code).length,
          href: `/marketplace/ressources?type=${encodeURIComponent(category.code)}`,
          icon: FileText,
        }));
    }

    // Produits : catégories (domaines) réellement utilisées par les vendeurs,
    // puis catégories de référence encore inutilisées.
    const real = buildProductCategories(products);
    const used = new Set(real.map((category) => category.slug));
    const extras = REFERENCE_PRODUCT_CATEGORIES
      .filter((category) => category.code !== "course" && category.code !== "service")
      .map((category) => ({
        slug: category.code,
        label: category.label,
        count: products.filter((p: any) => String(p?.type || "") === category.code).length,
      }))
      .filter((category) => !used.has(category.slug));

    return [...real, ...extras]
      .filter((category) => !q || category.label.toLowerCase().includes(q) || category.slug.includes(q))
      .map((category) => ({
        id: category.slug,
        label: category.label,
        description: "Produits numériques de cette catégorie",
        count: category.count,
        href: `/marketplace?categorie=${encodeURIComponent(category.slug)}`,
        icon: FileText,
      }));
  }, [kind, query, courseCategories, courses, marketplaceProducts]);

  return (
    <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <button type="button" onClick={() => router.push(kind === "course" ? "/academy" : "/marketplace")} className="ibx-btn ibx-btn-ghost">
          ← {kind === "course" ? "Toutes les formations" : "Boutique numérique"}
        </button>
        <header className="space-y-2">
          <span className="ibx-badge ibx-badge-info">{kind === "course" ? <BookOpen className="h-3.5 w-3.5" /> : <ShoppingBag className="h-3.5 w-3.5" />} {kind === "course" ? "Académie" : kind === "resource" ? "Ressources" : "Boutique"}</span>
          <h1 className="ibx-fg text-2xl font-black sm:text-3xl">
            {kind === "course" ? "Toutes les catégories de formation" : kind === "resource" ? "Toutes les ressources numériques" : "Toutes les catégories de produits"}
          </h1>
          <p className="ibx-fg-muted max-w-2xl text-sm">
            {kind === "course" ? "Parcourez les formations par domaine et accédez directement au catalogue filtré." : "Découvrez les produits numériques classés par usage, format et besoin."}
          </p>
        </header>
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ibx-fg-subtle)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une catégorie…" className="ibx-input pl-10" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => router.push(item.href)} className="ibx-surface group flex items-start gap-3 rounded-[var(--ibx-radius-md)] p-4 text-left transition hover:border-[var(--ibx-accent)]">
                <span className="ibx-surface-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[var(--ibx-accent-strong)]"><Icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="ibx-fg block text-sm font-bold">{item.label}</span>
                  <span className="ibx-fg-muted mt-1 block text-[11px] line-clamp-2">{item.description}</span>
                  <span className="ibx-fg-subtle mt-2 flex items-center justify-between text-[10px] font-semibold">
                    <span>{item.count} contenu{item.count > 1 ? "s" : ""}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {items.length === 0 && <p className="ibx-fg-muted rounded-xl border border-dashed border-[var(--ibx-border)] p-8 text-center text-sm">Aucune catégorie ne correspond à cette recherche.</p>}
      </div>
    </div>
  );
}

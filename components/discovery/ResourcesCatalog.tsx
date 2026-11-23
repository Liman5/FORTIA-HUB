"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Download, ArrowRight } from "lucide-react";
import { useMarketplace } from "@/lib/store/domains/contexts";
import { REFERENCE_PRODUCT_CATEGORIES } from "@/components/CategorySelect";

const RESOURCE_TYPES = ["ebook", "canva_template", "ai_prompts", "business_plan", "whitepaper", "contract", "pitch_deck", "premium_pack", "template_excel", "notion", "audio", "photo_pack", "preset", "plugin", "mockup"];

export function ResourcesCatalog() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { marketplaceProducts } = useMarketplace();
  const [query, setQuery] = useState("");
  const type = searchParams?.get("type") || "all";

  const categories = REFERENCE_PRODUCT_CATEGORIES.filter((category) => RESOURCE_TYPES.includes(category.code));
  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (marketplaceProducts || []).filter((product: any) => {
      if (product?.isPublished === false) return false;
      if (!RESOURCE_TYPES.includes(String(product?.type || ""))) return false;
      if (type !== "all" && String(product?.type || "") !== type) return false;
      if (!q) return true;
      return `${product.title || ""} ${product.description || ""} ${product.typeLabel || ""}`.toLowerCase().includes(q);
    });
  }, [marketplaceProducts, query, type]);

  const setType = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (value === "all") params.delete("type");
    else params.set("type", value);
    router.replace(`/marketplace/ressources${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
  };

  return (
    <div className="ibx-ui min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <span className="ibx-badge ibx-badge-info"><Download className="h-3.5 w-3.5" /> Bibliothèque numérique</span>
          <h1 className="ibx-fg text-2xl font-black sm:text-3xl">Ressources numériques</h1>
          <p className="ibx-fg-muted max-w-2xl text-sm">Ebooks, templates, prompts et outils téléchargeables immédiatement après achat.</p>
          <button type="button" onClick={() => router.push("/marketplace/categories")} className="ibx-btn ibx-btn-ghost">Toutes les catégories <ArrowRight className="h-3.5 w-3.5" /></button>
        </header>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative block w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ibx-fg-subtle)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une ressource…" className="ibx-input pl-10" />
          </label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="ibx-input max-w-xs">
            <option value="all">Tous les formats</option>
            {categories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product: any) => (
            <button key={product.id} type="button" onClick={() => router.push(`/product/${encodeURIComponent(product.slug || product.id)}`)} className="ibx-surface overflow-hidden rounded-[var(--ibx-radius-md)] text-left transition hover:border-[var(--ibx-accent)]">
              {product.image ? <img src={product.image} alt={product.title} className="h-36 w-full object-cover" /> : <div className="flex h-36 items-center justify-center bg-[var(--ibx-surface-muted)] text-[var(--ibx-fg-subtle)]"><Download className="h-8 w-8" /></div>}
              <div className="space-y-1.5 p-4">
                <span className="ibx-fg line-clamp-1 text-sm font-bold">{product.title}</span>
                <span className="ibx-fg-muted line-clamp-2 text-[11px]">{product.description}</span>
                <span className="ibx-fg flex items-center justify-between pt-1 text-xs font-black"><span>{product.price > 0 ? `${product.price} $` : "Gratuit"}</span><span className="ibx-fg-subtle text-[10px]">{product.typeLabel}</span></span>
              </div>
            </button>
          ))}
        </div>
        {products.length === 0 && <p className="ibx-fg-muted rounded-xl border border-dashed border-[var(--ibx-border)] p-8 text-center text-sm">Aucune ressource ne correspond à cette sélection.</p>}
      </div>
    </div>
  );
}

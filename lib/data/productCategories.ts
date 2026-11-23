// ============================================================
// FORTIA HUB — CATÉGORIES DE PRODUITS NUMÉRIQUES
// ------------------------------------------------------------
// Les vendeurs classent un produit par DOMAINE (taxonomie partagée avec
// les formations : crypto, IA, marketing, design…). Le domaine réellement
// choisi est conservé dans `typeLabel` ; `type` reste le type technique
// (enum SQL `product_type`).
//
// Ce module construit donc les catégories de produits À PARTIR DES
// DONNÉES RÉELLES (`typeLabel`), et non du seul enum technique — sinon
// les domaines (IA, Business, Finance…) n'apparaîtraient jamais.
//
// Univers strictement séparés : un produit de type `course`/`service`
// n'est jamais listé ici. Aucune dépendance React (module testable).
// ============================================================

import { slugifyLabel } from "@/lib/data/slug";

/** Types techniques qui ne sont pas des produits téléchargeables. */
export const NON_DIGITAL_TYPES = ["course", "service"];

export interface ProductCategoryOption {
  /** Identifiant stable utilisé dans l'URL : /marketplace?categorie=<slug> */
  slug: string;
  label: string;
  /** Nombre de produits publiés réellement rattachés. */
  count: number;
}

function productCategoryLabel(product: {
  typeLabel?: string | null;
  type?: string | null;
}): string {
  const label = String(product?.typeLabel || "").trim();
  if (label) return label;
  const type = String(product?.type || "").trim();
  return type === "ai_prompts" ? "Prompts IA" : type;
}

/** Catégories réellement utilisées par les produits publiés. */
export function buildProductCategories(
  products: unknown[] | null | undefined
): ProductCategoryOption[] {
  const map = new Map<string, ProductCategoryOption>();

  for (const raw of products || []) {
    const product = raw as { isPublished?: boolean; type?: string; typeLabel?: string };
    if (!product || product.isPublished === false) continue;
    if (NON_DIGITAL_TYPES.includes(String(product.type || ""))) continue;

    const label = productCategoryLabel(product);
    if (!label) continue;
    const slug = slugifyLabel(label);
    if (!slug) continue;

    const existing = map.get(slug);
    if (existing) existing.count += 1;
    else map.set(slug, { slug, label, count: 1 });
  }

  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, "fr")
  );
}

/** Un produit appartient-il à cette catégorie (slug) ? */
export function matchesProductCategory(
  product: { type?: string | null; typeLabel?: string | null } | null | undefined,
  slug: string
): boolean {
  const wanted = String(slug || "").trim();
  if (!wanted) return true;
  if (!product) return false;
  const label = productCategoryLabel(product);
  if (label && slugifyLabel(label) === wanted) return true;
  return String(product.type || "") === wanted;
}

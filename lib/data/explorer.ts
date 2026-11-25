// ============================================================
// FORTIA HUB — CONTENUS GRATUITS & FLUX MIXTE DE DÉCOUVERTE
// ------------------------------------------------------------
// Règles métier (source unique, testable, sans dépendance React) :
//   • un contenu est GRATUIT quand son prix est à 0 (ou absent) ;
//   • la catégorie « Gratuit » est un FILTRE transversal, pas une
//     catégorie stockée en base : elle s'ajoute aux catégories réelles
//     des formations et des produits ;
//   • le flux « À découvrir » mélange formations et produits numériques
//     pour l'exploration (25 éléments par défaut).
//
// Aucune donnée n'est inventée : tout provient des listes réelles
// fournies par le store.
// ============================================================

import { getCourseCategoryInfo, slugifyCategory } from "@/lib/data/courseCategories";
import { NON_DIGITAL_TYPES } from "@/lib/data/productCategories";

/** Slug d'URL de la catégorie transversale « Gratuit ». */
export const FREE_CATEGORY_SLUG = "gratuit";
/** Libellé affiché de la catégorie « Gratuit ». */
export const FREE_CATEGORY_LABEL = "Gratuit";

/** Un prix nul (explicitement à 0) signifie un accès libre. */
export function isFreePrice(price: unknown): boolean {
  if (price === null || price === undefined || price === "") return false;
  const value = Number(price);
  return Number.isFinite(value) && value === 0;
}

/** Formation accessible gratuitement (publiée). */
export function isFreeCourse(course: any): boolean {
  if (!course) return false;
  if (course.isPublished === false) return false;
  return isFreePrice(course.price);
}

/** Produit numérique téléchargeable gratuitement (publié, hors formation/service). */
export function isFreeProduct(product: any): boolean {
  if (!product) return false;
  if (product.isPublished === false) return false;
  if (NON_DIGITAL_TYPES.includes(String(product?.type || ""))) return false;
  return isFreePrice(product.price);
}

/** Formations gratuites, les mieux notées d'abord. */
export function listFreeCourses(courses: any[] | null | undefined): any[] {
  return (courses || [])
    .filter(isFreeCourse)
    .sort(
      (a, b) =>
        (Number(b?.rating) || 0) - (Number(a?.rating) || 0) ||
        (Number(b?.studentsCount) || 0) - (Number(a?.studentsCount) || 0)
    );
}

/** Produits numériques gratuits, les plus récents d'abord. */
export function listFreeProducts(products: any[] | null | undefined): any[] {
  return (products || [])
    .filter(isFreeProduct)
    .sort(
      (a, b) =>
        new Date(String(b?.createdAt || 0)).getTime() -
        new Date(String(a?.createdAt || 0)).getTime()
    );
}

/** Lien public d'une formation. */
export function courseHref(course: any): string {
  return `/course/${encodeURIComponent(String(course?.slug || course?.id || ""))}`;
}

/** Lien public d'un produit numérique. */
export function productHref(product: any): string {
  return `/product/${encodeURIComponent(String(product?.slug || product?.id || ""))}`;
}

/** Élément normalisé, commun aux formations et aux produits. */
export interface ExplorerItem {
  key: string;
  kind: "course" | "product";
  id: string;
  title: string;
  href: string;
  image: string;
  description: string;
  price: number;
  isFree: boolean;
  /** Libellé de catégorie réel (domaine du vendeur / catégorie de formation). */
  categoryLabel: string;
  /** Identifiant de catégorie utilisé dans les URL de catalogue. */
  categorySlug: string;
  /** Lien vers la catégorie (catalogue filtré). */
  categoryHref: string;
  rating: number;
  reviewsCount: number;
  /** Métadonnée courte : niveau + durée (formation) ou format (produit). */
  meta: string;
  /** Prestataire : formateur / boutique. */
  author: string;
}

/** Normalise une formation pour l'exploration. */
export function toCourseItem(course: any): ExplorerItem {
  const info = getCourseCategoryInfo(course);
  const categoryLabel = info.label || String(course?.categoryLabel || "Formation");
  const categorySlug = info.code || slugifyCategory(categoryLabel);
  const price = Number(course?.price) || 0;
  const duration = Number(course?.durationHours) || 0;
  return {
    key: `course-${course.id}`,
    kind: "course",
    id: String(course.id),
    title: String(course.title || "Formation"),
    href: courseHref(course),
    image: String(course.image || ""),
    description: String(course.description || ""),
    price,
    isFree: isFreePrice(price),
    categoryLabel,
    categorySlug,
    categoryHref: categorySlug
      ? `/academy?categorie=${encodeURIComponent(categorySlug)}`
      : "/academy",
    rating: Number(course.rating) || 0,
    reviewsCount: Number(course.reviewsCount) || 0,
    meta: [String(course.level || "").replace(/_/g, " "), duration > 0 ? `${duration} h` : ""]
      .filter(Boolean)
      .join(" · "),
    author: String(course.instructor?.name || course.instructorName || "FORTIA HUB"),
  };
}

/** Normalise un produit numérique pour l'exploration. */
export function toProductItem(product: any): ExplorerItem {
  const categoryLabel = String(product?.typeLabel || product?.type || "Produit numérique");
  const categorySlug = slugifyCategory(categoryLabel);
  const price = Number(product?.price) || 0;
  return {
    key: `product-${product.id}`,
    kind: "product",
    id: String(product.id),
    title: String(product.title || "Produit numérique"),
    href: productHref(product),
    image: String(product.image || product.bannerImage || ""),
    description: String(product.description || ""),
    price,
    isFree: isFreePrice(price),
    categoryLabel,
    categorySlug,
    categoryHref: categorySlug
      ? `/marketplace?categorie=${encodeURIComponent(categorySlug)}`
      : "/marketplace",
    rating: Number(product.rating) || 0,
    reviewsCount: Number(product.reviewsCount) || 0,
    meta: [String(product.fileFormat || ""), String(product.fileSize || "")]
      .filter(Boolean)
      .join(" · "),
    author: String(product.storeName || "FORTIA HUB"),
  };
}

/**
 * Flux mixte « à découvrir » : formations et produits numériques alternés.
 * Les contenus gratuits remontent (accès libre), puis la note et la
 * popularité réelles décident de l'ordre. Aucun score inventé.
 */
export function buildMixedFeed(
  courses: any[] | null | undefined,
  products: any[] | null | undefined,
  limit = 25
): ExplorerItem[] {
  const courseItems = (courses || [])
    .filter((course) => course && course.isPublished !== false)
    .map(toCourseItem);
  const productItems = (products || [])
    .filter((product) => product && product.isPublished !== false)
    .filter((product) => !NON_DIGITAL_TYPES.includes(String(product?.type || "")))
    .map(toProductItem);

  const score = (item: ExplorerItem) =>
    (item.isFree ? 1000 : 0) + item.rating * 20 + Math.min(item.reviewsCount, 200);

  const coursesRanked = [...courseItems].sort((a, b) => score(b) - score(a));
  const productsRanked = [...productItems].sort((a, b) => score(b) - score(a));

  // Alternance 1 formation / 1 produit : un flux varié, jamais deux fois le
  // même univers d'affilée tant que les deux listes contiennent des éléments.
  const mixed: ExplorerItem[] = [];
  let i = 0;
  let j = 0;
  while (mixed.length < limit && (i < coursesRanked.length || j < productsRanked.length)) {
    if (i < coursesRanked.length) mixed.push(coursesRanked[i++]);
    if (mixed.length >= limit) break;
    if (j < productsRanked.length) mixed.push(productsRanked[j++]);
  }
  return mixed;
}


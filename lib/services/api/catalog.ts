// ============================================================
// FORTIA HUB — API CLIENT : CATALOGUE (Académie)
// ============================================================
import { fetchDomain } from "./http";

/** Taille de page par défaut du catalogue (charge initiale). */
export const CATALOG_DEFAULT_LIMIT = 24;

export interface CatalogResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courses: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courseCategories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trainingCenters: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface CatalogQuery {
  page?: number;
  limit?: number;
  /** Codes réels de catégories (issus du mapping des familles) */
  codes?: string[];
  q?: string;
  center?: string;
  view?: "populaires" | "mieux-notees" | "nouveautes" | "mises-en-avant" | "toutes";
  /** Non paginé (espaces de gestion) */
  all?: boolean;
  /** Inclut les brouillons — exige une session valide */
  includeUnpublished?: boolean;
}

/** Construit la chaîne de requête (sert aussi de clé de cache). */
export function catalogQueryString(query: CatalogQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.codes?.length) params.set("codes", query.codes.join(","));
  if (query.q) params.set("q", query.q);
  if (query.center) params.set("center", query.center);
  if (query.view) params.set("view", query.view);
  if (query.all) params.set("all", "1");
  if (query.includeUnpublished) params.set("includeUnpublished", "1");
  return params.toString();
}

/** Liste de formations (métadonnées seules) — mise en cache 5 min. */
export async function fetchCatalog(
  query: CatalogQuery = {},
  force = false
): Promise<CatalogResult | null> {
  const qs = catalogQueryString(query);
  return fetchDomain<CatalogResult>("catalog", `/api/catalog?${qs}`, {
    suffix: qs || "default",
    force,
  });
}

/** Détail complet d'une formation (chapitres, leçons, quiz) — cache 10 min. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchCourseDetail(idOrSlug: string, force = false): Promise<any | null> {
  if (!idOrSlug) return null;
  return fetchDomain("courseDetail", `/api/catalog/course/${encodeURIComponent(idOrSlug)}`, {
    suffix: idOrSlug,
    force,
  });
}

/** Toutes les formations (y compris brouillons) — espaces formateur / admin. */
export async function fetchAllCourses(force = false): Promise<CatalogResult | null> {
  return fetchCatalog({ all: true, includeUnpublished: true }, force);
}

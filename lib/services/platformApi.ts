// ============================================================
// FORTIA HUB — AGRÉGATEUR DE DONNÉES PLATEFORME
// ------------------------------------------------------------
// ⚠️ Depuis la Phase 1, les données ne viennent PLUS d'un endpoint
// monolithique : chaque domaine possède sa route et son cache.
//   • Académie    → /api/catalog   (liste allégée, paginée)
//   • Boutique    → /api/marketplace
//   • Services    → /api/services
//   • Site        → /api/site
//   • Admin       → /api/platform/admin-sync (session admin obligatoire)
//
// Ce module conserve la MÊME forme de retour qu'avant : le store et les
// pages ne changent pas. Il borne simplement la charge initiale
// (`CATALOG_PAGE_SIZE`) : les pages qui ont besoin de davantage appellent
// `loadMoreCourses()` / `loadAllCourses()` du store.
// ============================================================

import { fetchCatalog, CATALOG_DEFAULT_LIMIT } from "./api/catalog";
import { fetchMarketplace } from "./api/marketplace";
import { fetchServices } from "./api/services";
import { fetchSite } from "./api/site";
import { fetchBanners } from "./api/banners";
import { clearCache, fetchDomain } from "./api/http";

export const CATALOG_PAGE_SIZE = CATALOG_DEFAULT_LIMIT;

export interface PlatformData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courses: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  courseCategories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trainingCenters: any[];
  /** Nombre TOTAL de formations (pagination serveur). */
  catalogTotal: number;
  /** Reste-t-il des formations à charger ? */
  catalogHasMore: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stores: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  servicePackages: any[];
  /** Bannières du site — module indépendant (/api/banners). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  siteBanners?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  freelances: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enterprises: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blogPosts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blogCategories: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notifications: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  siteContent: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feeConfig: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platformStats: any | null;

  // ===== Collections RÉSERVÉES À L'ADMINISTRATION =====
  // Elles ne sont JAMAIS servies par les endpoints publics : elles arrivent
  // par /api/platform/admin-sync (session admin) et sont donc `undefined` ici.
  // Les consommateurs du store les testent avec `?.length > 0` : aucune
  // donnée existante n'est écrasée par une valeur vide.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marketplaceOrders?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payoutRequests?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kycSubmissions?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postPurchaseSupport?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vendorApplications?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceQuotes?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instructorCommissions?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instructorStoragePurchases?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platformConfig?: any[];
}

/**
 * Charge les données publiques (4 requêtes en parallèle, chacune servie par
 * son cache). Un domaine en échec ne bloque pas les autres.
 */
export async function apiFetchPlatformData(force = false): Promise<PlatformData | null> {
  // UNE SEULE requête pour tout le démarrage (catalogue, boutique, services,
  // contenu, bannières). Avant : 5 requêtes parallèles → pool PostgreSQL saturé.
  const data = await fetchDomain<any>("marketplace", "/api/bootstrap", {
    suffix: "bootstrap",
    force,
  });

  if (!data) return null;

  return {
    courses: data.courses || [],
    courseCategories: data.courseCategories || [],
    trainingCenters: data.trainingCenters || [],
    catalogTotal: data.catalogTotal || 0,
    catalogHasMore: data.catalogHasMore || false,
    stores: data.stores || [],
    products: data.products || [],
    servicePackages: data.servicePackages || [],
    siteBanners: data.siteBanners || [],
    freelances: data.freelances || [],
    enterprises: data.enterprises || [],
    blogPosts: data.blogPosts || [],
    blogCategories: data.blogCategories || [],
    notifications: data.notifications || [],
    siteContent: data.siteContent || [],
    feeConfig: data.feeConfig ?? null,
    platformStats: data.platformStats ?? null,
  };
}

/** Vide tous les caches de domaine (après une écriture importante). */
export function clearPlatformCache(): void {
  clearCache();
}

/** Compat : lecture de l'ancien cache monolithique (plus alimenté). */
export function readPlatformCache(): null {
  return null;
}

/** Compat : écriture de l'ancien cache monolithique (sans effet). */
export function writePlatformCache(): void {
  // Les caches sont gérés domaine par domaine (lib/services/api/http.ts)
}

/** Compat : l'ancien cache monolithique n'est plus utilisé. */
export function isPlatformCacheFresh(): boolean {
  return false;
}

export async function apiFetchCourses(force = false) {
  const data = await apiFetchPlatformData(force);
  return data?.courses || [];
}

export async function apiFetchProducts(force = false) {
  const data = await apiFetchPlatformData(force);
  return data?.products || [];
}

export async function apiFetchStores(force = false) {
  const data = await apiFetchPlatformData(force);
  return data?.stores || [];
}

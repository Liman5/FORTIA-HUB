// ============================================================
// FORTIA HUB — API CLIENT PLATEFORME (liaison Supabase)
// Description : Récupère les données réelles depuis Supabase
// (via Prisma) pour remplacer les données mock du frontend.
// ============================================================

export interface PlatformData {
  courses: any[];
  courseCategories: any[];
  trainingCenters: any[];
  instructorCommissions: any[];
  instructorStoragePurchases: any[];
  stores: any[];
  products: any[];
  marketplaceOrders: any[];
  payoutRequests: any[];
  vendorApplications: any[];
  freelances: any[];
  enterprises: any[];
  blogPosts: any[];
  blogCategories: any[];
  servicePackages: any[];
  serviceQuotes: any[];
  postPurchaseSupport: any[];
  kycSubmissions: any[];
  notifications: any[];
  siteContent: any[];
  feeConfig: any;
  platformConfig: any[];
  platformStats: any;
}

// ============================================================
// CACHE LOCAL « stale-while-revalidate »
// Permet d'afficher immédiatement les données déjà chargées lors
// d'un rechargement de page (pas de re-téléchargement complet),
// et de n'aller sur le réseau que si le cache est périmé.
// ============================================================
const PLATFORM_CACHE_KEY = "fortia_platform_cache_v1";
const CACHE_MAX_AGE_MS = 60_000; // 60 secondes

export function readPlatformCache(): { data: PlatformData; savedAt: number } | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(PLATFORM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data && parsed.savedAt) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writePlatformCache(data: PlatformData): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      PLATFORM_CACHE_KEY,
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    // Quota dépassé ou stockage indisponible → on ignore silencieusement
  }
}

/** Supprime le cache (à appeler après toute écriture importante). */
export function clearPlatformCache(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(PLATFORM_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function isPlatformCacheFresh(savedAt: number): boolean {
  return Date.now() - savedAt < CACHE_MAX_AGE_MS;
}

/**
 * Charge toutes les données de la plateforme depuis Supabase (via Prisma).
 * Stratégie : cache local d'abord (si frais) → réseau sinon → repli sur le cache
 * périmé si le réseau échoue (offline).
 * Retourne null uniquement si aucun cache ET le réseau échoue.
 */
export async function apiFetchPlatformData(): Promise<PlatformData | null> {
  const cached = readPlatformCache();

  // 1) Cache frais : pas besoin de re-télécharger tout
  if (cached && isPlatformCacheFresh(cached.savedAt)) {
    return cached.data;
  }

  try {
    const response = await fetch("/api/platform/sync", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      // Repli sur le cache périmé (offline / erreur serveur)
      return cached ? cached.data : null;
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      return cached ? cached.data : null;
    }

    const data = json.data as PlatformData;
    writePlatformCache(data); // mémorise la dernière version chargée
    return data;
  } catch (error) {
    console.warn("[Platform API] Échec de chargement des données:", error);
    return cached ? cached.data : null;
  }
}

/**
 * Charge uniquement les formations depuis Supabase.
 */
export async function apiFetchCourses() {
  const data = await apiFetchPlatformData();
  return data?.courses || [];
}

/**
 * Charge uniquement les produits marketplace depuis Supabase.
 */
export async function apiFetchProducts() {
  const data = await apiFetchPlatformData();
  return data?.products || [];
}

/**
 * Charge uniquement les boutiques depuis Supabase.
 */
export async function apiFetchStores() {
  const data = await apiFetchPlatformData();
  return data?.stores || [];
}
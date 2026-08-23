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

/**
 * Charge toutes les données de la plateforme depuis Supabase (via Prisma).
 * Retourne null si la lecture échoue (offline / base inaccessible).
 */
export async function apiFetchPlatformData(): Promise<PlatformData | null> {
  try {
    const response = await fetch("/api/platform/sync", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    if (!json.success || !json.data) {
      return null;
    }

    return json.data as PlatformData;
  } catch (error) {
    console.warn("[Platform API] Échec de chargement des données:", error);
    return null;
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
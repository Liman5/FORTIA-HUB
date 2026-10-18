// ============================================================
// FORTIA HUB — API CLIENT : CONTENU DU SITE & NOTIFICATIONS
// ============================================================
import { fetchDomain } from "./http";

export interface SiteResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  siteContent: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  feeConfig: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  platformStats: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notifications: any[];
}

/** Textes du site, frais et statistiques — cache long (6 h). */
export async function fetchSite(force = false): Promise<SiteResult | null> {
  return fetchDomain<SiteResult>("site", "/api/site", { force });
}

/**
 * Notifications globales — cache MÉMOIRE très court (30 s) : cette donnée
 * change souvent, elle ne doit pas être persistée sur le disque.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchNotifications(force = false): Promise<any[] | null> {
  const data = await fetchDomain<SiteResult>("notifications", "/api/site", { force });
  return data?.notifications || null;
}

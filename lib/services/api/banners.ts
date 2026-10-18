// ============================================================
// FORTIA HUB — API CLIENT : BANNIÈRES DU SITE
// ------------------------------------------------------------
// Module indépendant : les bannières ont leur propre endpoint
// (/api/banners) et leur propre cache de domaine.
// ============================================================
import { fetchDomain } from "./http";

export interface BannersResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  siteBanners: any[];
}

/** Bannières du site (toutes, actives ou non) — cache de domaine. */
export async function fetchBanners(force = false): Promise<BannersResult | null> {
  return fetchDomain<BannersResult>("banners", "/api/banners", { force });
}

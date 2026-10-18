// ============================================================
// FORTIA HUB — API CLIENT : MARKETPLACE (boutique)
// ============================================================
import { fetchDomain } from "./http";

export interface MarketplaceResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stores: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  products: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MarketplaceQuery {
  page?: number;
  limit?: number;
  q?: string;
  type?: string;
  storeId?: string;
}

export function marketplaceQueryString(query: MarketplaceQuery = {}): string {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.storeId) params.set("storeId", query.storeId);
  return params.toString();
}

/** Boutiques (sans coordonnées de paiement) + produits — cache 5 min. */
export async function fetchMarketplace(
  query: MarketplaceQuery = {},
  force = false
): Promise<MarketplaceResult | null> {
  const qs = marketplaceQueryString(query);
  return fetchDomain<MarketplaceResult>("marketplace", `/api/marketplace?${qs}`, {
    suffix: qs || "default",
    force,
  });
}

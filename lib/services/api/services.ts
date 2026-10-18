// ============================================================
// FORTIA HUB — API CLIENT : SERVICES, FREELANCES, ENTREPRISES, BLOG
// ============================================================
import { fetchDomain } from "./http";

export interface ServicesResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  servicePackages: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  freelances: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enterprises: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blogPosts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blogCategories: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ServicesQuery {
  page?: number;
  limit?: number;
  q?: string;
}

/** Offres d'agence, freelances, entreprises et articles — cache 5 min. */
export async function fetchServices(
  query: ServicesQuery = {},
  force = false
): Promise<ServicesResult | null> {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  if (query.q) params.set("q", query.q);
  const qs = params.toString();

  return fetchDomain<ServicesResult>("services", `/api/services?${qs}`, {
    suffix: qs || "default",
    force,
  });
}

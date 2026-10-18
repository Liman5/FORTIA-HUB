// ============================================================
// FORTIA HUB — Couche d'accès HTTP + CACHE GRANULAIRE
// ------------------------------------------------------------
// Principe : CHAQUE DOMAINE possède son propre cache et son propre
// TTL. Une donnée éditoriale (catégories, contenu du site) reste
// valide 24 h alors qu'une liste de commandes expire en 30 s.
//
// Conséquences :
//   • un domaine en panne (401, 500, réseau) ne compromet PAS les autres ;
//   • plus de rechargement complet à chaque navigation ;
//   • la fraîcheur est adaptée à la nature de la donnée.
//
// Les domaines « lourds mais peu changeants » sont persistés dans
// localStorage ; les domaines volatils (notifications, commandes)
// restent en MÉMOIRE pour ne pas saturer le quota.
// ============================================================

export interface CacheEntry<T> {
  data: T;
  savedAt: number;
}

/** Durées de validité par domaine (en millisecondes). */
export const CACHE_TTL = {
  /** Catégories & taxonomies : stables */
  categories: 24 * 60 * 60 * 1000,
  /** Catalogue de formations */
  catalog: 5 * 60 * 1000,
  /** Boutique (boutiques, produits) */
  marketplace: 5 * 60 * 1000,
  /** Services, freelances, entreprises, blog */
  services: 5 * 60 * 1000,
  /** Bannières du site (module indépendant) */
  banners: 5 * 60 * 1000,
  /** Contenu éditorial du site, frais, statistiques */
  site: 6 * 60 * 60 * 1000,
  /** Notifications : volatil */
  notifications: 30 * 1000,
  /** Commandes / paiements : volatil */
  orders: 30 * 1000,
  /** Détail d'une formation (chapitres, leçons) : lourd, peu changeant */
  courseDetail: 10 * 60 * 1000,
} as const;

export type CacheDomain = keyof typeof CACHE_TTL;

/** Domaines persistés dans localStorage (les autres restent en mémoire). */
const PERSISTED_DOMAINS: CacheDomain[] = [
  "categories",
  "catalog",
  "marketplace",
  "services",
  "banners",
  "site",
];

const STORAGE_PREFIX = "fortia_cache_";
const MEMORY = new Map<string, CacheEntry<any>>();

function cacheKey(domain: CacheDomain, suffix?: string): string {
  return suffix ? `${domain}:${suffix}` : domain;
}

function storageKey(domain: CacheDomain, suffix?: string): string {
  return `${STORAGE_PREFIX}${cacheKey(domain, suffix)}`;
}

/** Lit une entrée (mémoire d'abord, puis stockage persistant). */
export function readEntry<T>(domain: CacheDomain, suffix?: string): CacheEntry<T> | null {
  const mem = MEMORY.get(cacheKey(domain, suffix));
  if (mem) return mem as CacheEntry<T>;

  if (!PERSISTED_DOMAINS.includes(domain)) return null;
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(storageKey(domain, suffix));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.data !== undefined && typeof parsed.savedAt === "number") {
      MEMORY.set(cacheKey(domain, suffix), parsed);
      return parsed as CacheEntry<T>;
    }
  } catch {
    // Stockage indisponible ou JSON corrompu → on ignore
  }
  return null;
}

/** Écrit une entrée (mémoire toujours, stockage si le domaine est persistant). */
export function writeEntry<T>(domain: CacheDomain, suffix: string | undefined, data: T): void {
  const entry: CacheEntry<T> = { data, savedAt: Date.now() };
  MEMORY.set(cacheKey(domain, suffix), entry);

  if (!PERSISTED_DOMAINS.includes(domain)) return;
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey(domain, suffix), JSON.stringify(entry));
  } catch {
    // Quota dépassé → on garde au moins la version en mémoire
  }
}

/** L'entrée est-elle encore fraîche ? */
export function isFresh(entry: CacheEntry<unknown> | null, domain: CacheDomain): boolean {
  if (!entry) return false;
  return Date.now() - entry.savedAt < CACHE_TTL[domain];
}

/**
 * Requête JSON avec cache par domaine.
 * @param options.force  Ignore le cache frais (après une écriture)
 * @param options.suffix Clé secondaire (ex : identifiant de formation)
 * @returns les données, ou le cache périmé en cas d'échec réseau (offline)
 */
export async function fetchDomain<T>(
  domain: CacheDomain,
  url: string,
  options: { suffix?: string; force?: boolean; method?: string; body?: unknown } = {}
): Promise<T | null> {
  const { suffix, force = false, method = "GET", body } = options;

  const cached = readEntry<T>(domain, suffix);
  if (!force && isFresh(cached, domain)) return cached!.data;

  try {
    const response = await fetch(url, {
      method,
      cache: "no-store",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      // 401 / 404 / 500 : on ne casse pas l'interface, on sert le cache s'il existe
      return cached ? cached.data : null;
    }

    const json = await response.json();
    if (json?.success === false) return cached ? cached.data : null;

    const data = (json?.data !== undefined ? json.data : json) as T;
    writeEntry(domain, suffix, data);
    return data;
  } catch {
    // Réseau indisponible → repli hors ligne
    return cached ? cached.data : null;
  }
}

/** Vide tout ou partie du cache (appelé après une écriture importante). */
export function clearCache(domains?: CacheDomain[]): void {
  const targets = domains ?? (Object.keys(CACHE_TTL) as CacheDomain[]);

  for (const domain of targets) {
    for (const key of Array.from(MEMORY.keys())) {
      if (key === domain || key.startsWith(`${domain}:`)) MEMORY.delete(key);
    }
    if (typeof window === "undefined") continue;
    if (!PERSISTED_DOMAINS.includes(domain)) continue;
    try {
      const prefix = `${STORAGE_PREFIX}${domain}`;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key === prefix || key.startsWith(`${prefix}:`))) localStorage.removeItem(key);
      }
    } catch {
      // ignore
    }
  }
}

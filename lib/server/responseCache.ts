// ============================================================
// FORTIA HUB — CACHE MÉMOIRE SERVEUR (routes publiques)
// ------------------------------------------------------------
// Les routes publiques (site, catalogue, boutique, services, bannières)
// sont appelées par CHAQUE visiteur, plusieurs fois par session. Sans
// cache, chaque appel consomme une connexion PostgreSQL ; le pool
// sature et la CONNEXION échoue (P2039).
//
// Ce cache très court (15 s par défaut) divise la charge par plusieurs
// dizaines sans que l'utilisateur voie de différence. Les écritures
// administrateur appellent `invalidateResponseCache()` pour forcer la
// fraîcheur immédiate.
// ============================================================

interface CacheEntry {
  body: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();
const MAX_ENTRIES = 200;

/** Lit une réponse en cache (null si absente ou expirée). */
export function readResponseCache(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.body;
}

/** Met en cache le corps d'une réponse (TTL court). */
export function writeResponseCache(key: string, body: string, ttlMs = 15_000): void {
  // Nettoyage opportuniste : évite une croissance illimitée.
  if (store.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of store) {
      if (v.expiresAt < now) store.delete(k);
    }
    if (store.size >= MAX_ENTRIES) store.clear();
  }
  store.set(key, { body, expiresAt: Date.now() + ttlMs });
}

/** Vide tout le cache (ou seulement les clés commençant par un préfixe). */
export function invalidateResponseCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

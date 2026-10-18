// ============================================================
// FORTIA HUB — FILE D'ATTENTE RÉSEAU (côté navigateur)
// ------------------------------------------------------------
// Au démarrage, l'application demande plusieurs domaines en parallèle
// (catalogue, boutique, services, contenu, bannières, session…). Sur un
// réseau mobile, cette rafale sature le pool de connexions PostgreSQL du
// serveur : Prisma renvoie alors `P2039` (pool épuisé) et la connexion
// échoue avec « service momentanément indisponible ».
//
// Ce module limite le nombre de requêtes simultanées et évite d'envoyer
// deux fois la même requête en cours. Le serveur n'est plus noyé.
// ============================================================

/** Nombre maximal de requêtes simultanées depuis le navigateur. */
const MAX_CONCURRENT = 4;

let activeCount = 0;
const waiting: Array<() => void> = [];

function acquire(): Promise<void> {
  if (activeCount < MAX_CONCURRENT) {
    activeCount += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiting.push(resolve));
}

function release(): void {
  const next = waiting.shift();
  if (next) {
    next();
    return;
  }
  activeCount = Math.max(0, activeCount - 1);
}

/**
 * Exécute la tâche en respectant la limite de concurrence.
 */
export async function withNetworkSlot<T>(task: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await task();
  } finally {
    release();
  }
}

const IN_FLIGHT = new Map<string, Promise<unknown>>();

/**
 * Déduplique une requête identique déjà en cours (même clé) : les appelants
 * simultanés partagent la même promesse au lieu de multiplier les appels.
 */
export function dedupeRequest<T>(key: string, task: () => Promise<T>): Promise<T> {
  const existing = IN_FLIGHT.get(key);
  if (existing) return existing as Promise<T>;

  const promise = task().finally(() => {
    IN_FLIGHT.delete(key);
  });
  IN_FLIGHT.set(key, promise);
  return promise;
}

/** Exécute une requête en la dédupliquant ET en respectant la limite. */
export function scheduledFetch<T>(key: string, task: () => Promise<T>): Promise<T> {
  return dedupeRequest(key, () => withNetworkSlot(task));
}

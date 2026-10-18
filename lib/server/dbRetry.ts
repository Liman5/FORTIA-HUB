// ============================================================
// FORTIA HUB — RÉSILIENCE BASE DE DONNÉES (côté serveur)
// ------------------------------------------------------------
// Le pool PostgreSQL peut être momentanément saturé (rafale de requêtes,
// mobile sur réseau lent, cold start). Prisma renvoie alors :
//   • P2039 → « Timed out fetching a new connection from the pool »
//   • P2024 → délai d'attente du pool dépassé
//   • P1001 / P1002 / P1017 → base injoignable / connexion fermée
//
// Ces erreurs sont TRANSITOIRES : une seconde tentative suffit le plus
// souvent. Sans cela, la connexion affichait « service momentanément
// indisponible » alors qu'une simple reprise fonctionnait.
// ============================================================

const RETRYABLE_CODES = new Set([
  "P2039",
  "P2024",
  "P1001",
  "P1002",
  "P1017",
  "ETIMEDOUT",
  "ECONNRESET",
  "ECONNREFUSED",
]);

/** L'erreur est-elle transitoire (donc rejouable) ? */
export function isRetryableDbError(error: unknown): boolean {
  const code = String((error as { code?: unknown })?.code ?? "");
  if (RETRYABLE_CODES.has(code)) return true;
  const message = String((error as { message?: unknown })?.message ?? "");
  return /connection pool|Timed out fetching|ECONNRESET|ETIMEDOUT/i.test(message);
}

/**
 * Exécute une opération base avec une ou deux reprises en cas d'erreur
 * transitoire de pool. La dernière erreur est propagée si tout échoue.
 */
export async function withDbRetry<T>(
  task: () => Promise<T>,
  attempts = 2,
  delayMs = 350
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  throw lastError;
}

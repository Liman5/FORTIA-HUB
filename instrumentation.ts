// ============================================================
// FORTIA HUB — INSTRUMENTATION SERVEUR (Phase 3)
// ------------------------------------------------------------
// Valide les variables d'environnement au démarrage du serveur.
// En production, une configuration incomplète échoue explicitement.
// ============================================================

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("./lib/server/env");
    validateEnv({ throwOnError: process.env.NODE_ENV === "production" });
  }
}

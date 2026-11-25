// ============================================================
// FORTIA HUB — RÈGLES DE LIMITATION DE DÉBIT (Phase 3)
// ------------------------------------------------------------
// Une seule table de règles, partagée par toutes les routes.
// Le compteur est PERSISTANT (table rate_limit_counters) avec repli
// mémoire documenté si la base est indisponible.
// ============================================================

import { AppError } from "./errors";
import { clientIp, rateLimitPersistent } from "./rateLimit";

export interface RateLimitRule {
  /** Nombre d'opérations autorisées dans la fenêtre. */
  limit: number;
  /** Durée de la fenêtre en millisecondes. */
  windowMs: number;
}

export const RATE_LIMITS = {
  authLogin: { limit: 10, windowMs: 60_000 },
  authRegister: { limit: 5, windowMs: 10 * 60_000 },
  authOtp: { limit: 5, windowMs: 60_000 },
  authPasswordReset: { limit: 5, windowMs: 15 * 60_000 },
  authTwoFactor: { limit: 10, windowMs: 60_000 },
  /** Connexion administrateur : 5 tentatives / 15 minutes (par IP). */
  adminLogin: { limit: 5, windowMs: 15 * 60_000 },
  /** Connexion administrateur : 5 tentatives / 15 minutes (par adresse ciblée). */
  adminLoginEmail: { limit: 5, windowMs: 15 * 60_000 },
  /** Assistant IA : 10 requêtes / minute (par utilisateur connecté ou par IP). */
  aiAssistant: { limit: 10, windowMs: 60_000 },
  checkout: { limit: 20, windowMs: 60_000 },
  paymentCancel: { limit: 20, windowMs: 60_000 },
  refund: { limit: 10, windowMs: 60_000 },
  subscriptionWrite: { limit: 20, windowMs: 60_000 },
  adminSensitive: { limit: 30, windowMs: 60_000 },
  publicForm: { limit: 10, windowMs: 60_000 },
  kyc: { limit: 5, windowMs: 10 * 60_000 },
  academyProgress: { limit: 120, windowMs: 60_000 },
  certificate: { limit: 10, windowMs: 60_000 },
} as const;

export type RateLimitScope = keyof typeof RATE_LIMITS;

/**
 * Applique une règle de débit. Lève une `AppError` 429 si la limite est
 * dépassée. `actorId` (session) est préféré à l'IP quand il existe.
 */
export async function enforceRateLimit(
  scope: RateLimitScope,
  request: Request,
  actorId?: string | null
): Promise<void> {
  const rule: RateLimitRule = RATE_LIMITS[scope];
  const identity = actorId && actorId.trim() ? `user:${actorId}` : `ip:${clientIp(request)}`;
  const wait = await rateLimitPersistent(`${scope}:${identity}`, rule.limit, rule.windowMs);
  if (wait === null) return;

  throw new AppError(429, "RATE_LIMITED", `Trop de requêtes. Réessayez dans ${wait} seconde(s).`, {
    details: [{ path: "rateLimit", message: `Réessayez dans ${wait} seconde(s).` }],
  });
}

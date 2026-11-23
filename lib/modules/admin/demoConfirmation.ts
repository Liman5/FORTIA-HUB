// ============================================================
// FORTIA HUB — CONFIRMATION DE PURGE DES DONNÉES DE DÉMONSTRATION
// ------------------------------------------------------------
// Fonction pure, sans dépendance : testable unitairement et
// réutilisable côté serveur comme côté interface.
// ============================================================

/** Mot exact exigé par le serveur avant toute suppression. */
export const DEMO_CONFIRMATION_WORD = "SUPPRIMER";

/**
 * Insensible à la casse et aux espaces, mais le mot doit être exact :
 * une chaîne vide, `true` ou « oui » est refusée.
 */
export function isValidDemoConfirmation(value: unknown): boolean {
  return String(value ?? "").trim().toUpperCase() === DEMO_CONFIRMATION_WORD;
}

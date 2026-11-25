// ============================================================
// FORTIA HUB — CLÉS `platform_config` PUBLIABLES (LISTE BLANCHE)
// ------------------------------------------------------------
// ⚠️ La table `platform_config` contient des données SENSIBLES :
//   • `2fa:user:<id>`    → secrets TOTP (chiffrés)
//   • `otp:email:<email>` → hash salé des codes de vérification
// Un `findMany()` global ne doit JAMAIS être renvoyé à un appelant
// non administrateur (assistant IA, API publique, etc.).
//
// Aucune clé n'est publique aujourd'hui : la liste est vide. Ajouter
// ici UNIQUEMENT des clés explicitement destinées au public.
// ============================================================

export const PUBLIC_PLATFORM_CONFIG_KEYS: readonly string[] = [];

/** Préfixes de clés strictement réservées au serveur / à l'administration. */
const SENSITIVE_KEY_PREFIXES = ["2fa:", "otp:"] as const;

/** Une clé est-elle sensible (secret 2FA ou code de vérification) ? */
export function isSensitivePlatformConfigKey(key: string): boolean {
  const normalized = String(key || "").trim().toLowerCase();
  if (!normalized) return true;
  return SENSITIVE_KEY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

/**
 * Filtre défensif : ne conserve que les clés de la liste blanche,
 * en rejetant systématiquement tout préfixe sensible.
 */
export function pickPublicPlatformConfig<T extends { key: string }>(rows: readonly T[]): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(
    (row) =>
      !!row &&
      typeof row.key === "string" &&
      !isSensitivePlatformConfigKey(row.key) &&
      PUBLIC_PLATFORM_CONFIG_KEYS.includes(row.key)
  );
}

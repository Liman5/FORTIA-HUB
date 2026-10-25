// ============================================================
// FORTIA HUB — LIMITATION DE DÉBIT (protection anti-abus)
// ------------------------------------------------------------
// Protège les routes sensibles (connexion, inscription, envoi d'OTP)
// contre la force brute et les robots. Compteur en mémoire, par IP,
// avec fenêtre glissante simple.
//
// En cas de déploiement multi-instances, chaque instance possède son
// compteur : c'est suffisant pour arrêter un robot, sans dépendance
// externe (pas de Redis requis).
// ============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

/**
 * @param key      identifiant du quota (ex. `login:1.2.3.4`)
 * @param limit    nombre d'essais autorisés dans la fenêtre
 * @param windowMs durée de la fenêtre (ms)
 * @returns `null` si autorisé, sinon le nombre de secondes à attendre
 */
export function rateLimit(key: string, limit: number, windowMs: number): number | null {
  const now = Date.now();

  // Nettoyage opportuniste pour éviter une croissance illimitée.
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, v] of buckets) {
      if (v.resetAt < now) buckets.delete(k);
    }
    if (buckets.size >= MAX_BUCKETS) buckets.clear();
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
}

/**
 * Compteur PERSISTANT (table `rate_limit_counters`).
 *
 * Indispensable en production serverless : chaque instance possède sa propre
 * mémoire, un robot pourrait donc répartir ses essais entre les instances.
 * Le compteur en base est partagé par toutes les instances.
 *
 * Repli automatique sur le compteur mémoire si la base est indisponible :
 * la protection ne disparaît jamais complètement.
 */
export async function rateLimitPersistent(
  key: string,
  limit: number,
  windowMs: number
): Promise<number | null> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = await prisma.$queryRaw<
      Array<{ count: number; reset_at: Date | string }>
    >`
      INSERT INTO rate_limit_counters ("key", "count", "reset_at", "created_at")
      VALUES (${key}, 1, ${resetAt}, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN rate_limit_counters."reset_at" < ${now} THEN 1
          ELSE rate_limit_counters."count" + 1
        END,
        "reset_at" = CASE
          WHEN rate_limit_counters."reset_at" < ${now} THEN ${resetAt}
          ELSE rate_limit_counters."reset_at"
        END
      RETURNING "count", "reset_at"
    `;

    const row = rows?.[0];
    if (!row) return rateLimit(key, limit, windowMs);

    const count = Number(row.count) || 0;
    if (count <= limit) return null;

    const expiresAt = new Date(row.reset_at as any).getTime();
    return Math.max(1, Math.ceil((expiresAt - now.getTime()) / 1000));
  } catch {
    // Base indisponible (table absente, pool saturé…) → compteur mémoire.
    return rateLimit(key, limit, windowMs);
  }
}

/** IP de l'appelant (derrière proxy / plateforme serverless). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const first = forwarded.split(",")[0].trim();
  return first || request.headers.get("x-real-ip") || "inconnu";
}

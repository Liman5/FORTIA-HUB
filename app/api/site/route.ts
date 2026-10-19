import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { readResponseCache, writeResponseCache } from "@/lib/server/responseCache";

export const dynamic = "force-dynamic";

const CACHE_KEY = "GET /api/site";

/**
 * GET /api/site
 * ------------------------------------------------------------
 * Contenu éditorial et configuration publique :
 *   • siteContent   → textes de la page d'accueil / contact
 *   • feeConfig     → frais d'inscription affichés
 *   • platformStats → compteurs publics
 *   • notifications → annonces globales (volatiles, cache client 30 s)
 *
 * Aucune donnée personnelle ni configuration interne (`platformConfig`).
 * Les bannières du site ont leur PROPRE endpoint : /api/banners.
 *
 * CACHE SERVEUR 15 s : cette route est appelée à chaque visite ; sans
 * cache, la charge PostgreSQL saturait le pool (login en échec P2039).
 */
export async function GET() {
  // Réponse déjà calculée récemment → aucune requête base nécessaire.
  const cached = readResponseCache(CACHE_KEY);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  }

  try {
    const [siteContent, feeConfig, platformStats, notifications] = await Promise.all([
      prisma.siteContent.findMany().catch(() => [] as never[]),
      prisma.registrationFeeConfig.findFirst().catch(() => null),
      prisma.platformStats.findFirst().catch(() => null),
      prisma.notification
        .findMany({ where: { isGlobal: true }, orderBy: { createdAt: "desc" }, take: 50 })
        .catch(() => [] as never[]),
    ]);

    const response = jsonSafe({
      success: true,
      data: { siteContent, feeConfig, platformStats, notifications },
    });
    const body = await response.text();
    writeResponseCache(CACHE_KEY, body);
    return new Response(body, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    console.error("[SITE] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture du contenu du site." }, { status: 500 });
  }
}

import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { readResponseCache, writeResponseCache } from "@/lib/server/responseCache";

export const dynamic = "force-dynamic";

/**
 * GET /api/banners
 * ------------------------------------------------------------
 * MODULE INDÉPENDANT : bannières du site (bandeau animé en haut de page).
 *
 * Toutes les bannières sont renvoyées, triées par `displayOrder`, SANS
 * filtre d'activation — exactement comme les services :
 *   • l'interface publique n'affiche que celles dont `isActive !== false` ;
 *   • l'administration les voit toutes pour pouvoir les réactiver.
 *
 *   ?active=1 → ne renvoie que les bannières actives.
 *
 * CACHE SERVEUR 15 s (soulage le pool PostgreSQL ; cf. incident P2039).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const onlyActive = url.searchParams.get("active") === "1";
  const cacheKey = `GET /api/banners${onlyActive ? "?active=1" : ""}`;

  const cached = readResponseCache(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { "Content-Type": "application/json", "X-Cache": "HIT",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  }

  try {
    const siteBanners = await prisma.siteBanner
      .findMany({
        where: onlyActive ? { isActive: true } : undefined,
        orderBy: { displayOrder: "asc" },
      })
      .catch(() => [] as never[]);

    const response = jsonSafe({ success: true, data: { siteBanners } });
    const body = await response.text();
    writeResponseCache(cacheKey, body);
    return new Response(body, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" },
    });
  } catch (error: any) {
    console.error("[BANNERS] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture des bannières." }, { status: 500 });
  }
}

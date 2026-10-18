import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";

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
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const onlyActive = url.searchParams.get("active") === "1";

    const siteBanners = await prisma.siteBanner
      .findMany({
        where: onlyActive ? { isActive: true } : undefined,
        orderBy: { displayOrder: "asc" },
      })
      .catch(() => [] as never[]);

    return jsonSafe({ success: true, data: { siteBanners } });
  } catch (error: any) {
    console.error("[BANNERS] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture des bannières." }, { status: 500 });
  }
}

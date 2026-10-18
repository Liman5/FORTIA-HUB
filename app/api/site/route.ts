import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
 */
export async function GET() {
  try {
    const [siteContent, feeConfig, platformStats, notifications] = await Promise.all([
      prisma.siteContent.findMany().catch(() => [] as never[]),
      prisma.registrationFeeConfig.findFirst().catch(() => null),
      prisma.platformStats.findFirst().catch(() => null),
      prisma.notification
        .findMany({ where: { isGlobal: true }, orderBy: { createdAt: "desc" }, take: 50 })
        .catch(() => [] as never[]),
    ]);

    return jsonSafe({
      success: true,
      data: { siteContent, feeConfig, platformStats, notifications },
    });
  } catch (error: any) {
    console.error("[SITE] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture du contenu du site." }, { status: 500 });
  }
}

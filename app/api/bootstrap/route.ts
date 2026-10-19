import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { readResponseCache, writeResponseCache } from "@/lib/server/responseCache";

export const dynamic = "force-dynamic";

/**
 * GET /api/bootstrap
 * ------------------------------------------------------------
 * UNE SEULE requête pour tout le démarrage de l'application :
 *   catalogue (formations + catégories + centres), boutique (boutiques +
 *   produits), services (prestations + freelances + entreprises + blog),
 *   contenu du site, frais, statistiques, notifications globales, bannières.
 *
 * Pourquoi : auparavant le navigateur lançait 5 requêtes en parallèle à
 * chaque ouverture, ce qui saturait le pool PostgreSQL (erreur P2039) et
 * faisait échouer la connexion des utilisateurs.
 *
 * Cache serveur 15 s + cache CDN 15 s (stale-while-revalidate 60 s) pour
 * les visiteurs anonymes. Un membre connecté n'est jamais servi par le CDN
 * (il peut voir ses propres brouillons).
 */
const CACHE_KEY = "GET /api/bootstrap";

export async function GET(req: NextRequest) {
  const hasSession = Boolean(req.cookies.get("fh_session")?.value);

  const cached = hasSession ? null : readResponseCache(CACHE_KEY);
  if (cached) {
    return new Response(cached, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "HIT",
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60",
      },
    });
  }

  try {
    const [viewer, admin] = await Promise.all([
      getCurrentUser(req).catch(() => null),
      requireAdmin(req).catch(() => null),
    ]);
    const isAnonymous = !viewer && !admin;

    const [
      courses,
      courseCategories,
      trainingCenters,
      courseTotal,
      stores,
      products,
      productTotal,
      servicePackages,
      freelances,
      enterprises,
      blogPosts,
      blogCategories,
      siteContent,
      feeConfig,
      platformStats,
      notifications,
      siteBanners,
    ] = await Promise.all([
      prisma.course.findMany({
        where: isAnonymous ? ({ isPublished: true } as any) : undefined,
        orderBy: [{ createdAt: "desc" }] as any,
        take: 24,
      }).catch(() => [] as never[]),
      prisma.courseCategory.findMany().catch(() => [] as never[]),
      prisma.trainingCenter.findMany().catch(() => [] as never[]),
      prisma.course.count(isAnonymous ? ({ where: { isPublished: true } as any } as any) : undefined).catch(() => 0),
      prisma.store.findMany({ orderBy: { createdAt: "desc" } as any }).catch(() => [] as never[]),
      prisma.product.findMany({
        where: isAnonymous ? ({ isPublished: true } as any) : undefined,
        orderBy: { createdAt: "desc" } as any,
        take: 60,
      }).catch(() => [] as never[]),
      prisma.product.count(isAnonymous ? ({ where: { isPublished: true } as any } as any) : undefined).catch(() => 0),
      prisma.servicePackage.findMany({ include: { options: true } as any }).catch(() => [] as never[]),
      prisma.freelanceProfile.findMany({ include: { services: true, portfolio: true } as any }).catch(() => [] as never[]),
      prisma.enterpriseProfile.findMany({ include: { team: true, portfolio: true, services: true } as any }).catch(() => [] as never[]),
      prisma.blogPost.findMany({
        include: { blogCategory: true } as any,
        orderBy: { date: "desc" } as any,
        take: 24,
      }).catch(() => [] as never[]),
      prisma.blogCategory.findMany().catch(() => [] as never[]),
      prisma.siteContent.findMany().catch(() => [] as never[]),
      prisma.registrationFeeConfig.findFirst().catch(() => null),
      prisma.platformStats.findFirst().catch(() => null),
      prisma.notification
        .findMany({ where: { isGlobal: true }, orderBy: { createdAt: "desc" }, take: 50 })
        .catch(() => [] as never[]),
      prisma.siteBanner
        .findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } })
        .catch(() => [] as never[]),
    ]);

    // Les coordonnées de retrait ne sortent JAMAIS de l'API publique.
    const publicStores = (stores as any[]).map((store) => {
      const { payoutInfo, ...rest } = store || {};
      return { ...rest, payoutMethod: payoutInfo?.method || "" };
    });

    const response = jsonSafe({
      success: true,
      data: {
        courses,
        courseCategories,
        trainingCenters,
        catalogTotal: courseTotal,
        catalogHasMore: (courses as any[]).length < courseTotal,
        stores: publicStores,
        products,
        productTotal,
        servicePackages,
        freelances,
        enterprises,
        blogPosts,
        blogCategories,
        siteContent,
        feeConfig,
        platformStats,
        notifications,
        siteBanners,
      },
    });

    const body = await response.text();
    if (isAnonymous) writeResponseCache(CACHE_KEY, body);

    return new Response(body, {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": isAnonymous ? "MISS" : "BYPASS",
        "Cache-Control": isAnonymous
          ? "public, s-maxage=15, stale-while-revalidate=60"
          : "private, no-store",
      },
    });
  } catch (error: any) {
    console.error("[BOOTSTRAP] Erreur:", error);
    return jsonSafe({ success: false, error: "Démarrage indisponible." }, { status: 500 });
  }
}

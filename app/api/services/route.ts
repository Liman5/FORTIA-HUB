import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/services
 * ------------------------------------------------------------
 * Contenu éditorial et social (public) :
 *   • servicePackages  → offres de l'agence
 *   • freelances       → profils indépendants
 *   • enterprises      → profils entreprises
 *   • blogPosts        → articles (paginés)
 *   • blogCategories
 *
 * Les demandes de devis (`serviceQuotes`) ne sont PAS exposées ici :
 * elles contiennent des données personnelles (admin uniquement).
 *
 * Paramètres : page, limit (articles), q, category
 */
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(
      Math.max(1, Number(params.get("limit") || DEFAULT_LIMIT)),
      MAX_LIMIT
    );
    const q = (params.get("q") || "").trim();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blogWhere: any = {};
    if (q) {
      blogWhere.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
      ];
    }

    const [servicePackages, freelances, enterprises, blogPosts, blogCategories, blogTotal] =
      await Promise.all([
        prisma.servicePackage
          .findMany({ include: { options: true } })
          .catch(() => [] as never[]),
        prisma.freelanceProfile
          .findMany({ include: { services: true, portfolio: true } })
          .catch(() => [] as never[]),
        prisma.enterpriseProfile
          .findMany({ include: { team: true, portfolio: true, services: true } })
          .catch(() => [] as never[]),
        prisma.blogPost
          .findMany({
            where: blogWhere,
            include: { blogCategory: true },
            orderBy: { date: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          })
          .catch(() => [] as never[]),
        prisma.blogCategory.findMany().catch(() => [] as never[]),
        prisma.blogPost.count({ where: blogWhere }).catch(() => 0),
      ]);

    return jsonSafe({
      success: true,
      data: {
        servicePackages,
        freelances,
        enterprises,
        blogPosts,
        blogCategories,
        total: blogTotal,
        page,
        limit,
        hasMore: (page - 1) * limit + blogPosts.length < blogTotal,
      },
    });
  } catch (error: any) {
    console.error("[SERVICES] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture des services." }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/catalog
 * ------------------------------------------------------------
 * Académie : catégories, centres de formation et LISTE de formations
 * **allégée** (métadonnées seules). Chapitres, leçons et quiz sont
 * volontairement EXCLUS : ils sont chargés à la demande par
 * `/api/catalog/course/[id]`.
 *
 * Paramètres : page, limit, codes, q, center, view, all=1,
 *              includeUnpublished=1 (exige une session)
 */
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
const MAX_ALL = 500;

type View = "populaires" | "mieux-notees" | "nouveautes" | "mises-en-avant" | "toutes";

function buildOrderBy(view: View) {
  switch (view) {
    case "populaires":
      return [{ studentsCount: "desc" as const }, { rating: "desc" as const }];
    case "mieux-notees":
      return [{ reviewsCount: "desc" as const }, { rating: "desc" as const }];
    case "mises-en-avant":
      return [{ isFeatured: "desc" as const }, { createdAt: "desc" as const }];
    default:
      return [{ createdAt: "desc" as const }];
  }
}

/**
 * Projection d'une formation vers sa forme « carte ».
 * Les champs lourds deviennent des tableaux vides : aucune interface ne
 * casse (`.map` reste valide) et le détail est rechargé à l'ouverture.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function projectCourse(c: any) {
  return {
    id: c.id,
    title: c.title,
    slug: c.slug,
    instructorId: c.instructorId || "",
    centerId: c.centerId || "",
    categoryId: c.categoryId || "",
    category: c.category
      ? { id: c.category.id, code: c.category.code, label: c.category.label }
      : null,
    categoryLabel: c.categoryLabel || c.category?.label || "",
    description: c.description || "",
    fullDescription: c.fullDescription || "",
    level: c.level,
    durationHours: Number(c.durationHours || 0),
    lessonsCount: Number(c.lessonsCount || 0),
    price: Number(c.price || 0),
    rating: Number(c.rating || 0),
    reviewsCount: Number(c.reviewsCount || 0),
    studentsCount: Number(c.studentsCount || 0),
    image: c.image || "",
    badge: c.badge || "",
    instructor: {
      name: c.instructorName || "",
      role: c.instructorRole || "",
      avatar: c.instructorAvatar || "",
    },
    isPublished: c.isPublished,
    isFeatured: c.isFeatured,
    createdAt: c.createdAt,
    learningOutcomes: [],
    chapters: [],
    quiz: [],
    /** Marqueur : le détail complet n'est pas encore chargé. */
    isLite: true,
  };
}

export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const wantsAll = params.get("all") === "1";
    const page = Math.max(1, Number(params.get("page") || 1));
    const limit = Math.min(
      Math.max(1, Number(params.get("limit") || DEFAULT_LIMIT)),
      wantsAll ? MAX_ALL : MAX_LIMIT
    );
    const view = (params.get("view") || "toutes") as View;
    const q = (params.get("q") || "").trim();
    const center = (params.get("center") || "").trim();
    const codes = (params.get("codes") || "")
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    // Brouillons : uniquement pour un utilisateur authentifié ou un admin
    const includeUnpublished = params.get("includeUnpublished") === "1";
    if (includeUnpublished) {
      const [user, admin] = await Promise.all([getCurrentUser(req), requireAdmin(req)]);
      if (!user && !admin) {
        return jsonSafe(
          { error: "Session requise pour consulter les formations non publiées." },
          { status: 401 }
        );
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};
    if (!includeUnpublished) where.isPublished = true;
    if (view === "mises-en-avant") where.isFeatured = true;
    if (center) where.centerId = center;
    if (codes.length > 0) where.category = { code: { in: codes } };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { instructorName: { contains: q, mode: "insensitive" } },
      ];
    }

    const skip = wantsAll ? 0 : (page - 1) * limit;

    const [total, rows, courseCategories, trainingCenters] = await Promise.all([
      prisma.course.count({ where }).catch(() => 0),
      prisma.course
        .findMany({
          where,
          include: { category: true },
          orderBy: buildOrderBy(view),
          skip,
          take: limit,
        })
        .catch(() => [] as never[]),
      prisma.courseCategory
        .findMany({ orderBy: { displayOrder: "asc" } })
        .catch(() => [] as never[]),
      prisma.trainingCenter
        .findMany({ orderBy: { createdAt: "desc" } })
        .catch(() => [] as never[]),
    ]);

    const courses = rows.map(projectCourse);

    return jsonSafe({
      success: true,
      data: {
        courses,
        courseCategories,
        trainingCenters,
        total,
        page,
        limit,
        hasMore: wantsAll ? false : skip + courses.length < total,
      },
    });
  } catch (error: any) {
    console.error("[CATALOG] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture du catalogue." }, { status: 500 });
  }
}


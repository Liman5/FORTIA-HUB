import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { hasEntitlement } from "@/lib/modules/payments/entitlements";


export const dynamic = "force-dynamic";

/**
 * GET /api/catalog/course/[id]
 * ------------------------------------------------------------
 * Détail COMPLET d'une formation : chapitres, leçons, quiz,
 * objectifs pédagogiques. Appelé uniquement à l'ouverture d'une
 * formation (lecteur de cours / espace formateur), jamais dans une liste.
 *
 * `id` accepte l'identifiant OU le slug de la formation.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return jsonSafe({ error: "Identifiant manquant." }, { status: 400 });
    }

    const course = await prisma.course.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        category: true,
        chapters: {
          orderBy: { displayOrder: "asc" },
          include: { lessons: { orderBy: { displayOrder: "asc" } } },
        },
        quizzes: {
          orderBy: { displayOrder: "asc" },
          include: { options: true },
        },
      },
    });

    if (!course) {
      return jsonSafe({ error: "Formation introuvable." }, { status: 404 });
    }

    // Bonnes réponses réservées au propriétaire de la formation / admin.
    const [viewer, admin] = await Promise.all([
      getCurrentUser(req).catch(() => null),
      requireAdmin(req).catch(() => null),
    ]);
    const canEdit = Boolean(admin) || Boolean(viewer && viewer.id === course.instructorId);

    // Une formation non publiée n'existe pas pour un visiteur / un autre membre.
    if (!course.isPublished && !canEdit) {
      return jsonSafe({ error: "Formation introuvable." }, { status: 404 });
    }

    // Contenu des leçons : propriétaire, admin, formation gratuite, ou droit réel.
    const [entitled, enrollment] = viewer?.id
      ? await Promise.all([
          hasEntitlement(viewer.id, "course", course.id).catch(() => false),
          prisma.courseEnrollment
            .findUnique({
              where: { userId_courseId: { userId: viewer.id, courseId: course.id } },
              select: { id: true },
            })
            .catch(() => null),
        ])
      : [false, null];
    const hasCourseAccess =
      canEdit || (Number(course.price) === 0 && course.isPublished) || entitled || !!enrollment;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c: any = course;
    let learningOutcomes: unknown[] = [];
    try {
      const parsed = JSON.parse(String(c.learningOutcomes || "[]"));
      if (Array.isArray(parsed)) learningOutcomes = parsed;
    } catch {
      learningOutcomes = [];
    }

    const data = {
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
      learningOutcomes,
      chapters: (c.chapters || []).map((chapter: any) => ({
        id: chapter.id,
        title: chapter.title,
        lessons: (chapter.lessons || []).map((lesson: any) => ({
          id: lesson.id,
          title: lesson.title,
          duration: lesson.duration || "",
          type: lesson.type || "video",
          videoUrl: hasCourseAccess ? lesson.videoUrl || "" : "",
          content: hasCourseAccess ? lesson.content || "" : "",
          videoProtected: hasCourseAccess ? lesson.videoProtected || false : false,
          videoCodeHash: hasCourseAccess ? lesson.videoCodeHash || undefined : undefined,
        })),
      })),
      quiz: (c.quizzes || []).map((quiz: any) => ({
        id: quiz.id,
        question: quiz.question,
        explanation: quiz.explanation || "",
        options: (quiz.options || []).map((option: any) => option.optionText),
        optionIds: (quiz.options || []).map((option: any) => option.id),
        ...(canEdit
          ? {
              correctAnswer: (quiz.options || []).findIndex(
                (option: any) => option.isCorrect
              ),
            }
          : {}),
      })),
      isLite: false,
    };

    return jsonSafe({ success: true, data });
  } catch (error: any) {
    console.error("[CATALOG DETAIL] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture de la formation." }, { status: 500 });
  }
}

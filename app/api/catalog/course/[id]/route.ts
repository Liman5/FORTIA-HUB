import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";

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
  _req: NextRequest,
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
          videoUrl: lesson.videoUrl || "",
          content: lesson.content || "",
          videoProtected: lesson.videoProtected || false,
          videoCodeHash: lesson.videoCodeHash || undefined,
        })),
      })),
      quiz: (c.quizzes || []).map((quiz: any) => ({
        id: quiz.id,
        question: quiz.question,
        explanation: quiz.explanation || "",
        options: (quiz.options || []).map((option: any) => option.optionText),
        correctAnswer: (quiz.options || []).findIndex((option: any) => option.isCorrect),
      })),
      isLite: false,
    };

    return jsonSafe({ success: true, data });
  } catch (error: any) {
    console.error("[CATALOG DETAIL] Erreur:", error);
    return jsonSafe({ error: "Erreur de lecture de la formation." }, { status: 500 });
  }
}

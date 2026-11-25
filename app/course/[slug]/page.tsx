import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import type { NextRequest } from "next/server";
import { AppShell } from "@/components/layout/AppShell";
import { CourseDetail } from "@/components/pages/CourseDetail";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";

export const dynamic = "force-dynamic";

/**
 * Fiche formation — /course/[slug]
 * ------------------------------------------------------------
 * Rendue CÔTÉ SERVEUR : la page est partageable et référençable.
 * L'accès (paywall) est décidé ici : formation gratuite, formation déjà
 * achetée (enrolled_course_ids / commande payée), ou formateur propriétaire.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await findCourse(slug);

  return {
    title: course ? `${course.title} | Académie FORTIA HUB` : "Formation | FORTIA HUB",
    description: course?.description || "Formation en ligne disponible sur FORTIA HUB.",
  };
}

/**
 * Lecture unique par requête (`cache`) : les métadonnées et la page
 * partagent la même requête, au lieu d'en lancer deux.
 */
const findCourse = cache(async (slug: string) => {
  // Le slug peut arriver encodé (accents, « & », espaces) : on teste les deux.
  const candidates = Array.from(
    new Set([
      slug,
      (() => {
        try {
          return decodeURIComponent(slug);
        } catch {
          return slug;
        }
      })(),
    ])
  );
  const looksLikeUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const uuids = candidates.filter(looksLikeUuid);

  return prisma.course
    .findFirst({
      where: uuids.length > 0 ? { OR: [{ slug: { in: candidates } }, { id: { in: uuids } }] } : { slug: { in: candidates } },
      include: {
        category: true,
        chapters: {
          orderBy: { displayOrder: "asc" },
          include: { lessons: true },
        },
      },
    })
    .catch(() => null);
});

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await findCourse(slug);

  if (!course) notFound();

  // Qui regarde ? (session utilisateur via cookie HttpOnly)
  const cookieStore = await cookies();
  const requestLike = { cookies: cookieStore } as unknown as NextRequest;
  const viewer = await getCurrentUser(requestLike).catch(() => null);

  let ownsCourse = false;
  if (viewer) {
    ownsCourse =
      (viewer.enrolledCourseIds || []).includes(course.id) ||
      (!!viewer.id && course.instructorId === viewer.id);
    if (!ownsCourse) {
      const paidOrder = await prisma.marketplaceOrder
        .findFirst({
          where: { buyerUserId: viewer.id, productId: course.id, status: "Paye" },
          select: { id: true },
        })
        .catch(() => null);
      ownsCourse = !!paidOrder;
    }
  }

  const hasAccess = Number(course.price) === 0 || ownsCourse;

  let outcomes: string[] = [];
  try {
    const parsed = JSON.parse(String(course.learningOutcomes || "[]"));
    if (Array.isArray(parsed)) outcomes = parsed.map((item: unknown) => String(item));
  } catch {
    outcomes = [];
  }

  const serialized = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    categoryLabel: course.categoryLabel || course.category?.label || "Formation",
    description: course.description || "",
    fullDescription: course.fullDescription || "",
    level: String(course.level || "Tous niveaux"),
    durationHours: Number(course.durationHours) || 0,
    lessonsCount: Number(course.lessonsCount) || 0,
    price: Number(course.price) || 0,
    rating: Number(course.rating) || 0,
    reviewsCount: Number(course.reviewsCount) || 0,
    studentsCount: Number(course.studentsCount) || 0,
    image: course.image || "",
    badge: course.badge || "",
    instructorName: course.instructorName || "Formateur FORTIA HUB",
    instructorRole: course.instructorRole || "",
    instructorAvatar: course.instructorAvatar || "",
    outcomes,
    chapters: (course.chapters || []).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      lessons: (chapter.lessons || []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        duration: lesson.duration || "",
        type: String(lesson.type || "video"),
      })),
    })),
  };

  return (
    <AppShell>
      <CourseDetail course={serialized} hasAccess={hasAccess} isLoggedIn={!!viewer} />
    </AppShell>
  );
}

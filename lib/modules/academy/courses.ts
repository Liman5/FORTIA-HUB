// ============================================================
// FORTIA HUB — SERVICE MÉTIER DES FORMATIONS (Phase 6)
// ============================================================

import { prisma } from "@/lib/prisma";
import { UUID_PATTERN } from "@/lib/validation/common";
import { normalizeCourseLevel, slugifyCourseTitle } from "./courseIdentity";

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

export type CourseWriteData = Record<string, any>;

export async function uniqueCourseSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugifyCourseTitle(base) || `cours-${Date.now()}`;
  let candidate = root;
  let suffix = 2;
  while (suffix < 500) {
    const existing = await prisma.course
      .findUnique({ where: { slug: candidate }, select: { id: true } })
      .catch(() => null);
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
  return `${root}-${Date.now()}`;
}

export async function resolveCourseCategoryId(ref: unknown): Promise<string | undefined> {
  const value = String(ref || "").trim();
  if (!value) return undefined;
  const category = await prisma.courseCategory
    .findUnique({
      where: UUID_PATTERN.test(value) ? { id: value } : { code: value },
    })
    .catch(() => null);
  return category?.id ?? undefined;
}

async function createChapters(
  tx: TransactionClient,
  courseId: string,
  chapters: unknown
): Promise<void> {
  if (!Array.isArray(chapters)) return;
  for (const [index, chapter] of chapters.entries()) {
    const createdChapter = await tx.courseChapter.create({
      data: {
        courseId,
        title: chapter.title || "Chapitre " + (index + 1),
        displayOrder: index,
      },
    });
    if (!Array.isArray(chapter.lessons)) continue;
    for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
      await tx.courseLesson.create({
        data: {
          chapterId: createdChapter.id,
          title: lesson.title || "Lecon " + (lessonIndex + 1),
          duration: lesson.duration || "15 min",
          type: lesson.type || "video",
          videoUrl: lesson.videoUrl || "",
          content: lesson.content || "",
          videoProtected: !!lesson.videoProtected,
          videoCodeHash: String(lesson.videoCodeHash || ""),
          displayOrder: lessonIndex,
        } as never,
      });
    }
  }
}

async function createQuizzes(
  tx: TransactionClient,
  courseId: string,
  quizzes: unknown
): Promise<void> {
  if (!Array.isArray(quizzes)) return;
  for (const [index, quiz] of quizzes.entries()) {
    const createdQuiz = await tx.courseQuiz.create({
      data: {
        courseId,
        question: quiz.question || "",
        explanation: quiz.explanation || "",
        displayOrder: index,
      },
    });
    if (!Array.isArray(quiz.options)) continue;
    for (const [optionIndex, option] of quiz.options.entries()) {
      await tx.quizOption.create({
        data: {
          quizId: createdQuiz.id,
          optionText: option,
          isCorrect: optionIndex === (quiz.correctAnswer ?? 0),
          displayOrder: optionIndex,
        },
      });
    }
  }
}

/** Création administrative (l'instructeur n'est pas imposé par la session). */
export async function createCourseRecord(data: CourseWriteData): Promise<string> {
  const categoryId = await resolveCourseCategoryId(data.category);
  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title: data.title || "Cours sans titre",
        slug: data.slug || "cours-" + Date.now(),
        categoryId,
        categoryLabel: data.categoryLabel || data.category || "",
        description: data.description || "",
        fullDescription: data.fullDescription || "",
        level: data.level || "Tous_niveaux",
        durationHours: data.durationHours || 0,
        lessonsCount: data.lessonsCount || 0,
        price: data.price || 0,
        rating: 5.0,
        reviewsCount: 0,
        studentsCount: 0,
        image: data.image || "",
        badge: data.badge || "",
        instructorName: data.instructorName || "",
        instructorRole: data.instructorRole || "",
        instructorAvatar: data.instructorAvatar || "",
        learningOutcomes: data.learningOutcomes || [],
        isPublished: data.isPublished ?? true,
        isFeatured: data.isFeatured ?? false,
      } as never,
    });
    await createChapters(tx, course.id, data.chapters);
    return course.id;
  });
}

export interface InstructorCourseInput {
  instructorId: string;
  centerId?: string | null;
  data: CourseWriteData;
}

export async function createInstructorCourseRecord(
  input: InstructorCourseInput
): Promise<string> {
  const { data } = input;
  const categoryId = await resolveCourseCategoryId(data.category || data.categoryId);
  const title = String(data.title || "").trim() || "Cours sans titre";
  const slug = await uniqueCourseSlug(String(data.slug || title));

  return prisma.$transaction(async (tx) => {
    const course = await tx.course.create({
      data: {
        title,
        slug,
        instructorId: input.instructorId,
        centerId: input.centerId || undefined,
        categoryId,
        categoryLabel: data.categoryLabel || data.category || "",
        description: data.description || "",
        fullDescription: data.fullDescription || "",
        level: normalizeCourseLevel(data.level),
        durationHours: data.durationHours || 0,
        lessonsCount: data.lessonsCount || 0,
        price: data.price || 0,
        image: data.image || "",
        badge: data.badge || "",
        instructorName: data.instructorName || "",
        instructorRole: data.instructorRole || "",
        instructorAvatar: data.instructorAvatar || "",
        learningOutcomes: data.learningOutcomes || [],
        isPublished: data.isPublished ?? false,
      } as never,
    });
    await createChapters(tx, course.id, data.chapters);
    await createQuizzes(tx, course.id, data.quiz);
    return course.id;
  });
}

export async function updateCourseRecord(
  courseId: string,
  data: CourseWriteData
): Promise<string> {
  const categoryId =
    data.categoryId ?? (data.category ? await resolveCourseCategoryId(data.category) : undefined);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.course.update({
      where: { id: courseId },
      data: {
        title: data.title ?? undefined,
        slug: data.slug ?? undefined,
        categoryId,
        categoryLabel: data.categoryLabel ?? undefined,
        description: data.description ?? undefined,
        fullDescription: data.fullDescription ?? undefined,
        level: data.level ?? undefined,
        durationHours: data.durationHours ?? undefined,
        lessonsCount: data.lessonsCount ?? undefined,
        price: data.price ?? undefined,
        image: data.image ?? undefined,
        badge: data.badge ?? undefined,
        instructorName: data.instructorName ?? undefined,
        instructorRole: data.instructorRole ?? undefined,
        instructorAvatar: data.instructorAvatar ?? undefined,
        learningOutcomes: data.learningOutcomes ?? undefined,
        rating: data.rating ?? undefined,
        reviewsCount: data.reviewsCount ?? undefined,
        isPublished: data.isPublished ?? undefined,
        isFeatured: data.isFeatured ?? undefined,
      } as never,
    });

    if (Array.isArray(data.chapters)) {
      await tx.courseChapter.deleteMany({ where: { courseId } });
      await createChapters(tx, courseId, data.chapters);
    }
    if (Array.isArray(data.quiz)) {
      await tx.courseQuiz.deleteMany({ where: { courseId } });
      await createQuizzes(tx, courseId, data.quiz);
    }
    return updated.id;
  });
}

export async function suspendCourseRecord(courseId: string): Promise<string> {
  const updated = await prisma.course.update({
    where: { id: courseId },
    data: { isPublished: false } as never,
  });
  return updated.id;
}

export async function setCourseFeaturedRecord(
  courseId: string,
  isFeatured: boolean
): Promise<{ id: string; isFeatured: boolean }> {
  return prisma.course.update({
    where: { id: courseId },
    data: { isFeatured } as never,
    select: { id: true, isFeatured: true },
  });
}

export async function archiveAndDeleteCourse(courseId: string): Promise<boolean> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      chapters: { include: { lessons: true } },
      quizzes: { include: { options: true } },
      reviews: true,
      certificates: true,
    },
  });
  if (!course) return false;

  await prisma.$transaction(async (tx) => {
    const payload = JSON.parse(JSON.stringify(course)) as never;
    await tx.dataArchive.upsert({
      where: {
        tableName_recordId_reason: {
          tableName: "courses",
          recordId: course.id,
          reason: "course_deleted",
        },
      },
      create: {
        tableName: "courses",
        recordId: course.id,
        reason: "course_deleted",
        payload,
      },
      update: { payload, archivedAt: new Date() },
    });

    await tx.entitlement.updateMany({
      where: {
        resourceType: "course",
        resourceId: course.id,
        status: { in: ["active", "suspended"] },
      },
      data: { status: "revoked", revokedAt: new Date() },
    });

    await tx.course.delete({ where: { id: course.id } });
  });

  return true;
}


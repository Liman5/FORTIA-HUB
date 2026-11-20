// ============================================================
// FORTIA HUB — PROGRESSION PÉDAGOGIQUE SERVEUR (Phase 3)
// ------------------------------------------------------------
// Source de vérité de la progression : une ligne par leçon terminée.
// Aucune valeur de progression envoyée par le navigateur n'est acceptée
// pour débloquer une attestation.
// ============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasEntitlement } from "@/lib/modules/payments/entitlements";
import {
  AppError,
  forbiddenError,
  notFoundError,
} from "@/lib/server/errors";

type Db = Prisma.TransactionClient | typeof prisma;

export const QUIZ_PASS_THRESHOLD = 0.7;

export interface CourseAccess {
  course: {
    id: string;
    title: string;
    categoryLabel: string;
    price: unknown;
    isPublished: boolean;
  };
  enrollmentId: string | null;
}

export interface CourseProgressSummary {
  totalLessons: number;
  completedLessons: number;
  progressPercent: number;
  totalQuizzes: number;
  bestQuiz: { score: number; total: number; percent: number; passed: boolean } | null;
}

/** Vérifie l'accès réel (entitlement, inscription ou formation gratuite publiée). */
export async function assertCourseAccess(
  userId: string,
  courseId: string
): Promise<CourseAccess> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      categoryLabel: true,
      price: true,
      isPublished: true,
    },
  });
  if (!course) throw notFoundError("Formation introuvable.");

  const isFree = Number(course.price) === 0 && course.isPublished;
  if (!isFree) {
    const [entitled, enrollment] = await Promise.all([
      hasEntitlement(userId, "course", courseId),
      prisma.courseEnrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true },
      }),
    ]);
    if (!entitled && !enrollment) {
      throw forbiddenError("Vous n'avez pas accès à cette formation.");
    }
    return { course, enrollmentId: enrollment?.id || null };
  }

  const enrollment = await prisma.courseEnrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  return { course, enrollmentId: enrollment?.id || null };
}

/** Calcule la progression à partir des preuves serveur uniquement. */
export async function computeCourseProgress(
  userId: string,
  courseId: string,
  db: Db = prisma
): Promise<CourseProgressSummary> {
  const [totalLessons, completedLessons, totalQuizzes, attempts] = await Promise.all([
    db.courseLesson.count({ where: { chapter: { courseId } } }),
    db.courseLessonProgress.count({ where: { userId, courseId } }),
    db.courseQuiz.count({ where: { courseId } }),
    db.courseQuizAttempt.findMany({
      where: { userId, courseId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { score: true, total: true, passed: true },
    }),
  ]);

  const progressPercent =
    totalLessons > 0 ? Math.min(100, Math.round((completedLessons / totalLessons) * 100)) : 0;

  let bestQuiz: CourseProgressSummary["bestQuiz"] = null;
  for (const attempt of attempts) {
    const percent = attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0;
    if (!bestQuiz || percent > bestQuiz.percent) {
      bestQuiz = {
        score: attempt.score,
        total: attempt.total,
        percent,
        passed: attempt.passed,
      };
    }
  }

  return { totalLessons, completedLessons, progressPercent, totalQuizzes, bestQuiz };
}

/** Met à jour l'inscription et le cache d'affichage (jamais une preuve). */
async function syncProgressCache(
  userId: string,
  courseId: string,
  summary: CourseProgressSummary,
  db: Db = prisma
): Promise<void> {
  const completedAt = summary.progressPercent === 100 ? new Date() : null;
  await db.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      progress: summary.progressPercent,
      completedAt,
    },
    update: {
      progress: summary.progressPercent,
      completedAt,
    },
  });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { courseProgress: true },
  });
  let map: Record<string, number> = {};
  try {
    const parsed = JSON.parse(String(user?.courseProgress || "{}"));
    if (parsed && typeof parsed === "object") map = { ...parsed };
  } catch {
    map = {};
  }
  map[courseId] = summary.progressPercent;
  await db.user.update({
    where: { id: userId },
    data: { courseProgress: map as never },
  });
}

/** Enregistre (ou retire) la complétion d'une leçon appartenant au cours. */
export async function recordLessonProgress(
  userId: string,
  courseId: string,
  lessonId: string,
  completed: boolean
): Promise<CourseProgressSummary> {
  await assertCourseAccess(userId, courseId);

  const lesson = await prisma.courseLesson.findFirst({
    where: { id: lessonId, chapter: { courseId } },
    select: { id: true },
  });
  if (!lesson) {
    throw new AppError(400, "LESSON_NOT_IN_COURSE", "Cette leçon n'appartient pas à la formation.");
  }

  return prisma.$transaction(async (tx) => {
    if (completed) {
      await tx.courseLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: { userId, courseId, lessonId },
        update: { completedAt: new Date() },
      });
    } else {
      await tx.courseLessonProgress.deleteMany({ where: { userId, lessonId } });
    }

    const summary = await computeCourseProgress(userId, courseId, tx);
    await syncProgressCache(userId, courseId, summary, tx);
    return summary;
  });
}

export interface QuizCorrection {
  quizId: string;
  correctOptionId: string;
  correctOptionIndex: number;
  explanation: string;
  isCorrect: boolean;
}

export interface QuizAttemptResult {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  corrections: QuizCorrection[];
}

/**
 * Calcule le score À PARTIR DES RÉPONSES et des bonnes réponses en base.
 * Le navigateur ne peut donc jamais déclarer un score ou une réussite.
 */
export async function recordQuizAttempt(
  userId: string,
  courseId: string,
  answers: Array<{ quizId: string; optionId: string }>
): Promise<QuizAttemptResult> {
  await assertCourseAccess(userId, courseId);

  const quizzes = await prisma.courseQuiz.findMany({
    where: { courseId },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      explanation: true,
      options: {
        orderBy: { displayOrder: "asc" },
        select: { id: true, isCorrect: true },
      },
    },
  });

  if (quizzes.length === 0) {
    throw new AppError(409, "NO_QUIZ", "Cette formation ne comporte aucun quiz.");
  }

  const answerByQuiz = new Map<string, string>();
  for (const answer of answers) {
    if (answerByQuiz.has(answer.quizId)) {
      throw new AppError(400, "DUPLICATE_ANSWER", "Chaque question ne peut être répondue qu'une fois.");
    }
    answerByQuiz.set(answer.quizId, answer.optionId);
  }

  let score = 0;
  const corrections: QuizCorrection[] = [];
  const storedAnswers: Record<string, string> = {};

  for (const quiz of quizzes) {
    const optionId = answerByQuiz.get(quiz.id);
    if (!optionId) {
      throw new AppError(400, "INCOMPLETE_QUIZ", "Toutes les questions doivent être répondues.");
    }
    const chosen = quiz.options.find((option) => option.id === optionId);
    if (!chosen) {
      throw new AppError(400, "INVALID_OPTION", "Réponse invalide pour une question.");
    }

    const correctIndex = quiz.options.findIndex((option) => option.isCorrect);
    const correctOption = quiz.options[correctIndex];
    const isCorrect = chosen.isCorrect;
    if (isCorrect) score += 1;
    storedAnswers[quiz.id] = optionId;

    corrections.push({
      quizId: quiz.id,
      correctOptionId: correctOption?.id || "",
      correctOptionIndex: correctIndex,
      explanation: quiz.explanation,
      isCorrect,
    });
  }

  const total = quizzes.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const passed = total > 0 && score / total >= QUIZ_PASS_THRESHOLD;

  await prisma.courseQuizAttempt.create({
    data: {
      userId,
      courseId,
      score,
      total,
      passed,
      answers: storedAnswers as never,
    },
  });

  return { score, total, percent, passed, corrections };
}


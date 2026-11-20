import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { recordLessonProgress } from "@/lib/modules/academy/progress";
import { lessonProgressSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/** POST /api/academy/lessons/progress — preuve serveur de complétion. */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  await enforceRateLimit("academyProgress", req, user.id);
  const body = parseOrThrow(lessonProgressSchema, await req.json().catch(() => null));

  const progress = await recordLessonProgress(
    user.id,
    body.courseId,
    body.lessonId,
    body.completed ?? true
  );

  return NextResponse.json({
    success: true,
    data: {
      progress: progress.progressPercent,
      completedLessons: progress.completedLessons,
      totalLessons: progress.totalLessons,
      quizRequired: progress.totalQuizzes > 0,
      quizPassed: progress.bestQuiz?.passed || false,
    },
  });
});

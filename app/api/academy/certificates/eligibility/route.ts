import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { evaluateCertificateEligibility } from "@/lib/modules/academy/certificates";
import { courseIdQuerySchema } from "@/lib/validation";
import { parseOrThrow, queryObject } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/** GET /api/academy/certificates/eligibility?courseId=… */
export const GET = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  const { courseId } = parseOrThrow(courseIdQuerySchema, queryObject(req));
  const result = await evaluateCertificateEligibility(user.id, courseId);

  return NextResponse.json({
    success: true,
    data: {
      eligible: result.eligible,
      reasons: result.reasons,
      progress: result.progress.progressPercent,
      completedLessons: result.progress.completedLessons,
      totalLessons: result.progress.totalLessons,
      quizRequired: result.progress.totalQuizzes > 0,
      bestQuiz: result.progress.bestQuiz,
    },
  });
});

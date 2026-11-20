import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { recordQuizAttempt } from "@/lib/modules/academy/progress";
import { quizAttemptSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/academy/quizzes/attempt
 * Le serveur calcule le score à partir des réponses et des bonnes
 * réponses en base : le client ne peut pas déclarer une réussite.
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  await enforceRateLimit("academyProgress", req, user.id);
  const body = parseOrThrow(quizAttemptSchema, await req.json().catch(() => null));

  const result = await recordQuizAttempt(user.id, body.courseId, body.answers);
  return NextResponse.json({ success: true, data: result });
});

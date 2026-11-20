import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { issueCourseCertificate } from "@/lib/modules/academy/certificates";
import { certificateIssueSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/academy/certificates/issue
 * Délivre l'attestation UNIQUEMENT après vérification serveur complète
 * (accès, toutes les leçons, quiz réussi). Idempotent.
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  await enforceRateLimit("certificate", req, user.id);
  const body = parseOrThrow(certificateIssueSchema, await req.json().catch(() => null));

  const certificate = await issueCourseCertificate({
    userId: user.id,
    courseId: body.courseId,
    actorId: user.id,
    isAdmin: false,
  });

  return NextResponse.json({ success: true, certificate });
});

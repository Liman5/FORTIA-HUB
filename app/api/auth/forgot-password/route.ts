import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  supabaseSendPasswordReset,
  supabaseEnsureAuthUser,
  isSupabaseAuthConfigured,
} from "@/lib/services/supabaseAuth";
import { forgotPasswordSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { logger } from "@/lib/server/logger";
import { withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/forgot-password
 * Réponse toujours générique : ne révèle jamais l'existence d'un compte.
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  await enforceRateLimit("authPasswordReset", req);
  const body = parseOrThrow(forgotPasswordSchema, await req.json().catch(() => null));

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });

  if (user) {
    if (isSupabaseAuthConfigured()) {
      try {
        const tempPassword = `fh_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        await supabaseEnsureAuthUser(body.email, tempPassword);
      } catch (error) {
        logger.warn("auth_forgot_password_supabase_user", {
          message: (error as Error)?.message,
        });
      }
    }

    const origin =
      req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    try {
      await supabaseSendPasswordReset(body.email, `${origin}/reset-password`);
    } catch (error) {
      logger.error("auth_forgot_password_send", { message: (error as Error)?.message });
    }
  }

  return NextResponse.json({
    success: true,
    message:
      "Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.",
  });
});


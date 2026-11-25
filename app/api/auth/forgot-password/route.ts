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
import { AppError, withApiRoute } from "@/lib/server/errors";
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

    // ⚠️ SÉCURITÉ : l'URL de retour est construite UNIQUEMENT à partir de la
    // configuration serveur. L'en-tête `Origin` est contrôlé par l'appelant :
    // il ne doit jamais décider de la destination du lien de réinitialisation
    // (risque de redirection du jeton vers un domaine hostile).
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
    if (!appUrl) {
      if (process.env.NODE_ENV === "production") {
        logger.error("auth_forgot_password_missing_app_url", {
          message: "NEXT_PUBLIC_APP_URL est absent : impossible de construire le lien de réinitialisation.",
        });
        throw new AppError(
          503,
          "APP_URL_MISSING",
          "Service de réinitialisation momentanément indisponible. Contactez le support."
        );
      }
      logger.warn("auth_forgot_password_dev_fallback", { message: "NEXT_PUBLIC_APP_URL absent : repli localhost." });
    }
    const origin = appUrl || "http://localhost:3000";
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


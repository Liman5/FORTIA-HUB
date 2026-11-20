import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  decodeSupabaseToken,
  supabaseUpdatePassword,
} from "@/lib/services/supabaseAuth";
import { resetPasswordSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { AppError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/reset-password
 * Body : { accessToken, password }
 * Valide le token Supabase, met à jour auth.users puis la table users.
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  await enforceRateLimit("authPasswordReset", req);
  const body = parseOrThrow(resetPasswordSchema, await req.json().catch(() => null));

  try {
    await supabaseUpdatePassword(body.accessToken, body.password);
  } catch {
    throw new AppError(
      401,
      "INVALID_RESET_TOKEN",
      "Lien de réinitialisation invalide ou expiré."
    );
  }

  const payload = decodeSupabaseToken(body.accessToken);
  const email = payload?.email || payload?.user_metadata?.email;
  if (email) {
    const passwordHash = await bcrypt.hash(body.password, 10);
    await prisma.user.update({
      where: { email: String(email) },
      data: { passwordHash },
    });
  }

  return NextResponse.json({
    success: true,
    message: "Votre mot de passe a été réinitialisé avec succès. Vous pouvez vous connecter.",
  });
});


import { NextResponse } from "next/server";
import { isEmailVerificationRequired } from "@/lib/services/emailVerification";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/config
 * Configuration publique minimale du parcours d'authentification.
 * Ne renvoie QUE le drapeau de vérification d'e-mail (aucune donnée interne).
 */
export async function GET() {
  return NextResponse.json(
    { emailVerificationRequired: isEmailVerificationRequired() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

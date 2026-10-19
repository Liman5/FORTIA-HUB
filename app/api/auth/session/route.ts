import { NextRequest, NextResponse } from "next/server";
import {
  clearSessionCookie,
  extendSessionIfNeeded,
  getCurrentUser,
  revokeSession,
  setSessionCookie,
} from "@/lib/services/authSession";
import { isTwoFactorEnabled } from "@/lib/services/twoFactor";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Vérifie la session JWT (cookie HttpOnly) et retourne l'utilisateur connecté.
 * Prolonge aussi la session si elle approche de son terme (30 jours glissants).
 * Retourne 401 si non authentifié.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié. Veuillez vous connecter." },
        { status: 401 }
      );
    }

    const twoFactorEnabled = await isTwoFactorEnabled(user.id);
    const response = NextResponse.json({ success: true, user: { ...user, twoFactorEnabled } });

    // Renouvellement glissant : l'app reste connectée tant qu'elle est utilisée.
    const extended = await extendSessionIfNeeded(request);
    if (extended) setSessionCookie(response, extended.token, extended.expiresAt);

    return response;
  } catch (error: any) {
    console.error("[AUTH SESSION] Erreur de vérification:", error?.message);
    return NextResponse.json(
      { error: "Erreur serveur lors de la vérification de la session." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/session
 * Déconnecte l'utilisateur : révoque la session en base et efface le cookie.
 */
export async function DELETE(request: NextRequest) {
  try {
    await revokeSession(request);
    const response = NextResponse.json({ success: true, message: "Déconnexion réussie." });
    clearSessionCookie(response);
    return response;
  } catch (error: any) {
    console.error("[AUTH SESSION] Erreur de déconnexion:", error?.message);
    return NextResponse.json(
      { error: "Erreur serveur lors de la déconnexion." },
      { status: 500 }
    );
  }
}

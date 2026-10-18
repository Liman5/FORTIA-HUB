import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/session
 * ------------------------------------------------------------
 * L'appelant possède-t-il une SESSION ADMINISTRATEUR valide ?
 *
 * Accepter deux voies (voir requireAdmin) :
 *   1. jeton de session admin → `Authorization: Bearer <token>`
 *      (créé par POST /api/admin/auth, conservé dans le navigateur) ;
 *   2. compte utilisateur dont le rôle est `admin` (cookie de session).
 *
 * Le drapeau `isAdmin` du client n'est JAMAIS une preuve : cette route est
 * la seule source de vérité côté serveur.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    if (!admin) {
      return NextResponse.json({ success: true, isAdmin: false });
    }

    return NextResponse.json({
      success: true,
      isAdmin: true,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });
  } catch (error: any) {
    console.error("[ADMIN SESSION] Erreur:", error);
    return NextResponse.json({ success: false, isAdmin: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { getVendorOverview, getInstructorOverview } from "@/lib/modules/analytics/overview";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/overview?role=vendor|instructor
 * ------------------------------------------------------------
 * Statistiques RÉELLES du compte connecté (aucune donnée d'un autre compte) :
 * ventes, revenus, commandes, vues, clics et ajouts au panier des 30 derniers
 * jours, série journalière, meilleurs contenus et dernières commandes.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const role = String(request.nextUrl.searchParams.get("role") || "vendor").toLowerCase();
    if (role !== "vendor" && role !== "instructor") {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }

    const overview =
      role === "instructor"
        ? await getInstructorOverview(user.id)
        : await getVendorOverview(user.id, user.email);

    return NextResponse.json({ success: true, overview });
  } catch (error: any) {
    console.error("[ANALYTICS] Erreur:", error);
    return NextResponse.json({ error: "Statistiques indisponibles." }, { status: 500 });
  }
}

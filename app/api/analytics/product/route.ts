import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { getProductAnalytics } from "@/lib/modules/analytics/overview";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/analytics/product?productId=…
 * Statistiques détaillées d'un produit : réservées à son propriétaire.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const productId = String(request.nextUrl.searchParams.get("productId") || "");
    if (!UUID_PATTERN.test(productId)) {
      return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
    }

    const analytics = await getProductAnalytics(user.id, user.email, productId);
    if (!analytics) {
      return NextResponse.json({ error: "Produit introuvable ou accès refusé." }, { status: 404 });
    }

    return NextResponse.json({ success: true, analytics });
  } catch (error: any) {
    console.error("[ANALYTICS PRODUIT] Erreur:", error);
    return NextResponse.json({ error: "Statistiques indisponibles." }, { status: 500 });
  }
}

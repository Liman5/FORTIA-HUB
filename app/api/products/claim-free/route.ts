import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/services/authSession";
import { grantEntitlement } from "@/lib/modules/payments/entitlements";

export const dynamic = "force-dynamic";

/**
 * POST /api/products/claim-free
 * ------------------------------------------------------------
 * Enregistre un produit GRATUIT dans la bibliothèque du membre connecté.
 *
 * Aucun paiement, aucun panier : le droit est accordé parce que le produit
 * est publié ET vendu à 0 (vérifié en base, jamais depuis le navigateur).
 * La fonction `grantEntitlement` est idempotente et synchronise aussi le
 * cache d'accès historique (donc la bibliothèque et les téléchargements).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const productId = String(body?.productId || "");
    if (!UUID_PATTERN.test(productId)) {
      return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, isPublished: true },
      select: { id: true, price: true, type: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
    }
    if (product.type === "course" || product.type === "service") {
      return NextResponse.json({ error: "Ce contenu n'est pas un produit numérique." }, { status: 400 });
    }
    if (Number(product.price) !== 0) {
      return NextResponse.json({ error: "Ce produit n'est pas gratuit." }, { status: 400 });
    }

    await grantEntitlement({
      userId: user.id,
      resourceType: "product",
      resourceId: product.id,
      source: "free_product",
      metadata: { channel: "free-download" },
    });

    return NextResponse.json({ success: true, productId: product.id });
  } catch (error: any) {
    console.error("[CLAIM FREE PRODUCT] Erreur:", error);
    return NextResponse.json({ error: "Ajout à la bibliothèque impossible." }, { status: 500 });
  }
}

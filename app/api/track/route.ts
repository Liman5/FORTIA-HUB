import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

/**
 * POST /api/track
 * Statistiques produits : { productId, storeId?, type: "view" | "click" | "add_to_cart" }
 *
 * Écriture silencieuse et sans impact utilisateur : toute erreur est ignorée
 * (les statistiques ne doivent jamais gêner la navigation ni l'achat).
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    // Anti-abus : 120 événements / minute par IP (largement suffisant).
    if (rateLimit(`track:${clientIp(req)}`, 120, 60_000)) {
      return NextResponse.json({ success: true, ignored: true });
    }

    const body = await req.json().catch(() => null);
    const type = String(body?.type || "");
    if (!["view", "click", "add_to_cart"].includes(type)) {
      return NextResponse.json({ success: false }, { status: 400 });
    }

    const productId = UUID.test(String(body?.productId || "")) ? String(body.productId) : null;
    const storeId = UUID.test(String(body?.storeId || "")) ? String(body.storeId) : null;
    if (!productId && !storeId) return NextResponse.json({ success: true, ignored: true });

    await prisma.productEvent.create({
      data: { productId, storeId, eventType: type } as never,
    });

    return NextResponse.json({ success: true });
  } catch {
    // Jamais d'erreur visible : le tracking est accessoire.
    return NextResponse.json({ success: true, ignored: true });
  }
}

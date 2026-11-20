import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { cancelPendingOrder } from "@/lib/modules/payments/orders";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/** POST /api/payments/cancel — annule une commande encore en attente. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const body = await req.json().catch(() => null);
    const orderId = String(body?.orderId || "").trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId requis.", code: "ORDER_REQUIRED" },
        { status: 400 }
      );
    }
    const result = await cancelPendingOrder(orderId, user.id);
    return NextResponse.json({ success: true, cancelled: result.success });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

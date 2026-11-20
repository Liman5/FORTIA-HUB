import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import {
  cancelSubscription,
  listUserSubscriptions,
} from "@/lib/modules/payments/subscriptions";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/** GET /api/subscriptions — abonnements du membre connecté. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }
    const subscriptions = await listUserSubscriptions(user.id);
    return NextResponse.json({ success: true, data: { subscriptions } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

/** POST /api/subscriptions — annule un abonnement (fin de période). */
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
    const subscriptionId = String(body?.subscriptionId || "").trim();
    if (!subscriptionId) {
      return NextResponse.json(
        { success: false, error: "subscriptionId requis.", code: "SUBSCRIPTION_REQUIRED" },
        { status: 400 }
      );
    }
    const subscription = await cancelSubscription(user.id, subscriptionId);
    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

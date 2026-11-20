import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import {
  cancelSubscription,
  listUserSubscriptions,
} from "@/lib/modules/payments/subscriptions";
import { subscriptionCancelSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/** GET /api/subscriptions — abonnements du membre connecté. */
export const GET = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();
  const subscriptions = await listUserSubscriptions(user.id);
  return NextResponse.json({ success: true, data: { subscriptions } });
});

/** POST /api/subscriptions — annule un abonnement (fin de période). */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  await enforceRateLimit("subscriptionWrite", req, user.id);
  const body = parseOrThrow(subscriptionCancelSchema, await req.json().catch(() => null));
  const subscription = await cancelSubscription(user.id, body.subscriptionId);

  return NextResponse.json({
    success: true,
    data: {
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
  });
});


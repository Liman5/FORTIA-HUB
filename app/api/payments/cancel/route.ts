import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { cancelPendingOrder } from "@/lib/modules/payments/orders";
import { cancelOrderSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import { unauthorizedError, withApiRoute } from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/** POST /api/payments/cancel — annule une commande encore en attente. */
export const POST = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  await enforceRateLimit("paymentCancel", req, user.id);
  const body = parseOrThrow(cancelOrderSchema, await req.json().catch(() => null));
  const result = await cancelPendingOrder(body.orderId, user.id);
  return NextResponse.json({ success: true, cancelled: result.success });
});


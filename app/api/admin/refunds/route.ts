import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { listRefunds, refundOrder } from "@/lib/modules/payments/refunds";
import { refundSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import {
  forbiddenError,
  unauthorizedError,
  withApiRoute,
} from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/** GET /api/admin/refunds — historique des remboursements (admins). */
export const GET = withApiRoute(async (req: NextRequest) => {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) throw unauthorizedError("Accès réservé à l'administration.");

  const requested = Number(req.nextUrl.searchParams.get("limit") || 100);
  const limit = Number.isFinite(requested) ? requested : 100;
  const refunds = await listRefunds(limit);
  return NextResponse.json({ success: true, data: { refunds } });
});

/** POST /api/admin/refunds — rembourse un paiement (domaine finance). */
export const POST = withApiRoute(async (req: NextRequest) => {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) throw unauthorizedError("Accès réservé à l'administration.");
  if (isReadOnlyAdmin(admin.role)) {
    throw forbiddenError("Votre profil est en lecture seule : aucun remboursement autorisé.");
  }
  if (!canWriteDomain(admin.role, "finance")) {
    throw forbiddenError("Vos droits ne couvrent pas le domaine finance.");
  }

  await enforceRateLimit("refund", req, admin.id);
  const body = parseOrThrow(refundSchema, await req.json().catch(() => null));

  const refund = await refundOrder({
    orderId: body.orderId,
    paymentId: body.paymentId,
    amountMinor: body.amountMinor,
    reason: body.reason,
    adminId: admin.id,
  });

  return NextResponse.json({ success: true, data: { refund } });
});


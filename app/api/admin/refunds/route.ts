import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { listRefunds, refundOrder } from "@/lib/modules/payments/refunds";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/refunds — historique des remboursements (admins). */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req).catch(() => null);
    if (!admin) return unauthorizedResponse("Accès réservé à l'administration.");
    const limit = Number(req.nextUrl.searchParams.get("limit") || 100);
    const refunds = await listRefunds(limit);
    return NextResponse.json({ success: true, data: { refunds } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

/** POST /api/admin/refunds — rembourse un paiement (domaine finance). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req).catch(() => null);
    if (!admin) return unauthorizedResponse("Accès réservé à l'administration.");
    if (isReadOnlyAdmin(admin.role)) {
      return forbiddenResponse("Votre profil est en lecture seule : aucun remboursement autorisé.");
    }
    if (!canWriteDomain(admin.role, "finance")) {
      return forbiddenResponse("Vos droits ne couvrent pas le domaine finance.");
    }

    const body = await req.json().catch(() => null);
    const orderId = String(body?.orderId || "").trim();
    const reason = String(body?.reason || "").trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "orderId requis.", code: "ORDER_REQUIRED" },
        { status: 400 }
      );
    }
    if (reason.length < 3) {
      return NextResponse.json(
        { success: false, error: "Motif de remboursement requis.", code: "REASON_REQUIRED" },
        { status: 400 }
      );
    }

    const refund = await refundOrder({
      orderId,
      paymentId: body?.paymentId ? String(body.paymentId) : undefined,
      amountMinor:
        body?.amountMinor === undefined ? undefined : Number(body.amountMinor),
      reason,
      adminId: admin.id,
    });

    return NextResponse.json({ success: true, data: { refund } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

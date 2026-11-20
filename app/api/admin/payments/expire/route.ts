import { NextRequest, NextResponse } from "next/server";
import {
  requireAdmin,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { runPaymentMaintenance } from "@/lib/modules/payments/maintenance";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments/expire
 * Expire immédiatement les abonnements/droits échus (domaine finance).
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req).catch(() => null);
    if (!admin) return unauthorizedResponse("Accès réservé à l'administration.");
    if (isReadOnlyAdmin(admin.role)) {
      return forbiddenResponse("Votre profil est en lecture seule.");
    }
    if (!canWriteDomain(admin.role, "finance")) {
      return forbiddenResponse("Vos droits ne couvrent pas le domaine finance.");
    }

    const result = await runPaymentMaintenance(new Date());
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

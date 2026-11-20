import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { runPaymentMaintenance } from "@/lib/modules/payments/maintenance";
import {
  forbiddenError,
  unauthorizedError,
  withApiRoute,
} from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments/expire
 * Expire immédiatement les abonnements/droits échus (domaine finance).
 */
export const POST = withApiRoute(async (req: NextRequest) => {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) throw unauthorizedError("Accès réservé à l'administration.");
  if (isReadOnlyAdmin(admin.role)) {
    throw forbiddenError("Votre profil est en lecture seule.");
  }
  if (!canWriteDomain(admin.role, "finance")) {
    throw forbiddenError("Vos droits ne couvrent pas le domaine finance.");
  }

  await enforceRateLimit("adminSensitive", req, admin.id);
  const result = await runPaymentMaintenance(new Date());
  return NextResponse.json({ success: true, data: result });
});


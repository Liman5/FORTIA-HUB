import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { normalizeCurrency } from "@/lib/modules/payments/money";
import { subscriptionPlanSchema } from "@/lib/validation";
import { parseOrThrow } from "@/lib/validation/common";
import {
  forbiddenError,
  unauthorizedError,
  withApiRoute,
} from "@/lib/server/errors";
import { enforceRateLimit } from "@/lib/server/rateLimits";

export const dynamic = "force-dynamic";

/** GET /api/admin/subscription-plans — toutes les formules (admins). */
export const GET = withApiRoute(async (req: NextRequest) => {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) throw unauthorizedError("Accès réservé à l'administration.");

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: { plans } });
});

/** POST /api/admin/subscription-plans — crée une formule (domaine contenu). */
export const POST = withApiRoute(async (req: NextRequest) => {
  const admin = await requireAdmin(req).catch(() => null);
  if (!admin) throw unauthorizedError("Accès réservé à l'administration.");
  if (isReadOnlyAdmin(admin.role)) {
    throw forbiddenError("Votre profil est en lecture seule.");
  }
  if (!canWriteDomain(admin.role, "content")) {
    throw forbiddenError("Vos droits ne couvrent pas le domaine contenu.");
  }

  await enforceRateLimit("adminSensitive", req, admin.id);
  const body = parseOrThrow(subscriptionPlanSchema, await req.json().catch(() => null));

  const plan = await prisma.subscriptionPlan.create({
    data: {
      code: body.code,
      name: body.name,
      description: body.description || "",
      amountMinor: body.amountMinor,
      currency: normalizeCurrency(body.currency),
      interval: body.interval || "month",
      isActive: body.isActive !== false,
    },
  });
  return NextResponse.json({ success: true, data: { plan } });
});


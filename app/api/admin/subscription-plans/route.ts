import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireAdmin,
  unauthorizedResponse,
  forbiddenResponse,
} from "@/lib/server/requireAdmin";
import { canWriteDomain, isReadOnlyAdmin } from "@/lib/server/adminRoles";
import { normalizeCurrency } from "@/lib/modules/payments/money";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/subscription-plans — toutes les formules (admins). */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(req).catch(() => null);
    if (!admin) return unauthorizedResponse("Accès réservé à l'administration.");
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: { plans } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

/** POST /api/admin/subscription-plans — crée une formule (domaine contenu). */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req).catch(() => null);
    if (!admin) return unauthorizedResponse("Accès réservé à l'administration.");
    if (isReadOnlyAdmin(admin.role)) {
      return forbiddenResponse("Votre profil est en lecture seule.");
    }
    if (!canWriteDomain(admin.role, "content")) {
      return forbiddenResponse("Vos droits ne couvrent pas le domaine contenu.");
    }

    const body = await req.json().catch(() => null);
    const code = String(body?.code || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .slice(0, 60);
    const name = String(body?.name || "").trim().slice(0, 120);
    const amountMinor = Math.floor(Number(body?.amountMinor) || 0);
    const currency = normalizeCurrency(body?.currency);
    const interval = body?.interval === "year" ? "year" : "month";

    if (!code || !name || amountMinor <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "code, name et amountMinor (> 0) sont requis.",
          code: "INVALID_PLAN",
        },
        { status: 400 }
      );
    }

    const plan = await prisma.subscriptionPlan.create({
      data: {
        code,
        name,
        description: String(body?.description || "").slice(0, 500),
        amountMinor,
        currency,
        interval,
        isActive: body?.isActive !== false,
      },
    });
    return NextResponse.json({ success: true, data: { plan } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

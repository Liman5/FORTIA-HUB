import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import { hasEntitlement, listEntitlements } from "@/lib/modules/payments/entitlements";
import { paymentErrorResponse } from "@/lib/modules/payments/http";

export const dynamic = "force-dynamic";

/**
 * GET /api/entitlements
 * • sans paramètre : tous les droits du membre connecté ;
 * • ?resourceType=course&resourceId=… : vérification d'un droit précis.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const resourceType = String(req.nextUrl.searchParams.get("resourceType") || "").trim();
    const resourceId = String(req.nextUrl.searchParams.get("resourceId") || "").trim();

    if (resourceType && resourceId) {
      const active = await hasEntitlement(
        user.id,
        resourceType as never,
        resourceId
      );
      return NextResponse.json({ success: true, data: { active } });
    }

    const entitlements = await listEntitlements(user.id);
    return NextResponse.json({ success: true, data: { entitlements } });
  } catch (error) {
    return paymentErrorResponse(error);
  }
}

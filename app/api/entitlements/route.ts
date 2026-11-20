import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import {
  hasEntitlement,
  listEntitlements,
  type ResourceType,
} from "@/lib/modules/payments/entitlements";
import { entitlementQuerySchema } from "@/lib/validation";
import { parseOrThrow, queryObject } from "@/lib/validation/common";
import { AppError, unauthorizedError, withApiRoute } from "@/lib/server/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/entitlements
 * • sans paramètre : tous les droits du membre connecté ;
 * • ?resourceType=course&resourceId=… : vérification d'un droit précis.
 */
export const GET = withApiRoute(async (req: NextRequest) => {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) throw unauthorizedError();

  const query = parseOrThrow(entitlementQuerySchema, queryObject(req));
  if (Boolean(query.resourceType) !== Boolean(query.resourceId)) {
    throw new AppError(
      400,
      "VALIDATION_ERROR",
      "resourceType et resourceId doivent être fournis ensemble.",
      { details: [{ path: "query", message: "Paramètres incomplets." }] }
    );
  }

  if (query.resourceType && query.resourceId) {
    const active = await hasEntitlement(
      user.id,
      query.resourceType as ResourceType,
      query.resourceId
    );
    return NextResponse.json({ success: true, data: { active } });
  }

  const entitlements = await listEntitlements(user.id);
  return NextResponse.json({ success: true, data: { entitlements } });
});


import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import { getPlatformUser } from "@/lib/modules/admin/platformUsers";
import { setPlatformUserStatus } from "@/lib/modules/admin/platformUserStatus";
import { platformAdminError } from "@/lib/modules/admin/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/platform-users/[id] — fiche détaillée. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;
  try {
    const { id } = await params;
    const user = await getPlatformUser(id);
    return NextResponse.json({ success: true, data: { user } });
  } catch (error) {
    return platformAdminError(error);
  }
}

/** PATCH /api/admin/platform-users/[id] — suspendre / bloquer / réactiver. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (!["suspend", "block", "reactivate"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action invalide.", code: "INVALID_ACTION" },
        { status: 400 }
      );
    }
    const result = await setPlatformUserStatus({
      userId: id,
      action: action as "suspend" | "block" | "reactivate",
      reason: body?.reason,
      until: body?.until || null,
      actor: guard.admin,
    });
    return NextResponse.json({ success: true, data: { user: result } });
  } catch (error) {
    return platformAdminError(error);
  }
}

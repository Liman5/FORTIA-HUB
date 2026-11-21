import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import {
  cancelAccountDeletion,
  requestAccountDeletion,
} from "@/lib/modules/admin/platformDeletion";
import { platformAdminError } from "@/lib/modules/admin/http";

export const dynamic = "force-dynamic";

/** POST — suppression administrative différée (7 jours minimum). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await requestAccountDeletion({
      userId: id,
      actor: guard.admin,
      origin: "admin",
      reason: body?.reason,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return platformAdminError(error);
  }
}

/** DELETE — annulation d'une suppression encore dans le délai. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const result = await cancelAccountDeletion({
      userId: id,
      requestId: body?.requestId,
      actor: guard.admin,
      reason: body?.reason,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return platformAdminError(error);
  }
}

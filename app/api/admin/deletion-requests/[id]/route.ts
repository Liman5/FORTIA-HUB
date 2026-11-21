import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import {
  cancelAccountDeletion,
  processDeletionRequestNow,
} from "@/lib/modules/admin/platformDeletion";
import { PlatformUserError } from "@/lib/modules/admin/platformUsers";
import { platformAdminError } from "@/lib/modules/admin/http";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** POST /api/admin/deletion-requests/[id] — annuler ou exécuter (si éligible). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    if (action === "cancel") {
      const request = await prisma.pendingDeletion.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!request) throw new PlatformUserError(404, "DELETION_NOT_FOUND", "Demande introuvable.");
      const result = await cancelAccountDeletion({
        userId: request.userId,
        requestId: id,
        actor: guard.admin,
        reason: body?.reason,
      });
      return NextResponse.json({ success: true, data: result });
    }
    if (action === "process") {
      const result = await processDeletionRequestNow(id);
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json(
      { success: false, error: "Action invalide.", code: "INVALID_ACTION" },
      { status: 400 }
    );
  } catch (error) {
    return platformAdminError(error);
  }
}

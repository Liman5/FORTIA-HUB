import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/services/authSession";
import {
  cancelAccountDeletion,
  DELETION_RETENTION_DAYS,
  requestAccountDeletion,
} from "@/lib/modules/admin/platformDeletion";
import { PlatformUserError } from "@/lib/modules/admin/platformUsers";
import { platformAdminError } from "@/lib/modules/admin/http";
import { enforceRateLimit } from "@/lib/server/rateLimits";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET /api/account/deletion — état de la demande du compte connecté. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  const mine = await prisma.pendingDeletion.findFirst({
    where: { userId: user.id },
    orderBy: { requestedAt: "desc" },
  });
  return NextResponse.json({
    success: true,
    data: {
      retentionDays: DELETION_RETENTION_DAYS,
      request: mine
        ? {
            id: mine.id,
            status: mine.status,
            requestedAt: mine.requestedAt,
            deleteAt: mine.deleteAt,
            origin: mine.origin,
            canCancel: mine.status === "pending",
          }
        : null,
    },
  });
}

/** POST — demande de suppression par l'utilisateur lui-même (jamais autrui). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  try {
    await enforceRateLimit("publicForm", req, user.id);
    const body = await req.json().catch(() => ({}));
    const result = await requestAccountDeletion({
      userId: user.id,
      origin: "user",
      reason: body?.reason,
    });
    return NextResponse.json({
      success: true,
      data: { ...result, retentionDays: DELETION_RETENTION_DAYS },
      message: `Demande enregistrée. La suppression définitive interviendra au plus tôt le ${result.deleteAt.toISOString()}.`,
    });
  } catch (error) {
    return platformAdminError(error);
  }
}

/** DELETE — annulation par l'utilisateur pendant le délai. */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser(req).catch(() => null);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentification requise.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }
  try {
    await enforceRateLimit("publicForm", req, user.id);
    const body = await req.json().catch(() => ({}));
    const result = await cancelAccountDeletion({
      userId: user.id,
      requestId: body?.requestId,
      reason: body?.reason,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof PlatformUserError) return platformAdminError(error);
    return platformAdminError(error);
  }
}

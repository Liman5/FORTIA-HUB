import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import { listDeletionRequests } from "@/lib/modules/admin/platformDeletion";
import { platformAdminError } from "@/lib/modules/admin/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/deletion-requests — demandes utilisateur et administratives. */
export async function GET(req: NextRequest) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;
  try {
    const params = req.nextUrl.searchParams;
    const result = await listDeletionRequests({
      status: params.get("status") || undefined,
      page: Number(params.get("page") || 1),
      limit: Number(params.get("limit") || 25),
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return platformAdminError(error);
  }
}

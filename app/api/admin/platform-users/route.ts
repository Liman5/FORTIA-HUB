import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import { listPlatformUsers } from "@/lib/modules/admin/platformUsers";
import { platformAdminError } from "@/lib/modules/admin/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/platform-users — liste paginée + statistiques réelles. */
export async function GET(req: NextRequest) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;

  try {
    const params = req.nextUrl.searchParams;
    const result = await listPlatformUsers({
      q: params.get("q") || undefined,
      role: params.get("role") || undefined,
      status: params.get("status") || undefined,
      kyc: params.get("kyc") || undefined,
      deletion: params.get("deletion") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      page: Number(params.get("page") || 1),
      limit: Number(params.get("limit") || 25),
      sort: params.get("sort") || undefined,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return platformAdminError(error);
  }
}

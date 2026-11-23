import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/server/platformAdmin";
import { countDemoData, isValidDemoConfirmation, purgeDemoData } from "@/lib/modules/admin/demoData";
import { platformAdminError } from "@/lib/modules/admin/http";

export const dynamic = "force-dynamic";

/** GET /api/admin/demo-data — nombre réel de données de démonstration. */
export async function GET(req: NextRequest) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;

  try {
    const counts = await countDemoData();
    return NextResponse.json({ success: true, data: counts });
  } catch (error) {
    return platformAdminError(error);
  }
}

/**
 * DELETE /api/admin/demo-data — supprime toutes les données de démonstration.
 * Le client doit envoyer `{ confirm: "SUPPRIMER" }` : double protection
 * contre une suppression accidentelle.
 */
export async function DELETE(req: NextRequest) {
  const guard = await requirePlatformAdmin(req);
  if (guard.error) return guard.error;

  try {
    const body = await req.json().catch(() => ({}));
    const confirm = (body as { confirm?: string })?.confirm;
    if (!isValidDemoConfirmation(confirm)) {
      return NextResponse.json(
        {
          success: false,
          error: "Confirmation requise.",
          code: "CONFIRMATION_REQUIRED",
        },
        { status: 400 }
      );
    }

    const result = await purgeDemoData(guard.admin);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return platformAdminError(error);
  }
}

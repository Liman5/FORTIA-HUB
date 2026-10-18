import { NextRequest } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/requireAdmin";
import { listCommissionRules, SALE_SCOPE_LABELS } from "@/lib/server/commissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/commissions
 * Registre des taux + PREUVES D'APPLICATION (réservé aux administrateurs).
 *
 * Renvoie :
 *   • rules  → tous les taux (type, mode, valeur, actif, dernière mise à jour)
 *   • stats  → ventes réellement enregistrées et commission réellement
 *              prélevée : c'est la preuve que le taux est bien appliqué.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return jsonSafe(
      { success: false, error: "Session administrateur requise." },
      { status: 401 }
    );
  }

  try {
    const [rules, aggregate] = await Promise.all([
      listCommissionRules(),
      prisma.marketplaceOrder
        .aggregate({
          _count: { _all: true },
          _sum: { amountUsd: true, platformCommissionUsd: true, vendorEarningsUsd: true },
          _max: { createdAt: true },
        })
        .catch(() => null),
    ]);

    const volumeUsd = Number(aggregate?._sum?.amountUsd ?? 0) || 0;
    const commissionUsd = Number(aggregate?._sum?.platformCommissionUsd ?? 0) || 0;
    const vendorPayoutUsd = Number(aggregate?._sum?.vendorEarningsUsd ?? 0) || 0;
    const ordersCount = Number(aggregate?._count?._all ?? 0) || 0;

    return jsonSafe({
      success: true,
      data: {
        rules,
        stats: {
          ordersCount,
          volumeUsd,
          commissionUsd,
          vendorPayoutUsd,
          lastOrderAt: aggregate?._max?.createdAt
            ? new Date(aggregate._max.createdAt).toISOString()
            : null,
        },
        labels: SALE_SCOPE_LABELS,
        reader: { role: admin.role, email: admin.email },
      },
    });
  } catch (error) {
    console.error("[ADMIN COMMISSIONS] Erreur :", error);
    return jsonSafe(
      { success: false, error: "Lecture des commissions impossible." },
      { status: 500 }
    );
  }
}

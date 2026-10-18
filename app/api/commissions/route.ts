import { NextResponse } from "next/server";
import { jsonSafe } from "@/lib/server/json";
import { listCommissionRules } from "@/lib/server/commissions";

export const dynamic = "force-dynamic";

/**
 * GET /api/commissions
 * Règles de commission ACTIVES (lecture publique).
 *
 * Utilisé au moment du paiement pour annoncer au client la part plateforme
 * et la part vendeur. Le montant définitif est recalculé côté serveur lors
 * de l'enregistrement de la commande : cette lecture est indicative.
 */
export async function GET() {
  try {
    const rules = await listCommissionRules();

    return jsonSafe({
      success: true,
      data: {
        rules: rules
          .filter((rule) => rule.isActive)
          .map((rule) => ({
            scope: rule.scope,
            mode: rule.mode,
            value: rule.value,
          })),
      },
    });
  } catch (error) {
    console.error("[COMMISSIONS] Erreur de lecture :", error);
    return jsonSafe({ success: false, error: "Lecture des taux impossible." }, { status: 500 });
  }
}

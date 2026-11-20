import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/plans
 * Offres publiques : formules d'abonnement + tarifs serveur (stockage, frais).
 * Aucun secret, aucune donnée personnelle.
 */
export async function GET() {
  try {
    const [subscriptionPlans, pricePlans] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: { amountMinor: "asc" },
        select: {
          code: true,
          name: true,
          description: true,
          amountMinor: true,
          currency: true,
          interval: true,
        },
      }),
      prisma.pricePlan.findMany({
        where: { isActive: true },
        orderBy: { amountMinor: "asc" },
        select: {
          code: true,
          label: true,
          amountMinor: true,
          currency: true,
          metadata: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { subscriptionPlans, pricePlans },
    });
  } catch (error) {
    console.error("[PAYMENTS] Lecture des offres impossible:", error);
    return NextResponse.json(
      { success: false, error: "Offres indisponibles pour le moment." },
      { status: 500 }
    );
  }
}

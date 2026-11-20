// ============================================================
// FORTIA HUB — HANDLERS D'ÉCRITURE (Phase 5)
// Généré depuis l'ancien switch ; l'autorisation et la validation
// restent centralisées dans /api/platform/write.
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { WriteError, requireStoreAccess } from "@/lib/server/writeAuthorization";
import { isSaleScope, saveCommissionRule, type SaleScope } from "@/lib/server/commissions";

import type { WriteHandlerContext } from "../types";

export async function handleFinanceAction(
  action: string,
  context: WriteHandlerContext
): Promise<Response | null> {
  const { auth, data } = context;
  switch (action) {
    case "save-commission-rule": {
        // Action réservée aux administrateurs finances (politique d'accès).
        if (!auth.admin) {
          return NextResponse.json(
            {
              success: false,
              error: "Session administrateur requise pour modifier un taux de commission.",
            },
            { status: 401 }
          );
        }

        const scope: SaleScope = isSaleScope(data.scope) ? data.scope : "general";
        const mode = data.mode === "fixed" ? "fixed" : "percent";
        const value = Math.max(0, Number(data.value) || 0);
        const isActive = data.isActive !== false;

        if (mode === "percent" && value > 100) {
          return NextResponse.json(
            { success: false, error: "Un pourcentage ne peut pas dépasser 100 %." },
            { status: 400 }
          );
        }

        const rule = await saveCommissionRule({ scope, mode, value, isActive });
        return NextResponse.json({ success: true, rule });
      }

    case "submit-payout": {
        // Le vendeur ne peut demander un retrait que sur SA boutique.
        const store = await requireStoreAccess(auth, data.storeId);
        const amountUsd = Math.max(0, Number(data.amountUsd) || 0);
        if (amountUsd <= 0) {
          throw new WriteError(400, "Montant de retrait invalide.");
        }

        // Solde disponible = chiffre d'affaires moins retraits en attente.
        const [storeBalance, pending] = await Promise.all([
          prisma.store.findUnique({
            where: { id: store.id },
            select: { totalRevenueUsd: true },
          }),
          prisma.payoutRequest.aggregate({
            where: { storeId: store.id, status: "En_attente" },
            _sum: { amountUsd: true },
          }),
        ]);
        const revenue = Number(storeBalance?.totalRevenueUsd || 0);
        const alreadyRequested = Number(pending._sum.amountUsd || 0);
        const available = Math.max(0, revenue - alreadyRequested);
        if (amountUsd > available) {
          throw new WriteError(
            409,
            `Montant supérieur au solde disponible (${available.toFixed(2)} $).`
          );
        }
        const created = await prisma.payoutRequest.create({
          data: {
            storeId: store.id,
            storeName: store.name,
            vendorName: auth.user?.name || data.vendorName || "",
            amountUsd,
            amountFcfa: Math.round(amountUsd * 600),
            payoutMethod: data.payoutMethod || "",
            accountDetails: data.accountDetails || "",
            status: "En_attente",
          } as any,
        });
        return NextResponse.json({ success: true, id: created.id });
      }

    case "approve-payout": {
        const payout = await prisma.payoutRequest.findUnique({ where: { id: data.id } });
        if (!payout) {
          return NextResponse.json({ error: "Demande de retrait introuvable" }, { status: 404 });
        }
        if (payout.status !== "En_attente") {
          return NextResponse.json(
            { error: "Cette demande de retrait a déjà été traitée." },
            { status: 409 }
          );
        }

        await prisma.$transaction(async (tx) => {
          // Transition atomique : une seconde approbation simultanée échoue.
          const approved = await tx.payoutRequest.updateMany({
            where: { id: payout.id, status: "En_attente" },
            data: { status: "Paye" } as any,
          });
          if (approved.count === 0) {
            throw new WriteError(409, "Cette demande de retrait a déjà été traitée.");
          }

          if (payout.storeId) {
            const storeDoc = await tx.store.findUnique({ where: { id: payout.storeId } });
            if (storeDoc) {
              const newBalance = Math.max(
                Number(storeDoc.totalRevenueUsd || 0) - Number(payout.amountUsd || 0),
                0
              );
              await tx.store.update({
                where: { id: payout.storeId },
                data: { totalRevenueUsd: newBalance } as any,
              });
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: "Retrait approuvé.",
        });
      }
  }
  return null;
}
